import {hashSeed,mulberry32,clamp} from './editorCore';

export const fx0={exposure:0,contrast:100,saturation:100,grayscale:0,blur:0,threshold:0,grain:0,noise:0,scratches:0,halftone:0,xerox:0,fade:0};

const svgUri=svg=>`url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

export function dotNoiseBackground(seedValue,amount){
  if(!amount)return 'none';
  const rnd=mulberry32(hashSeed(`${seedValue}:noise`)),count=Math.round(35+amount*5.2),maxR=.25+amount/100*1.15;
  let nodes='';
  for(let i=0;i<count;i++){
    const x=(rnd()*100).toFixed(2),y=(rnd()*100).toFixed(2),r=(.12+rnd()*maxR).toFixed(2),dark=rnd()>.36;
    const opacity=(.12+rnd()*.72).toFixed(2);
    nodes+=`<circle cx="${x}" cy="${y}" r="${r}" fill="${dark?'#000':'#fff'}" opacity="${opacity}"/>`;
  }
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">${nodes}</svg>`);
}

export function scratchBackground(seedValue,amount){
  if(!amount)return 'none';
  const rnd=mulberry32(hashSeed(`${seedValue}:scratches`)),count=Math.round(4+amount*.9);
  let nodes='';
  for(let i=0;i<count;i++){
    const x=(rnd()*110-5),y=(rnd()*110-5),len=(4+rnd()*(16+amount*.55)),ang=(-35+rnd()*70)*Math.PI/180;
    const x2=x+Math.cos(ang)*len,y2=y+Math.sin(ang)*len,w=(.08+rnd()*(.18+amount/100*.8)).toFixed(2),op=(.16+rnd()*.68).toFixed(2);
    const col=rnd()>.28?'#fff':'#000';
    nodes+=`<line x1="${x.toFixed(2)}" y1="${y.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${col}" stroke-width="${w}" opacity="${op}" stroke-linecap="${rnd()>.5?'round':'square'}"/>`;
    if(rnd()>.82){const off=(.4+rnd()*1.4);nodes+=`<line x1="${(x+off).toFixed(2)}" y1="${(y+off*.2).toFixed(2)}" x2="${(x2+off).toFixed(2)}" y2="${(y2+off*.2).toFixed(2)}" stroke="${col}" stroke-width="${Math.max(.05,+w*.45).toFixed(2)}" opacity="${(op*.55).toFixed(2)}"/>`}
  }
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">${nodes}</svg>`);
}

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
