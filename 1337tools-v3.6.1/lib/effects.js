import {hashSeed,mulberry32,clamp} from './editorCore';

export const fx0={exposure:0,contrast:100,saturation:100,grayscale:0,blur:0,threshold:0,grain:0,noise:0,scratches:0,halftone:0,xerox:0,fade:0};

const svgUri=svg=>`url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
const bgCache=new Map();
function cached(key,make){if(bgCache.has(key))return bgCache.get(key);const value=make();bgCache.set(key,value);if(bgCache.size>160)bgCache.delete(bgCache.keys().next().value);return value}

export function dotNoiseSpec(seedValue,amount){
  const rnd=mulberry32(hashSeed(`${seedValue}:noise`)),count=Math.round(35+amount*5.2),maxR=.25+amount/100*1.15,items=[];
  for(let i=0;i<count;i++)items.push({x:rnd()*100,y:rnd()*100,r:.12+rnd()*maxR,dark:rnd()>.36,opacity:.12+rnd()*.72});
  return items;
}
export function dotNoiseBackground(seedValue,amount){
  if(!amount)return 'none';
  return cached(`noise:${seedValue}:${amount}`,()=>{const nodes=dotNoiseSpec(seedValue,amount).map(p=>`<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${p.r.toFixed(2)}" fill="${p.dark?'#000':'#fff'}" opacity="${p.opacity.toFixed(2)}"/>`).join('');return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">${nodes}</svg>`)});
}

export function scratchSpec(seedValue,amount){
  const rnd=mulberry32(hashSeed(`${seedValue}:scratches`)),count=Math.round(4+amount*.9),items=[];
  for(let i=0;i<count;i++){
    const x=rnd()*110-5,y=rnd()*110-5,len=4+rnd()*(16+amount*.55),ang=(-35+rnd()*70)*Math.PI/180;
    const width=.08+rnd()*(.18+amount/100*.8),opacity=.16+rnd()*.68,color=rnd()>.28?'#fff':'#000',cap=rnd()>.5?'round':'square';
    items.push({x1:x,y1:y,x2:x+Math.cos(ang)*len,y2:y+Math.sin(ang)*len,width,opacity,color,cap});
    if(rnd()>.82){
      const off=.4+rnd()*1.4;
      items.push({x1:x+off,y1:y+off*.2,x2:x+Math.cos(ang)*len+off,y2:y+Math.sin(ang)*len+off*.2,width:Math.max(.05,width*.45),opacity:opacity*.55,color,cap});
    }
  }
  return items;
}
export function scratchBackground(seedValue,amount){
  if(!amount)return 'none';
  return cached(`scratch:${seedValue}:${amount}`,()=>{const nodes=scratchSpec(seedValue,amount).map(p=>`<line x1="${p.x1.toFixed(2)}" y1="${p.y1.toFixed(2)}" x2="${p.x2.toFixed(2)}" y2="${p.y2.toFixed(2)}" stroke="${p.color}" stroke-width="${p.width.toFixed(2)}" opacity="${p.opacity.toFixed(2)}" stroke-linecap="${p.cap}"/>`).join('');return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">${nodes}</svg>`)});
}

export function grainBackground(){return cached('grain',()=>{
  const nodes=[];
  for(let y=3;y<100;y+=6)for(let x=3;x<100;x+=6)nodes.push(`<circle cx="${x}" cy="${y}" r=".72" fill="#fff" opacity=".8"/>`);
  for(let y=4.5;y<100;y+=9)for(let x=4.5;x<100;x+=9)nodes.push(`<circle cx="${x}" cy="${y}" r=".82" fill="#000" opacity=".7"/>`);
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">${nodes.join('')}</svg>`);
})}
export function halftoneBackground(){return cached('halftone',()=>{
  const nodes=[];
  for(let y=4;y<100;y+=8)for(let x=4;x<100;x+=8)nodes.push(`<circle cx="${x}" cy="${y}" r="1.6" fill="#000"/>`);
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">${nodes.join('')}</svg>`);
})}
export function xeroxBackground(){return cached('xerox',()=>{
  const nodes=[];
  for(let y=1;y<100;y+=4)nodes.push(`<line x1="0" y1="${y}" x2="100" y2="${y}" stroke="#000" stroke-width="1" opacity=".16"/>`);
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">${nodes.join('')}</svg>`);
})}

export async function experimentalCutout(src,seedValue=Math.random()*1e9){
  const img=await loadImage(src),max=1400,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
  const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale)),c=document.createElement('canvas');
  c.width=w;c.height=h;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);
  const im=ctx.getImageData(0,0,w,h),d=im.data,rnd=mulberry32(hashSeed(seedValue));
  const pts=[[2,2],[w-3,2],[2,h-3],[w-3,h-3],[Math.floor(w/2),2],[Math.floor(w/2),h-3],[2,Math.floor(h/2)],[w-3,Math.floor(h/2)]];
  const bg=pts.reduce((a,[x,y])=>{const i=(clamp(y,0,h-1)*w+clamp(x,0,w-1))*4;return [a[0]+d[i],a[1]+d[i+1],a[2]+d[i+2]]},[0,0,0]).map(v=>v/pts.length);
  const tol=52+rnd()*42,soft=24+rnd()*45,rough=5+rnd()*22;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=(y*w+x)*4,dist=Math.hypot(d[i]-bg[0],d[i+1]-bg[1],d[i+2]-bg[2]);
    const wave=(Math.sin(x*.071+seedValue*.000001)+Math.sin(y*.053+seedValue*.000003))*rough*.25;
    const jitter=(rnd()-.5)*rough*.55,edge=tol+wave+jitter;
    if(dist<edge)d[i+3]=0;else if(dist<edge+soft)d[i+3]=Math.round(255*(dist-edge)/soft);
  }
  ctx.putImageData(im,0,0);return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('PNG encode failed')),'image/png'));
}

function loadImage(src){return new Promise((res,rej)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>res(i);i.onerror=rej;i.src=src})}
