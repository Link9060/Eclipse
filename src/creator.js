import * as THREE from 'three';
import { options, defaults, loadCharacter, saveCharacter, normalize, resolveSlots } from './character/state.js';
import { CharacterAssembler } from './character/CharacterAssembler.js';
const $=id=>document.getElementById(id);
let state=loadCharacter();
let preview=null;
let revision=0;
const fields={
  frame:'Frame',height:'Height',build:'Build',faceShape:'Face',skinTone:'Skin tone',
  markings:'Markings',eyeGlow:'Eye light',hair:'Hairstyle',hairColor:'Hair color',
  hood:'Hood preview',cloakPattern:'Cloak pattern',mantleStyle:'Mantle',
  tunicStyle:'Tunic',beltStyle:'Belt',wrapDensity:'Wraps',bootStyle:'Boots'
};
const groups=[
  ['Body',['frame','height','build']],
  ['Face',['faceShape','skinTone','markings','eyeGlow']],
  ['Hair',['hair','hairColor']],
  ['Traveler’s kit',['hood','cloakPattern','mantleStyle','tunicStyle','beltStyle','wrapDensity','bootStyle']]
];
function update(){
  saveCharacter(state);
  for(const b of document.querySelectorAll('[data-field]')){
    b.setAttribute('aria-pressed',String(state[b.dataset.field]===b.dataset.value));
  }
  for(const input of document.querySelectorAll('[data-palette]'))input.value=state.palette[input.dataset.palette];
  $('selection').textContent=state.frame+' · '+state.hair+' · '+state.hood.toLowerCase()+' hood';
  refresh();
}
function controls(){
  for(const [label,keys] of groups){
    const section=document.createElement('details');
    section.className='section';
    section.open=['Body','Hair'].includes(label);
    const title=document.createElement('summary');title.textContent=label;section.append(title);
    for(const field of keys){
      const row=document.createElement('div');row.className='field';
      const heading=document.createElement('div');heading.className='label';heading.textContent=fields[field];row.append(heading);
      const choices=document.createElement('div');choices.className=field==='hair'?'choices hair':'choices';
      choices.setAttribute('role','group');choices.setAttribute('aria-label',fields[field]);
      for(const value of options[field]){
        const b=document.createElement('button');b.type='button';b.className='choice';
        b.dataset.field=field;b.dataset.value=value;b.textContent=value;
        b.onclick=()=>{state[field]=value;update()};
        choices.append(b);
      }
      row.append(choices);section.append(row);
    }
    $('options').append(section);
  }
  for(const key of Object.keys(defaults.palette)){
    const label=document.createElement('label');label.className='palette-row';label.textContent=key;
    const input=document.createElement('input');input.type='color';input.dataset.palette=key;input.setAttribute('aria-label',key+' color');
    input.oninput=()=>{state.palette[key]=input.value;update()};label.append(input);$('palette').append(label);
  }
  $('name').value=state.name;
  $('name').oninput=()=>{state.name=$('name').value;saveCharacter(state)};
  $('randomize').onclick=()=>{for(const key of ['frame','faceShape','hair','markings','hairColor']){const list=options[key];state[key]=list[Math.floor(Math.random()*list.length)]}update()};
  $('reset').onclick=()=>{state=normalize();$('name').value=state.name;update()};
  $('begin').onclick=()=>{
    const persisted=saveCharacter(state);
    $('status').textContent=persisted?'Traveler configuration saved locally.':'Storage unavailable; configuration remains in this session.';
    $('summary').textContent=(state.name.trim()||'Unnamed traveler')+' · '+state.frame+' · '+state.hair;
    $('confirmed').classList.add('open');$('back').focus();
    window.dispatchEvent(new CustomEvent('eclipse:character-confirmed',{detail:{...normalize(state),hood:'Down'}}));
  };
  $('back').onclick=()=>{$('confirmed').classList.remove('open');$('begin').focus()};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('confirmed').classList.contains('open'))$('back').click()});
  update();
}
function showMissing(result){
  $('loading').hidden=false;
  $('asset-title').textContent='Traveler artwork pending';
  $('asset-message').textContent=result.missing.length+' of '+result.total+' required mesh slots are unavailable. Your customization is saved; 3D preview will appear when matching GLB assets are added.';
  $('missing').replaceChildren(...result.missing.map(s=>{const li=document.createElement('li');li.textContent=s.id;return li}));
}
async function refresh(){
  if(!preview)return;
  const token=++revision;
  $('loading').hidden=false;
  $('asset-title').textContent='Assembling traveler';
  $('asset-message').textContent='Loading selected character meshes…';
  $('missing').replaceChildren();
  try{
    const result=await preview.assembler.build(normalize(state));
    if(token!==revision||result.stale)return;
    for(const id of ['front','face','spin'])$(id).disabled=!result.ready;
    if(result.ready){$('loading').hidden=true;preview.fit()}else showMissing(result);
  }catch(err){
    if(token!==revision)return;
    console.error(err);
    $('asset-title').textContent='Preview unavailable';$('asset-message').textContent='An asset could not be assembled. Your configuration is still saved.';
  }
}
function init(){
  const host=$('viewport'),scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(30,1,.01,100);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  host.append(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xf0e9df,0x33303a,2.2));
  function light(color,intensity,x,y,z){const l=new THREE.DirectionalLight(color,intensity);l.position.set(x,y,z);scene.add(l);return l}
  const key=light(0xfff2e1,3,3,5,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  light(0xe4e5ff,2,-3,3,-4);
  const assembler=new CharacterAssembler(scene);
  let yaw=.22,auto=false,drag=false,lastX=0,zoom=1,desiredZoom=1;
  let center=new THREE.Vector3(0,.9,0),target=center.clone(),height=1.8;
  function fit(){
    assembler.root.rotation.y=0;
    const bounds=new THREE.Box3().setFromObject(assembler.root);
    if(!bounds.isEmpty()){bounds.getCenter(center);height=Math.max(bounds.max.y-bounds.min.y,.1);target.copy(center)}
    desiredZoom=1;
  }
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
  new ResizeObserver(resize).observe(host);resize();
  host.addEventListener('pointerdown',e=>{if(!assembler.ready)return;drag=true;lastX=e.clientX;host.setPointerCapture(e.pointerId);auto=false;$('spin').setAttribute('aria-pressed','false')});
  host.addEventListener('pointermove',e=>{if(drag){yaw+=(e.clientX-lastX)*.012;lastX=e.clientX}});
  for(const evt of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(evt,()=>drag=false);
  host.addEventListener('wheel',e=>{if(!assembler.ready)return;e.preventDefault();desiredZoom=THREE.MathUtils.clamp(desiredZoom-e.deltaY*.001,.8,3.5)},{passive:false});
  $('front').onclick=()=>{yaw=0;desiredZoom=1;target.copy(center);auto=false;$('spin').setAttribute('aria-pressed','false')};
  $('face').onclick=()=>{yaw=0;desiredZoom=3.2;target.copy(center);target.y+=height*.34;auto=false;$('spin').setAttribute('aria-pressed','false')};
  $('spin').onclick=()=>{auto=!auto;$('spin').setAttribute('aria-pressed',String(auto))};
  const clock=new THREE.Clock();
  renderer.setAnimationLoop(()=>{
    const dt=Math.min(clock.getDelta(),.05);if(auto&&assembler.ready)yaw+=dt*.55;
    assembler.root.rotation.y=yaw;zoom+=(desiredZoom-zoom)*Math.min(dt*9,1);
    const distance=height*2.35/zoom*Math.max(1,.65/camera.aspect);
    camera.position.set(target.x,target.y+height*.05,distance);camera.lookAt(target);
    renderer.render(scene,camera);
  });
  preview={assembler,fit};
  refresh();
}
controls();
try{init()}catch(error){
  console.error(error);$('asset-title').textContent='3D renderer unavailable';
  $('asset-message').textContent='WebGL could not initialize. Your character configuration is still editable.';
}
