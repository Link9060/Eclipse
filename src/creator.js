import * as THREE from 'three';
import { creatorOptions, loadCharacter, saveCharacter, normalizeCreator } from './character/state.js';
import { CharacterAssembler } from './character/CharacterAssembler.js';
const $=id=>document.getElementById(id);
let state=normalizeCreator(loadCharacter());
let preview=null;
let revision=0;
let queued=false;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const motionPreview={wind:0.85,direction:45,speed:0,quality:1};
const fields={frame:'Gender',hair:'Hairstyle'};
function update(){
  saveCharacter(state);
  for(const b of document.querySelectorAll('[data-field]')){
    b.setAttribute('aria-pressed',String(state[b.dataset.field]===b.dataset.value));
  }
  $('selection').textContent=state.frame+' · '+state.hair;
  if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;refresh()})}
}
function controls(){
  for(const [field,values] of Object.entries(creatorOptions)){
    const section=document.createElement('section');section.className='section';
    const heading=document.createElement('h3');heading.className='creator-heading';heading.textContent=fields[field];section.append(heading);
    const choices=document.createElement('div');choices.className=field==='hair'?'choices hair':'choices';
    choices.setAttribute('role','group');choices.setAttribute('aria-label',fields[field]);
    for(const value of values){
      const b=document.createElement('button');b.type='button';b.className='choice';
      b.dataset.field=field;b.dataset.value=value;b.textContent=value;
      b.onclick=()=>{state=normalizeCreator({...state,[field]:value});update()};
      choices.append(b);
    }
    section.append(choices);
    $('options').append(section);
  }
  $('randomize').onclick=()=>{const {frame,hair}=creatorOptions;state=normalizeCreator({frame:frame[Math.floor(Math.random()*frame.length)],hair:hair[Math.floor(Math.random()*hair.length)]});update()};
  $('reset').onclick=()=>{state=normalizeCreator();update()};
  $('begin').onclick=()=>{
    const persisted=saveCharacter(state);
    $('status').textContent=persisted?'Traveler saved locally.':'Storage unavailable; selection remains in this session.';
    $('summary').textContent=state.frame+' · '+state.hair+' · Concordant garments';
    $('confirmed').classList.add('open');$('back').focus();
    window.dispatchEvent(new CustomEvent('eclipse:character-confirmed',{detail:normalizeCreator(state)}));
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
    const result=await preview.assembler.build(normalizeCreator(state));
    if(token!==revision||result.stale)return;
    for(const id of ['front','face','spin'])$(id).disabled=!result.ready;
    if(result.ready){$('loading').hidden=true;preview.fit(!preview.hasFit);preview.hasFit=true}else showMissing(result);
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
  scene.add(new THREE.HemisphereLight(0xf0e9df,0x57525a,2.0));
  function light(color,intensity,x,y,z){const l=new THREE.DirectionalLight(color,intensity);l.position.set(x,y,z);scene.add(l);return l}
  const key=light(0xfff2e1,2.7,-3,4,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  key.shadow.camera.left=-1.4;key.shadow.camera.right=1.4;key.shadow.camera.top=2;key.shadow.camera.bottom=-1.4;key.shadow.normalBias=.015;key.target.position.set(0,.85,0);scene.add(key.target);
  light(0xe4e5ff,1.8,-3,3,-4);
  light(0xe8d9ce,.85,3,2,4);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(12,12),new THREE.ShadowMaterial({opacity:.23}));
  ground.rotation.x=-Math.PI/2;ground.position.y=.005;ground.receiveShadow=true;scene.add(ground);
  const assembler=new CharacterAssembler(scene);
  let yaw=.22,auto=false,drag=false,lastX=0,zoom=1,desiredZoom=1;
  let center=new THREE.Vector3(0,.9,0),target=center.clone(),height=1.8;
  function fit(reset=false){
    assembler.root.rotation.y=0;
    const bounds=new THREE.Box3().setFromObject(assembler.root);
    if(!bounds.isEmpty()){
      const oldCenter=center.clone(),oldHeight=height;
      bounds.getCenter(center);height=Math.max(bounds.max.y-bounds.min.y,.1);
      if(reset){target.copy(center);desiredZoom=1}
      else{const relative=target.clone().sub(oldCenter).multiplyScalar(height/oldHeight);target.copy(center).add(relative)}
    }
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
    const direction=motionPreview.direction*Math.PI/180+yaw;
    assembler.motion.setEnabled(!reducedMotion.matches);
    assembler.motion.setQuality(motionPreview.quality);
    assembler.motion.update(dt,Math.cos(direction)*motionPreview.wind,Math.sin(direction)*motionPreview.wind,0,motionPreview.speed);
    assembler.root.rotation.y=yaw;zoom+=(desiredZoom-zoom)*Math.min(dt*9,1);
    const distance=height*2.15/zoom*Math.max(1,.65/camera.aspect);
    camera.position.set(target.x,target.y+height*.05,distance);camera.lookAt(target);
    renderer.render(scene,camera);
  });
  preview={assembler,fit,hasFit:false};
  refresh();
}
controls();
try{init()}catch(error){
  console.error(error);$('asset-title').textContent='3D renderer unavailable';
  $('asset-message').textContent='WebGL could not initialize. Your character configuration is still editable.';
}
