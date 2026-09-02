'use client';

import {useEffect,useRef} from 'react';
import {hashSeed,mulberry32} from '../lib/editorCore';

const ASCII_VARIANTS=['glyph','block','braille','square'];
const SLICE_VARIANTS=['bands','wide','micro'];
const ROUTE_TEMPLATES=[
  ['ascii','slice','ascii'],
  ['slice','ascii','echo'],
  ['echo','ascii','slice'],
  ['ascii','echo','ascii'],
  ['slice','echo','ascii'],
  ['echo','slice','ascii'],
];

function makeCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c}
function clamp01(v){return Math.max(0,Math.min(1,v))}
function smootherstep(v){v=clamp01(v);return v*v*v*(v*(v*6-15)+10)}

export default function EntryLiveMark(){
  const ref=useRef(null);

  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;
    let raf=0,ro=null,disposed=false,resizeDirty=true,pauseAt=0;
    let size={w:1,h:1,dpr:1};
    let base=makeCanvas(1,1),sample=makeCanvas(1,1),frameA=makeCanvas(1,1),frameB=makeCanvas(1,1),frameC=makeCanvas(1,1);
    const sessionSeed=Math.floor(Math.random()*1e9),sessionStart=performance.now();
    let cycle=0,nodes=[],nodeIndex=0,phase='hold',phaseStart=sessionStart,phaseDuration=2200;
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    function resize(){
      const r=canvas.getBoundingClientRect();if(r.width<2||r.height<2)return false;
      const dpr=Math.max(.72,Math.min(1.35,window.devicePixelRatio||1,1900/Math.max(1,r.width),1150/Math.max(1,r.height)));
      const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
      if(w===size.w&&h===size.h&&dpr===size.dpr)return false;
      size={w,h,dpr};canvas.width=w;canvas.height=h;
      base=makeCanvas(w,h);sample=makeCanvas(1,1);frameA=makeCanvas(w,h);frameB=makeCanvas(w,h);frameC=makeCanvas(w,h);
      drawBase();buildCycle();nodeIndex=0;return true;
    }

    function drawBase(){
      const {w,h}=size,ctx=base.getContext('2d');ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;
      const portrait=h>w,maxWidth=w*(portrait?.90:.80),maxHeight=h*(portrait?.24:.35);
      let fs=Math.min(maxHeight,w*.20),total=0,metrics={ascent:0,descent:0};
      for(let n=0;n<8;n++){
        ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;
        const oneM=ctx.measureText('1'),restM=ctx.measureText('337'),one=oneM.width,rest=restM.width,kern=-fs*.043;
        ctx.font=`300 ${fs}px Helvetica Neue, Helvetica, Arial, sans-serif`;
        const toolsM=ctx.measureText('tools'),tools=toolsM.width,gap=fs*.055;
        total=one+rest+kern+gap+tools;
        metrics={ascent:Math.max(oneM.actualBoundingBoxAscent||fs*.72,restM.actualBoundingBoxAscent||fs*.72,toolsM.actualBoundingBoxAscent||fs*.72),descent:Math.max(oneM.actualBoundingBoxDescent||fs*.12,restM.actualBoundingBoxDescent||fs*.12,toolsM.actualBoundingBoxDescent||fs*.12)};
        const textH=metrics.ascent+metrics.descent,fit=Math.min(maxWidth/Math.max(1,total),maxHeight/Math.max(1,textH),1);
        if(fit>.997)break;fs*=fit;
      }
      ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;
      const oneM=ctx.measureText('1'),restM=ctx.measureText('337'),oneW=oneM.width,restW=restM.width,kern=-fs*.043;
      ctx.font=`300 ${fs}px Helvetica Neue, Helvetica, Arial, sans-serif`;
      const toolsM=ctx.measureText('tools'),toolsW=toolsM.width,gap=fs*.055;
      metrics={ascent:Math.max(oneM.actualBoundingBoxAscent||fs*.72,restM.actualBoundingBoxAscent||fs*.72,toolsM.actualBoundingBoxAscent||fs*.72),descent:Math.max(oneM.actualBoundingBoxDescent||fs*.12,restM.actualBoundingBoxDescent||fs*.12,toolsM.actualBoundingBoxDescent||fs*.12)};
      total=oneW+restW+kern+gap+toolsW;
      const baseline=h/2+(metrics.ascent-metrics.descent)/2;
      let x=(w-total)/2;
      ctx.textBaseline='alphabetic';ctx.fillStyle='#fff';
      ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;ctx.fillText('1',x,baseline);x+=oneW+kern;ctx.fillText('337',x,baseline);x+=restW+gap;
      ctx.font=`300 ${fs}px Helvetica Neue, Helvetica, Arial, sans-serif`;ctx.fillText('tools',x,baseline);
      const d=Math.max(5,Math.min(13,fs*.043));ctx.save();ctx.translate(Math.min(w-d*2,x+toolsW+d*2.2),baseline+metrics.descent+d*.65);ctx.rotate(Math.PI/4);ctx.fillStyle='#ffd800';ctx.fillRect(-d/2,-d/2,d,d);ctx.restore();
    }

    function renderAscii(target,desc){
      const {w,h}=size,ctx=target.getContext('2d'),rnd=mulberry32(hashSeed(`${desc.seed}:ascii:${desc.variant}`));ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;
      ctx.globalAlpha=.08;ctx.drawImage(base,0,0);ctx.globalAlpha=1;
      const cellBase=desc.variant==='braille'?6.0:desc.variant==='square'?7.2:desc.variant==='block'?8.2:6.8;
      const cell=Math.max(5,Math.round((cellBase+rnd()*(desc.variant==='braille'?3.5:4.8))*size.dpr));
      const cols=Math.max(1,Math.ceil(w/cell)),rows=Math.max(1,Math.ceil(h/cell));
      if(sample.width!==cols||sample.height!==rows){sample.width=cols;sample.height=rows}
      const sx=sample.getContext('2d',{willReadFrequently:true});sx.clearRect(0,0,cols,rows);sx.drawImage(base,0,0,cols,rows);const px=sx.getImageData(0,0,cols,rows).data;
      const charsets={glyph:[...'@#%*+=-:.'],square:[...'■▪▫·'],block:[...'█▓▒░'],braille:[...'⣿⣷⣯⣟⣛⣚⣀']};
      const chars=charsets[desc.variant]||charsets.glyph;
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.font=`700 ${cell*(desc.variant==='braille'?1.22:1.05)}px IBM Plex Mono, Courier New, monospace`;
      for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
        const q=(gy*cols+gx)*4,a=px[q+3]/255;if(a<.07)continue;
        const lum=(px[q]*.2126+px[q+1]*.7152+px[q+2]*.0722)/255;
        const idx=Math.min(chars.length-1,Math.max(0,Math.floor((1-lum)*(chars.length-1)+rnd()*.45)));
        if(a<.16&&rnd()>.84)continue;
        ctx.globalAlpha=.64+.34*a;ctx.fillText(chars[idx]||chars[0],(gx+.5)*cell,(gy+.5)*cell);
      }
      ctx.globalAlpha=1;
    }

    function renderSliceSource(target,source,desc,timeSec,intensity=1){
      const {w,h}=size,ctx=target.getContext('2d'),rnd=mulberry32(hashSeed(`${desc.seed}:slice:${desc.variant}`));ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;
      const bands=desc.variant==='wide'?8+Math.floor(rnd()*6):desc.variant==='micro'?18+Math.floor(rnd()*10):11+Math.floor(rnd()*10);
      const bh=h/bands;
      const baseAmp=desc.variant==='wide'?w*.030:desc.variant==='micro'?w*.013:w*.021;
      const amp=baseAmp*(.72+rnd()*.55),speed=.42+rnd()*.22,globalPhase=rnd()*Math.PI*2;
      const pulse=.32+.68*(.5-.5*Math.cos(timeSec*Math.PI*2*speed+globalPhase));
      for(let i=0;i<bands;i++){
        const y=i*bh,bandPhase=rnd()*Math.PI*2,dir=i%2===0?1:-1;
        const profile=(.44+.56*Math.sin((i/(Math.max(1,bands-1)))*Math.PI));
        const stagger=.7+.3*Math.sin(timeSec*(1.15+rnd()*.35)+bandPhase);
        const offset=dir*amp*profile*pulse*stagger*intensity;
        const lift=Math.sin(timeSec*.85+bandPhase)*bh*.055*pulse*intensity;
        ctx.globalAlpha=.975;ctx.drawImage(source,0,y,w,bh,offset,y+lift,w,bh+.65);
      }
      ctx.globalAlpha=1;
    }

    function renderSlice(target,desc,timeSec,intensity=1){renderSliceSource(target,base,desc,timeSec,intensity)}

    function renderEchoSource(target,source,desc,timeSec,intensity=1){
      const {w,h}=size,ctx=target.getContext('2d'),rnd=mulberry32(hashSeed(`${desc.seed}:echo`));ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;
      const copies=4+Math.floor(rnd()*4),axis=rnd()>.5?1:-1,spread=w*(.004+rnd()*.007),speed=.45+rnd()*.18;
      const pulse=.35+.65*(.5-.5*Math.cos(timeSec*Math.PI*2*speed+rnd()*Math.PI*2));
      ctx.globalAlpha=1;ctx.drawImage(source,0,0);
      for(let i=1;i<=copies;i++){
        const k=i/copies,dx=axis*spread*i*pulse*intensity,dy=Math.sin(timeSec*.65+i*.9)*h*.0025*i*intensity;
        ctx.globalAlpha=(.14*(1-k)+.035)*intensity;ctx.drawImage(source,dx,dy,w,h);
      }
      ctx.globalAlpha=1;
    }

    function renderEcho(target,desc,timeSec,intensity=1){renderEchoSource(target,base,desc,timeSec,intensity)}

    function makeDescriptor(kind,rnd,usedAscii){
      const seed=Math.floor(rnd()*1e9);
      if(kind==='ascii'){
        const available=ASCII_VARIANTS.filter(v=>!usedAscii.has(v));
        const pool=available.length?available:ASCII_VARIANTS;
        const variant=pool[Math.floor(rnd()*pool.length)];usedAscii.add(variant);return {kind,variant,seed,frame:null};
      }
      if(kind==='slice')return {kind,variant:SLICE_VARIANTS[Math.floor(rnd()*SLICE_VARIANTS.length)],seed};
      return {kind:'echo',seed};
    }

    function buildCycle(){
      const rnd=mulberry32(hashSeed(`${sessionSeed}:${cycle}:route`));
      const template=ROUTE_TEMPLATES[Math.floor(rnd()*ROUTE_TEMPLATES.length)],usedAscii=new Set();
      const route=template.map(kind=>makeDescriptor(kind,rnd,usedAscii));
      for(const desc of route)if(desc.kind==='ascii'){
        desc.frame=makeCanvas(size.w,size.h);renderAscii(desc.frame,desc);
      }
      nodes=[{kind:'clean'},...route,{kind:'clean'}];
    }

    function holdDuration(desc){
      const rnd=mulberry32(hashSeed(`${sessionSeed}:${cycle}:hold:${nodeIndex}:${desc.kind}`));
      if(desc.kind==='clean')return 1750+rnd()*1100;
      if(desc.kind==='slice')return 1200+rnd()*650;
      if(desc.kind==='echo')return 900+rnd()*550;
      return 760+rnd()*520;
    }

    function transitionDuration(from,to){
      const rnd=mulberry32(hashSeed(`${sessionSeed}:${cycle}:transition:${nodeIndex}:${from.kind}:${to.kind}`));
      if((from.kind==='slice'||from.kind==='echo')&&to.kind==='ascii')return 1500+rnd()*520;
      return 1050+rnd()*650;
    }

    function renderNode(desc,target,timeSec,intensity=1){
      const ctx=target.getContext('2d');ctx.clearRect(0,0,size.w,size.h);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.imageSmoothingEnabled=true;
      if(!desc||desc.kind==='clean'){ctx.drawImage(base,0,0);return}
      if(desc.kind==='ascii'){ctx.drawImage(desc.frame,0,0);return}
      if(desc.kind==='slice'){renderSlice(target,desc,timeSec,intensity);return}
      renderEcho(target,desc,timeSec,intensity);
    }

    function mix(ctx,a,b,p){ctx.globalAlpha=1-p;ctx.drawImage(a,0,0);ctx.globalAlpha=p;ctx.drawImage(b,0,0);ctx.globalAlpha=1}

    function drawAsciiReveal(ctx,asciiFrame,p,seed,reverse=false){
      // Reveal/erase glyphs in staggered strips so the new effect is already forming
      // while the previous physical motion is still visibly active.
      const {w,h}=size,rnd=mulberry32(hashSeed(`${seed}:ascii-reveal`));
      const horizontal=rnd()>.24,count=horizontal?14+Math.floor(rnd()*8):18+Math.floor(rnd()*8);
      for(let i=0;i<count;i++){
        const stagger=rnd()*.30 + (i/count)*.08;
        const local=smootherstep(clamp01((p-stagger)/Math.max(.18,.66-stagger)));
        const alpha=reverse?1-local:local;
        if(alpha<=.008)continue;
        const drift=(1-local)*(rnd()-.5)*(horizontal?w*.010:h*.010);
        ctx.globalAlpha=alpha;
        if(horizontal){
          const y=Math.floor(i*h/count),hh=Math.ceil(h/count)+1;
          ctx.drawImage(asciiFrame,0,y,w,hh,drift,y,w,hh);
        }else{
          const x=Math.floor(i*w/count),ww=Math.ceil(w/count)+1;
          ctx.drawImage(asciiFrame,x,0,ww,h,x,drift,ww,h);
        }
      }
      ctx.globalAlpha=1;
    }

    function renderSliceIntoAscii(ctx,from,asciiFrame,p,timeSec){
      // Slice geometry never stops. Each moving band changes material from clean wordmark
      // to ASCII at its own moment, then the same offsets settle continuously to zero.
      const {w,h}=size,rnd=mulberry32(hashSeed(`${from.seed}:slice:${from.variant}`));
      const bands=from.variant==='wide'?8+Math.floor(rnd()*6):from.variant==='micro'?18+Math.floor(rnd()*10):11+Math.floor(rnd()*10);
      const bh=h/bands;
      const baseAmp=from.variant==='wide'?w*.030:from.variant==='micro'?w*.013:w*.021;
      const amp=baseAmp*(.72+rnd()*.55),speed=.42+rnd()*.22,globalPhase=rnd()*Math.PI*2;
      const pulse=.32+.68*(.5-.5*Math.cos(timeSec*Math.PI*2*speed+globalPhase));
      const settle=smootherstep(clamp01((p-.56)/.44));
      const motion=1-settle;
      ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;
      for(let i=0;i<bands;i++){
        const y=i*bh,bandPhase=rnd()*Math.PI*2,dir=i%2===0?1:-1;
        const profile=.44+.56*Math.sin((i/Math.max(1,bands-1))*Math.PI);
        const staggerMotion=.7+.3*Math.sin(timeSec*(1.15+rnd()*.35)+bandPhase);
        const offset=dir*amp*profile*pulse*staggerMotion*motion;
        const lift=Math.sin(timeSec*.85+bandPhase)*bh*.055*pulse*motion;
        // Spatially stagger the material conversion, but keep the exact same displaced band.
        const order=i/Math.max(1,bands-1);
        const wave=.08*Math.sin(order*Math.PI*3+globalPhase);
        const local=smootherstep(clamp01((p-(.05+order*.16+wave))/.64));
        const dy=y+lift;
        if(local<.999){ctx.globalAlpha=.975*(1-local);ctx.drawImage(base,0,y,w,bh,offset,dy,w,bh+.8)}
        if(local>.001){ctx.globalAlpha=.975*local;ctx.drawImage(asciiFrame,0,y,w,bh,offset,dy,w,bh+.8)}
      }
      // Only at the very end do we lock to the exact static ASCII raster; this is a sub-frame settle,
      // not a state switch, because almost every band is already ASCII by this point.
      const lock=smootherstep(clamp01((p-.92)/.08));
      if(lock>0){ctx.globalAlpha=lock;ctx.drawImage(asciiFrame,0,0)}
      ctx.globalAlpha=1;
    }

    function renderEchoIntoAscii(ctx,from,asciiFrame,p,timeSec){
      // Echo copies keep travelling while each copy changes from clean pixels to glyphs.
      // The far echoes convert first, so the trail visually collapses into the ASCII source.
      const {w,h}=size,rnd=mulberry32(hashSeed(`${from.seed}:echo`));
      const copies=4+Math.floor(rnd()*4),axis=rnd()>.5?1:-1,spread=w*(.004+rnd()*.007),speed=.45+rnd()*.18;
      const pulse=.35+.65*(.5-.5*Math.cos(timeSec*Math.PI*2*speed+rnd()*Math.PI*2));
      const settle=smootherstep(clamp01((p-.58)/.42));
      const motion=1-settle;
      ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;

      // Trail first: same copy, same position, same alpha — only its source material morphs.
      for(let i=copies;i>=1;i--){
        const k=i/copies,dx=axis*spread*i*pulse*motion,dy=Math.sin(timeSec*.65+i*.9)*h*.0025*i*motion;
        const alpha=(.14*(1-k)+.035)*motion;
        const local=smootherstep(clamp01((p-(.02+(1-k)*.15))/.62));
        if(local<.999){ctx.globalAlpha=alpha*(1-local);ctx.drawImage(base,dx,dy,w,h)}
        if(local>.001){ctx.globalAlpha=alpha*local;ctx.drawImage(asciiFrame,dx,dy,w,h)}
      }

      // Main wordmark converts a little later than the echoes, preserving continuity and depth.
      const core=smootherstep(clamp01((p-.12)/.68));
      if(core<.999){ctx.globalAlpha=1-core;ctx.drawImage(base,0,0)}
      if(core>.001){ctx.globalAlpha=core;ctx.drawImage(asciiFrame,0,0)}
      const lock=smootherstep(clamp01((p-.93)/.07));
      if(lock>0){ctx.globalAlpha=lock;ctx.drawImage(asciiFrame,0,0)}
      ctx.globalAlpha=1;
    }

    function morphMotionIntoAscii(ctx,from,asciiFrame,p,timeSec){
      if(from.kind==='slice')renderSliceIntoAscii(ctx,from,asciiFrame,p,timeSec);
      else renderEchoIntoAscii(ctx,from,asciiFrame,p,timeSec);
    }

    function overlapOutOfAscii(ctx,asciiFrame,motionFrame,p,seed){
      // The physical effect starts underneath before ASCII has finished dissolving.
      const motionIn=smootherstep(clamp01((p-.02)/.74));
      ctx.globalAlpha=motionIn;ctx.drawImage(motionFrame,0,0);
      drawAsciiReveal(ctx,asciiFrame,clamp01((p-.26)/.74),seed,true);
      ctx.globalAlpha=1;
    }

    function overlapMotionToMotion(ctx,fromFrame,toFrame,p){
      // Both effects stay alive for the middle of the transition instead of freezing/crossfading.
      const out=1-smootherstep(clamp01((p-.58)/.42));
      const incoming=smootherstep(clamp01((p-.06)/.76));
      ctx.globalAlpha=.30+.70*out;ctx.drawImage(fromFrame,0,0);
      ctx.globalAlpha=incoming;ctx.drawImage(toFrame,0,0);
      ctx.globalAlpha=1;
    }

    function advance(now){
      if(phase==='hold'){
        if(nodeIndex===nodes.length-1){cycle++;buildCycle();nodeIndex=0;phase='hold';phaseStart=now;phaseDuration=holdDuration(nodes[0]);return}
        phase='transition';phaseStart=now;phaseDuration=transitionDuration(nodes[nodeIndex],nodes[nodeIndex+1]);return;
      }
      nodeIndex++;phase='hold';phaseStart=now;phaseDuration=holdDuration(nodes[nodeIndex]);
    }

    function frame(now){
      if(disposed)return;
      if(resizeDirty){resizeDirty=false;const changed=resize();if(changed){nodeIndex=0;phase='hold';phaseStart=now;phaseDuration=1900}}
      const ctx=canvas.getContext('2d');ctx.clearRect(0,0,size.w,size.h);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.imageSmoothingEnabled=true;
      if(reduced){ctx.drawImage(base,0,0);return}
      let guard=0;while((now-phaseStart)>=phaseDuration&&guard++<12)advance(phaseStart+phaseDuration);
      const raw=clamp01((now-phaseStart)/Math.max(1,phaseDuration)),p=smootherstep(raw),timeSec=(now-sessionStart)/1000;
      if(phase==='hold')renderNode(nodes[nodeIndex],canvas,timeSec,1);
      else{
        const from=nodes[nodeIndex],to=nodes[nodeIndex+1];
        const fromIsMotion=from.kind==='slice'||from.kind==='echo';
        const toIsMotion=to.kind==='slice'||to.kind==='echo';
        const intoAscii=fromIsMotion&&to.kind==='ascii';
        const outOfAscii=from.kind==='ascii'&&toIsMotion;

        // Dynamic effects keep moving through the transition instead of freezing into a still.
        // Into-ASCII is special: ASCII becomes the source of the outgoing motion itself.
        const fromIntensity=fromIsMotion?(intoAscii?1:(.42+.58*(1-p))):1;
        const toIntensity=toIsMotion?(outOfAscii?(.35+.65*p):(.38+.62*p)):1;
        if(!intoAscii)renderNode(from,frameA,timeSec,fromIntensity);
        renderNode(to,frameB,timeSec,toIntensity);

        const transitionSeed=(from.seed||0)^(to.seed||0)^hashSeed(`${cycle}:${nodeIndex}:${from.kind}:${to.kind}`);
        if(intoAscii)morphMotionIntoAscii(ctx,from,frameB,p,timeSec);
        else if(outOfAscii)overlapOutOfAscii(ctx,frameA,frameB,p,transitionSeed);
        else if(fromIsMotion&&toIsMotion)overlapMotionToMotion(ctx,frameA,frameB,p);
        else mix(ctx,frameA,frameB,p);
      }
      ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';raf=requestAnimationFrame(frame);
    }

    const drawStatic=()=>{const ctx=canvas.getContext('2d');ctx.clearRect(0,0,size.w,size.h);ctx.drawImage(base,0,0)};
    resizeDirty=false;resize();buildCycle();nodeIndex=0;phase='hold';phaseStart=performance.now();phaseDuration=2200;
    if(reduced)drawStatic();else raf=requestAnimationFrame(frame);
    const markResize=()=>{resizeDirty=true;if(reduced){resizeDirty=false;if(resize())drawStatic()}};
    if(typeof ResizeObserver!=='undefined'){ro=new ResizeObserver(markResize);ro.observe(canvas)}
    window.addEventListener('resize',markResize);
    const onVisibility=()=>{
      if(document.hidden){pauseAt=performance.now();cancelAnimationFrame(raf);raf=0;return}
      const now=performance.now();if(pauseAt){phaseStart+=now-pauseAt;pauseAt=0}
      resizeDirty=true;if(!reduced&&!raf)raf=requestAnimationFrame(frame);
    };
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{disposed=true;cancelAnimationFrame(raf);ro?.disconnect();window.removeEventListener('resize',markResize);document.removeEventListener('visibilitychange',onVisibility)};
  },[]);

  return <canvas ref={ref} className="entryLiveCanvas" aria-hidden="true"/>;
}
