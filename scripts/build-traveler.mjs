// ECLIPSE: first art-blockout mesh library.
// Tailored triangulated surfaces, shared rest pose, independently replaceable GLBs.
// Run: node scripts/build-traveler.mjs [asset-directory]
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const PI=Math.PI, tau=PI*2;
const colors={skin:[.07,.066,.085],hair:[.86,.83,.79],primary:[.77,.72,.65],secondary:[.09,.085,.105],accent:[.49,.44,.37],metal:[.38,.34,.29],eyes:[.65,.69,.75],leather:[.15,.105,.085],lining:[.035,.033,.043],shadow:[.025,.023,.032]};
const V=(x,y,z)=>[x,y,z];
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,n)=>a.map(v=>v*n),dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>mul(a,1/(Math.hypot(...a)||1));
class Model {
  constructor(){this.parts=new Map()}
  tri(name,role,a,b,c){
    const normal=unit(cross(sub(b,a),sub(c,a)));
    if(Math.hypot(...normal)<.1)return;
    const key=name+'|'+role;
    if(!this.parts.has(key))this.parts.set(key,{name,role,p:[],n:[]});
    const m=this.parts.get(key);m.p.push(...a,...b,...c);m.n.push(...normal,...normal,...normal);
  }
  quad(name,role,a,b,c,d){this.tri(name,role,a,b,c);this.tri(name,role,a,c,d)}
  // Each ring is [center X, Y, center Z, horizontal radius, depth radius].
  // Fold offsets are built into the surface, not stacked primitive objects.
  loft(name,role,rings,n=10,fold=.0){
    const rows=rings.map(([x,y,z,rx,rz],j)=>Array.from({length:n},(_,i)=>{
      const a=tau*i/n, wave=1+fold*Math.sin(i*2.7+j*1.6);
      return V(x+Math.cos(a)*rx*wave,y+(j&&j<rings.length-1?fold*.045*Math.cos(i*2):0),z+Math.sin(a)*rz*wave);
    }));
    for(let j=0;j<rows.length-1;j++)for(let i=0;i<n;i++){
      const k=(i+1)%n;this.quad(name,role,rows[j][i],rows[j+1][i],rows[j+1][k],rows[j][k]);
    }
    for(let i=0;i<n;i++){const k=(i+1)%n;this.tri(name,role,V(...rings[0].slice(0,3)),rows[0][i],rows[0][k]);const r=rings.at(-1);this.tri(name,role,V(...r.slice(0,3)),rows.at(-1)[k],rows.at(-1)[i]);}
  }
  tube(name,role,points,radii,n=7){
    const rows=points.map((p,j)=>{
      const d=unit(sub(points[Math.min(j+1,points.length-1)],points[Math.max(j-1,0)]));
      const u=unit(cross(d,Math.abs(d[2])>.9?V(0,1,0):V(0,0,1))),v=cross(d,u);
      return Array.from({length:n},(_,i)=>add(p,add(mul(u,Math.cos(tau*i/n)*radii[j]),mul(v,Math.sin(tau*i/n)*radii[j]))));
    });
    for(let j=0;j<rows.length-1;j++)for(let i=0;i<n;i++){let k=(i+1)%n;this.quad(name,role,rows[j][i],rows[j][k],rows[j+1][k],rows[j+1][i])}
  }
  sheet(name,role,rows){
    for(let j=0;j<rows.length-1;j++)for(let i=0;i<rows[j].length-1;i++)this.quad(name,role,rows[j][i],rows[j][i+1],rows[j+1][i+1],rows[j+1][i]);
  }
  ribbon(name,role,points,width=.012){
    const rows=points.map((p,j)=>{
      const d=unit(sub(points[Math.min(j+1,points.length-1)],points[Math.max(j-1,0)]));
      const side=unit(V(-d[1],d[0],0));return [add(p,mul(side,width/2)),add(p,mul(side,-width/2))];
    });
    this.sheet(name,role,rows);
  }
  diamond(name,role,x,y,z,w,h){
    this.ribbon(name,role,[V(x,y+h,z),V(x+w,y,z),V(x,y-h,z),V(x-w,y,z),V(x,y+h,z)],.008);
  }
}
function body(m,b){
  m.loft('neck','skin',[[0,1.37,0,.05,.046],[0,1.52,.005,.055,.048]],10);
  for(const s of [-1,1]){
    const x=s*b.arm;
    m.loft('hand','skin',[[x+s*.008,.88,.035,.026,.022],[x,.92,.038,.036,.024],[x,1.005,.015,.038,.027],[x-s*.008,1.05,.006,.027,.026]],8);
    for(let i=0;i<4;i++){const a=x+(i-1.5)*.012;m.tube('fingers','skin',[V(a,.933,.043),V(a+s*.002,.888+Math.abs(i-1.5)*.006,.05)],[.009,.004],5)}
    m.tube('thumb','skin',[V(x-s*.024,.98,.046),V(x-s*.044,.943,.06),V(x-s*.04,.92,.06)],[.014,.011,.007]);
  }
}
function head(m,frame,shape){
  const w=shape==='narrow'?.085:shape==='soft'?.101:.095;
  const jaw=frame==='female'?.66:.76;
  // Continuous faceted head: tapered chin, cheekbone, brow and crown.
  m.loft('face','skin',[[0,1.47,.038,w*.38,.042],[0,1.50,.024,w*jaw,.069],[0,1.55,.008,w*.96,.088],[0,1.61,0,w,.096],[0,1.67,-.008,w*.94,.092],[0,1.72,-.012,w*.70,.071],[0,1.75,-.015,.017,.02]],12);
  m.tri('nose','skin',V(-.021,1.609,.087),V(.019,1.609,.087),V(0,1.566,.127));
  m.tri('nose','skin',V(-.021,1.609,.087),V(0,1.566,.127),V(-.017,1.559,.091));
  m.tri('nose','skin',V(0,1.566,.127),V(.019,1.609,.087),V(.017,1.559,.091));
  for(const s of [-1,1]){
    const x=s*.039;
    m.quad('eye_socket','shadow',V(x-s*.025,1.612,.098),V(x+s*.026,1.620,.088),V(x+s*.023,1.598,.09),V(x-s*.022,1.598,.098));
    m.quad('eye','eyes',V(x-s*.018,1.605,.100),V(x+s*.020,1.612,.091),V(x+s*.015,1.604,.092),V(x-s*.013,1.601,.100));
    m.tube('brow','skin',[V(x-s*.022,1.627,.097),V(x+s*.023,1.636,.082)],[.010,.005]);
    m.tube('ear','skin',[V(s*w*.86,1.55,-.013),V(s*(w+.014),1.62,-.012),V(s*w,1.64,-.018)],[.02,.022,.008]);
  }
  m.ribbon('mouth','shadow',[V(-.025,1.536,.092),V(0,1.533,.099),V(.025,1.536,.092)],.005);
}
function hair(m,style){
  // Swept cap and individual tapered locks, with a non-spherical hairline.
  m.loft('crown','hair',[[0,1.642,-.037,.094,.068],[0,1.694,-.014,.105,.101],[0,1.74,-.013,.087,.084],[.008,1.768,-.018,.026,.035]],12,.035);
  if(style==='cropped')return;
  const long=['long','bob','braid','twin-braids','locs'].includes(style);
  const spikes=style==='spiked';
  for(let i=0;i<7;i++){
    const x=(i-3)*.026, sign=x<0?-1:1;
    const shift=style==='side-part'?.044:.026;
    m.tube('fringe_'+i,'hair',[V(x*.7,1.735,.04),V(x+shift,1.693,.097),V(x+shift*.8,spikes?1.73:1.615+Math.abs(x)*.28,.114)],[.028,.025,.002],5);
    if(long)m.tube('side_lock_'+i,'hair',[V(sign*(.065+Math.abs(x)*.3),1.70,-.025),V(sign*.104,1.60,-.028),V(sign*(.09+i*.003),style==='long'?1.30:1.48,-.04)],[.026,.026,.003],6);
  }
  if(style==='topknot')m.loft('knot','hair',[[0,1.73,-.067,.035,.035],[0,1.79,-.075,.049,.042],[0,1.815,-.075,.012,.012]],8);
  if(style==='braid'||style==='twin-braids')for(const x of style==='braid'?[0]:[-.065,.065])m.tube('braid','hair',Array.from({length:9},(_,i)=>V(x+.008*Math.sin(i*2.4),1.65-i*.043,-.085-.015*Math.sin(i))),Array.from({length:9},(_,i)=>.028-i*.002),7);
  if(style==='waves')for(let i=0;i<5;i++)m.tube('wave','hair',[V(-.08+i*.04,1.68,-.025),V(-.06+i*.04,1.76,.022),V(-.08+i*.04,1.69,.082)],[.024,.027,.012],6);
}
function hood(m,up){
  if(!up){m.loft('folded_hood','primary',[[0,1.32,-.105,.12,.05],[0,1.38,-.117,.145,.08],[0,1.46,-.10,.085,.056]],10,.12);return}
  // Open hood lip traced in the image plane; successive rings retreat to a pointed back.
  const lip=[V(0,1.835,.036),V(.087,1.797,.073),V(.145,1.713,.109),V(.153,1.599,.113),V(.114,1.505,.095),V(0,1.447,.110),V(-.114,1.505,.095),V(-.153,1.599,.113),V(-.145,1.713,.109),V(-.087,1.797,.073)];
  const middle=lip.map(([x,y,z],i)=>V(x*1.12,y+.015,-.065-(i%2)*.011));
  const back=lip.map(([x,y])=>V(x*.42,1.63+(y-1.63)*.7,-.145));
  for(let i=0;i<lip.length;i++){
    const k=(i+1)%lip.length;
    // Bottom opening remains open over the neck; mantle covers the join.
    if(i===4||i===5)continue;
    m.quad('hood_shell','primary',lip[i],middle[i],middle[k],lip[k]);
    m.quad('hood_shell','primary',middle[i],back[i],back[k],middle[k]);
    m.tri('hood_back','primary',back[i],V(0,1.64,-.17),back[k]);
    const inset=p=>V(p[0]*.91,1.64+(p[1]-1.64)*.93,p[2]-.005);
    m.quad('hood_lining','lining',lip[i],lip[k],inset(lip[k]),inset(lip[i]));
  }
  m.ribbon('pattern_trim_hood','accent',lip.slice(0,5).map(p=>add(p,V(0,0,.003))),.014);
  m.ribbon('pattern_trim_hood','accent',[lip[0],...lip.slice(6).reverse()].map(p=>add(p,V(0,0,.003))),.014);
  m.diamond('pattern_border_hood','accent',0,1.797,.065,.024,.022);
}
function tunic(m,b,style){
  m.loft('inner_tunic','secondary',[[0,.89,0,b.hip,.12],[0,1.04,0,b.waist,.10],[0,1.19,0,b.waist*1.04,.12],[0,1.35,0,b.shoulder,.115],[0,1.44,0,.08,.058]],12,.05);
  // Diagonal overlapping front pieces, then independently tapered fabric tails.
  m.sheet('crossed_cloth','primary',[[V(-.12,1.41,.09),V(-.045,1.45,.08)],[V(-.10,1.28,.128),V(.015,1.30,.135)],[V(.02,1.14,.129),V(.12,1.17,.10)],[V(.10,1.06,.109),V(.16,1.08,.078)]]);
  for(const s of [-1,1]){
    const end=style==='narrow'?.60:style==='standard'?.52:.43;
    const w=style==='narrow'?.075:.13;
    const a=V(s*.018,1.04,.126),b1=V(s*b.hip,.99,.098),c=V(s*(.07+w),.76,.12),d=V(s*.075,end+(s<0?.09:0),.125),e=V(s*.026,.76,.151);
    m.tri('panel','primary',a,b1,e);m.tri('panel','primary',b1,c,e);m.tri('panel','primary',e,c,d);
    m.ribbon('pattern_trim_panel','accent',[add(b1,V(0,0,.005)),add(c,V(0,0,.005)),add(d,V(0,0,.005))],.012);
    if(style==='layered'){
      m.sheet('underpanel','secondary',[[V(s*.12,1.01,.08),V(s*.19,.99,.06)],[V(s*.11,.73,.104),V(s*.24,.73,.055)],[V(s*.07,.54,.12),V(s*.18,.48,.06)]]);
      m.diamond('pattern_border_panel','accent',s*.095,.68,.151,.022,.043);
    }
  }
  for(const s of [-1,1]){
    m.loft('sleeve','secondary',[[s*b.arm,1.11,0,.057,.054],[s*(b.arm-.008),1.20,-.005,.071,.064],[s*(b.shoulder*.95),1.34,0,.075,.075],[s*(b.shoulder*.75),1.40,0,.048,.06]],9,.12);
  }
}
function mantle(m,b,style){
  const end=style==='short'?.89:style==='split'?.37:.21;
  const rows=[
    [V(-.11,1.46,-.035),V(0,1.46,-.063),V(.12,1.46,-.035)],
    [V(-b.shoulder-.09,1.28,-.05),V(-.045,1.35,-.17),V(b.shoulder+.07,1.28,-.055)],
    [V(-.34,1.03,-.12),V(-.08,1.05,-.19),V(.27,1.04,-.13)],
    [V(-.29,.64+(end*.45),-.17),V(-.12,.63+(end*.45),-.23),V(.23,.73+(end*.4),-.17)],
    [V(-.34,end+.08,-.13),V(-.12,end,-.20),V(.21,end+.2,-.18)]
  ];
  if(style==='short')rows.splice(3,1);
  m.sheet('cloak_back','primary',rows);
  // Broad angled shoulder flap with visible folded planes.
  const p=[V(-.07,1.45,.075),V(-.26,1.36,.075),V(-.33,1.22,.082),V(-.20,1.19,.148),V(.025,1.36,.15)];
  m.tri('shoulder_mantle','primary',p[0],p[1],p[4]);m.tri('shoulder_mantle','primary',p[1],p[2],p[3]);m.tri('shoulder_mantle','primary',p[1],p[3],p[4]);
  m.ribbon('pattern_trim_mantle','accent',[p[2],p[3],p[4]].map(v=>add(v,V(0,0,.006))),.016);
  m.sheet('dark_mantle','secondary',[[V(-.055,1.42,.14),V(.10,1.45,.09),V(.18,1.39,.08)],[V(.025,1.34,.157),V(.17,1.32,.14),V(.28,1.28,.075)],[V(.08,1.29,.15),V(.20,1.24,.13),V(.27,1.19,.075)]]);
  m.diamond('clasp','metal',0,1.37,.17,.026,.026);
  m.ribbon('pattern_trim_cloak','accent',rows.map(r=>add(r[0],V(0,0,-.004))),.016);
  m.ribbon('pattern_trim_cloak','accent',rows.map(r=>add(r[2],V(0,0,-.004))),.016);
  m.ribbon('pattern_border_cloak','accent',rows.at(-1).map(p=>add(p,V(0,.019,-.004))),.016);
}
function trousers(m,b){
  for(const s of [-1,1])m.loft('folded_trousers','secondary',[[s*.105,.29,-.005,.06,.06],[s*.105,.37,-.018,.081,.068],[s*.12,.46,.006,.10,.086],[s*.10,.55,-.008,.095,.084],[s*.105,.66,.004,.11,.095],[s*.10,.80,-.005,.112,.107],[s*.09,.95,0,b.hip*.59,.105]],10,.18);
}
function belt(m,b,style){
  for(const [y,w] of [[1.05,.048],[1.00,.042]])m.loft('leather_belt','leather',[[0,y-w/2,0,b.waist+.025,.132],[0,y+w/2,0,b.waist+.026,.133]],12);
  m.diamond('belt_buckle','metal',.045,1.035,.146,.031,.026);
  if(style!=='minimal')for(const s of style==='utility'?[-1,1]:[-1]){
    const x=s*.19;
    m.loft('pouch','leather',[[x,.83,.097,.035,.025],[x,.86,.102,.063,.04],[x,.94,.105,.067,.041],[x,.99,.105,.053,.033]],8,.03);
    m.sheet('pouch_flap','leather',[[V(x-.05,.99,.148),V(x+.05,.99,.148)],[V(x-.048,.94,.155),V(x+.045,.94,.155)],[V(x-.02,.91,.155),V(x+.022,.91,.155)]]);
    m.diamond('pouch_clasp','metal',x,.94,.16,.01,.013);
  }
}
function wraps(m,b,style){
  for(const s of [-1,1]){
    const x=s*b.arm;
    m.loft('bracer','secondary',[[x,1.005,.004,.035,.034],[x,1.10,0,.05,.048],[x-s*.006,1.185,0,.058,.053]],9,.07);
    const n=style==='light'?2:style==='heavy'?5:3;
    for(let i=0;i<n;i++){const y=1.015+i*.15/n; m.loft('cloth_wrap','accent',[[x,y,0,.046+i*.002,.043+i*.002],[x,y+.017,0,.046+i*.002,.043+i*.002]],9,.035)}
  }
}
function boots(m,b,style){
  for(const s of [-1,1]){
    const x=s*.105;
    m.loft('boot_upper','secondary',[[x,.035,.045,.073,.128],[x,.07,.043,.072,.125],[x,.12,.020,.061,.088],[x,.19,-.005,.052,.058],[x,.31,-.005,.062,.06],[x,.35,-.006,.071,.066]],10,.06);
    m.loft('boot_sole','leather',[[x,.012,.047,.075,.13],[x,.035,.047,.075,.13]],10);
    if(style!=='light'){
      m.ribbon('boot_wrap','accent',[V(x-.051,.26,.048),V(x+.04,.21,.061),V(x-.035,.15,.074)],.014);
      m.diamond('boot_emblem','metal',x,.28,.063,.017,.027);
    }
    if(style==='reinforced')m.loft('boot_cuff','leather',[[x,.31,-.005,.071,.07],[x,.35,-.005,.073,.07]],10);
  }
}
function markings(m,style){
  for(const s of [-1,1]){
    if(style==='cheeks')m.ribbon('face_mark','accent',[V(s*.034,1.58,.099),V(s*.065,1.565,.084)],.007);
    if(style==='temple')m.ribbon('face_mark','accent',[V(s*.078,1.65,.066),V(s*.088,1.61,.052)],.007);
  }
  if(style==='brow')m.diamond('face_mark','accent',0,1.648,.099,.012,.018);
}
function glb(model){
  const materials=[],roleIndex=new Map(),meshes=[],nodes=[],views=[],accessors=[],chunks=[];
  let offset=0;
  function append(values,position){
    const data=new Uint8Array(values.length*4),dv=new DataView(data.buffer);
    values.forEach((v,i)=>dv.setFloat32(i*4,v,true));
    const view=views.length;views.push({buffer:0,byteOffset:offset,byteLength:data.length,target:34962});chunks.push(data);offset+=data.length;
    const a={bufferView:view,componentType:5126,count:values.length/3,type:'VEC3'};
    if(position){a.min=[Infinity,Infinity,Infinity];a.max=[-Infinity,-Infinity,-Infinity];values.forEach((v,i)=>{const k=i%3;a.min[k]=Math.min(a.min[k],v);a.max[k]=Math.max(a.max[k],v)})}
    accessors.push(a);return accessors.length-1;
  }
  for(const part of model.parts.values()){
    const {name,role,p,n}=part;if(!p.length)continue;
    if(!roleIndex.has(role)){roleIndex.set(role,materials.length);materials.push({name:role,doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[...colors[role],1],metallicFactor:role==='metal'?.3:0,roughnessFactor:.92},...(role==='eyes'?{emissiveFactor:[.05,.06,.07]}:{})})}
    const mesh=meshes.length;meshes.push({name,primitives:[{attributes:{POSITION:append(p,true),NORMAL:append(n,false)},material:roleIndex.get(role)}]});nodes.push({name,mesh});
  }
  const doc={asset:{version:'2.0',generator:'Eclipse traveler art blockout'},scene:0,scenes:[{nodes:nodes.map((_,i)=>i)}],nodes,meshes,materials,bufferViews:views,accessors,buffers:[{byteLength:offset}]};
  const str=JSON.stringify(doc),jsonLen=Math.ceil(str.length/4)*4,bytes=new Uint8Array(12+8+jsonLen+8+offset),d=new DataView(bytes.buffer);
  d.setUint32(0,0x46546c67,true);d.setUint32(4,2,true);d.setUint32(8,bytes.length,true);d.setUint32(12,jsonLen,true);d.setUint32(16,0x4e4f534a,true);bytes.fill(32,20,20+jsonLen);
  for(let i=0;i<str.length;i++)bytes[20+i]=str.charCodeAt(i);
  d.setUint32(20+jsonLen,offset,true);d.setUint32(24+jsonLen,0x004e4942,true);
  let pos=28+jsonLen;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length}
  return bytes;
}
export function generate(emit){
  const make=(path,fn)=>{const m=new Model();fn(m);emit(path+'.glb',glb(m))};
  for(const frame of ['male','female']){
    for(const shape of ['angular','soft','narrow']){
      make('head/'+frame+'/'+shape,m=>head(m,frame,shape));
      for(const mark of ['cheeks','brow','temple'])make('markings/'+frame+'/'+shape+'-'+mark,m=>markings(m,mark));
    }
    for(const build of ['slim','standard','athletic']){
      const delta=build==='slim'?0:build==='standard'?.013:.025;
      const b={shoulder:(frame==='female'?.185:.205)+delta,waist:.116+delta,hip:(frame==='female'?.176:.158)+delta*.5,arm:(frame==='female'?.253:.273)+delta};
      make('body/'+frame+'/'+build,m=>body(m,b));
      const p='garments/'+frame+'/'+build+'/';
      for(const up of [true,false])make(p+'hood-'+(up?'up':'down'),m=>hood(m,up));
      for(const s of ['short','split','wrapped'])make(p+'mantle-'+s,m=>mantle(m,b,s));
      for(const s of ['narrow','standard','layered'])make(p+'tunic-'+s,m=>tunic(m,b,s));
      make(p+'trousers',m=>trousers(m,b));
      for(const s of ['minimal','pouch','utility'])make(p+'belt-'+s,m=>belt(m,b,s));
      for(const s of ['light','standard','heavy'])make(p+'wraps-'+s,m=>wraps(m,b,s));
      for(const s of ['light','traveler','reinforced'])make(p+'boots-'+s,m=>boots(m,b,s));
    }
  }
  for(const s of ['cropped','sweep','spiked','side-part','braid','bob','long','topknot','waves','twin-braids','locs'])make('hair/'+s,m=>hair(m,s));
}
const root=process.argv[2]||'assets/characters';
let count=0,retained=0;
generate((path,bytes)=>{
  const target=join(root,path);if(existsSync(target)){retained++;return}
  mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes);count++;
});
console.log('Eclipse: '+count+' blockout GLBs generated; '+retained+' authored/existing GLBs retained.');
