import * as THREE from 'three';

// Shared per-character uniforms; no per-frame vertex uploads or geometry rebuilds.
// Wind and velocity passed in character-local coordinates (m/s).
export class SecondaryMotion {
  constructor(){
    this.uniforms={eclipseTime:{value:0},eclipseFlow:{value:new THREE.Vector2()},eclipseGust:{value:0},eclipseStrength:{value:1}};
    this.velocity=new THREE.Vector2();
    this.target=new THREE.Vector2();
    this.wind=new THREE.Vector2(.65,-.15);
    this.enabled=true;
    this.quality=1;
  }
  update(dt,windX,windZ,velocityX=0,velocityZ=0){
    dt=Math.min(Math.max(dt,0),.05);
    this.uniforms.eclipseTime.value+=dt;
    this.target.set(windX-velocityX*.65,windZ-velocityZ*.65).clampLength(0,5);
    // Exponential damping is stable even at low frame rates.
    this.velocity.lerp(this.target,1-Math.exp(-dt*5));
    this.uniforms.eclipseFlow.value.copy(this.velocity);
    this.uniforms.eclipseGust.value=Math.min(1,this.velocity.length()/2.5);
    this.uniforms.eclipseStrength.value=this.enabled?this.quality:0;
  }
  setEnabled(enabled){this.enabled=!!enabled;this.uniforms.eclipseStrength.value=this.enabled?this.quality:0}
  setQuality(quality){this.quality=THREE.MathUtils.clamp(quality,0,1);this.uniforms.eclipseStrength.value=this.enabled?this.quality:0}
}

// The generated meshes share a character-space rest pose. Production assets can
// opt in with node userData.eclipseMotion = "hair" | "cloak" | "panel" | "mantle".
// Unsupported skinned/transformed assets stay static until a rig-aware adapter exists.
export function motionProfile(slot,name,explicit){
  if(['hair','cloak','panel','mantle'].includes(explicit))return explicit;
  name=name.toLowerCase();
  if(slot==='hair'&&!/crown|knot/.test(name))return 'hair';
  if(slot==='mantle'&&/cloak/.test(name))return 'cloak';
  if(slot==='mantle'&&/shoulder_mantle|dark_mantle|pattern_trim_mantle/.test(name))return 'mantle';
  if(slot==='tunic'&&/panel/.test(name))return 'panel';
  return null;
}
const profiles={
  hair:{anchor:1.74,span:.19,amplitude:.019,frequency:3.1,trail:.013},
  cloak:{anchor:1.42,span:1.15,amplitude:.056,frequency:1.8,trail:.043},
  panel:{anchor:1.035,span:.56,amplitude:.025,frequency:2.4,trail:.012},
  mantle:{anchor:1.44,span:.25,amplitude:.012,frequency:2.2,trail:.007}
};
function patch(material,motion,profile){
  const p=profiles[profile];
  const previous=material.onBeforeCompile;
  const previousKey=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,renderer){
    previous.call(this,shader,renderer);
    Object.assign(shader.uniforms,motion.uniforms);
    const declaration=`
uniform float eclipseTime;
uniform vec2 eclipseFlow;
uniform float eclipseGust;
uniform float eclipseStrength;
vec3 eclipseDeform(vec3 p){
  float freeEnd=clamp((${p.anchor.toFixed(3)}-p.y)/${p.span.toFixed(3)},0.0,1.0);
  freeEnd=freeEnd*freeEnd;
  float phase=eclipseTime*${p.frequency.toFixed(3)}+p.x*12.0+p.y*4.2;
  float ripple=sin(phase)+0.35*sin(phase*1.61+p.z*9.0);
  float flutter=ripple*${p.amplitude.toFixed(3)}*(0.12+0.88*eclipseGust);
  vec2 bend=eclipseFlow*${p.trail.toFixed(3)};
  p.x+=eclipseStrength*freeEnd*(bend.x+flutter);
  p.z+=eclipseStrength*freeEnd*(bend.y+flutter*0.55);
  return p;
}
`;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+declaration);
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed=eclipseDeform(transformed);');
  };
  material.customProgramCacheKey=()=>previousKey+'|eclipse-motion-v1|'+profile;
  material.needsUpdate=true;
}
export function attachSecondaryMotion(mesh,slot,motion){
  const profile=motionProfile(slot,mesh.name,mesh.userData.eclipseMotion);
  if(!profile||mesh.isSkinnedMesh)return false;
  // Shared rest-space generator places vertices directly in model coordinates.
  if(mesh.position.lengthSq()>1e-8||Math.abs(mesh.quaternion.w)<.99999||mesh.scale.distanceToSquared(new THREE.Vector3(1,1,1))>1e-8)return false;
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  for(const material of materials)patch(material,motion,profile);
  // Match shadow silhouette to the visible animation.
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});
  patch(depth,motion,profile);mesh.customDepthMaterial=depth;
  mesh.frustumCulled=false; // Bounds remain in rest pose, so avoid clipping fluttering edges.
  return true;
}
