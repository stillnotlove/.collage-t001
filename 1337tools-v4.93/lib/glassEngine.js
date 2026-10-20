import {clamp, hashSeed, mulberry32} from './editorCore';

export const GLASS_MODES=['CLEAR','PRISM','LIQUID','SATIN'];
export const GLASS_DEFAULT_VIEW={scale:100,x:0,y:0};
export const GLASS_DEFAULT_LENSES=[
  {id:'lens-a',x:34,y:42,radius:24,strength:58,softness:68,swirl:0,aberration:12,ellipseX:1,ellipseY:1.08},
  {id:'lens-b',x:66,y:58,radius:18,strength:42,softness:72,swirl:12,aberration:18,ellipseX:1.05,ellipseY:.96},
];
export const GLASS_DEFAULT_PARAMS={mode:'CLEAR',detail:54,edge:26,grain:8,background:0};

export const createGlassCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};

export function renderGlassSource(canvas,{image,view=GLASS_DEFAULT_VIEW,transparent=false}){
  const ctx=canvas.getContext('2d',{willReadFrequently:true}),w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  if(!transparent){ctx.fillStyle='#f5f3ed';ctx.fillRect(0,0,w,h)}
  if(!image)return;
  const iw=image.naturalWidth||image.width||1,ih=image.naturalHeight||image.height||1;
  const fit=Math.min(w/iw,h/ih);
  const z=Math.max(.1,(+view.scale||100)/100);
  const drawW=iw*fit*z,drawH=ih*fit*z;
  const x=(w-drawW)/2 + (+view.x||0)/100*w;
  const y=(h-drawH)/2 + (+view.y||0)/100*h;
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(image,x,y,drawW,drawH);
}

function sampleBilinear(data,w,h,x,y,out){
  x=clamp(x,0,w-1); y=clamp(y,0,h-1);
  const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(w-1,x0+1),y1=Math.min(h-1,y0+1),tx=x-x0,ty=y-y0;
  const i00=(y0*w+x0)*4,i10=(y0*w+x1)*4,i01=(y1*w+x0)*4,i11=(y1*w+x1)*4;
  for(let c=0;c<4;c++){
    const a=data[i00+c]*(1-tx)+data[i10+c]*tx;
    const b=data[i01+c]*(1-tx)+data[i11+c]*tx;
    out[c]=a*(1-ty)+b*ty;
  }
  return out;
}

function applyOpticalLens(source,dest,w,h,lens,params,mode){
  const cx=lens.x/100*w,cy=lens.y/100*h,rad=Math.max(12,lens.radius/100*Math.min(w,h));
  const rx=rad*Math.max(.55,lens.ellipseX||1),ry=rad*Math.max(.55,lens.ellipseY||1);
  const left=Math.max(0,Math.floor(cx-rx-5)),right=Math.min(w-1,Math.ceil(cx+rx+5)),top=Math.max(0,Math.floor(cy-ry-5)),bottom=Math.min(h-1,Math.ceil(cy+ry+5));
  const power=(lens.strength||0)/100,soft=(lens.softness||0)/100,swirl=(lens.swirl||0)/100*2.8,ab=(lens.aberration||0)/100;
  const detail=(params.detail||0)/100,edge=(params.edge||0)/100,grain=(params.grain||0)/100;
  const rv=new Float64Array(4),gv=new Float64Array(4),bv=new Float64Array(4);
  for(let y=top;y<=bottom;y++){
    for(let x=left;x<=right;x++){
      const nx=(x-cx)/rx,ny=(y-cy)/ry,r2=nx*nx+ny*ny;if(r2>1)continue;const r=Math.sqrt(r2);
      const fall=Math.pow(1-r,1.4-soft*.85);
      const curve=mode==='PRISM'?1.45:mode==='LIQUID'?0.88:1.08;
      const disp=(.28+curve*power)*fall*rad*(.42+.58*detail);
      const angle=swirl*fall*fall;
      const cs=Math.cos(angle),sn=Math.sin(angle);
      const dx=(x-cx)*cs-(y-cy)*sn,dy=(x-cx)*sn+(y-cy)*cs;
      const srcX=x-dx/rad*disp,srcY=y-dy/rad*disp;
      const fringe=ab*fall*rad*.06*(mode==='PRISM'?1.35:1);
      sampleBilinear(source,w,h,srcX+fringe,srcY,rv);
      sampleBilinear(source,w,h,srcX,srcY,gv);
      sampleBilinear(source,w,h,srcX-fringe,srcY,bv);
      const idx=(y*w+x)*4;
      let rr=rv[0],gg=gv[1],bb=bv[2],aa=(rv[3]+gv[3]+bv[3])/3;
      const rim=Math.max(0,1-Math.abs(r-.88)/.12)*edge;
      const centerGlow=Math.max(0,1-r/.92)*(mode==='CLEAR'?.04:mode==='PRISM'?.08:.06)*255;
      const noise=((Math.sin((x*12.9898+y*78.233+cx*.14+cy*.09))*43758.5453)%1)*grain*12;
      rr=clamp(rr + rim*52 + centerGlow + noise,0,255);
      gg=clamp(gg + rim*56 + centerGlow + noise,0,255);
      bb=clamp(bb + rim*68 + centerGlow + noise,0,255);
      if(mode==='PRISM'){ rr=clamp(rr+fall*18,0,255); bb=clamp(bb+fall*26,0,255); }
      if(mode==='LIQUID'){ rr=clamp(rr*0.98,0,255); gg=clamp(gg*1.02,0,255); bb=clamp(bb*1.05,0,255); }
      dest[idx]=rr;dest[idx+1]=gg;dest[idx+2]=bb;dest[idx+3]=aa;
    }
  }
}

function applySatinLens(source,dest,w,h,lens,params){
  const cx=lens.x/100*w,cy=lens.y/100*h,rad=Math.max(12,lens.radius/100*Math.min(w,h));
  const rx=rad*Math.max(.55,lens.ellipseX||1),ry=rad*Math.max(.55,lens.ellipseY||1);
  const left=Math.max(0,Math.floor(cx-rx-5)),right=Math.min(w-1,Math.ceil(cx+rx+5)),top=Math.max(0,Math.floor(cy-ry-5)),bottom=Math.min(h-1,Math.ceil(cy+ry+5));
  const power=(lens.strength||0)/100,soft=(lens.softness||0)/100,swirl=(lens.swirl||0)/100*2.8;
  const detail=(params.detail||0)/100,edge=(params.edge||0)/100,grain=(params.grain||0)/100;
  const frostMult=1.05;
  const desat=.16;
  const c1=new Float64Array(4),c2=new Float64Array(4),c3=new Float64Array(4);
  for(let y=top;y<=bottom;y++){
    for(let x=left;x<=right;x++){
      const nx=(x-cx)/rx,ny=(y-cy)/ry,r2=nx*nx+ny*ny;if(r2>1)continue;const r=Math.sqrt(r2);
      const fall=Math.pow(1-r,1.28-soft*.78);
      const idx=(y*w+x)*4;
      const scatter=frostMult*(.45+power*1.25)*fall*rad*(.22+detail*.5);
      const angle=(Math.sin((x-cx)*0.063)+Math.cos((y-cy)*0.051))*1.57 + swirl*fall;
      const jitterX=Math.cos(angle)*scatter + Math.sin((y+cx)*0.11)*scatter*0.18;
      const jitterY=Math.sin(angle)*scatter + Math.cos((x+cy)*0.09)*scatter*0.18;
      sampleBilinear(source,w,h,x+jitterX,y+jitterY,c1);
      sampleBilinear(source,w,h,x-jitterY*.55,y+jitterX*.55,c2);
      sampleBilinear(source,w,h,x+jitterX*.35,y-jitterY*.35,c3);
      let rr=(c1[0]+c2[0]+c3[0])/3, gg=(c1[1]+c2[1]+c3[1])/3, bb=(c1[2]+c2[2]+c3[2])/3, aa=(c1[3]+c2[3]+c3[3])/3;
      const lum=.2126*rr+.7152*gg+.0722*bb;
      rr=rr*(1-desat)+lum*desat; gg=gg*(1-desat)+lum*desat; bb=bb*(1-desat)+lum*desat;
      const rim=Math.max(0,1-Math.abs(r-.88)/.12)*edge*1.04;
      const haze=Math.max(0,1-r/.98)*.06*255;
      const noise=((Math.sin((x*12.9898+y*78.233+cx*.14+cy*.09))*43758.5453)%1)*grain*10;
      rr=clamp(rr + rim*44 + haze + noise,0,255);
      gg=clamp(gg + rim*46 + haze + noise,0,255);
      bb=clamp(bb + rim*52 + haze + noise,0,255);
      dest[idx]=rr;dest[idx+1]=gg;dest[idx+2]=bb;dest[idx+3]=aa;
    }
  }
}

function applyLens(source,dest,w,h,lens,params,mode){
  if(mode==='SATIN') return applySatinLens(source,dest,w,h,lens,params);
  return applyOpticalLens(source,dest,w,h,lens,params,mode);
}

export function renderGlassEffect(targetCanvas,{image,view=GLASS_DEFAULT_VIEW,lenses=GLASS_DEFAULT_LENSES,params=GLASS_DEFAULT_PARAMS,transparent=false}){
  const w=targetCanvas.width,h=targetCanvas.height;
  const base=createGlassCanvas(w,h); renderGlassSource(base,{image,view,transparent});
  const bctx=base.getContext('2d',{willReadFrequently:true});
  const src=bctx.getImageData(0,0,w,h); const out=new ImageData(new Uint8ClampedArray(src.data),w,h);
  const mode=params.mode||'CLEAR';
  for(const lens of lenses) applyLens(src.data,out.data,w,h,lens,params,mode);
  const ctx=targetCanvas.getContext('2d'); ctx.clearRect(0,0,w,h); ctx.putImageData(out,0,0);
  return {baseCanvas:base};
}

export function renderGlassPreview(canvas,{image,view,lenses,params,selectedId=null,dragging=false,showGuides=true}){
  renderGlassEffect(canvas,{image,view,lenses,params,transparent:false});
  if(!showGuides)return;
  const ctx=canvas.getContext('2d');
  for(const lens of lenses){
    const selected=lens.id===selectedId; const rad=Math.max(12,lens.radius/100*Math.min(canvas.width,canvas.height));
    const rx=rad*Math.max(.55,lens.ellipseX||1),ry=rad*Math.max(.55,lens.ellipseY||1);
    const x=lens.x/100*canvas.width,y=lens.y/100*canvas.height;
    ctx.save();
    ctx.strokeStyle=selected?'#ffd400':'rgba(255,255,255,.88)'; ctx.lineWidth=selected?2.2:1.2; ctx.setLineDash(selected?[7,5]:[5,6]);
    ctx.beginPath(); ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle=selected?'#ffd400':'#0f39f5';
    ctx.beginPath();ctx.arc(x,y,selected?5:4,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  if(dragging){ctx.save();ctx.fillStyle='rgba(255,212,0,.12)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();}
}

export function exportGlassCanvas({image,ratio,lenses,params,view,transparent=false}){
  const out=createGlassCanvas(ratio.width,ratio.height);
  renderGlassEffect(out,{image,view,lenses,params,transparent});
  return out;
}

export function randomizeGlass(seed){
  const rand=mulberry32(hashSeed(seed));
  const count=1+Math.floor(rand()*3);
  const modes=GLASS_MODES;
  const params={
    mode:modes[Math.floor(rand()*modes.length)],
    detail:Math.round(38+rand()*50), edge:Math.round(16+rand()*54), grain:Math.round(rand()*18), background:0,
  };
  const lenses=[];
  for(let i=0;i<count;i++){
    lenses.push({
      id:`lens-${i}-${Math.floor(rand()*9999)}`,
      x:Math.round(22+rand()*56), y:Math.round(24+rand()*52), radius:Math.round(12+rand()*20),
      strength:Math.round(26+rand()*52), softness:Math.round(54+rand()*34), swirl:Math.round(-30+rand()*60), aberration:Math.round(rand()*30),
      ellipseX:Number((0.8+rand()*0.5).toFixed(2)), ellipseY:Number((0.8+rand()*0.5).toFixed(2)),
    });
  }
  return {params,lenses};
}
