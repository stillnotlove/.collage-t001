// 1337tools SCAN v2 — line-by-line temporal capture and deterministic fine-grain rendering.
// A scan line captures one position of a physically movable sheet at a time.
import {clamp,hashSeed,mulberry32} from './editorCore';

export const SCAN_DIRECTIONS=['TOP → BOTTOM','LEFT → RIGHT'];
export const SCAN_OUTPUTS=['B/W','COLOR'];
export const SCAN_PRESET={speed:50,effect:75,distortion:72,grain:25,contrast:22,stretch:55,smear:25,banding:16,softness:8};
export const SCAN_STYLES={
  CLEAN:{effect:40,distortion:34,grain:12,contrast:9,stretch:24,smear:10,banding:5,softness:5},
  RAW:{effect:78,distortion:65,grain:26,contrast:30,stretch:62,smear:24,banding:16,softness:10},
  BROKEN:{effect:95,distortion:95,grain:36,contrast:40,stretch:86,smear:56,banding:32,softness:14},
};
export const SCAN_PAPER='#f5f3ed';
export const SCAN_STEPS=600;
export const createScanCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c;};
const n=(v,f=0)=>Number.isFinite(+v)?+v:f;
const pct=v=>clamp(n(v)/100,0,1);

export function randomizeScanParams(seed=Math.random(),previous=SCAN_PRESET){
  const r=mulberry32(hashSeed(`SCAN-PRESET:${seed}`));
  const styles=[SCAN_STYLES.CLEAN,SCAN_STYLES.RAW,SCAN_STYLES.BROKEN];
  const base=styles[Math.floor(r()*styles.length)];
  const vary=(k,range,min=0,max=100)=>Math.round(clamp(base[k]+(r()*2-1)*range,min,max));
  return {
    speed:previous.speed, // keep the user's chosen scanner speed
    effect:vary('effect',13,15,100),
    distortion:vary('distortion',17,12,100),
    grain:vary('grain',13,0,65),
    contrast:vary('contrast',18,-30,65),
    stretch:vary('stretch',18,0,100),
    smear:vary('smear',17,0,100),
    banding:vary('banding',12,0,55),
    softness:vary('softness',6,0,35),
  };
}

export function scanImageGeometry(img,w,h,view={scale:100,x:0,y:0}){
  const iw=img.naturalWidth||img.width||1,ih=img.naturalHeight||img.height||1;
  const fit=Math.min(w/iw,h/ih),zoom=clamp(n(view.scale,100)/100,.1,6);
  const dw=iw*fit*zoom,dh=ih*fit*zoom;
  return {iw,ih,dw,dh,dx:(w-dw)/2+n(view.x)*w*.0042,dy:(h-dh)/2+n(view.y)*h*.0042};
}

export function renderScanSource(canvas,{image,view={scale:100,x:0,y:0},output='COLOR',paper=SCAN_PAPER}={}){
  const w=canvas.width,h=canvas.height,ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle=paper;ctx.fillRect(0,0,w,h);
  if(image){const {dx,dy,dw,dh}=scanImageGeometry(image,w,h,view);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,dx,dy,dw,dh);}
  if(output==='B/W'){
    const frame=ctx.getImageData(0,0,w,h),d=frame.data;
    for(let i=0;i<d.length;i+=4){const l=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];d[i]=d[i+1]=d[i+2]=l;}
    ctx.putImageData(frame,0,0);
  }
  return canvas;
}

export function makeAutoMotion(t,seed){
  const r=mulberry32(hashSeed(`SCAN-MOTION:${seed}`));
  const p1=r()*6.283,p2=r()*6.283,p3=r()*6.283;
  const a=.30+r()*.4,b=.16+r()*.22;
  // One or two abrupt changes, combined with a slow drifting page.
  const jump=t>(.33+r()*.13)?(r()-.5)*21:0;
  const jump2=t>(.68+r()*.12)?(r()-.5)*17:0;
  return {x:(Math.sin(t*12+p1)*a+Math.sin(t*32+p2)*b)*19+jump+jump2,
    y:(Math.sin(t*8+p3)*a+Math.sin(t*23+p1)*b)*18-jump*.35+jump2*.3};
}

function paintHorizontal(ctx,image,sample,params,y0,y1){
  const {iw,ih,dw,dh,dx,dy}=scanImageGeometry(image,ctx.canvas.width,ctx.canvas.height,sample);
  const w=ctx.canvas.width,h=ctx.canvas.height;
  const distort=pct(params.distortion),st=pct(params.stretch),sm=pct(params.smear);
  const soft=Math.max(0,pct(params.softness)*Math.min(w,h)*.004);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.filter=soft>.04?`blur(${soft.toFixed(2)}px)`:'none';
  for(let y=y0;y<y1;y++){
    const t=y/Math.max(1,h-1);
    const wave=(Math.sin(t*38+sample.j*5.3)*.007+Math.sin(t*114+sample.j*7.1)*.002)*w*distort;
    const shift=wave+(sample.vx*w*.7+sample.vy*h*.14)*distort;
    const sy=(y-dy)/dh*ih+sample.vy*ih*.045*sm*distort;
    if(sy < 0 || sy >= ih)continue;
    const stretch=1+Math.abs(sample.vx)*st*distort*1.55+Math.abs(sample.vy)*st*distort*.35;
    const dw2=dw*stretch;
    const destX=dx+shift-(dw2-dw)*.5;
    ctx.drawImage(image,0,clamp(sy,0,ih-1),iw,Math.min(ih,Math.max(.25,ih/dh)),destX,y,dw2,1);
    if(sm>.02 && Math.abs(sample.vx)+Math.abs(sample.vy)>.003){
      ctx.globalAlpha=sm*.17*distort;
      ctx.drawImage(image,0,clamp(sy,0,ih-1),iw,Math.min(ih,Math.max(.25,ih/dh)),destX+sample.vx*w*.2,y,dw2,1);
      ctx.globalAlpha=1;
    }
  }
  ctx.filter='none';
}
function paintVertical(ctx,image,sample,params,x0,x1){
  const {iw,ih,dw,dh,dx,dy}=scanImageGeometry(image,ctx.canvas.width,ctx.canvas.height,sample);
  const w=ctx.canvas.width,h=ctx.canvas.height;
  const distort=pct(params.distortion),st=pct(params.stretch),sm=pct(params.smear);
  const soft=Math.max(0,pct(params.softness)*Math.min(w,h)*.004);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.filter=soft>.04?`blur(${soft.toFixed(2)}px)`:'none';
  for(let x=x0;x<x1;x++){
    const t=x/Math.max(1,w-1);
    const wave=(Math.sin(t*38+sample.j*5.3)*.007+Math.sin(t*114+sample.j*7.1)*.002)*h*distort;
    const shift=wave+(sample.vy*h*.7+sample.vx*w*.14)*distort;
    const sx=(x-dx)/dw*iw+sample.vx*iw*.045*sm*distort;
    if(sx<0 || sx>=iw)continue;
    const stretch=1+Math.abs(sample.vy)*st*distort*1.55+Math.abs(sample.vx)*st*distort*.35;
    const dh2=dh*stretch;
    const destY=dy+shift-(dh2-dh)*.5;
    ctx.drawImage(image,clamp(sx,0,iw-1),0,Math.min(iw,Math.max(.25,iw/dw)),ih,x,destY,1,dh2);
    if(sm>.02 && Math.abs(sample.vx)+Math.abs(sample.vy)>.003){
      ctx.globalAlpha=sm*.17*distort;
      ctx.drawImage(image,clamp(sx,0,iw-1),0,Math.min(iw,Math.max(.25,iw/dw)),ih,x,destY+sample.vy*h*.2,1,dh2);
      ctx.globalAlpha=1;
    }
  }
  ctx.filter='none';
}

function finishBand(canvas,baseCanvas,dir,lo,hi,params,seed,output){
  const ctx=canvas.getContext('2d',{willReadFrequently:true}),w=canvas.width,h=canvas.height;
  const vert=dir==='LEFT → RIGHT';
  const x=vert?lo:0,y=vert?0:lo,bw=vert?hi-lo:w,bh=vert?h:hi-lo;
  if(!bw||!bh)return;
  const frame=ctx.getImageData(x,y,bw,bh),base=baseCanvas.getContext('2d',{willReadFrequently:true}).getImageData(x,y,bw,bh),d=frame.data,b=base.data;
  const mix=pct(params.effect),g=pct(params.grain),band=pct(params.banding),contrast=clamp(n(params.contrast),-50,80);
  const contrastGain=1+contrast*.012;
  for(let yy=0;yy<bh;yy++){
    for(let xx=0;xx<bw;xx++){
      const pos=(yy*bw+xx)*4,gx=x+xx,gy=y+yy;
      const t=vert?gx/w:gy/h;
      const stripe=band*(Math.sin(t*111+seed*.031)*.036+Math.sin(t*17+seed*.017)*.025);
      // Pixel-scale signal: no sparse black spots and no randomly sized blobs.
      let hv=(Math.imul((gx+1),374761393)^Math.imul((gy+1),668265263)^(seed>>>0))>>>0;
      hv=Math.imul(hv^(hv>>>13),1274126177)>>>0;
      const grain=((hv&1023)/1023+((hv>>>10)&1023)/1023+((hv>>>20)&1023)/1023-1.5)*g*42;
      const mono=.2126*d[pos]+.7152*d[pos+1]+.0722*d[pos+2];
      for(let k=0;k<3;k++){
        const src=output==='B/W'?mono:d[pos+k];
        const scanned=clamp((src-127.5)*contrastGain+127.5+grain-stripe*255,0,255);
        d[pos+k]=clamp(b[pos+k]*(1-mix)+scanned*mix,0,255);
      }
      d[pos+3]=255;
    }
  }
  ctx.putImageData(frame,x,y);
}

export function paintScanBand({targetCanvas,baseCanvas,image,direction='TOP → BOTTOM',samples=[],fromStep=0,toStep=0,params=SCAN_PRESET,seed=1,output='B/W'}){
  if(!image||toStep<=fromStep)return;
  const w=targetCanvas.width,h=targetCanvas.height,axis=direction==='LEFT → RIGHT'?w:h;
  const count=Math.max(1,samples.length),ctx=targetCanvas.getContext('2d',{willReadFrequently:true});
  for(let step=fromStep;step<toStep;step++){
    const lo=Math.floor(step*axis/count),hi=Math.floor((step+1)*axis/count);
    if(hi<=lo)continue;
    const sample=samples[step]||samples[Math.max(0,step-1)]||{scale:100,x:0,y:0,vx:0,vy:0,j:0};
    if(direction==='LEFT → RIGHT')paintVertical(ctx,image,sample,params,lo,hi);
    else paintHorizontal(ctx,image,sample,params,lo,hi);
  }
  const lo=Math.floor(fromStep*axis/count),hi=Math.floor(toStep*axis/count);
  finishBand(targetCanvas,baseCanvas,direction,lo,hi,params,seed,output);
}

export function renderScanPreview(canvas,{baseCanvas,resultCanvas,liveCanvas,progress=0,direction='TOP → BOTTOM',scanning=false}={}){
  const ctx=canvas.getContext('2d');const w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  if(liveCanvas){ctx.save();ctx.globalAlpha=.85;ctx.drawImage(liveCanvas,0,0,w,h);ctx.restore();}
  else if(baseCanvas)ctx.drawImage(baseCanvas,0,0,w,h);
  const p=clamp(progress,0,1);
  if(resultCanvas && p>0){ctx.save();ctx.beginPath();if(direction==='LEFT → RIGHT')ctx.rect(0,0,w*p,h);else ctx.rect(0,0,w,h*p);ctx.clip();ctx.drawImage(resultCanvas,0,0,w,h);ctx.restore();}
  if(scanning){
    const pos=direction==='LEFT → RIGHT'?w*p:h*p;
    const thickness=clamp((direction==='LEFT → RIGHT'?w:h)*.015,5,24);
    const grad=direction==='LEFT → RIGHT'?ctx.createLinearGradient(pos-thickness,0,pos+thickness,0):ctx.createLinearGradient(0,pos-thickness,0,pos+thickness);
    grad.addColorStop(0,'rgba(255,255,255,0)');grad.addColorStop(.46,'rgba(255,255,255,.35)');grad.addColorStop(.5,'rgba(255,255,255,.95)');grad.addColorStop(.54,'rgba(255,255,255,.35)');grad.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=grad;if(direction==='LEFT → RIGHT')ctx.fillRect(pos-thickness,0,thickness*2,h);else ctx.fillRect(0,pos-thickness,w,thickness*2);
  }
  return canvas;
}

export function renderScanSnapshot(canvas,{image,baseView={scale:100,x:0,y:0},params=SCAN_PRESET,output='B/W',direction='TOP → BOTTOM',samples=[],progress=1,seed=1,transparent=false}={}){
  const w=canvas.width,h=canvas.height;
  const base=createScanCanvas(w,h);renderScanSource(base,{image,view:baseView,output});
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(base,0,0);
  const toStep=Math.min(samples.length,Math.round(progress*samples.length));
  paintScanBand({targetCanvas:canvas,baseCanvas:base,image,direction,samples,fromStep:0,toStep,params,seed,output});
  if(transparent){
    const frame=ctx.getImageData(0,0,w,h),d=frame.data;
    for(let i=0;i<d.length;i+=4){const l=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];d[i+3]=Math.round(clamp((248-l)/90,0,1)*255);}
    ctx.putImageData(frame,0,0);
  }
  return canvas;
}
