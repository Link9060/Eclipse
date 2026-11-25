import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneRig } from 'three/addons/utils/SkeletonUtils.js';
import { resolveSlots, skinColors, hairColors } from './state.js';

const heightScale={Short:.94,Medium:1,Tall:1.06};
export class CharacterAssembler {
  constructor(scene){
    this.root=new THREE.Group();
    this.root.name='Concordant';
    scene.add(this.root);
    this.loader=new GLTFLoader();
    this.cache=new Map();
    this.revision=0;
    this.ready=false;
  }
  load(url){
    if(!this.cache.has(url)){
      const promise=this.loader.loadAsync(url);
      this.cache.set(url,promise);
    }
    return this.cache.get(url);
  }
  disposeInstance(group){
    group.traverse(obj=>{
      if(obj.isMesh){
        const materials=Array.isArray(obj.material)?obj.material:[obj.material];
        materials.forEach(m=>m?.dispose());
        if(obj.isSkinnedMesh)obj.skeleton?.dispose();
      }
    });
    group.removeFromParent();
  }
  clear(){
    for(const child of [...this.root.children])this.disposeInstance(child);
    this.ready=false;
  }
  async build(state){
    const revision=++this.revision;
    const slots=resolveSlots(state);
    const results=await Promise.allSettled(slots.map(s=>this.load(s.url)));
    if(revision!==this.revision)return {stale:true};
    const missing=slots.filter((s,i)=>results[i].status==='rejected');
    if(missing.some(s=>s.required)){
      this.clear();
      return {ready:false,missing,total:slots.length};
    }
    const assembled=new THREE.Group();
    for(let i=0;i<slots.length;i++){
      if(results[i].status!=='fulfilled')continue;
      const part=cloneRig(results[i].value.scene);
      part.name='slot:'+slots[i].id;
      part.traverse(obj=>{
        if(!obj.isMesh)return;
        obj.material=Array.isArray(obj.material)?obj.material.map(m=>m.clone()):obj.material.clone();
        obj.castShadow=true;
        obj.receiveShadow=true;
        const materials=Array.isArray(obj.material)?obj.material:[obj.material];
        for(const m of materials){
          // Artists assign these material names in Blender. Unnamed materials retain their authored appearance.
          const role=m.name.toLowerCase().split('.')[0];
          const colors={skin:skinColors[state.skinTone],hair:hairColors[state.hairColor],primary:state.palette.primary,secondary:state.palette.secondary,accent:state.palette.accent,metal:state.palette.metal};
          if(colors[role]&&m.color)m.color.set(colors[role]);
          if(role==='eyes'&&m.emissive){
            m.emissive.set('#d6dce7');
            m.emissiveIntensity={Off:0,Faint:.18,Bright:.7}[state.eyeGlow];
          }
        }
        const name=obj.name.toLowerCase();
        if(name.startsWith('pattern_trim'))obj.visible=state.cloakPattern!=='None';
        if(name.startsWith('pattern_border'))obj.visible=state.cloakPattern==='Full border';
      });
      assembled.add(part);
    }
    assembled.scale.setScalar(heightScale[state.height]);
    this.clear();
    this.root.add(assembled);
    this.ready=true;
    return {ready:true,missing:[],total:slots.length};
  }
}
