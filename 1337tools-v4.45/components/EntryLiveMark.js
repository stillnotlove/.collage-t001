'use client';

import {useEffect,useRef} from 'react';
import {hashSeed,mulberry32} from '../lib/editorCore';

const ASCII_VARIANTS=['glyph','block','braille','square'];

function makeCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c}
function clamp01(v){return Math.max(0,Math.min(1,v))}
function smoothstep(v){v=clamp01(v);return v*v*(3-2*v)}

export default function EntryLiveMark(){
  const ref=useRef(null);

  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;
    let raf=0,ro=null,disposed=false,resizeDirty=true,pauseAt=0;
    let size={w:1,h:1,dpr:1};
    let base=makeCanvas(1,1),sample=makeCanvas(1,1),sliceFrame=makeCanvas(1,1),asciiA=makeCanvas(1,1),asciiB=makeCanvas(1,1);
    const sessionSeed=Math.floor(Math.random()*1e9);
    let cycle=0,cycleData=null;
    let phase='cleanHold',phaseStart=performance.now(),phaseDuration=2400;
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    function resize(){
      const r=canvas.getBoundingClientRect();if(r.width<2||r.height<2)return false;
      const dpr=Math.max(.7,Math.min(1.35,window.devicePixelRatio||1,1800/Math.max(1,r.width),1100/Math.max(1,r.height)));
      const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
      if(w===size.w&&h===size.h&&dpr===size.dpr)return false;
      size={w,h,dpr};canvas.width=w;canvas.height=h;
      base=makeCanvas(w,h);sliceFrame=makeCanvas(w,h);asciiA=makeCanvas(w,h);asciiB=makeCanvas(w,h);sample=makeCanvas(1,1);
      drawBase();cycleData=null;return true;
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

    function renderSlice(target,seed,amount=1){
      const {w,h}=size,ctx=target.getContext('2d'),rnd=mulberry32(hashSeed(`${seed}:slice`));ctx.clearRect(0,0,w,h);
      const bands=11+Math.floor(rnd()*11),bh=h/bands,amp=w*(.012+rnd()*.022),direction=rnd()>.5?1:-1;
      for(let i=0;i<bands;i++){
        const y=i*bh;
        const wave=Math.sin((i/bands)*Math.PI*1.18 + rnd()*0.8)*direction;
        const rhythm=(i%3===0?1:i%3===1?-.7:.42);
        const offset=(wave*.55+rhythm*.45)*(.45+rnd()*.55)*amp*amount;
        const lift=(rnd()-.5)*bh*.08*amount;
        ctx.globalAlpha=.97;
        ctx.drawImage(base,0,y,w,bh,offset,y+lift,w,bh+.6);
      }
      ctx.globalAlpha=1;
    }

    function renderAscii(target,seed,variant='glyph'){
      const {w,h}=size,ctx=target.getContext('2d'),rnd=mulberry32(hashSeed(`${seed}:ascii:${variant}`));ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;
      ctx.globalAlpha=.09;ctx.drawImage(base,0,0);ctx.globalAlpha=1;
      const cellBase=variant==='braille'?6.0:variant==='square'?7.2:variant==='block'?8.2:6.8;
      const cell=Math.max(5,Math.round((cellBase+rnd()*(variant==='braille'?3.5:4.8))*size.dpr));
      const cols=Math.max(1,Math.ceil(w/cell)),rows=Math.max(1,Math.ceil(h/cell));
      if(sample.width!==cols||sample.height!==rows){sample.width=cols;sample.height=rows}
      const sx=sample.getContext('2d',{willReadFrequently:true});sx.clearRect(0,0,cols,rows);sx.drawImage(base,0,0,cols,rows);const px=sx.getImageData(0,0,cols,rows).data;
      const charsets={glyph:[...'@#%*+=-:.'],square:[...'■▪▫·'],block:[...'█▓▒░'],braille:[...'⣿⣷⣯⣟⣛⣚⣀']};
      const chars=charsets[variant]||charsets.glyph;
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.font=`700 ${cell*(variant==='braille'?1.22:1.05)}px IBM Plex Mono, Courier New, monospace`;
      for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
        const q=(gy*cols+gx)*4,a=px[q+3]/255;if(a<.07)continue;
        const lum=(px[q]*.2126+px[q+1]*.7152+px[q+2]*.0722)/255;
        const idx=Math.min(chars.length-1,Math.max(0,Math.floor((1-lum)*(chars.length-1)+rnd()*.45)));
        if(a<.16&&rnd()>.84)continue;
        ctx.globalAlpha=.64+.34*a;ctx.fillText(chars[idx]||chars[0],(gx+.5)*cell,(gy+.5)*cell);
      }
      ctx.globalAlpha=1;
    }

    function chooseAsciiPair(rnd){
      const first=ASCII_VARIANTS[Math.floor(rnd()*ASCII_VARIANTS.length)];
      const pool=ASCII_VARIANTS.filter(v=>v!==first);
      const second=pool[Math.floor(rnd()*pool.length)];
      return [first,second];
    }

    function buildCycle(){
      const rnd=mulberry32(hashSeed(`${sessionSeed}:${cycle}:cycle`));
      const [variantA,variantB]=chooseAsciiPair(rnd);
      const sliceSeed=Math.floor(rnd()*1e9),asciiSeedA=Math.floor(rnd()*1e9),asciiSeedB=Math.floor(rnd()*1e9);
      renderAscii(asciiA,asciiSeedA,variantA);
      renderSlice(sliceFrame,sliceSeed,1);
      renderAscii(asciiB,asciiSeedB,variantB);
      cycleData={sliceSeed,variantA,variantB};
    }

    function duration(tag,min,max){
      const rnd=mulberry32(hashSeed(`${sessionSeed}:${cycle}:${tag}`));return min+rnd()*(max-min);
    }

    function nextPhase(now){
      if(phase==='cleanHold'){
        buildCycle();phase='cleanToAsciiA';phaseStart=now;phaseDuration=duration('cleanToAsciiA',1050,1550);return;
      }
      if(phase==='cleanToAsciiA'){
        phase='asciiAHold';phaseStart=now;phaseDuration=duration('asciiAHold',560,960);return;
      }
      if(phase==='asciiAHold'){
        phase='asciiToSlice';phaseStart=now;phaseDuration=duration('asciiToSlice',1000,1500);return;
      }
      if(phase==='asciiToSlice'){
        phase='sliceHold';phaseStart=now;phaseDuration=duration('sliceHold',420,720);return;
      }
      if(phase==='sliceHold'){
        phase='sliceToAsciiB';phaseStart=now;phaseDuration=duration('sliceToAsciiB',1050,1550);return;
      }
      if(phase==='sliceToAsciiB'){
        phase='asciiBHold';phaseStart=now;phaseDuration=duration('asciiBHold',640,1040);return;
      }
      if(phase==='asciiBHold'){
        phase='returnClean';phaseStart=now;phaseDuration=duration('returnClean',1450,2200);return;
      }
      cycle++;cycleData=null;phase='cleanHold';phaseStart=now;phaseDuration=duration('cleanHold',1700,2800);
    }

    function mix(ctx,a,b,p){ctx.globalAlpha=1-p;ctx.drawImage(a,0,0);ctx.globalAlpha=p;ctx.drawImage(b,0,0);ctx.globalAlpha=1}

    function frame(now){
      if(disposed)return;
      if(resizeDirty){
        resizeDirty=false;
        const changed=resize();
        if(changed){phase='cleanHold';phaseStart=now;phaseDuration=1900;cycleData=null}
      }
      const ctx=canvas.getContext('2d');ctx.clearRect(0,0,size.w,size.h);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.imageSmoothingEnabled=true;
      if(reduced){ctx.drawImage(base,0,0);return}
      let guard=0;
      while((now-phaseStart)>=phaseDuration&&guard++<12)nextPhase(phaseStart+phaseDuration);
      const p=smoothstep((now-phaseStart)/Math.max(1,phaseDuration));
      if(phase==='cleanHold'||!cycleData)ctx.drawImage(base,0,0);
      else if(phase==='cleanToAsciiA')mix(ctx,base,asciiA,p);
      else if(phase==='asciiAHold')ctx.drawImage(asciiA,0,0);
      else if(phase==='asciiToSlice')mix(ctx,asciiA,sliceFrame,p);
      else if(phase==='sliceHold')ctx.drawImage(sliceFrame,0,0);
      else if(phase==='sliceToAsciiB')mix(ctx,sliceFrame,asciiB,p);
      else if(phase==='asciiBHold')ctx.drawImage(asciiB,0,0);
      else mix(ctx,asciiB,base,p);
      ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
      raf=requestAnimationFrame(frame);
    }

    const drawStatic=()=>{const ctx=canvas.getContext('2d');ctx.clearRect(0,0,size.w,size.h);ctx.drawImage(base,0,0)};
    const startNow=performance.now();resizeDirty=false;const initialSized=resize();phaseStart=startNow;phaseDuration=2400;
    if(reduced){if(initialSized||size.w>1)drawStatic()}else raf=requestAnimationFrame(frame);
    const markResize=()=>{
      resizeDirty=true;
      if(reduced){resizeDirty=false;if(resize())drawStatic()}
    };
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
