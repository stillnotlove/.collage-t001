import {fx0} from './effects';
import {clamp,hashSeed,mulberry32} from './editorCore';

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
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error(`Could not decode image source: ${String(src).slice(0,80)}`));
    img.src=src;
  });
  cache?.set(src,task);return task;
}

function roundedRect(ctx,x,y,w,h,r){
  const rr=clamp(r,0,Math.min(w,h)/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
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

function makeNoise(w,h,seed,amount,kind='noise'){
  const c=canvasOf(w,h),x=ctxOf(c),rnd=mulberry32(hashSeed(`${seed}:${kind}:export`)),m=Math.min(w,h);
  if(kind==='grain'){
    const count=Math.round(120+amount*18);
    for(let i=0;i<count;i++){const r=.15+rnd()*.75,x0=rnd()*w,y0=rnd()*h;x.globalAlpha=.12+rnd()*.5;x.fillStyle=rnd()>.5?'#fff':'#000';x.beginPath();x.arc(x0,y0,r,0,Math.PI*2);x.fill()}
  }else{
    const count=Math.round(35+amount*5.2),maxR=m*(.0025+amount/100*.0115);
    for(let i=0;i<count;i++){const r=m*.0012+rnd()*maxR;x.globalAlpha=.12+rnd()*.72;x.fillStyle=rnd()>.36?'#000':'#fff';x.beginPath();x.arc(rnd()*w,rnd()*h,r,0,Math.PI*2);x.fill()}
  }
  x.globalAlpha=1;return c;
}

function makeScratches(w,h,seed,amount){
  const c=canvasOf(w,h),x=ctxOf(c),rnd=mulberry32(hashSeed(`${seed}:scratches:export`)),count=Math.round(4+amount*.9),unit=Math.min(w,h)/100;
  for(let i=0;i<count;i++){
    const x1=(rnd()*110-5)/100*w,y1=(rnd()*110-5)/100*h,len=(4+rnd()*(16+amount*.55))*unit,ang=(-35+rnd()*70)*Math.PI/180;
    x.strokeStyle=rnd()>.28?'#fff':'#000';x.globalAlpha=.16+rnd()*.68;x.lineWidth=Math.max(.5,(.08+rnd()*(.18+amount/100*.8))*unit);x.lineCap=rnd()>.5?'round':'square';x.beginPath();x.moveTo(x1,y1);x.lineTo(x1+Math.cos(ang)*len,y1+Math.sin(ang)*len);x.stroke();
  }
  x.globalAlpha=1;return c;
}

function makeHalftone(w,h){
  const c=canvasOf(w,h),x=ctxOf(c),step=Math.max(8,Math.min(w,h)*.025),r=step*.2;x.fillStyle='#000';
  for(let yy=step*.5;yy<h;yy+=step)for(let xx=step*.5;xx<w;xx+=step){x.beginPath();x.arc(xx,yy,r,0,Math.PI*2);x.fill()}
  return c;
}
function makeXerox(w,h){
  const c=canvasOf(w,h),x=ctxOf(c),step=Math.max(4,h/150);x.strokeStyle='#000';x.globalAlpha=.16;x.lineWidth=Math.max(1,step*.22);
  for(let y=0;y<h;y+=step){x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke()}x.globalAlpha=1;return c;
}
function makeSolid(w,h,color){const c=canvasOf(w,h),x=ctxOf(c);x.fillStyle=color;x.fillRect(0,0,w,h);return c}

async function renderImageLayer(l,w,h,imageCache){
  const out=canvasOf(w,h),x=ctxOf(out),base=canvasOf(w,h),b=ctxOf(base),alpha=canvasOf(w,h),a=ctxOf(alpha),f={...fx0,...l.fx};
  const img=await loadImage(l.src,imageCache),radius=Math.min(w,h)*(+l.radius||0)/100;
  a.save();if(l.radius){roundedRect(a,0,0,w,h,radius);a.clip()}drawFittedImage(a,img,w,h,l.fit||'cover');a.restore();
  b.save();if(l.radius){roundedRect(b,0,0,w,h,radius);b.clip()}
  const th=f.threshold/100;
  b.filter=`brightness(${1+f.exposure/100}) contrast(${f.contrast/100+th*5+f.xerox/80}) saturate(${f.saturation/100}) grayscale(${Math.max(f.grayscale/100,th,f.xerox/120)}) blur(${Math.max(0,+f.blur||0)}px)`;
  drawFittedImage(b,img,w,h,l.fit||'cover');b.restore();
  b.globalCompositeOperation='destination-in';b.drawImage(alpha,0,0);b.globalCompositeOperation='source-over';x.drawImage(base,0,0);
  const seed=l.fxSeed||l.id;
  if(f.grain>0){const e=makeNoise(w,h,seed,f.grain,'grain');maskEffect(e,alpha);compositeEffect(out,e,'overlay',f.grain/150)}
  if(f.noise>0){const e=makeNoise(w,h,seed,f.noise,'noise');maskEffect(e,alpha);compositeEffect(out,e,'soft-light',f.noise/105)}
  if(f.scratches>0){const e=makeScratches(w,h,seed,f.scratches);maskEffect(e,alpha);compositeEffect(out,e,'screen',f.scratches/105)}
  if(f.halftone>0){const e=makeHalftone(w,h);maskEffect(e,alpha);compositeEffect(out,e,'multiply',f.halftone/115)}
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
  else {const r=clamp(+l.radius||0,0,50)*10;roundedRect(x,40,40,920,920,r)}
  x.fill();if(sw>0)x.stroke();return c;
}

function textMetrics(ctx,text,spacing){
  const chars=[...text];return chars.reduce((sum,ch)=>sum+ctx.measureText(ch).width,0)+Math.max(0,chars.length-1)*spacing;
}
function drawTracked(ctx,text,x,y,spacing,mode){
  const chars=[...(text||' ')],total=textMetrics(ctx,text||' ',spacing);let px=x-total/2;
  for(const ch of chars){const w=ctx.measureText(ch).width;if(mode==='stroke')ctx.strokeText(ch,px+w/2,y);else ctx.fillText(ch,px+w/2,y);px+=w+spacing}
}
function paintTextLines(ctx,l,mode){
  const lines=String(l.text??'').split('\n'),fs=clamp((+l.fontSize||64)*.5,5,88)*10,lh=fs*(+l.lineHeight||.9),tracking=(+l.tracking||0)*5,total=(lines.length-1)*lh;
  ctx.font=`${clamp(+l.fontWeight||400,100,900)} ${fs}px ${l.fontFamily||'Arial, sans-serif'}`;ctx.textAlign='center';ctx.textBaseline='middle';
  lines.forEach((line,i)=>drawTracked(ctx,line||' ',500,500-total/2+i*lh,tracking,mode));
}
function renderTextLayer(l){
  const c=canvasOf(1000,1000),x=ctxOf(c),ow=Math.max(0,+l.outline||0)*6.5,mode=l.outlineMode||'center';
  x.save();x.translate(500,500);x.scale(+l.scaleX||1,+l.scaleY||1);x.translate(-500,-500);x.fillStyle=l.color||'#111';x.strokeStyle=l.outlineColor||'#111';x.lineJoin='round';
  if(ow<=0)paintTextLines(x,l,'fill');
  else if(mode==='inside'){
    paintTextLines(x,l,'fill');
    const stroke=canvasOf(1000,1000),s=ctxOf(stroke);s.translate(500,500);s.scale(+l.scaleX||1,+l.scaleY||1);s.translate(-500,-500);s.strokeStyle=l.outlineColor||'#111';s.lineWidth=ow*2;s.lineJoin='round';paintTextLines(s,l,'stroke');
    s.globalCompositeOperation='destination-in';s.drawImage(c,0,0);x.globalCompositeOperation='source-over';x.drawImage(stroke,0,0);
  }else{
    x.lineWidth=mode==='outside'?ow*2:ow;x.strokeStyle=l.outlineColor||'#111';paintTextLines(x,l,'stroke');x.fillStyle=l.color||'#111';paintTextLines(x,l,'fill');
  }
  x.restore();return c;
}

async function renderLayer(l,docWidth,docHeight,imageCache){
  const w=Math.max(1,Math.round(docWidth*(+l.width||1)/100)),h=Math.max(1,Math.round(docHeight*(+l.height||1)/100));
  if(l.type==='image')return {canvas:await renderImageLayer(l,w,h,imageCache),w,h};
  if(l.type==='text')return {canvas:renderTextLayer(l),w,h};
  return {canvas:renderShapeLayer(l),w,h};
}

/**
 * Render from the scene model, not from the editor DOM. Selection state, handles,
 * responsive canvas sizing and HUD CSS therefore cannot change the exported file.
 */
export async function exportScene(layers,{kind='png',background='#fff',docWidth=1200,docHeight=1500}={}){
  if(!Array.isArray(layers))throw new Error('Scene layers are missing');
  if(document.fonts?.ready)await document.fonts.ready;
  const out=canvasOf(docWidth,docHeight),ctx=ctxOf(out);ctx.fillStyle=background;ctx.fillRect(0,0,docWidth,docHeight);
  const visible=[...layers].filter(l=>!l.hidden).sort((a,b)=>(a.order||0)-(b.order||0)),imageCache=new Map();
  for(const l of visible){
    try{
      const {canvas,w,h}=await renderLayer(l,docWidth,docHeight,imageCache),cx=docWidth*(+l.x||0)/100,cy=docHeight*(+l.y||0)/100;
      ctx.save();ctx.translate(cx,cy);ctx.rotate((+l.rotation||0)*Math.PI/180);ctx.globalAlpha=clamp(Number.isFinite(+l.opacity)?+l.opacity:1,0,1);ctx.globalCompositeOperation=BLENDS[l.blend]||'source-over';ctx.drawImage(canvas,-w/2,-h/2,w,h);ctx.restore();
    }catch(err){throw new Error(`Layer ${l.name||l.text||l.shape||l.id}: ${err?.message||err}`)}
  }
  const mime=kind==='jpg'?'image/jpeg':'image/png',quality=kind==='jpg'?.94:undefined;
  return blobFromCanvas(out,mime,quality);
}
