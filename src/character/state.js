// Character schema shared by the creator and future gameplay.
export const options = Object.freeze({
  frame:['Male','Female'],
  height:['Short','Medium','Tall'],
  build:['Slim','Standard','Athletic'],
  faceShape:['Angular','Soft','Narrow'],
  skinTone:['Obsidian','Ash','Slate','Midnight'],
  markings:['None','Cheeks','Brow','Temple'],
  eyeGlow:['Off','Faint','Bright'],
  hair:['Cropped','Sweep','Spiked','Side part','Braid','Bob','Long','Topknot','Shaved','Waves','Twin braids','Locs'],
  hairColor:['White','Ivory','Silver'],
  hood:['Up','Down'],
  cloakPattern:['None','Trim','Full border'],
  mantleStyle:['Short','Split','Wrapped'],
  tunicStyle:['Narrow','Standard','Layered'],
  beltStyle:['Minimal','Pouch','Utility'],
  wrapDensity:['Light','Standard','Heavy'],
  bootStyle:['Light','Traveler','Reinforced']
});
export const palettes = {
  primary:'#e1dbd1', secondary:'#29272c', accent:'#b2a79a', metal:'#98918b'
};
export const defaults = Object.freeze({
  version:2,name:'',frame:'Male',height:'Medium',build:'Slim',
  faceShape:'Angular',skinTone:'Obsidian',markings:'Cheeks',eyeGlow:'Faint',
  hair:'Sweep',hairColor:'White',hood:'Up',cloakPattern:'Trim',
  mantleStyle:'Wrapped',tunicStyle:'Layered',beltStyle:'Pouch',
  wrapDensity:'Standard',bootStyle:'Traveler',palette:palettes,
  kit:'concordant-traveler',garmentStage:1
});
export const storageKey='eclipse.character.v2';
export function normalize(raw={}){
  const out={...defaults,palette:{...palettes}};
  for(const [key,values] of Object.entries(options)){
    if(values.includes(raw?.[key]))out[key]=raw[key];
  }
  if(typeof raw?.name==='string')out.name=raw.name.slice(0,32);
  for(const key of Object.keys(palettes)){
    const value=raw?.palette?.[key];
    if(typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value))out.palette[key]=value;
  }
  return out;
}
export function loadCharacter(storage=globalThis.localStorage){
  try{return normalize(JSON.parse(storage.getItem(storageKey)||storage.getItem('eclipse.character.v1')||'{}'))}
  catch{return normalize()}
}
export function saveCharacter(state,storage=globalThis.localStorage){
  try{storage.setItem(storageKey,JSON.stringify(normalize(state)));return true}catch{return false}
}
export const skinColors={Obsidian:'#232229',Ash:'#45434a',Slate:'#383e47',Midnight:'#191d2b'};
export const hairColors={White:'#f4f0eb',Ivory:'#e1d9c9',Silver:'#bfc3c9'};
export const slug=value=>value.toLowerCase().replaceAll(' ','-');
// All files share a world-space origin, skeleton and rest pose. URLs are relative to this module,
// so GitHub Pages project subpaths work without a custom domain.
const asset=(path)=>new URL('../../assets/characters/'+path+'.glb',import.meta.url).href;
export function resolveSlots(state){
  const frame=slug(state.frame),build=slug(state.build);
  return [
    {id:'body',url:asset('body/'+frame+'/'+build),required:true},
    {id:'head',url:asset('head/'+frame+'/'+slug(state.faceShape)),required:true},
    ...(state.hair==='Shaved'?[]:[{id:'hair',url:asset('hair/'+slug(state.hair)),required:true}]),
    {id:'hood',url:asset('garments/'+frame+'/'+build+'/hood-'+slug(state.hood)),required:true},
    {id:'mantle',url:asset('garments/'+frame+'/'+build+'/mantle-'+slug(state.mantleStyle)),required:true},
    {id:'tunic',url:asset('garments/'+frame+'/'+build+'/tunic-'+slug(state.tunicStyle)),required:true},
    {id:'trousers',url:asset('garments/'+frame+'/'+build+'/trousers'),required:true},
    {id:'belt',url:asset('garments/'+frame+'/'+build+'/belt-'+slug(state.beltStyle)),required:true},
    {id:'wraps',url:asset('garments/'+frame+'/'+build+'/wraps-'+slug(state.wrapDensity)),required:true},
    {id:'boots',url:asset('garments/'+frame+'/'+build+'/boots-'+slug(state.bootStyle)),required:true},
    ...(state.markings==='None'?[]:[{id:'markings',url:asset('markings/'+frame+'/'+slug(state.faceShape)+'-'+slug(state.markings)),required:true}])
  ];
}
