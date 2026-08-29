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
  ['Arial, sans-serif','Arial'],['Inter, sans-serif','Inter'],['Oswald, sans-serif','Oswald'],['PT Sans, sans-serif','PT Sans'],['PT Serif, serif','PT Serif'],['Russo One, sans-serif','Russo One'],['Caveat, cursive','Caveat'],['Marck Script, cursive','Marck Script'],['Bad Script, cursive','Bad Script'],['Neucha, cursive','Neucha']
];

export const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export const randSigned=()=>Math.random()*2-1;
export const snap=(layers,selectedIds,primaryId)=>JSON.stringify({layers,selectedIds,primaryId});

export function nextOrder(layers){return Math.max(0,...layers.map(l=>Number.isFinite(l.order)?l.order:0))+1}
export function normalizeOrder(layers){return [...layers].sort((a,b)=>(a.order||0)-(b.order||0)).map((l,i)=>({...l,order:i+1}))}

export function hashSeed(value){
  let h=2166136261>>>0; const s=String(value);
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
  return h>>>0;
}
export function mulberry32(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

export function rotatedAabb(l){
  const hw=l.width/2,hh=l.height/2,a=(l.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  const pts=[[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].map(([x,y])=>({x:l.x+x*c-y*s,y:l.y+x*s+y*c}));
  const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
  return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
}
export function getBounds(items){
  if(!items.length)return null;let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const l of items){const b=rotatedAabb(l);minX=Math.min(minX,b.minX);maxX=Math.max(maxX,b.maxX);minY=Math.min(minY,b.minY);maxY=Math.max(maxY,b.maxY)}
  return {minX,minY,maxX,maxY,cx:(minX+maxX)/2,cy:(minY+maxY)/2,width:Math.max(.1,maxX-minX),height:Math.max(.1,maxY-minY)};
}
export function intersectsMarquee(l,m){const b=rotatedAabb(l);return b.maxX>=m.x&&b.minX<=m.x+m.w&&b.maxY>=m.y&&b.minY<=m.y+m.h}
