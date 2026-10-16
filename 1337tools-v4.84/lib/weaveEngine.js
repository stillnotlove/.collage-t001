import {clamp, hashSeed, mulberry32} from './editorCore';

export const WEAVE_MODES=['STRIPS','GRID','WAVES'];
export const WEAVE_DEFAULT_VIEW={scale:100,x:0,y:0};
export const WEAVE_DEFAULT_PARAMS={mode:'STRIPS',direction:'VERTICAL',count:18,gap:8,mix:50,softness:8,amplitude:18,frequency:22,phase:0,jitter:0};

export const createWeaveCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};

function fitDraw(ctx,image,view,w,h,transparent=false){
  ctx.clearRect(0,0,w,h);
  if(!transparent){ctx.fillStyle='#f5f3ed';ctx.fillRect(0,0,w,h)}
  if(!image)return;
  const iw=image.naturalWidth||image.width||1, ih=image.naturalHeight||image.height||1;
  const fit=Math.min(w/iw,h/ih), z=Math.max(.1,(+view.scale||100)/100);
  const drawW=iw*fit*z, drawH=ih*fit*z;
  const x=(w-drawW)/2 + (+view.x||0)/100*w;
  const y=(h-drawH)/2 + (+view.y||0)/100*h;
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
  ctx.drawImage(image,x,y,drawW,drawH);
}

function smoothstep(a,b,x){
  const t=clamp((x-a)/(b-a||1),0,1);
  return t*t*(3-2*t);
}

function patternValue(x,y,w,h,params,rand){
  const mode=params.mode||'STRIPS';
  const dir=params.direction||'VERTICAL';
  const count=Math.max(2,+params.count||12);
  const phase=(+params.phase||0)/100;
  const amp=(+params.amplitude||0)/100;
  const freq=(+params.frequency||0)/100;
  const jitter=(+params.jitter||0)/100;
  const gap=(+params.gap||0)/100;
  const duty=clamp((+params.mix||50)/100,.08,.92);
  const u=x/w,v=y/h;
  const n1=Math.sin((u*37.2+v*14.1+phase*5.1)*6.2831)*.5+.5;
  const n2=Math.sin((u*18.7-v*11.3+phase*3.7)*6.2831)*.5+.5;
  const jit=(n1*0.65+n2*0.35-.5)*jitter;
  let cell,local;
  if(mode==='GRID'){
    const cu=(u+phase+jit*0.22)*count;
    const cv=(v+phase*0.6-jit*0.18)*count;
    const iu=Math.floor(cu), iv=Math.floor(cv);
    const fu=cu-iu, fv=cv-iv;
    const choose=((iu+iv)&1)===0?1:0;
    const edge=Math.min(fu,1-fu,fv,1-fv);
    return {choose, edge};
  }
  if(dir==='VERTICAL'){
    const wave=mode==='WAVES' ? Math.sin((v*(1+freq*8)+phase*2)*Math.PI*2)*amp*0.38 : 0;
    cell=(u+wave+phase+jit*0.18)*count;
  }else{
    const wave=mode==='WAVES' ? Math.sin((u*(1+freq*8)+phase*2)*Math.PI*2)*amp*0.38 : 0;
    cell=(v+wave+phase+jit*0.18)*count;
  }
  const i=Math.floor(cell), f=cell-i;
  local=f;
  const open=Math.max(.05,1-gap*.85);
  const start=(1-open)/2;
  const end=1-start;
  const inBand=local>=start&&local<=end;
  const tNorm=inBand?(local-start)/Math.max(.0001,end-start):0;
  const choose=inBand && tNorm<duty ? 1 : 0;
  const edge=Math.min(Math.abs(tNorm-duty), Math.abs(local-start), Math.abs(local-end));
  return {choose, edge};
}

export function renderWeaveEffect(targetCanvas,{imageA,imageB,viewA=WEAVE_DEFAULT_VIEW,viewB=WEAVE_DEFAULT_VIEW,params=WEAVE_DEFAULT_PARAMS,transparent=false}){
  const w=targetCanvas.width,h=targetCanvas.height;
  const ca=createWeaveCanvas(w,h), cb=createWeaveCanvas(w,h);
  fitDraw(ca.getContext('2d',{willReadFrequently:true}),imageA,viewA,w,h,transparent);
  fitDraw(cb.getContext('2d',{willReadFrequently:true}),imageB,viewB,w,h,transparent);
  const da=ca.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h);
  const db=cb.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h);
  const out=new ImageData(w,h);
  const soft=(+params.softness||0)/100;
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const {choose,edge}=patternValue(x,y,w,h,params);
      let t=choose?1:0;
      if(soft>0){
        const radius=(.002 + soft*.045);
        const blend=smoothstep(0,radius,edge);
        t = choose ? 1-(1-blend)*.5 : (1-blend)*.5;
      }
      const i=(y*w+x)*4;
      const a=t,b=1-t;
      out.data[i]=Math.round(da.data[i]*a + db.data[i]*b);
      out.data[i+1]=Math.round(da.data[i+1]*a + db.data[i+1]*b);
      out.data[i+2]=Math.round(da.data[i+2]*a + db.data[i+2]*b);
      out.data[i+3]=Math.round(da.data[i+3]*a + db.data[i+3]*b);
    }
  }
  targetCanvas.getContext('2d').putImageData(out,0,0);
}

export function renderWeavePreview(canvas,args){
  renderWeaveEffect(canvas,args);
  const ctx=canvas.getContext('2d');
  ctx.save();
  ctx.fillStyle='rgba(255,255,255,.88)';
  ctx.font=`700 ${Math.max(10,canvas.width*.015)}px monospace`;
  ctx.textAlign='left';ctx.textBaseline='top';
  ctx.fillText(args.params.mode,12,12);
  ctx.fillText(args.params.direction,12,28);
  ctx.restore();
}

export function exportWeaveCanvas({imageA,imageB,ratio,viewA,viewB,params,transparent=false}){
  const c=createWeaveCanvas(ratio.width,ratio.height);
  renderWeaveEffect(c,{imageA,imageB,viewA,viewB,params,transparent});
  return c;
}

export function randomizeWeave(seed){
  const rand=mulberry32(hashSeed(seed));
  const modes=WEAVE_MODES;
  return {
    mode:modes[Math.floor(rand()*modes.length)],
    direction:rand()>.5?'VERTICAL':'HORIZONTAL',
    count:Math.round(8+rand()*28),
    gap:Math.round(rand()*26),
    mix:Math.round(28+rand()*44),
    softness:Math.round(rand()*26),
    amplitude:Math.round(rand()*46),
    frequency:Math.round(8+rand()*48),
    phase:Math.round(rand()*100),
    jitter:Math.round(rand()*24),
  };
}
