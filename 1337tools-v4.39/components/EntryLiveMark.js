'use client';

import {useEffect,useRef} from 'react';
import {hashSeed,mulberry32} from '../lib/editorCore';

const EFFECTS=['slice','ascii','asciiSquare','asciiBraille','asciiBlock','echo','pixel','columns','distress'];
const ROUTES=[
  ['slice','asciiBlock','echo'],
  ['columns','asciiBraille','distress'],
  ['asciiSquare','slice','pixel'],
  ['echo','ascii','columns'],
  ['pixel','distress','asciiBlock'],
  ['slice','echo','asciiBraille'],
];

function makeCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c}
function clamp01(v){return Math.max(0,Math.min(1,v))}
function smoothstep(v){v=clamp01(v);return v*v*(3-2*v)}

export default function EntryLiveMark(){
  const ref=useRef(null);

  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;
    let raf=0,ro=null,disposed=false;
    let size={w:1,h:1,dpr:1};
    let base=makeCanvas(1,1),sample=makeCanvas(1,1);
    const sessionSeed=Math.floor(Math.random()*1e9);
    let cycle=0;
    let phase='cleanHold';
    let phaseStart=performance.now();
    let phaseDuration=2800;
    let route=[];
    let routeFrames=[];
    let routeIndex=0;
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    function resize(){
      const r=canvas.getBoundingClientRect();if(r.width<2||r.height<2)return false;
      const dpr=Math.max(.68,Math.min(1,window.devicePixelRatio||1,1600/Math.max(1,r.width),900/Math.max(1,r.height)));
      const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
      if(w===size.w&&h===size.h&&dpr===size.dpr)return false;
      size={w,h,dpr};canvas.width=w;canvas.height=h;base=makeCanvas(w,h);sample=makeCanvas(1,1);routeFrames=[];drawBase();return true;
    }

    function drawBase(){
      const {w,h}=size,ctx=base.getContext('2d');ctx.clearRect(0,0,w,h);
      const portrait=h>w,maxWidth=w*(portrait?.90:.80),maxHeight=h*(portrait?.22:.34);
      let fs=Math.min(maxHeight,w*.20),total=0,metrics={ascent:0,descent:0};
      for(let n=0;n<7;n++){
        ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;
        const oneM=ctx.measureText('1'),restM=ctx.measureText('337'),one=oneM.width,rest=restM.width,kern=-fs*.043;
        ctx.font=`300 ${fs}px Helvetica Neue, Helvetica, Arial, sans-serif`;
        const toolsM=ctx.measureText('tools'),tools=toolsM.width,gap=fs*.055;
        total=one+rest+kern+gap+tools;
        metrics={ascent:Math.max(oneM.actualBoundingBoxAscent||fs*.72,restM.actualBoundingBoxAscent||fs*.72,toolsM.actualBoundingBoxAscent||fs*.72),descent:Math.max(oneM.actualBoundingBoxDescent||fs*.12,restM.actualBoundingBoxDescent||fs*.12,toolsM.actualBoundingBoxDescent||fs*.12)};
        const textH=metrics.ascent+metrics.descent,fit=Math.min(maxWidth/Math.max(1,total),maxHeight/Math.max(1,textH),1);
        if(fit>.995)break;fs*=fit;
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
      const d=Math.max(5,Math.min(13,fs*.043));ctx.save();ctx.translate(Math.min(w-d*2,x+toolsW+d*2.25),baseline+metrics.descent+d*.65);ctx.rotate(Math.PI/4);ctx.fillStyle='#ffd800';ctx.fillRect(-d/2,-d/2,d,d);ctx.restore();
    }

    function renderSlice(target,seed){
      const {w,h}=size,ctx=target.getContext('2d'),rnd=mulberry32(hashSeed(`${seed}:slice`));ctx.clearRect(0,0,w,h);
      const bands=10+Math.floor(rnd()*11),bh=h/bands,amp=w*(.012+rnd()*.024);
      for(let i=0;i<bands;i++){
        const y=i*bh,offset=((i%2?1:-1)*(.25+rnd()*.75))*amp;
        ctx.globalAlpha=.92+.08*rnd();ctx.drawImage(base,0,y,w,bh,offset,y,w,bh);
      }
      ctx.globalAlpha=1;
    }

    function renderEcho(target,seed){
      const {w,h}=size,ctx=target.getContext('2d'),rnd=mulberry32(hashSeed(`${seed}:echo`));ctx.clearRect(0,0,w,h);
      const copies=3+Math.floor(rnd()*3),amp=w*(.003+rnd()*.006);
      for(let i=copies;i>=1;i--){ctx.globalAlpha=.05+.04*(copies-i);ctx.drawImage(base,(i%2?1:-1)*amp*i,(i-copies/2)*h*.002)}
      ctx.globalAlpha=1;ctx.drawImage(base,0,0);
    }

    function renderDistress(target,seed){
      const {w,h}=size,ctx=target.getContext('2d'),rnd=mulberry32(hashSeed(`${seed}:distress`));ctx.clearRect(0,0,w,h);ctx.drawImage(base,0,0);
      ctx.globalCompositeOperation='destination-out';
      const cuts=24+Math.floor(rnd()*28);
      for(let i=0;i<cuts;i++){
        const horizontal=rnd()>.28,x=rnd()*w,y=rnd()*h,ww=horizontal?w*(.008+rnd()*.045):size.dpr*(1+rnd()*2),hh=horizontal?size.dpr*(1+rnd()*3):h*(.008+rnd()*.05);
        ctx.globalAlpha=.35+rnd()*.55;ctx.fillRect(x,y,ww,hh);
      }
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
    }

    function renderAscii(target,seed,variant='glyph'){
      const {w,h}=size,ctx=target.getContext('2d'),rnd=mulberry32(hashSeed(`${seed}:ascii:${variant}`));ctx.clearRect(0,0,w,h);
      const cellBase=variant==='braille'?6.2:variant==='square'?7.8:variant==='block'?8.8:7.2;
      const cell=Math.max(5,Math.round((cellBase+rnd()*(variant==='braille'?4:6))*size.dpr));
      const cols=Math.max(1,Math.ceil(w/cell)),rows=Math.max(1,Math.ceil(h/cell));
      if(sample.width!==cols||sample.height!==rows){sample.width=cols;sample.height=rows}
      const sx=sample.getContext('2d',{willReadFrequently:true});sx.clearRect(0,0,cols,rows);sx.drawImage(base,0,0,cols,rows);const px=sx.getImageData(0,0,cols,rows).data;
      const charsets={glyph:[...'@#%*+=-:.'],square:[...'■▪▫·'],block:[...'█▓▒░'],braille:[...'⣿⣷⣯⣟⣛⣚⣀']};
      const chars=charsets[variant]||charsets.glyph;
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.font=`700 ${cell*(variant==='braille'?1.25:1.08)}px IBM Plex Mono, Courier New, monospace`;
      for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
        const q=(gy*cols+gx)*4,a=px[q+3]/255;if(a<.08)continue;
        const lum=(px[q]*.2126+px[q+1]*.7152+px[q+2]*.0722)/255;
        const idx=Math.min(chars.length-1,Math.max(0,Math.floor((1-lum)*(chars.length-1)+rnd()*.5)));
        if(a<.18&&rnd()>.78)continue;
        ctx.globalAlpha=.62+.38*a;ctx.fillText(chars[idx]||chars[0],(gx+.5)*cell,(gy+.5)*cell);
      }
      ctx.globalAlpha=1;
    }

    function renderPixel(target,seed){
      const {w,h}=size,ctx=target.getContext('2d'),rnd=mulberry32(hashSeed(`${seed}:pixel`));ctx.clearRect(0,0,w,h);
      const block=Math.max(7,Math.round((8+rnd()*14)*size.dpr)),sw=Math.max(1,Math.round(w/block)),sh=Math.max(1,Math.round(h/block));
      if(sample.width!==sw||sample.height!==sh){sample.width=sw;sample.height=sh}
      const sx=sample.getContext('2d');sx.clearRect(0,0,sw,sh);sx.drawImage(base,0,0,sw,sh);
      ctx.imageSmoothingEnabled=false;ctx.drawImage(sample,0,0,sw,sh,0,0,w,h);ctx.imageSmoothingEnabled=true;
    }

    function renderColumns(target,seed){
      const {w,h}=size,ctx=target.getContext('2d'),rnd=mulberry32(hashSeed(`${seed}:columns`));ctx.clearRect(0,0,w,h);
      const cols=14+Math.floor(rnd()*14),cw=w/cols,amp=h*(.018+rnd()*.025);
      for(let i=0;i<cols;i++){const x=i*cw,dy=(i%2?1:-1)*amp*(.25+rnd()*.75);ctx.globalAlpha=.93+.07*rnd();ctx.drawImage(base,x,0,cw+1,h,x,dy,cw+1,h)}ctx.globalAlpha=1;
    }

    function renderEffect(target,effect,seed){
      if(effect==='slice')renderSlice(target,seed);
      else if(effect==='ascii')renderAscii(target,seed,'glyph');
      else if(effect==='asciiSquare')renderAscii(target,seed,'square');
      else if(effect==='asciiBraille')renderAscii(target,seed,'braille');
      else if(effect==='asciiBlock')renderAscii(target,seed,'block');
      else if(effect==='echo')renderEcho(target,seed);
      else if(effect==='pixel')renderPixel(target,seed);
      else if(effect==='columns')renderColumns(target,seed);
      else renderDistress(target,seed);
    }

    function buildRoute(){
      const rnd=mulberry32(hashSeed(`${sessionSeed}:${cycle}:route`));
      const template=ROUTES[Math.floor(rnd()*ROUTES.length)];
      route=[...template];
      if(rnd()>.72){
        const swap=EFFECTS[Math.floor(rnd()*EFFECTS.length)];
        const at=Math.floor(rnd()*route.length);
        if(!route.includes(swap))route[at]=swap;
      }
      routeFrames=route.map((effect,index)=>{
        const frame=makeCanvas(size.w,size.h);
        renderEffect(frame,effect,Math.floor(rnd()*1e9)+index*997+cycle*41);
        return frame;
      });
      routeIndex=0;
    }

    function timing(tag,min,max){
      const rnd=mulberry32(hashSeed(`${sessionSeed}:${cycle}:${tag}:${routeIndex}`));
      return min+rnd()*(max-min);
    }

    function advance(now){
      if(phase==='cleanHold'){
        buildRoute();
        phase='transitionIn';phaseStart=now;phaseDuration=timing('in',850,1250);return;
      }
      if(phase==='transitionIn'){
        phase='effectHold';phaseStart=now;phaseDuration=timing('hold',620,980);return;
      }
      if(phase==='effectHold'){
        if(routeIndex<routeFrames.length-1){
          phase='transitionBetween';phaseStart=now;phaseDuration=timing('between',720,1180);return;
        }
        phase='transitionOut';phaseStart=now;phaseDuration=timing('out',1300,1900);return;
      }
      if(phase==='transitionBetween'){
        routeIndex=Math.min(routeFrames.length-1,routeIndex+1);
        phase='effectHold';phaseStart=now;phaseDuration=timing('hold',560,900);return;
      }
      cycle++;
      route=[];routeFrames=[];routeIndex=0;
      phase='cleanHold';phaseStart=now;phaseDuration=timing('clean',2400,3800);
    }

    function mix(ctx,a,b,p){
      ctx.globalAlpha=1-p;ctx.drawImage(a,0,0);
      ctx.globalAlpha=p;ctx.drawImage(b,0,0);
      ctx.globalAlpha=1;
    }

    function frame(now){
      if(disposed)return;
      const changed=resize();
      if(changed){
        phase='cleanHold';phaseStart=now;phaseDuration=1800;route=[];routeFrames=[];routeIndex=0;
      }
      const ctx=canvas.getContext('2d');ctx.clearRect(0,0,size.w,size.h);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
      if(reduced){ctx.drawImage(base,0,0);return}

      if((now-phaseStart)>=phaseDuration)advance(now);
      const p=smoothstep((now-phaseStart)/Math.max(1,phaseDuration));
      const current=routeFrames[routeIndex];
      if(phase==='cleanHold'||!routeFrames.length){
        ctx.drawImage(base,0,0);
      }else if(phase==='transitionIn'){
        mix(ctx,base,routeFrames[0],p);
      }else if(phase==='effectHold'){
        ctx.drawImage(current||base,0,0);
      }else if(phase==='transitionBetween'){
        const next=routeFrames[Math.min(routeFrames.length-1,routeIndex+1)]||base;
        mix(ctx,current||base,next,p);
      }else{
        mix(ctx,current||base,base,p);
      }
      ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
      raf=requestAnimationFrame(frame);
    }

    resize();drawBase();phaseStart=performance.now();phaseDuration=2200;
    if(reduced){const ctx=canvas.getContext('2d');ctx.drawImage(base,0,0)}else raf=requestAnimationFrame(frame);
    if(typeof ResizeObserver!=='undefined'){ro=new ResizeObserver(()=>resize());ro.observe(canvas)}
    const onResize=()=>resize();window.addEventListener('resize',onResize);
    return()=>{disposed=true;cancelAnimationFrame(raf);ro?.disconnect();window.removeEventListener('resize',onResize)};
  },[]);

  return <canvas ref={ref} className="entryLiveCanvas" aria-hidden="true"/>;
}
