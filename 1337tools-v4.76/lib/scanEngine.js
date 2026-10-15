import {clamp,hashSeed,mulberry32} from './editorCore';

export const SCAN_DIRECTIONS=['TOP → BOTTOM','LEFT → RIGHT'];
export const SCAN_OUTPUTS=['B/W','COLOR'];
export const SCAN_PAPER=['#f5f2ea','#ffffff','#e8e1d1','#f1efe9'];
export const SCAN_PRESET={
  scanSpeed:44,
  intensity:58,
  stretch:62,
  smear:48,
  wave:34,
  lineShift:44,
  grain:18,
  banding:22,
  softness:14,
  contrast:24,
  threshold:18,
  edgeShadow:16,
};

export function createScanCanvas(w,h){
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(w));
  canvas.height=Math.max(1,Math.round(h));
  return canvas;
}

export function randomizeScanParams(seed=Math.random()){
  const r=mulberry32(hashSeed(`scan-random:${seed}`));
  return {
    scanSpeed:Math.round(26+r()*48),
    intensity:Math.round(34+r()*52),
    stretch:Math.round(25+r()*70),
    smear:Math.round(18+r()*72),
    wave:Math.round(10+r()*68),
    lineShift:Math.round(14+r()*72),
    grain:Math.round(6+r()*28),
    banding:Math.round(6+r()*36),
    softness:Math.round(2+r()*28),
    contrast:Math.round(-6+r()*52),
    threshold:Math.round(r()*54),
    edgeShadow:Math.round(4+r()*36),
  };
}

function fitImagePlacement(image,w,h,view){
  const iw=image?.naturalWidth||image?.width||1, ih=image?.naturalHeight||image?.height||1;
  const fit=Math.min(w/iw,h/ih);
  const zoom=clamp((+view.scale||100)/100,.1,8);
  const dw=iw*fit*zoom, dh=ih*fit*zoom;
  const dx=(w-dw)/2+clamp(+view.x||0,-100,100)/100*w*.42;
  const dy=(h-dh)/2+clamp(+view.y||0,-100,100)/100*h*.42;
  return {iw,ih,dw,dh,dx,dy};
}

export function renderScanSource(canvas,{image,view={scale:100,x:0,y:0},paper=SCAN_PAPER[0],output='B/W',softness=0,contrast=0,threshold=0}={}){
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Canvas 2D context unavailable');
  const w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle=paper;
  ctx.fillRect(0,0,w,h);
  if(!image)return canvas;
  const {dw,dh,dx,dy}=fitImagePlacement(image,w,h,view);
  const blurPx=Math.max(0,(+softness||0)/100*Math.min(w,h)*0.008);
  ctx.save();
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  const filters=[];
  if(blurPx>0.01)filters.push(`blur(${blurPx.toFixed(2)}px)`);
  if((+contrast||0)!==0)filters.push(`contrast(${(100+(+contrast||0)*1.2).toFixed(1)}%)`);
  ctx.filter=filters.join(' ')||'none';
  ctx.drawImage(image,dx,dy,dw,dh);
  ctx.filter='none';
  ctx.restore();
  if(output==='B/W' || (+threshold||0)>0){
    const img=ctx.getImageData(0,0,w,h),d=img.data,amt=clamp((+threshold||0)/100,0,1);
    for(let i=0;i<d.length;i+=4){
      const l=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];
      if(output==='B/W'){
        const hard=l>=127?255:0;
        const mix=l*(1-amt)+hard*amt;
        d[i]=d[i+1]=d[i+2]=mix;
      }else if(amt>0){
        const levels=Math.max(2,Math.round(14-amt*10));
        const q=Math.round(l/255*(levels-1))*255/(levels-1);
        const mix=l*(1-amt*.65)+q*amt*.65;
        d[i]=d[i+1]=d[i+2]=mix;
      }
    }
    ctx.putImageData(img,0,0);
  }
  return canvas;
}

function bandSampleForStep(samples,index,fallback){
  return samples[index]||fallback||{x:0,y:0,scale:100,vx:0,vy:0,j1:0.5,j2:0.5,j3:0.5,j4:0.5};
}

function drawHorizontalBand(targetCtx,sourceCanvas,y0,y1,sample,params,seedRand){
  const w=targetCtx.canvas.width,h=targetCtx.canvas.height;
  const bandH=Math.max(1,y1-y0);
  const stretchAmt=clamp((+params.stretch||0)/100,0,1),smearAmt=clamp((+params.smear||0)/100,0,1),waveAmt=clamp((+params.wave||0)/100,0,1),shiftAmt=clamp((+params.lineShift||0)/100,0,1),strength=clamp((+params.intensity||0)/100,0,1);
  for(let y=y0;y<y1;y++){
    const t=y/Math.max(1,h-1);
    const rowJ=(sample.j1-.5)*2,rowK=(sample.j2-.5)*2,rowM=(sample.j3-.5)*2;
    const wobble=Math.sin(t*18+sample.j4*6.283)*waveAmt*w*0.014 + Math.sin(t*53+sample.j2*9.7)*waveAmt*w*0.004;
    const shift=(sample.vx*w*0.95*shiftAmt + sample.vy*h*0.12*smearAmt + rowJ*w*0.01*strength + wobble);
    const sy=clamp(y + sample.vy*h*0.65*smearAmt + rowK*h*0.004*strength,0,h-1);
    const stretch=1 + Math.abs(sample.vx)*stretchAmt*1.55 + Math.abs(sample.vy)*stretchAmt*0.45 + Math.abs(rowM)*stretchAmt*0.03;
    const destW=w*stretch;
    const destX=shift - (destW-w)*0.5;
    targetCtx.drawImage(sourceCanvas,0,sy,w,1,destX,y,destW,1);
    if(smearAmt>0.02 && Math.abs(sample.vx)+Math.abs(sample.vy)>0.003){
      targetCtx.globalAlpha=.08+.18*smearAmt;
      targetCtx.drawImage(sourceCanvas,0,sy,w,1,destX+sample.vx*w*0.18,y,destW,1);
      targetCtx.globalAlpha=1;
    }
  }
}

function drawVerticalBand(targetCtx,sourceCanvas,x0,x1,sample,params,seedRand){
  const w=targetCtx.canvas.width,h=targetCtx.canvas.height;
  const stretchAmt=clamp((+params.stretch||0)/100,0,1),smearAmt=clamp((+params.smear||0)/100,0,1),waveAmt=clamp((+params.wave||0)/100,0,1),shiftAmt=clamp((+params.lineShift||0)/100,0,1),strength=clamp((+params.intensity||0)/100,0,1);
  for(let x=x0;x<x1;x++){
    const t=x/Math.max(1,w-1);
    const colJ=(sample.j1-.5)*2,colK=(sample.j2-.5)*2,colM=(sample.j3-.5)*2;
    const wobble=Math.sin(t*17+sample.j4*6.283)*waveAmt*h*0.015 + Math.sin(t*47+sample.j2*9.7)*waveAmt*h*0.004;
    const shift=(sample.vy*h*0.95*shiftAmt + sample.vx*w*0.12*smearAmt + colJ*h*0.01*strength + wobble);
    const sx=clamp(x + sample.vx*w*0.62*smearAmt + colK*w*0.004*strength,0,w-1);
    const stretch=1 + Math.abs(sample.vy)*stretchAmt*1.45 + Math.abs(sample.vx)*stretchAmt*0.38 + Math.abs(colM)*stretchAmt*0.03;
    const destH=h*stretch;
    const destY=shift - (destH-h)*0.5;
    targetCtx.drawImage(sourceCanvas,sx,0,1,h,x,destY,1,destH);
    if(smearAmt>0.02 && Math.abs(sample.vx)+Math.abs(sample.vy)>0.003){
      targetCtx.globalAlpha=.08+.18*smearAmt;
      targetCtx.drawImage(sourceCanvas,sx,0,1,h,x,destY+sample.vy*h*0.18,1,destH);
      targetCtx.globalAlpha=1;
    }
  }
}

function decorateHorizontalBand(targetCtx,y0,y1,params,machineSeed,stepOffset=0){
  const w=targetCtx.canvas.width,h=targetCtx.canvas.height;
  const grainAmt=clamp((+params.grain||0)/100,0,1),bandAmt=clamp((+params.banding||0)/100,0,1),shadowAmt=clamp((+params.edgeShadow||0)/100,0,1),strength=clamp((+params.intensity||0)/100,0,1);
  const img=targetCtx.getImageData(0,y0,w,Math.max(1,y1-y0));
  const d=img.data,rand=mulberry32(hashSeed(`${machineSeed}:band:${stepOffset}:${y0}`));
  const shadowW=Math.max(1,Math.round(w*.11));
  for(let yy=0;yy<img.height;yy++){
    const globalY=y0+yy;
    const rowShade=1 - bandAmt*(0.015 + Math.abs(Math.sin((globalY/h)*37 + rand()*6.283))*0.07);
    for(let x=0;x<w;x++){
      const i=(yy*w+x)*4;
      const grain=(rand()-.5)*(10 + 32*grainAmt);
      const edge=shadowAmt>0 ? (1 - shadowAmt*(Math.max(0,(shadowW-x)/shadowW)*0.22 + Math.max(0,(x-(w-shadowW))/shadowW)*0.08)) : 1;
      const tint=rowShade*edge;
      d[i]=clamp((d[i]+grain)*tint,0,255);
      d[i+1]=clamp((d[i+1]+grain)*tint,0,255);
      d[i+2]=clamp((d[i+2]+grain)*tint,0,255);
      d[i+3]=255;
    }
  }
  targetCtx.putImageData(img,0,y0);
}

function decorateVerticalBand(targetCtx,x0,x1,params,machineSeed,stepOffset=0){
  const w=targetCtx.canvas.width,h=targetCtx.canvas.height;
  const grainAmt=clamp((+params.grain||0)/100,0,1),bandAmt=clamp((+params.banding||0)/100,0,1),shadowAmt=clamp((+params.edgeShadow||0)/100,0,1);
  const img=targetCtx.getImageData(x0,0,Math.max(1,x1-x0),h);
  const d=img.data,rand=mulberry32(hashSeed(`${machineSeed}:vband:${stepOffset}:${x0}`));
  const shadowH=Math.max(1,Math.round(h*.11));
  for(let x=0;x<img.width;x++){
    const globalX=x0+x;
    const colShade=1 - bandAmt*(0.015 + Math.abs(Math.sin((globalX/w)*31 + rand()*6.283))*0.07);
    for(let y=0;y<h;y++){
      const i=(y*img.width+x)*4;
      const grain=(rand()-.5)*(10 + 32*grainAmt);
      const edge=shadowAmt>0 ? (1 - shadowAmt*(Math.max(0,(shadowH-y)/shadowH)*0.12 + Math.max(0,(y-(h-shadowH))/shadowH)*0.05)) : 1;
      const tint=colShade*edge;
      d[i]=clamp((d[i]+grain)*tint,0,255);
      d[i+1]=clamp((d[i+1]+grain)*tint,0,255);
      d[i+2]=clamp((d[i+2]+grain)*tint,0,255);
      d[i+3]=255;
    }
  }
  targetCtx.putImageData(img,x0,0);
}

export function applyScanBand({targetCanvas,sourceCanvas,direction='TOP → BOTTOM',fromStep=0,toStep=0,samples=[],params=SCAN_PRESET,machineSeed=1,previewStepOffset=0}){
  const ctx=targetCanvas.getContext('2d');
  if(!ctx)return;
  const axis=direction==='LEFT → RIGHT'?targetCanvas.width:targetCanvas.height;
  const maxStep=Math.max(1,samples.length);
  const start=clamp(Math.floor(fromStep*axis/maxStep),0,axis);
  const end=clamp(Math.ceil(toStep*axis/maxStep),0,axis);
  if(end<=start)return;
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  for(let step=fromStep;step<toStep;step++){
    const band0=clamp(Math.floor(step*axis/maxStep),0,axis);
    const band1=clamp(Math.ceil((step+1)*axis/maxStep),0,axis);
    if(band1<=band0)continue;
    const sample=bandSampleForStep(samples,step,samples[Math.max(0,step-1)]);
    if(direction==='LEFT → RIGHT')drawVerticalBand(ctx,sourceCanvas,band0,band1,sample,params,machineSeed);
    else drawHorizontalBand(ctx,sourceCanvas,band0,band1,sample,params,machineSeed);
  }
  if(direction==='LEFT → RIGHT')decorateVerticalBand(ctx,start,end,params,machineSeed,previewStepOffset+fromStep);
  else decorateHorizontalBand(ctx,start,end,params,machineSeed,previewStepOffset+fromStep);
}


function postTonePass(canvas,{output='B/W',contrast=0,threshold=0}={}){
  const ctx=canvas.getContext('2d');
  const w=canvas.width,h=canvas.height;
  const img=ctx.getImageData(0,0,w,h),d=img.data;
  const contrastMul=1 + clamp((+contrast||0)/100,-.6,.95)*1.18;
  const threshAmt=clamp((+threshold||0)/100,0,1);
  for(let i=0;i<d.length;i+=4){
    let r=clamp((d[i]-127.5)*contrastMul+127.5,0,255);
    let g=clamp((d[i+1]-127.5)*contrastMul+127.5,0,255);
    let b=clamp((d[i+2]-127.5)*contrastMul+127.5,0,255);
    const l=.2126*r+.7152*g+.0722*b;
    if(output==='B/W'){
      const hard=l>=127.5?255:0;
      const mix=l*(1-threshAmt)+hard*threshAmt;
      r=g=b=mix;
    }else if(threshAmt>0){
      const levels=Math.max(2,Math.round(14-threshAmt*10));
      const q=Math.round(l/255*(levels-1))*255/(levels-1);
      r=r*(1-threshAmt*.45)+q*threshAmt*.45;
      g=g*(1-threshAmt*.45)+q*threshAmt*.45;
      b=b*(1-threshAmt*.45)+q*threshAmt*.45;
    }
    d[i]=r;d[i+1]=g;d[i+2]=b;
  }
  ctx.putImageData(img,0,0);
  return canvas;
}

function drawHorizontalBandFromImage(targetCtx,image,y0,y1,sample,params){
  const w=targetCtx.canvas.width,h=targetCtx.canvas.height;
  const {iw,ih,dw,dh,dx,dy}=fitImagePlacement(image,w,h,sample);
  const stretchAmt=clamp((+params.stretch||0)/100,0,1),smearAmt=clamp((+params.smear||0)/100,0,1),waveAmt=clamp((+params.wave||0)/100,0,1),shiftAmt=clamp((+params.lineShift||0)/100,0,1),strength=clamp((+params.intensity||0)/100,0,1);
  const blurPx=Math.max(0,(+params.softness||0)/100*Math.min(w,h)*0.005);
  targetCtx.filter=blurPx>0.02?`blur(${blurPx.toFixed(2)}px)`:'none';
  for(let y=y0;y<y1;y++){
    if(y<dy || y>dy+dh)continue;
    const t=y/Math.max(1,h-1);
    const rowJ=(sample.j1-.5)*2,rowK=(sample.j2-.5)*2,rowM=(sample.j3-.5)*2;
    const wobble=Math.sin(t*18+sample.j4*6.283)*waveAmt*w*0.014 + Math.sin(t*53+sample.j2*9.7)*waveAmt*w*0.004;
    const shift=(sample.vx*w*0.95*shiftAmt + sample.vy*h*0.12*smearAmt + rowJ*w*0.01*strength + wobble);
    const srcY=clamp(((y-dy)/dh)*ih + sample.vy*ih*0.012*smearAmt + rowK*ih*0.0018*strength,0,ih-1);
    const stretch=1 + Math.abs(sample.vx)*stretchAmt*1.55 + Math.abs(sample.vy)*stretchAmt*0.45 + Math.abs(rowM)*stretchAmt*0.03;
    const destW=dw*stretch;
    const destX=dx + shift - (destW-dw)*0.5;
    targetCtx.drawImage(image,0,srcY,iw,1,destX,y,destW,1);
    if(smearAmt>0.02 && Math.abs(sample.vx)+Math.abs(sample.vy)>0.003){
      targetCtx.globalAlpha=.08+.18*smearAmt;
      targetCtx.drawImage(image,0,srcY,iw,1,destX+sample.vx*w*0.18,y,destW,1);
      targetCtx.globalAlpha=1;
    }
  }
  targetCtx.filter='none';
}

function drawVerticalBandFromImage(targetCtx,image,x0,x1,sample,params){
  const w=targetCtx.canvas.width,h=targetCtx.canvas.height;
  const {iw,ih,dw,dh,dx,dy}=fitImagePlacement(image,w,h,sample);
  const stretchAmt=clamp((+params.stretch||0)/100,0,1),smearAmt=clamp((+params.smear||0)/100,0,1),waveAmt=clamp((+params.wave||0)/100,0,1),shiftAmt=clamp((+params.lineShift||0)/100,0,1),strength=clamp((+params.intensity||0)/100,0,1);
  const blurPx=Math.max(0,(+params.softness||0)/100*Math.min(w,h)*0.005);
  targetCtx.filter=blurPx>0.02?`blur(${blurPx.toFixed(2)}px)`:'none';
  for(let x=x0;x<x1;x++){
    if(x<dx || x>dx+dw)continue;
    const t=x/Math.max(1,w-1);
    const colJ=(sample.j1-.5)*2,colK=(sample.j2-.5)*2,colM=(sample.j3-.5)*2;
    const wobble=Math.sin(t*17+sample.j4*6.283)*waveAmt*h*0.015 + Math.sin(t*47+sample.j2*9.7)*waveAmt*h*0.004;
    const shift=(sample.vy*h*0.95*shiftAmt + sample.vx*w*0.12*smearAmt + colJ*h*0.01*strength + wobble);
    const srcX=clamp(((x-dx)/dw)*iw + sample.vx*iw*0.012*smearAmt + colK*iw*0.0018*strength,0,iw-1);
    const stretch=1 + Math.abs(sample.vy)*stretchAmt*1.45 + Math.abs(sample.vx)*stretchAmt*0.38 + Math.abs(colM)*stretchAmt*0.03;
    const destH=dh*stretch;
    const destY=dy + shift - (destH-dh)*0.5;
    targetCtx.drawImage(image,srcX,0,1,ih,x,destY,1,destH);
    if(smearAmt>0.02 && Math.abs(sample.vx)+Math.abs(sample.vy)>0.003){
      targetCtx.globalAlpha=.08+.18*smearAmt;
      targetCtx.drawImage(image,srcX,0,1,ih,x,destY+sample.vy*h*0.18,1,destH);
      targetCtx.globalAlpha=1;
    }
  }
  targetCtx.filter='none';
}

function applyScanBandFromImage({targetCanvas,image,direction='TOP → BOTTOM',fromStep=0,toStep=0,samples=[],params=SCAN_PRESET,machineSeed=1}){
  const ctx=targetCanvas.getContext('2d');
  if(!ctx || !image)return;
  const axis=direction==='LEFT → RIGHT'?targetCanvas.width:targetCanvas.height;
  const maxStep=Math.max(1,samples.length);
  const start=clamp(Math.floor(fromStep*axis/maxStep),0,axis);
  const end=clamp(Math.ceil(toStep*axis/maxStep),0,axis);
  if(end<=start)return;
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  for(let step=fromStep;step<toStep;step++){
    const band0=clamp(Math.floor(step*axis/maxStep),0,axis);
    const band1=clamp(Math.ceil((step+1)*axis/maxStep),0,axis);
    if(band1<=band0)continue;
    const sample=bandSampleForStep(samples,step,samples[Math.max(0,step-1)]);
    if(direction==='LEFT → RIGHT')drawVerticalBandFromImage(ctx,image,band0,band1,sample,params);
    else drawHorizontalBandFromImage(ctx,image,band0,band1,sample,params);
  }
  if(direction==='LEFT → RIGHT')decorateVerticalBand(ctx,start,end,params,machineSeed,fromStep);
  else decorateHorizontalBand(ctx,start,end,params,machineSeed,fromStep);
}

export function renderScanPreview(canvas,{sourceCanvas,resultCanvas,progress=0,direction='TOP → BOTTOM',showStripe=true,stripeAlpha=.9}={}){
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Canvas 2D context unavailable');
  const w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  if(sourceCanvas){ctx.save();ctx.globalAlpha=.24;ctx.drawImage(sourceCanvas,0,0,w,h);ctx.restore();}
  if(resultCanvas){
    const clip=clamp(progress,0,1);
    if(direction==='LEFT → RIGHT'){
      const edge=Math.round(w*clip);
      if(edge>0){ctx.save();ctx.beginPath();ctx.rect(0,0,edge,h);ctx.clip();ctx.drawImage(resultCanvas,0,0,w,h);ctx.restore();}
      if(showStripe && clip<1){drawStripe(ctx,edge,0,10,'vertical',stripeAlpha,h,w)}
    }else{
      const edge=Math.round(h*clip);
      if(edge>0){ctx.save();ctx.beginPath();ctx.rect(0,0,w,edge);ctx.clip();ctx.drawImage(resultCanvas,0,0,w,h);ctx.restore();}
      if(showStripe && clip<1){drawStripe(ctx,0,edge,10,'horizontal',stripeAlpha,h,w)}
    }
  }
  return canvas;
}

function drawStripe(ctx,x,y,size=10,orientation='horizontal',alpha=.9,h=0,w=0){
  if(orientation==='horizontal'){
    const g=ctx.createLinearGradient(0,y-size,0,y+size);
    g.addColorStop(0,'rgba(255,255,255,0)');
    g.addColorStop(.45,`rgba(255,255,255,${alpha*.18})`);
    g.addColorStop(.5,`rgba(255,245,190,${alpha*.94})`);
    g.addColorStop(.55,`rgba(255,255,255,${alpha*.2})`);
    g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=g;ctx.fillRect(0,Math.max(0,y-size),w||ctx.canvas.width,size*2);
  }else{
    const g=ctx.createLinearGradient(x-size,0,x+size,0);
    g.addColorStop(0,'rgba(255,255,255,0)');
    g.addColorStop(.45,`rgba(255,255,255,${alpha*.18})`);
    g.addColorStop(.5,`rgba(255,245,190,${alpha*.94})`);
    g.addColorStop(.55,`rgba(255,255,255,${alpha*.2})`);
    g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=g;ctx.fillRect(Math.max(0,x-size),0,size*2,h||ctx.canvas.height);
  }
}

export function createEmptyScanSurface(canvas,paper=SCAN_PAPER[0]){
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle=paper;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  return canvas;
}

export function renderScanSnapshot(canvas,{image,view={scale:100,x:0,y:0},paper=SCAN_PAPER[0],output='B/W',direction='TOP → BOTTOM',params=SCAN_PRESET,samples=[],progress=1,machineSeed=1,transparent=false}={}){
  const w=canvas.width,h=canvas.height;
  const result=createScanCanvas(w,h);
  createEmptyScanSurface(result,paper);
  const maxSteps=Math.max(1,samples.length);
  const steps=Math.max(0,Math.min(maxSteps,Math.round(maxSteps*clamp(progress,0,1))));
  applyScanBandFromImage({targetCanvas:result,image,direction,fromStep:0,toStep:steps,samples,params,machineSeed});
  postTonePass(result,{output,contrast:params.contrast,threshold:params.threshold});
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,w,h);
  ctx.drawImage(result,0,0);
  if(transparent){
    const img=ctx.getImageData(0,0,w,h),d=img.data;
    for(let i=0;i<d.length;i+=4){
      const l=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];
      d[i+3]=Math.round(255*clamp((250-l)/90,0,1));
    }
    ctx.putImageData(img,0,0);
  }
  return canvas;
}
