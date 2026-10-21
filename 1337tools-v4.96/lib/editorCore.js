export const RATIOS={
  '1 / 1':{label:'1:1',width:1200,height:1200},
  '4 / 5':{label:'4:5',width:1200,height:1500},
  '9 / 16':{label:'9:16',width:1080,height:1920},
  '16 / 9':{label:'16:9',width:1920,height:1080},
  '3 / 2':{label:'3:2',width:1800,height:1200},
};

export const blends=['normal','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','hard-light','soft-light','difference','exclusion'];
export const shapes=['rect','circle','triangle','star','cross','line'];
export const fonts=[
  ['Arial, Helvetica, sans-serif','Arial'],
  ['Arial Black, Arial, Helvetica, sans-serif','Arial Black'],
  ['Helvetica, Arial, sans-serif','Helvetica'],
  ['Helvetica Neue, Helvetica, Arial, sans-serif','Helvetica Neue'],
  ['Golos Text, Arial, sans-serif','Golos Text'],
  ['IBM Plex Sans, Arial, sans-serif','IBM Plex Sans'],
  ['IBM Plex Mono, monospace','IBM Plex Mono'],
  ['JetBrains Mono, monospace','JetBrains Mono'],
  ['Roboto Condensed, Arial, sans-serif','Roboto Condensed'],
  ['Commissioner, Arial, sans-serif','Commissioner'],
  ['Unbounded, Arial, sans-serif','Unbounded'],
  ['Archivo Black, Arial Black, Arial, sans-serif','Archivo Black'],
  ['Space Mono, monospace','Space Mono']
];

export const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export const randSigned=()=>Math.random()*2-1;
export const snap=(layers,selectedIds,primaryId,canvas={})=>JSON.stringify({layers,selectedIds,primaryId,...canvas});

export function nextOrder(layers){return Math.max(0,...layers.map(l=>Number.isFinite(l.order)?l.order:0))+1}
export function normalizeOrder(layers){return [...layers].sort((a,b)=>(a.order||0)-(b.order||0)).map((l,i)=>({...l,order:i+1}))}

export function hashSeed(value){
  let h=2166136261>>>0; const s=String(value);
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0;
}
export function mulberry32(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

export function rotatedAabb(l,canvasAspect=1){
  const aspect=Math.max(.01,+canvasAspect||1),cx=(+l.x||0)*aspect,cy=+l.y||0,hw=(+l.width||0)*aspect/2,hh=(+l.height||0)/2,a=(+l.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  const pts=[[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].map(([x,y])=>({x:(cx+x*c-y*s)/aspect,y:cy+x*s+y*c}));
  const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
  return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
}
export function getBounds(items,canvasAspect=1){
  if(!items.length)return null;let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const l of items){const b=rotatedAabb(l,canvasAspect);minX=Math.min(minX,b.minX);maxX=Math.max(maxX,b.maxX);minY=Math.min(minY,b.minY);maxY=Math.max(maxY,b.maxY)}
  return {minX,minY,maxX,maxY,cx:(minX+maxX)/2,cy:(minY+maxY)/2,width:Math.max(.1,maxX-minX),height:Math.max(.1,maxY-minY)};
}
export function intersectsMarquee(l,m,canvasAspect=1){const b=rotatedAabb(l,canvasAspect);return b.maxX>=m.x&&b.minX<=m.x+m.w&&b.maxY>=m.y&&b.minY<=m.y+m.h}
