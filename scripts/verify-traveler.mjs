import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { options, normalize, resolveSlots, loadCharacter, saveCharacter } from '../src/character/state.js';

// Every frame/build/face and every individual customization variant must resolve.
const required = new Set();
for(const frame of options.frame)for(const build of options.build)for(const faceShape of options.faceShape){
  const base=normalize({frame,build,faceShape});
  for(const [key,values] of Object.entries(options))for(const value of values){
    const state=normalize({...base,[key]:value});
    for(const slot of resolveSlots(state))required.add(slot.url);
  }
}
let triangles=0,bytes=0;
for(const url of required){
  const path=fileURLToPath(url), b=readFileSync(path);
  assert.equal(b.readUInt32LE(0),0x46546c67,path);
  assert.equal(b.readUInt32LE(4),2,path);
  assert.equal(b.readUInt32LE(8),b.length,path);
  const jsonLength=b.readUInt32LE(12);
  assert.equal(b.readUInt32LE(16),0x4e4f534a,path);
  const doc=JSON.parse(b.subarray(20,20+jsonLength).toString());
  assert.equal(doc.asset.version,'2.0',path);
  assert.ok(doc.meshes?.length,path+' missing meshes');
  assert.ok(doc.scenes?.length,path+' missing scenes');
  const binHeader=20+jsonLength;
  assert.equal(b.readUInt32LE(binHeader+4),0x004e4942,path);
  const binLength=b.readUInt32LE(binHeader);
  assert.equal(binHeader+8+binLength,b.length,path);
  assert.ok(doc.buffers[0].byteLength<=binLength,path);
  for(const view of doc.bufferViews){
    assert.ok((view.byteOffset??0)+view.byteLength<=binLength,path+' invalid buffer view');
  }
  for(const mesh of doc.meshes)for(const primitive of mesh.primitives){
    const a=doc.accessors[primitive.attributes.POSITION];
    assert.ok(a.count>0&&a.type==='VEC3',path+' invalid positions');
    assert.ok(a.min?.every(Number.isFinite)&&a.max?.every(Number.isFinite),path+' invalid bounds');
    const mode=primitive.mode??4;
    if(mode===4){
      const count=primitive.indices==null?a.count:doc.accessors[primitive.indices].count;
      assert.equal(count%3,0,path+' incomplete triangles');triangles+=count/3;
    }
  }
  bytes+=b.length;
}
const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
storage.setItem('eclipse.character.v1',JSON.stringify({name:'Traveler',frame:'Female',hair:'Bob'}));
const state=loadCharacter(storage);
assert.equal(state.version,2);assert.equal(state.frame,'Female');
assert.equal(state.hair,'Bob');assert.equal(state.name,'Traveler');
assert.ok(saveCharacter(state,storage));assert.deepEqual(loadCharacter(storage),state);
assert.equal(normalize({frame:'not-valid'}).frame,'Male');
assert.equal(resolveSlots(normalize({hair:'Shaved',markings:'None'})).length,9);
console.log('Validated '+required.size+' GLB assets, '+triangles+' triangles, '+bytes+' bytes, and state migration.');
