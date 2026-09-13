import {fx0,dotNoiseSpec,halftoneSpec} from './effects';
import {clamp} from './editorCore';

const BLENDS={
  normal:'source-over',multiply:'multiply',screen:'screen',overlay:'overlay',darken:'darken',lighten:'lighten',
  'color-dodge':'color-dodge','color-burn':'color-burn','hard-light':'hard-light','soft-light':'soft-light',difference:'difference',exclusion:'exclusion'
};

const canvasOf=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c};
const ctxOf=c=>c.getContext('2d',{alpha:true,willReadFrequently:false});

function blobFromCanvas(canvas,type,quality){
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Browser could not encode the export canvas')),type,quality));
}

function loadImage(src,cache){
  if(!src)return Promise.reject(new Error('Image layer has no source'));
  if(cache?.has(src))return cache.get(src);
  const task=new Promise((resolve,reject)=>{
    const img=new Image();
    if(/^https?:/i.test(src))img.crossOrigin='anonymous';
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error(`Could not decode image source: ${String(src).slice(0,80)}`));
    img.src=src;
  });
  cache?.set(src,task);return task;
}

function roundedRect(ctx,x,y,w,h,rPct){
  const rx=clamp(+rPct||0,0,50)/100*w,ry=clamp(+rPct||0,0,50)/100*h;
  if(!rx&&!ry){ctx.beginPath();ctx.rect(x,y,w,h);ctx.closePath();return}
  ctx.beginPath();
  ctx.moveTo(x+rx,y);ctx.lineTo(x+w-rx,y);ctx.ellipse(x+w-rx,y+ry,rx,ry,0,-Math.PI/2,0);
  ctx.lineTo(x+w,y+h-ry);ctx.ellipse(x+w-rx,y+h-ry,rx,ry,0,0,Math.PI/2);
  ctx.lineTo(x+rx,y+h);ctx.ellipse(x+rx,y+h-ry,rx,ry,0,Math.PI/2,Math.PI);
  ctx.lineTo(x,y+ry);ctx.ellipse(x+rx,y+ry,rx,ry,0,Math.PI,Math.PI*1.5);ctx.closePath();
}

function roundedRectAbs(ctx,x,y,w,h,r){
  const rr=clamp(+r||0,0,Math.min(w,h)/2);
  ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
}

function drawFittedImage(ctx,img,w,h,fit='cover'){
  const iw=img.naturalWidth||img.width||1,ih=img.naturalHeight||img.height||1;
  if(fit==='fill'){ctx.drawImage(img,0,0,w,h);return}
  const s=fit==='contain'?Math.min(w/iw,h/ih):Math.max(w/iw,h/ih),dw=iw*s,dh=ih*s;
  ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);
}

function maskEffect(effect,base){
  const x=ctxOf(effect);x.globalCompositeOperation='destination-in';x.drawImage(base,0,0);x.globalCompositeOperation='source-over';
}
function compositeEffect(target,effect,mode,opacity){
  if(opacity<=0)return;const x=ctxOf(target);x.save();x.globalAlpha=clamp(opacity,0,1);x.globalCompositeOperation=mode;x.drawImage(effect,0,0);x.restore();
}

function makeGrain(w,h){
  const c=canvasOf(w,h),x=ctxOf(c);
  for(let py=3;py<100;py+=6)for(let px=3;px<100;px+=6){x.globalAlpha=.8;x.fillStyle='#fff';x.beginPath();x.ellipse(px/100*w,py/100*h,.72/100*w,.72/100*h,0,0,Math.PI*2);x.fill()}
  for(let py=4.5;py<100;py+=9)for(let px=4.5;px<100;px+=9){x.globalAlpha=.7;x.fillStyle='#000';x.beginPath();x.ellipse(px/100*w,py/100*h,.82/100*w,.82/100*h,0,0,Math.PI*2);x.fill()}
  x.globalAlpha=1;return c;
}
function makeNoise(w,h,seed,amount){
  const c=canvasOf(w,h),x=ctxOf(c),unit=Math.max(1,Math.min(w,h)/1000);
  for(const p of dotNoiseSpec(seed,amount)){
    x.globalAlpha=p.opacity;x.fillStyle=p.color;x.beginPath();x.ellipse(p.x/100*w,p.y/100*h,Math.max(.35,p.r/100*w*unit),Math.max(.35,p.r/100*h*unit),0,0,Math.PI*2);x.fill();
  }
  x.globalAlpha=1;return c;
}
function makeHalftone(w,h,seed,amount,opts={}){
  const c=canvasOf(w,h),x=ctxOf(c),unit=Math.min(w,h)/100;
  for(const p of halftoneSpec(seed,amount,opts)){
    x.globalAlpha=p.opacity;x.fillStyle=p.color;x.beginPath();x.ellipse(p.x/100*w,p.y/100*h,Math.max(.4,p.r*unit),Math.max(.4,p.r*unit),0,0,Math.PI*2);x.fill();
  }
  x.globalAlpha=1;return c;
}
function makeXerox(w,h){
  const c=canvasOf(w,h),x=ctxOf(c);x.strokeStyle='#000';x.globalAlpha=.16;x.lineWidth=Math.max(.5,h/100);
  for(let py=1;py<100;py+=4){const y=py/100*h;x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke()}x.globalAlpha=1;return c;
}
function makeSolid(w,h,color){const c=canvasOf(w,h),x=ctxOf(c);x.fillStyle=color;x.fillRect(0,0,w,h);return c}

async function renderImageLayer(l,w,h,imageCache){
  const out=canvasOf(w,h),x=ctxOf(out),base=canvasOf(w,h),b=ctxOf(base),alpha=canvasOf(w,h),a=ctxOf(alpha),f={...fx0,...l.fx};
  const img=await loadImage(l.src,imageCache);
  a.save();if(l.radius){roundedRect(a,0,0,w,h,l.radius);a.clip()}drawFittedImage(a,img,w,h,l.fit||'cover');a.restore();
  b.save();if(l.radius){roundedRect(b,0,0,w,h,l.radius);b.clip()}
  const th=f.threshold/100;
  b.filter=`brightness(${1+f.exposure/100}) contrast(${f.contrast/100+th*5+f.xerox/80}) saturate(${f.saturation/100}) grayscale(${Math.max(f.grayscale/100,th,f.xerox/120)}) blur(${Math.max(0,+f.blur||0)}px)`;
  drawFittedImage(b,img,w,h,l.fit||'cover');b.restore();
  // Do not re-mask the filtered base. CSS blur on a transparent PNG is allowed to
  // spread outside the original alpha; re-applying alpha here was the main source
  // of preview/export mismatch for blurred cutouts.
  x.drawImage(base,0,0);
  const seed=l.fxSeed||l.id;
  if(f.grain>0){const e=makeGrain(w,h);maskEffect(e,alpha);compositeEffect(out,e,'overlay',f.grain/150)}
  if(f.noise>0){const e=makeNoise(w,h,seed,f.noise);maskEffect(e,alpha);compositeEffect(out,e,'soft-light',f.noise/90)}
  if(f.halftone>0){const e=makeHalftone(w,h,seed,f.halftone,{size:f.halftoneSize,density:f.halftoneDensity,angle:f.halftoneAngle,color:f.halftoneColor});maskEffect(e,alpha);compositeEffect(out,e,'multiply',((f.halftoneOpacity||85)/100)*(f.halftone/100))}
  if(f.xerox>0){const e=makeXerox(w,h);maskEffect(e,alpha);compositeEffect(out,e,'multiply',f.xerox/120)}
  if(f.fade>0){const e=makeSolid(w,h,'#e7cfa1');maskEffect(e,alpha);compositeEffect(out,e,'screen',f.fade/180)}
  return out;
}

function renderShapeLayer(l){
  const c=canvasOf(1000,1000),x=ctxOf(c),sw=Math.max(0,+l.strokeWidth||0)*10,fill=l.fill||'#111',stroke=l.stroke||fill;
  x.lineJoin='round';x.lineCap=l.lineCap||'round';x.fillStyle=fill;x.strokeStyle=stroke;x.lineWidth=sw;
  if(l.shape==='line'){
    x.beginPath();x.moveTo(40,500);x.lineTo(960,500);x.strokeStyle=stroke;x.lineWidth=80+sw*2;x.stroke();x.strokeStyle=fill;x.lineWidth=80;x.stroke();return c;
  }
  if(l.shape==='circle'){x.beginPath();x.ellipse(500,500,470,470,0,0,Math.PI*2)}
  else if(l.shape==='triangle'){x.beginPath();x.moveTo(500,40);x.lineTo(960,960);x.lineTo(40,960);x.closePath()}
  else if(l.shape==='star'){const pts=[[500,20],[610,360],[970,360],[680,570],[790,920],[500,710],[210,920],[320,570],[30,360],[390,360]];x.beginPath();pts.forEach(([px,py],i)=>i?x.lineTo(px,py):x.moveTo(px,py));x.closePath()}
  else if(l.shape==='cross'){x.beginPath();x.moveTo(360,40);x.lineTo(640,40);x.lineTo(640,360);x.lineTo(960,360);x.lineTo(960,640);x.lineTo(640,640);x.lineTo(640,960);x.lineTo(360,960);x.lineTo(360,640);x.lineTo(40,640);x.lineTo(40,360);x.lineTo(360,360);x.closePath()}
  else {const r=clamp(+l.radius||0,0,46)*10;roundedRectAbs(x,40,40,920,920,r)}
  x.fill();if(sw>0)x.stroke();return c;
}

function fontFamilyForCanvas(value){return value||'Arial, sans-serif'}
function setTextFont(ctx,l,fs){
  ctx.font=`${clamp(+l.fontWeight||400,100,900)} ${fs}px ${fontFamilyForCanvas(l.fontFamily)}`;
  ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fontKerning='auto';
}
function textWidth(ctx,text,spacing){
  if('letterSpacing' in ctx){const old=ctx.letterSpacing;ctx.letterSpacing=`${spacing}px`;const width=ctx.measureText(text).width;ctx.letterSpacing=old;return width}
  const chars=[...text];return chars.reduce((sum,ch)=>sum+ctx.measureText(ch).width,0)+Math.max(0,chars.length-1)*spacing;
}
function drawTracked(ctx,text,x,y,spacing,mode){
  const value=text||' ';
  if('letterSpacing' in ctx){ctx.letterSpacing=`${spacing}px`;mode==='stroke'?ctx.strokeText(value,x,y):ctx.fillText(value,x,y);return}
  const chars=[...value],total=textWidth(ctx,value,spacing);let px=x-total/2;const oldAlign=ctx.textAlign;ctx.textAlign='center';
  for(const ch of chars){const w=ctx.measureText(ch).width;mode==='stroke'?ctx.strokeText(ch,px+w/2,y):ctx.fillText(ch,px+w/2,y);px+=w+spacing}ctx.textAlign=oldAlign;
}
function paintTextLines(ctx,l,mode){
  const lines=String(l.text??'').split('\n'),fs=clamp((+l.fontSize||64)*.5,5,88)*10,lh=fs*(+l.lineHeight||.9),tracking=(+l.tracking||0)*5,total=(lines.length-1)*lh,start=500-total/2+fs*.33;
  setTextFont(ctx,l,fs);
  lines.forEach((line,i)=>drawTracked(ctx,line||' ',500,start+i*lh,tracking,mode));
}
function textPass(l,{fill,stroke,strokeWidth=0,mode='fill'}={}){
  const c=canvasOf(1000,1000),x=ctxOf(c);x.save();x.translate(500,500);x.scale(+l.scaleX||1,+l.scaleY||1);x.translate(-500,-500);x.fillStyle=fill||l.color||'#111';x.strokeStyle=stroke||l.outlineColor||'#111';x.lineWidth=strokeWidth;x.lineJoin='round';paintTextLines(x,l,mode);x.restore();return c;
}
function renderTextLayer(l){
  const out=canvasOf(1000,1000),x=ctxOf(out),ow=Math.max(0,+l.outline||0)*6.5,mode=l.outlineMode||'center';
  const fill=textPass(l,{fill:l.color,mode:'fill'});
  if(ow<=0){x.drawImage(fill,0,0);return out}
  const stroke=textPass(l,{stroke:l.outlineColor,strokeWidth:mode==='center'?ow:ow*2,mode:'stroke'});
  if(mode==='inside'){
    const s=ctxOf(stroke);s.globalCompositeOperation='destination-in';s.drawImage(fill,0,0);s.globalCompositeOperation='source-over';x.drawImage(fill,0,0);x.drawImage(stroke,0,0);
  }else{x.drawImage(stroke,0,0);x.drawImage(fill,0,0)}
  return out;
}

function renderKey(l,w,h){
  const common={type:l.type,width:w,height:h};
  if(l.type==='image')return JSON.stringify({...common,src:l.src,fit:l.fit,radius:l.radius,fx:{...fx0,...l.fx},fxSeed:l.fxSeed});
  if(l.type==='text')return JSON.stringify({...common,text:l.text,color:l.color,fontFamily:l.fontFamily,fontSize:l.fontSize,fontWeight:l.fontWeight,tracking:l.tracking,lineHeight:l.lineHeight,scaleX:l.scaleX,scaleY:l.scaleY,outline:l.outline,outlineColor:l.outlineColor,outlineMode:l.outlineMode});
  return JSON.stringify({...common,shape:l.shape,fill:l.fill,stroke:l.stroke,strokeWidth:l.strokeWidth,lineCap:l.lineCap,radius:l.radius});
}
async function renderLayer(l,docWidth,docHeight,imageCache,renderCache){
  const w=Math.max(1,Math.round(docWidth*(+l.width||1)/100)),h=Math.max(1,Math.round(docHeight*(+l.height||1)/100)),key=renderKey(l,w,h);
  if(renderCache.has(key))return renderCache.get(key);
  const task=(async()=>{
    if(l.type==='image')return {canvas:await renderImageLayer(l,w,h,imageCache),w,h};
    if(l.type==='text')return {canvas:renderTextLayer(l),w,h};
    return {canvas:renderShapeLayer(l),w,h};
  })();
  renderCache.set(key,task);return task;
}

async function ensureFonts(layers){
  if(!document.fonts)return;
  const requests=new Map();
  for(const l of layers){
    if(l.type!=='text')continue;
    const first=String(l.fontFamily||'Arial').split(',')[0].trim().replace(/^['"]|['"]$/g,''),weight=clamp(+l.fontWeight||400,100,900),key=`${weight}:${first}`;
    if(!requests.has(key))requests.set(key,{first,weight,sample:String(l.text||'1337').slice(0,32)});
  }
  await Promise.allSettled([...requests.values()].map(({first,weight,sample})=>document.fonts.load(`${weight} 64px "${first}"`,sample)));
  await document.fonts.ready;
}

/** Render exclusively from scene data. UI selection and viewport state never participate. */
export async function exportScene(layers,{kind='png',background='#fff',transparent=false,docWidth=1200,docHeight=1500}={}){
  if(!Array.isArray(layers))throw new Error('Scene layers are missing');
  const visible=[...layers].filter(l=>!l.hidden).sort((a,b)=>(a.order||0)-(b.order||0));
  await ensureFonts(visible);
  const out=canvasOf(docWidth,docHeight),ctx=ctxOf(out);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';if(!transparent){ctx.fillStyle=background;ctx.fillRect(0,0,docWidth,docHeight);}
  const imageCache=new Map(),renderCache=new Map();
  for(const l of visible){
    try{
      const {canvas,w,h}=await renderLayer(l,docWidth,docHeight,imageCache,renderCache),cx=docWidth*(+l.x||0)/100,cy=docHeight*(+l.y||0)/100;
      ctx.save();ctx.translate(cx,cy);ctx.rotate((+l.rotation||0)*Math.PI/180);ctx.globalAlpha=clamp(Number.isFinite(+l.opacity)?+l.opacity:1,0,1);ctx.globalCompositeOperation=BLENDS[l.blend]||'source-over';ctx.drawImage(canvas,-w/2,-h/2,w,h);ctx.restore();
    }catch(err){throw new Error(`Layer ${l.name||l.text||l.shape||l.id}: ${err?.message||err}`)}
  }
  const mime=kind==='jpg'?'image/jpeg':'image/png',quality=kind==='jpg'?.94:undefined;
  try{return await blobFromCanvas(out,mime,quality)}catch(err){
    if(String(err?.message||'').includes('encode'))throw new Error('Canvas encoding failed. A remote image may not allow export (CORS).');
    throw err;
  }
}
