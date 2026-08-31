import {hashSeed,mulberry32,clamp} from './editorCore';

export const fx0={
  exposure:0,contrast:100,saturation:100,grayscale:0,blur:0,
  threshold:0,grain:0,noise:0,scratches:0,
  halftone:0,halftoneSize:16,halftoneDensity:55,halftoneOpacity:85,halftoneAngle:0,halftoneColor:'#000000',
  xerox:0,fade:0
};

const svgUri=svg=>`url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
const bgCache=new Map();
function cached(key,make){if(bgCache.has(key))return bgCache.get(key);const value=make();bgCache.set(key,value);if(bgCache.size>220)bgCache.delete(bgCache.keys().next().value);return value}

export function dotNoiseSpec(seedValue,amount){
  const rnd=mulberry32(hashSeed(`${seedValue}:noise`)),count=Math.round(220+amount*14),items=[];
  for(let i=0;i<count;i++){
    const mono=rnd()>.48;
    items.push({
      x:rnd()*100,
      y:rnd()*100,
      r:.03+rnd()*(.06+amount/100*.1),
      color:mono?'#000':'#fff',
      opacity:.04+rnd()*(.1+amount/100*.18)
    });
  }
  return items;
}
export function dotNoiseBackground(seedValue,amount){
  if(!amount)return 'none';
  return cached(`noise:${seedValue}:${amount}`,()=>{
    const nodes=dotNoiseSpec(seedValue,amount).map(p=>`<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${p.r.toFixed(3)}" fill="${p.color}" opacity="${p.opacity.toFixed(3)}"/>`).join('');
    return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">${nodes}</svg>`)
  });
}

export function halftoneSpec(seedValue,amount,opts={}){
  if(!amount)return [];
  const rnd=mulberry32(hashSeed(`${seedValue}:halftone`));
  const size=clamp(+opts.size||16,2,40);
  const density=clamp(+opts.density||55,5,100);
  const angle=(+opts.angle||0)*Math.PI/180;
  const color=opts.color||'#000000';
  const step=clamp(14-(density/100)*10,4,18);
  const base=.35+size*.06;
  const items=[];
  for(let py=-6;py<=106;py+=step){
    for(let px=-6;px<=106;px+=step){
      const jitter=(amount/100)*.24;
      const jx=(rnd()-.5)*step*jitter, jy=(rnd()-.5)*step*jitter;
      const x=px+jx, y=py+jy;
      const rx=50+(x-50)*Math.cos(angle)-(y-50)*Math.sin(angle);
      const ry=50+(x-50)*Math.sin(angle)+(y-50)*Math.cos(angle);
      items.push({x:rx,y:ry,r:base,color,opacity:1});
    }
  }
  return items;
}
export function halftoneBackground(seedValue,amount,opts={}){
  if(!amount)return 'none';
  const key=`halftone:${seedValue}:${amount}:${opts.size||16}:${opts.density||55}:${opts.angle||0}:${opts.color||'#000'}`;
  return cached(key,()=>{
    const nodes=halftoneSpec(seedValue,amount,opts).map(p=>`<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${p.r.toFixed(2)}" fill="${p.color}" opacity="${p.opacity.toFixed(2)}"/>`).join('');
    return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">${nodes}</svg>`)
  });
}

export function grainBackground(){return cached('grain',()=>{
  const nodes=[];
  for(let y=3;y<100;y+=6)for(let x=3;x<100;x+=6)nodes.push(`<circle cx="${x}" cy="${y}" r=".72" fill="#fff" opacity=".8"/>`);
  for(let y=4.5;y<100;y+=9)for(let x=4.5;x<100;x+=9)nodes.push(`<circle cx="${x}" cy="${y}" r=".82" fill="#000" opacity=".7"/>`);
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
