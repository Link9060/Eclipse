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
    m.tube('brow','shadow',[V(x-s*.022,1.627,.097),V(x+s*.023,1.636,.082)],[.010,.005]);
    m.tube('ear','skin',[V(s*w*.86,1.55,-.013),V(s*(w+.014),1.62,-.012),V(s*w,1.64,-.018)],[.02,.022,.008]);
  }
  m.ribbon('mouth','shadow',[V(-.022,1.536,.093),V(0,1.531,.099),V(.022,1.536,.093)],.005);
}
function hair(m,style){
  // Continuous sculpted scalp with directional grooves and an irregular edge.
  const crop=style==='cropped',spike=style==='spiked',wave=style==='waves',part=style==='side-part';
  const long=style==='long',bob=style==='bob',braided=style==='braid'||style==='twin-braids',locs=style==='locs',knot=style==='topknot';
  const center=V(-.005,1.635,-.009),mix=(a,b,t)=>a+(b-a)*t;
  function surface(phi,t){
    const front=Math.max(0,Math.sin(phi)),back=Math.max(0,-Math.sin(phi));
    const a=phi+(part?.56:crop?.12:.30)*t;
    const groove=.5+.5*Math.cos(phi*(crop?20:13)+.65*Math.sin(phi*3));
    let end=1.48-.53*front+.40*back;
    if(crop)end=1.39-.43*front+.30*back;
    if(bob||long||locs)end+=.14*(1-front);
    if(braided||knot)end-=.12*back;
    if(!crop)end+=.16*Math.pow(groove,3)*(.45+.55*front);
    const theta=.006+(end-.006)*t;
    const volume=(crop?.006:.014)*Math.sin(theta);
    const ridge=(crop?.002:.006)*Math.pow(Math.sin(PI*t*.92),.65)*(groove-.38);
    const waviness=wave?.006*Math.sin(t*8+phi*4)*Math.sin(PI*t):0;
    const peak=spike?.025*Math.pow(groove,3)*Math.sin(PI*t):0;
    return V(center[0]+(.103+volume+ridge+waviness)*Math.sin(theta)*Math.cos(a)-.008*(1-t),
      center[1]+(.130+volume*.4)*Math.cos(theta)+peak+.003*Math.sin(phi*4)*Math.sin(PI*t),
      center[2]+(.109+volume+ridge+waviness)*Math.sin(theta)*Math.sin(a));
  }
  m.sheet('crown','hair',Array.from({length:15},(_,j)=>Array.from({length:65},(_,i)=>surface(tau*i/64,j/14))));
  if(crop)return;
  function lock(name,a,b,c,d,width,depth){
    const pts=Array.from({length:9},(_,i)=>{const t=i/8,u=1-t;return add(add(mul(a,u*u*u),mul(b,3*u*u*t)),add(mul(c,3*u*t*t),mul(d,t*t*t)))});
    const rings=pts.map((p,j)=>{
      const tangent=unit(sub(pts[Math.min(j+1,8)],pts[Math.max(j-1,0)]));
      let side=unit(cross(tangent,unit(sub(p,center))));if(Math.hypot(...side)<.1)side=V(1,0,0);
      const normal=unit(cross(side,tangent)),t=j/8;
      const w=width*(.78+.42*Math.sin(PI*t))*Math.pow(1-t*.995,.68),h=depth*(.75+.35*Math.sin(PI*t))*Math.pow(1-t*.995,.62);
      return Array.from({length:9},(_,i)=>add(p,add(mul(side,Math.cos(tau*i/8)*w),mul(normal,Math.sin(tau*i/8)*h))));
    });
    m.sheet(name,'hair',rings);
  }
  if(!braided&&!knot&&!locs){
    const fringe=[[-.062,-.097,1.625],[-.04,-.066,1.598],[-.01,-.024,1.613],[.016,.047,1.626],[.041,.081,1.65],[.065,.102,1.666]];
    for(let i=0;i<fringe.length;i++){
      let [x,tip,y]=fringe[i];if(part){tip=x+.048;y+=.013}
      const a=V(x*.72,1.733-Math.abs(x)*.16,.039),b=V(x*.85,1.742,.086);
      let c=V(tip*.7,1.676,.113),d=V(tip,y,.101-Math.abs(tip)*.18);
      if(spike){c=V(x*1.2,1.768,.088);d=V(x*1.5,1.79+.018*Math.sin(i*1.7),.052+.018*Math.cos(i))}
      if(wave){c=V(tip*.72,1.69,.12);d[1]+=.012*Math.sin(i*2)}
      lock('fringe',a,b,c,d,.025+(i%2)*.005,.009);
    }
  }
  for(const sign of [-1,1]){
    const count=long||bob?5:2;
    for(let i=0;i<count;i++){
      const phi=sign===1?-.08-i*.30:PI+.08+i*.30;
      const a=surface(phi,.43),b=surface(phi,.76),c=surface(phi,.99);
      const y=long?1.32+i*.035:bob?1.49+i*.014:1.59+i*.023;
      lock('side_lock',a,b,add(c,V(sign*.005,0,0)),V(sign*(.103+i*.004),y,c[2]-.016),.020,.009);
    }
  }
  if(long||bob)for(let i=0;i<9;i++){
    const phi=PI+i*PI/8,a=surface(phi,.45),b=surface(phi,.78),c=surface(phi,.98);
    lock('nape_lock',a,b,add(c,V(0,-.08,-.010)),V(c[0]*1.08,(long?1.30:1.49)+.018*Math.cos(i*1.9),Math.min(c[2]-.020,-.085)),.022,.012);
  }
  if(knot)m.loft('knot','hair',[[0,1.69,-.085,.026,.028],[0,1.75,-.111,.042,.042],[.009,1.787,-.116,.04,.037],[.015,1.807,-.11,.017,.018]],14,.08);
  if(braided)for(const x of style==='braid'?[0]:[-.061,.061])for(let strand=0;strand<3;strand++){
    const pts=Array.from({length:35},(_,i)=>{const t=i/34,a=t*tau*3+strand*tau/3;return V(x+Math.cos(a)*.015*(1-t*.55),1.55-t*.27,-.112+Math.sin(a)*.015*(1-t*.55))});
    m.tube('braid','hair',pts,pts.map((_,i)=>.0105*(1-i/43)),8);
  }
  if(locs)for(let i=0;i<11;i++){
    const phi=PI+i*PI/10,a=surface(phi,.55),b=surface(phi,.94);
    const pts=Array.from({length:12},(_,j)=>{const t=j/11;return V(mix(a[0],b[0]*1.14,t)+.004*Math.sin(t*5+i),mix(a[1],1.43+(i%3)*.022,t),mix(a[2],b[2]*1.12,t))});
    m.tube('loc','hair',pts,pts.map((_,j)=>.012-j*.00045),8);
  }
}
function hood(m,up){
  if(!up){
    const rows=Array.from({length:6},(_,j)=>Array.from({length:29},(_,i)=>{
      const a=PI*.04+PI*.92*i/28,t=j/5;
      return V((.15-.034*t)*Math.cos(a),1.415-.09*t+.017*Math.cos(a*2)+.009*Math.sin(a*5+t*4),-.042-(.144+.025*Math.sin(PI*t))*Math.sin(a));
    }));
    m.sheet('folded_hood','primary',rows);
    m.sheet('folded_hood_lining','lining',rows.map(row=>row.map(p=>V(p[0]*.96,p[1]+.004,p[2]+.006))));
    m.ribbon('folded_hood_trim','accent',rows[0].map(p=>add(p,V(0,.003,-.005))),.009);
    return
  }
  // Open hood lip traced in the image plane; successive rings retreat to a pointed back.
  const lip=[V(-.012,1.849,.052),V(.061,1.821,.072),V(.117,1.763,.101),V(.143,1.688,.119),V(.142,1.586,.121),V(.113,1.497,.103),V(0,1.444,.104),V(-.112,1.497,.103),V(-.147,1.586,.121),V(-.144,1.688,.117),V(-.117,1.766,.098),V(-.073,1.819,.066)];
  const middle=lip.map(([x,y,z],i)=>V(x*1.12,y+.015,-.065-(i%2)*.011));
  const back=lip.map(([x,y])=>V(x*.42,1.63+(y-1.63)*.7,-.145));
  for(let i=0;i<lip.length;i++){
    const k=(i+1)%lip.length;
    // Bottom opening remains open over the neck; mantle covers the join.
    if(i===5||i===6)continue;
    m.quad('hood_shell','primary',lip[i],middle[i],middle[k],lip[k]);
    m.quad('hood_shell','primary',middle[i],back[i],back[k],middle[k]);
    m.tri('hood_back','primary',back[i],V(0,1.64,-.17),back[k]);
    const inset=p=>V(p[0]*.91,1.64+(p[1]-1.64)*.93,p[2]-.005);
    m.quad('hood_lining','lining',lip[i],lip[k],inset(lip[k]),inset(lip[i]));
    const innerMid=p=>V(p[0]*.93,1.64+(p[1]-1.64)*.94,p[2]+.008);
    m.quad('hood_inside','lining',inset(lip[i]),inset(lip[k]),innerMid(middle[k]),innerMid(middle[i]));
    m.quad('hood_inside','lining',innerMid(middle[i]),innerMid(middle[k]),innerMid(back[k]),innerMid(back[i]));
  }
  m.ribbon('pattern_trim_hood','accent',lip.slice(0,6).map(p=>add(p,V(0,0,.003))),.014);
  m.ribbon('pattern_trim_hood','accent',[lip[0],...lip.slice(7).reverse()].map(p=>add(p,V(0,0,.003))),.014);
  m.diamond('pattern_border_hood','accent',0,1.797,.065,.024,.022);
}
function tunic(m,b,style){
  m.loft('inner_tunic','secondary',[[0,.91,0,b.hip,.12],[0,1.04,0,b.waist,.10],[0,1.19,0,b.waist*1.04,.12],[0,1.35,0,b.shoulder,.115],[0,1.44,0,.08,.058]],16,.035);
  // Diagonal cloth overlay follows the torso with a clear front offset.
  m.sheet('crossed_cloth','primary',[[V(-.12,1.41,.125),V(-.045,1.45,.114)],[V(-.10,1.28,.151),V(.015,1.30,.154)],[V(.02,1.14,.145),V(.12,1.17,.131)],[V(.10,1.06,.139),V(.16,1.08,.112)]]);
  for(const side of [-1,1]){
    const end=(style==='narrow'?.64:style==='standard'?.56:.46)+(side<0?.08:0);
    const width=style==='narrow'?.115:.155;
    function panel(u,t,outer){
      const x=side*(.023+.055*t+u*width*(1-.64*Math.pow(t,5)));
      const y=1.017+(end-1.017)*t+.035*u*t;
      // Loose front cloth remains outside the trousers; inner panels are laterally offset.
      const release=Math.min(1,t*5);
      const root=outer?.151:.130;
      const z=root+((outer?.205:.169)-root)*release+.014*Math.sin(u*PI*2)*Math.sin(PI*t)+.019*t;
      return V(x+(outer?0:side*.045),y+(outer?0:-.025),z);
    }
    const grid=Array.from({length:12},(_,j)=>Array.from({length:9},(_,i)=>panel(i/8,j/11,true)));
    m.sheet('panel','primary',grid);
    m.ribbon('pattern_trim_panel','accent',grid.map(row=>add(row[8],V(0,0,.006))),.010);
    if(style==='layered'){
      const under=Array.from({length:12},(_,j)=>Array.from({length:9},(_,i)=>panel(i/8,j/11,false)));
      m.sheet('underpanel','secondary',under);
      m.ribbon('pattern_trim_panel','accent',under.map(row=>add(row[8],V(0,0,.006))),.007);
    }
  }
  for(const side of [-1,1]){
    m.loft('sleeve','secondary',[[side*b.arm,1.14,0,.058,.054],[side*(b.arm-.008),1.22,-.005,.066,.064],[side*(b.shoulder*.95),1.34,0,.072,.073],[side*(b.shoulder*.75),1.40,0,.048,.06]],14,.055);
  }
}
function mantle(m,b,style){
  const end=style==='short'?.94:style==='split'?.40:.22;
  // Wrapped outer cloak: continuous folds, no separate overlapping side sheet.
  // Its surface stays behind the arms and legs except at the collar attachment.
  function drape(u,t){
    const theta=PI+.20+u*(PI-.40);
    const shoulder=Math.sin(Math.min(1,t*5)*PI/2);
    const rx=.102+(b.shoulder+.15-.102)*shoulder+.032*t;
    const rz=.10+.12*shoulder+.035*t;
    const pleat=(.009+.027*t)*Math.sin(u*PI*10+.5*Math.sin(t*4));
    const hem=end+.10*Math.cos(u*PI*1.2)+.045*Math.sin(u*PI*5);
    return V((rx+pleat)*Math.cos(theta),1.46+(hem-1.46)*t-.045*shoulder*Math.abs(Math.cos(theta)),(rz+pleat)*Math.sin(theta)-.055*shoulder);
  }
  const rows=Array.from({length:19},(_,j)=>Array.from({length:25},(_,i)=>drape(i/24,j/18)));
  m.sheet('cloak_back','primary',rows);
  // Lining is offset on the interior and shares the identical fold topology.
  m.sheet('cloak_lining','lining',rows.map(row=>row.map(p=>V(p[0]*.987,p[1],p[2]+.007))));
  for(const u of [0,1]){
    const edge=rows.map(row=>row[u===0?0:24]);
    m.ribbon('pattern_trim_cloak','accent',edge.map(p=>add(p,V(0,0,-.006))),.013);
  }
  const hem=rows.at(-1).map(p=>add(p,V(0,.013,-.008)));
  m.ribbon('pattern_trim_cloak','accent',hem,.013);
  // Shoulder cape is separated from sleeves and torso by an intentional air gap.
  for(const side of [-1,1]){
    const role=side<0?'primary':'secondary';
    const grid=Array.from({length:6},(_,j)=>Array.from({length:9},(_,i)=>{
      const t=j/5,u=i/8, a=-.45+u*(PI*.80);
      const x=side*(.035+(b.shoulder+.115-.035)*t)*Math.sin(a+.6);
      const y=1.452-.20*t-.025*u+.010*Math.sin(t*PI*3);
      const z=.105+.075*Math.sin(a)-.015*t+.009*Math.sin(u*PI*5)*t;
      return V(x,y,z);
    }));
    m.sheet('shoulder_mantle',role,grid);
    if(side<0)m.ribbon('pattern_trim_mantle','accent',grid.at(-1).map(p=>add(p,V(0,0,.009))),.012);
  }
  m.diamond('clasp','metal',0,1.38,.197,.024,.026);
  m.diamond('clasp_inner','accent',0,1.38,.200,.011,.014);
}
function trousers(m,b){
  for(const s of [-1,1])m.loft('folded_trousers','secondary',[[s*.105,.29,-.005,.06,.06],[s*.105,.37,-.018,.081,.068],[s*.12,.46,.006,.10,.086],[s*.10,.55,-.008,.095,.084],[s*.105,.66,.004,.11,.095],[s*.10,.80,-.005,.112,.107],[s*.09,.95,0,b.hip*.59,.105]],10,.18);
}
function belt(m,b,style){
  for(const [y,w] of [[1.05,.048],[1.00,.042]])m.loft('leather_belt','leather',[[0,y-w/2,0,b.waist+.031,.155],[0,y+w/2,0,b.waist+.032,.156]],12);
  m.diamond('belt_buckle','metal',.045,1.035,.167,.031,.026);
  if(style!=='minimal')for(const s of style==='utility'?[-1,1]:[-1]){
    const x=s*.195;
    m.loft('pouch','leather',[[x,.83,.205,.035,.025],[x,.86,.21,.063,.04],[x,.94,.215,.067,.041],[x,.99,.215,.053,.033]],8,.03);
    m.sheet('pouch_flap','leather',[[V(x-.05,.99,.258),V(x+.05,.99,.258)],[V(x-.048,.94,.265),V(x+.045,.94,.265)],[V(x-.02,.91,.265),V(x+.022,.91,.265)]]);
    m.diamond('pouch_clasp','metal',x,.94,.270,.01,.013);
  }
}
function wraps(m,b,style){
  for(const s of [-1,1]){
    const x=s*b.arm;
    m.loft('bracer','secondary',[[x,1.005,.004,.035,.034],[x,1.10,0,.05,.048],[x-s*.006,1.185,0,.058,.053]],9,.07);
    const n=style==='light'?2:style==='heavy'?5:3;
    for(let i=0;i<n;i++){const y=1.015+i*.15/n; const q=(y-1.005)/.18,rx=.040+.026*q,rz=.039+.024*q;m.loft('cloth_wrap','accent',[[x-.006*q,y,0,rx,rz],[x-.006*q,y+.017,0,rx+.002,rz+.002]],14,.025)}
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
