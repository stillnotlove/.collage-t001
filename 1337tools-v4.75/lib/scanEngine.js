// SCAN v1. Pure canvas pipeline: optical capture -> tone -> scanner defects -> paper.
// No remote uploads; every operation is processed in the visitor's browser.
import {clamp,hashSeed,mulberry32} from './editorCore';

export const SCAN_PRESETS={
  FLATBED:{intensity:50,exposure:0,contrast:12,threshold:0,grain:12,streaks:10,dust:14,banding:6,skew:0.25,wobble:6,softness:14,lidShadow:12,edgeFade:10},
  OFFICE:{intensity:75,exposure:-6,contrast:43,threshold:43,grain:30,streaks:38,dust:22,banding:27,skew:0.45,wobble:24,softness:12,lidShadow:28,edgeFade:27},
  'COPY OF COPY':{intensity:85,exposure:-9,contrast:55,threshold:62,grain:45,streaks:40,dust:30,banding:38,skew:0.7,wobble:31,softness:18,lidShadow:22,edgeFade:32}
};
export const SCAN_MODES=Object.keys(SCAN_PRESETS);
export const SCAN_PAPER=['#f0ede4','#ffffff','#ddd8ca','#f4f0e6'];

export function createScanCanvas(w,h){
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w));canvas.height=Math.max(1,Math.round(h));return canvas;
}

// Intended to be deterministic for fixed source / params / seed / generation.
export function renderScan(canvas,{image,params,seed=1,generation=0,view={scale:100,x:0,y:0},paper='#f0ede4',output='B/W',transparent=false}={}){
  if(!canvas || !canvas.width || !canvas.height)throw new Error('Invalid SCAN canvas');
  const w=canvas.width,h=canvas.height,ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw new Error('Canvas 2D context unavailable');
  const p={...SCAN_PRESETS.FLATBED,...params};
  const strength=clamp((+p.intensity||0)/100,0,1),refScale=Math.min(w/1200,h/1200),safeSeed=hashSeed(`SCAN-${seed}`);
  const random=mulberry32(hashSeed(`${safeSeed}:page:${generation}`));
  const fixed=mulberry32(hashSeed(`${safeSeed}:machine`));
  const work=createScanCanvas(w,h),wc=work.getContext('2d',{willReadFrequently:true});
  wc.fillStyle=paper;wc.fillRect(0,0,w,h);
  if(image){
    const iw=image.naturalWidth||image.width||1,ih=image.naturalHeight||image.height||1;
    const fit=Math.min(w/iw,h/ih),zoom=clamp((+view.scale||100)/100,.1,6),dw=iw*fit*zoom,dh=ih*fit*zoom;
    const dx=(w-dw)/2+clamp(+view.x||0,-100,100)/100*w*.42;
    const dy=(h-dh)/2+clamp(+view.y||0,-100,100)/100*h*.42;
    const angle=clamp(+p.skew||0,-5,5)*Math.PI/180*strength;
    wc.save();wc.translate(w/2,h/2);wc.rotate(angle);wc.translate(-w/2,-h/2);
    wc.imageSmoothingEnabled=true;wc.imageSmoothingQuality='high';
    wc.filter=`blur(${Math.max(0,(+p.softness||0)/100)*2.5*refScale*strength}px)`;
    wc.drawImage(image,dx,dy,dw,dh);wc.filter='none';wc.restore();
  }
  // Exposure & contrast operate on scanned luminance, not on a texture overlay.
  const src=wc.getImageData(0,0,w,h),dst=ctx.createImageData(w,h),s=src.data,d=dst.data;
  const exposure=clamp(+p.exposure||0,-80,80)*1.0*strength;
  const contrast=1+clamp(+p.contrast||0,-80,100)/100*1.55*strength;
  const threshold=clamp(+p.threshold||0,0,100)/100*strength;
  const toner=clamp(+p.grain||0,0,100)/100*strength;
  const streaks=clamp(+p.streaks||0,0,100)/100*strength;
  const banding=clamp(+p.banding||0,0,100)/100*strength;
  const wobble=clamp(+p.wobble||0,0,100)/100*strength;
  const isBw=output==='B/W';
  // A fixed seeded scan head produces recurring vertical streaks on every pass.
  const streakColumns=Array.from({length:Math.max(2,Math.round(6+streaks*44))},()=>({
    x:fixed()*w,width:Math.max(0.8,(1+fixed()*3)*refScale),dark:fixed()*.26*streaks
  }));
  // Per-line scanner instability; no layout shifts in the page component itself.
  const lineShift=new Int16Array(h),lineShade=new Float32Array(h);
  const scanPhase=fixed()*Math.PI*2,driftPhase=fixed()*Math.PI*2;
  for(let y=0;y<h;y++){
    const yn=y/Math.max(1,h),jitter=(random()-.5)*w*.004*wobble;
    lineShift[y]=Math.round((Math.sin(yn*29+scanPhase)*w*.0035*wobble+Math.sin(yn*4+driftPhase)*w*.005*wobble+jitter));
    const periodic=Math.sin(yn*160+scanPhase)*.5+.5;
    lineShade[y]=1-(banding*(.05+.17*periodic))*(.35+.65*random());
  }
  for(let y=0;y<h;y++){
    const row=y*w,offset=lineShift[y],shade=lineShade[y];
    for(let x=0;x<w;x++){
      const dest=(row+x)*4,sx=clamp(x-offset,0,w-1),i=(row+sx)*4;
      let r=s[i],g=s[i+1],b=s[i+2];
      r=clamp((r-127.5)*contrast+127.5+exposure,0,255);
      g=clamp((g-127.5)*contrast+127.5+exposure,0,255);
      b=clamp((b-127.5)*contrast+127.5+exposure,0,255);
      const luma=.2126*r+.7152*g+.0722*b;
      if(isBw){
        // Stronger office thresholding eats midtones while FLATBED stays tonal.
        const hard=luma>=127.5?255:0;
        const value=luma*(1-threshold)+hard*threshold;
        r=g=b=value;
      }else if(threshold>0){
        const levels=Math.max(2,Math.round(14-threshold*10));
        const quant=v=>Math.round(v/255*(levels-1))*255/(levels-1);
        r=r*(1-threshold*.45)+quant(r)*threshold*.45;
        g=g*(1-threshold*.45)+quant(g)*threshold*.45;
        b=b*(1-threshold*.45)+quant(b)*threshold*.45;
      }
      // Toner speckle only consumes ink; it cannot randomly brighten the paper.
      const density=1-(r+g+b)/(3*255),speckle=random();
      if(speckle<toner*density*.23){r*=.45;g*=.45;b*=.45}
      const gnoise=(random()-.5)*toner*(10+25*density);
      let stripe=1;
      if(streaks>0){
        // Sparse stripes are evaluated as 1D printer-head defects.
        const u=(x/w)*13.0+scanPhase;
        const wave=Math.abs(Math.sin(u*11.9)*Math.sin(u*2.2));
        if(wave>.91)stripe-=streaks*.16*(wave-.91)/.09;
      }
      const dark=shade*stripe;
      d[dest]=clamp((r+gnoise)*dark,0,255);
      d[dest+1]=clamp((g+gnoise)*dark,0,255);
      d[dest+2]=clamp((b+gnoise)*dark,0,255);
      d[dest+3]=255;
    }
  }
  ctx.putImageData(dst,0,0);
  if(streaks>0){
    ctx.save();for(const c of streakColumns){ctx.fillStyle=`rgba(12,12,12,${clamp(c.dark,0,.34)})`;ctx.fillRect(c.x,0,c.width,h)}ctx.restore();
  }
  // Glass marks retain their locations for the lifetime of one machine seed.
  const dust=clamp(+p.dust||0,0,100)/100*strength;
  if(dust>0){
    const count=Math.round((w*h/100000)*dust*130),maxR=Math.max(1,1.5*refScale);
    ctx.save();ctx.fillStyle=`rgba(20,19,18,${.12+.46*dust})`;
    for(let i=0;i<count;i++){const x=fixed()*w,y=fixed()*h,r=maxR*(.24+fixed()*1.15);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
    const countScratches=Math.round(8*dust);
    for(let i=0;i<countScratches;i++){
      const x=fixed()*w,y=fixed()*h,len=h*(.05+fixed()*.40);
      ctx.strokeStyle=`rgba(20,19,18,${.07+.16*dust})`;ctx.lineWidth=Math.max(.5,.65*refScale);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(fixed()-.5)*w*.012,y+len);ctx.stroke();
    }ctx.restore();
  }
  const fade=clamp(+p.edgeFade||0,0,100)/100*strength,shadow=clamp(+p.lidShadow||0,0,100)/100*strength;
  if(fade>0){
    const grad=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.15,w/2,h/2,Math.max(w,h)*.78);
    grad.addColorStop(0,'rgba(0,0,0,0)');grad.addColorStop(1,`rgba(0,0,0,${.70*fade})`);
    ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  }
  if(shadow>0){
    const grd=ctx.createLinearGradient(0,0,w*.16,0);
    grd.addColorStop(0,`rgba(8,8,9,${shadow*.75})`);grd.addColorStop(1,'rgba(8,8,9,0)');
    ctx.fillStyle=grd;ctx.fillRect(0,0,w*.16,h);
  }
  // PNG alpha: key out light paper without changing the RGB scan content.
  if(transparent){
    const img=ctx.getImageData(0,0,w,h),a=img.data;
    for(let i=0;i<a.length;i+=4){
      const luma=.2126*a[i]+.7152*a[i+1]+.0722*a[i+2];
      a[i+3]=Math.round(255*clamp((248-luma)/85,0,1));
    }
    ctx.putImageData(img,0,0);
  }
  return canvas;
}
