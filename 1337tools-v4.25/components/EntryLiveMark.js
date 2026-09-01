'use client';

import {useEffect,useRef} from 'react';
import {hashSeed,mulberry32} from '../lib/editorCore';

const ROUTES=[
  ['asciiSquare','asciiBraille','rebuildGlyph'],
  ['slice','asciiBlock','rebuildSlice'],
  ['columns','asciiSquare','ascii','rebuildColumns'],
  ['echo','asciiBraille','rebuildSoft'],
  ['distress','asciiSquare','asciiBraille','rebuildGlyph'],
  ['pixel','asciiBlock','rebuildColumns'],
  ['ascii','distress','asciiSquare','rebuildSoft'],
  ['slice','columns','asciiBraille','rebuildSlice'],
  ['asciiBraille','echo','asciiBlock','rebuildGlyph'],
  ['columns','pixel','asciiSquare','rebuildColumns'],
  ['asciiBlock','ascii','distress','rebuildSoft'],
  ['echo','slice','asciiBraille','rebuildSlice'],
];
const EFFECTS=['slice','ascii','asciiSquare','asciiBraille','asciiBlock','distress','echo','pixel','columns'];
const REBUILDS=['rebuildGlyph','rebuildSlice','rebuildColumns','rebuildSoft'];


function makeCanvas(w,h){
  const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c;
}
function clamp01(v){return Math.max(0,Math.min(1,v))}
function smoothstep(v){v=clamp01(v);return v*v*(3-2*v)}

export default function EntryLiveMark(){
  const ref=useRef(null);

  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;
    let raf=0,ro=null,disposed=false;
    let size={w:1,h:1,dpr:1};
    let base=makeCanvas(1,1),workA=makeCanvas(1,1),workB=makeCanvas(1,1),sample=makeCanvas(1,1);
    const sessionSeed=Math.floor(Math.random()*1e9);
    let cycle=0,route=[],seeds=[],stage=-1,stageStart=performance.now()+700,stageDuration=1200,pauseUntil=stageStart;
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    function resize(){
      const r=canvas.getBoundingClientRect();if(r.width<2||r.height<2)return false;
      const dpr=Math.max(.65,Math.min(1.35,window.devicePixelRatio||1,1900/Math.max(1,r.width),1250/Math.max(1,r.height))),w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
      if(w===size.w&&h===size.h&&dpr===size.dpr)return false;
      size={w,h,dpr};canvas.width=w;canvas.height=h;base=makeCanvas(w,h);workA=makeCanvas(w,h);workB=makeCanvas(w,h);sample=makeCanvas(1,1);drawBase();return true;
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
        const textH=metrics.ascent+metrics.descent;
        const fit=Math.min(maxWidth/Math.max(1,total),maxHeight/Math.max(1,textH),1);
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

    function copy(target,source){const c=target.getContext('2d');c.clearRect(0,0,size.w,size.h);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.drawImage(source,0,0)}

    function renderSlice(target,source,seed,time,amount){
      const {w,h}=size,ctx=target.getContext('2d');ctx.clearRect(0,0,w,h);if(amount<=.001){ctx.drawImage(source,0,0);return}
      const rnd=mulberry32(hashSeed(`${seed}:slice`)),bands=10+Math.floor(rnd()*15),bh=h/bands,amp=w*(.012+rnd()*.032)*amount,phase=time*.00145;
      for(let i=0;i<bands;i++){
        const y=i*bh,offset=(Math.sin(i*1.73+phase)*.4+(rnd()-.5))*amp;
        ctx.globalAlpha=.94+.06*rnd();ctx.drawImage(source,0,y,w,bh,offset,y,w,bh);
      }
      if(amount>.42){ctx.globalAlpha=.08+.14*amount;for(let i=0;i<2;i++){const y=rnd()*h,hh=bh*(.35+rnd()*.9);ctx.drawImage(source,0,y,w,hh,(rnd()-.5)*amp*2.3,y,w,hh)}}ctx.globalAlpha=1;
    }

    function renderScan(target,source,seed,time,amount){
      const {w,h}=size,ctx=target.getContext('2d');ctx.clearRect(0,0,w,h);if(amount<=.001){ctx.drawImage(source,0,0);return}
      const rnd=mulberry32(hashSeed(`${seed}:scan`)),strip=Math.max(2,Math.round((2+rnd()*3)*size.dpr)),gap=Math.max(1,Math.round((1+rnd()*2)*size.dpr));
      for(let x=0;x<w;x+=strip+gap){const sway=Math.sin(x*.021+time*.002)*size.dpr*(.8+rnd()*1.7)*amount;ctx.globalAlpha=1-(.18+.22*rnd())*amount;ctx.drawImage(source,x,0,strip,h,x+sway,0,strip,h)}
      ctx.globalAlpha=1;
    }

    function renderEcho(target,source,seed,time,amount){
      const {w}=size,ctx=target.getContext('2d');ctx.clearRect(0,0,size.w,size.h);if(amount<=.001){ctx.drawImage(source,0,0);return}
      const rnd=mulberry32(hashSeed(`${seed}:echo`)),copies=2+Math.floor(rnd()*4),amp=w*(.002+rnd()*.006)*amount;
      for(let i=copies;i>=1;i--){const dx=Math.sin(time*.0013+i*1.7)*amp*i,dy=Math.cos(time*.001+i*.8)*amp*.35*i;ctx.globalAlpha=(.04+.09*(1-i/(copies+1)))*amount;ctx.drawImage(source,dx,dy)}
      ctx.globalAlpha=1;ctx.drawImage(source,0,0);
    }

    function renderDistress(target,source,seed,time,amount){
      const {w,h}=size,ctx=target.getContext('2d');ctx.clearRect(0,0,w,h);ctx.drawImage(source,0,0);if(amount<=.001)return;
      const rnd=mulberry32(hashSeed(`${seed}:distress`)),cuts=18+Math.floor(rnd()*48),visible=Math.max(0,Math.round(cuts*amount));
      ctx.globalCompositeOperation='destination-out';
      for(let i=0;i<visible;i++){
        const horizontal=rnd()>.25,x=rnd()*w,y=rnd()*h,ww=horizontal?w*(.008+rnd()*.065):size.dpr*(1+rnd()*3),hh=horizontal?size.dpr*(1+rnd()*4):h*(.01+rnd()*.08);ctx.globalAlpha=.32+rnd()*.68;ctx.fillRect(x,y,ww,hh);
      }
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.08+.09*amount;const shift=Math.sin(time*.004+seed*.0001)*w*.005*amount;ctx.drawImage(source,shift,0);ctx.globalAlpha=1;
    }

    function renderAscii(target,source,seed,time,amount,forcedVariant=null){
      const {w,h}=size,ctx=target.getContext('2d');ctx.clearRect(0,0,w,h);if(amount<=.001){ctx.drawImage(source,0,0);return}
      const rnd=mulberry32(hashSeed(`${seed}:ascii:${forcedVariant||'auto'}`));
      const variants=['glyph','square','braille','block'];
      const variant=forcedVariant||variants[Math.floor(rnd()*variants.length)];
      const cellBase=variant==='braille'?5.2:variant==='square'?6.6:variant==='block'?7.5:6.1;
      const cell=Math.max(4,Math.round((cellBase+rnd()*(variant==='braille'?5:7))*size.dpr));
      const cols=Math.max(1,Math.ceil(w/cell)),rows=Math.max(1,Math.ceil(h/cell));
      if(sample.width!==cols||sample.height!==rows){sample.width=cols;sample.height=rows}
      const sx=sample.getContext('2d',{willReadFrequently:true});sx.clearRect(0,0,cols,rows);sx.drawImage(source,0,0,cols,rows);const px=sx.getImageData(0,0,cols,rows).data;
      ctx.globalAlpha=.18+(1-amount)*.82;ctx.drawImage(source,0,0);ctx.globalAlpha=amount;
      const charsets={
        glyph:[...'@#%*+=-:.'],
        square:[...'■▪▫·'],
        block:[...'█▓▒░'],
        braille:[...'⣿⣷⣯⣟⣛⣚⣀'],
      };
      const chars=charsets[variant]||charsets.glyph;
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';
      const fontScale=variant==='braille'?1.28:variant==='square'?1.14:variant==='block'?1.07:1.06;
      ctx.font=`700 ${cell*fontScale}px IBM Plex Mono, Courier New, monospace`;
      const phase=time*.00075;
      for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
        const q=(gy*cols+gx)*4,a=px[q+3]/255;if(a<.045)continue;
        const lum=(px[q]*.2126+px[q+1]*.7152+px[q+2]*.0722)/255;
        const density=clamp01(a*(.74+(1-lum)*.34)+.035*Math.sin(gx*.31+gy*.23+phase));
        if(a<.11&&rnd()>.72+a*2.2)continue;
        const tone=1-lum;
        const idx=Math.min(chars.length-1,Math.max(0,Math.floor(tone*(chars.length-1)+rnd()*.65)));
        const ch=chars[idx]||chars[0];
        const x=(gx+.5)*cell,y=(gy+.5)*cell;
        const jitter=variant==='glyph'?(rnd()-.5)*cell*.08:0;
        ctx.globalAlpha=amount*(.55+.45*density);ctx.fillText(ch,x+jitter,y);
      }
      ctx.globalAlpha=1;
    }


    function renderPixel(target,source,seed,time,amount){
      const {w,h}=size,ctx=target.getContext('2d');ctx.clearRect(0,0,w,h);if(amount<=.001){ctx.drawImage(source,0,0);return}
      const rnd=mulberry32(hashSeed(`${seed}:pixel`)),block=Math.max(5,Math.round((5+rnd()*18)*size.dpr*(.45+amount*.85))),sw=Math.max(1,Math.round(w/block)),sh=Math.max(1,Math.round(h/block));
      if(sample.width!==sw||sample.height!==sh){sample.width=sw;sample.height=sh}
      const sx=sample.getContext('2d');sx.clearRect(0,0,sw,sh);sx.drawImage(source,0,0,sw,sh);
      ctx.imageSmoothingEnabled=false;ctx.globalAlpha=amount;ctx.drawImage(sample,0,0,sw,sh,0,0,w,h);ctx.globalAlpha=1-amount;ctx.drawImage(source,0,0);ctx.globalAlpha=1;ctx.imageSmoothingEnabled=true;
    }

    function renderColumns(target,source,seed,time,amount){
      const {w,h}=size,ctx=target.getContext('2d');ctx.clearRect(0,0,w,h);if(amount<=.001){ctx.drawImage(source,0,0);return}
      const rnd=mulberry32(hashSeed(`${seed}:columns`)),cols=12+Math.floor(rnd()*20),cw=w/cols,amp=h*(.012+rnd()*.045)*amount;
      for(let i=0;i<cols;i++){const x=i*cw,dy=(Math.sin(i*1.31+time*.0016)+(rnd()-.5)*.9)*amp;ctx.globalAlpha=.92+.08*rnd();ctx.drawImage(source,x,0,cw+1,h,x,dy,cw+1,h)}ctx.globalAlpha=1;
    }



    function applyEffect(target,source,name,seed,time,amount){
      if(name==='slice')renderSlice(target,source,seed,time,amount);
      else if(name==='ascii')renderAscii(target,source,seed,time,amount);
      else if(name==='asciiSquare')renderAscii(target,source,seed,time,amount,'square');
      else if(name==='asciiBraille')renderAscii(target,source,seed,time,amount,'braille');
      else if(name==='asciiBlock')renderAscii(target,source,seed,time,amount,'block');
      else if(name==='scan')renderScan(target,source,seed,time,amount);
      else if(name==='distress')renderDistress(target,source,seed,time,amount);
      else if(name==='pixel')renderPixel(target,source,seed,time,amount);
      else if(name==='columns')renderColumns(target,source,seed,time,amount);
      else renderEcho(target,source,seed,time,amount);
    }


    function renderRebuild(target,source,seed,time,amount,variant='rebuildSlice'){
      const {w,h,dpr}=size,ctx=target.getContext('2d'),p=smoothstep(amount),rnd=mulberry32(hashSeed(`${seed}:${variant}`));ctx.clearRect(0,0,w,h);
      if(variant==='rebuildSoft'){
        const settle=1-p,dx=Math.sin(seed*.000013)*w*.012*settle,dy=Math.cos(seed*.000017)*h*.008*settle;
        ctx.globalAlpha=1-p*.88;ctx.drawImage(source,dx,dy);ctx.globalAlpha=.18+.82*p;ctx.drawImage(base,-dx*.2,-dy*.2);ctx.globalAlpha=1;return;
      }
      if(variant==='rebuildColumns'){
        ctx.globalAlpha=1-p*.86;ctx.drawImage(source,0,0);ctx.globalAlpha=1;
        const cols=14+Math.floor(rnd()*18),cw=w/cols;
        for(let i=0;i<cols;i++){
          const delay=(i%2?cols-i-1:i)/cols*.24,local=smoothstep(clamp01((p-delay)/(1-delay))),x=i*cw,dy=(1-local)*(rnd()-.5)*h*.09;
          ctx.globalAlpha=local;ctx.drawImage(base,x,0,cw+1,h,x,dy,cw+1,h);
        }
        ctx.globalAlpha=1;return;
      }
      if(variant==='rebuildGlyph'){
        ctx.globalAlpha=1-p*.9;ctx.drawImage(source,0,0);ctx.globalAlpha=1;
        const cell=Math.max(7,Math.round((8+rnd()*7)*dpr)),cols=Math.ceil(w/cell),rows=Math.ceil(h/cell);
        for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
          const order=((x*17+y*29+Math.floor(rnd()*31))%(cols+rows))/Math.max(1,cols+rows),local=smoothstep(clamp01((p-order*.38)/.62));if(local<=.01)continue;
          ctx.globalAlpha=local;ctx.drawImage(base,x*cell,y*cell,cell+1,cell+1,x*cell,y*cell,cell+1,cell+1);
        }
        ctx.globalAlpha=1;return;
      }
      // diagonal slice rebuild: fragments visibly slide back into the clean wordmark.
      ctx.globalAlpha=1-p*.9;ctx.drawImage(source,0,0);ctx.globalAlpha=1;
      const bands=10+Math.floor(rnd()*10),bh=h/bands,amp=w*(.035+rnd()*.028)*(1-p);
      for(let i=0;i<bands;i++){
        const y=i*bh,delay=i/bands*.18,local=smoothstep(clamp01((p-delay)/(1-delay))),dx=(i%2?1:-1)*amp*(.35+.65*Math.sin(i*1.31+seed*.00001));ctx.globalAlpha=local;ctx.drawImage(base,0,y,w,bh,dx,y,w,bh);
      }
      ctx.globalAlpha=1;
    }

    function generateRoute(){
      const rnd=mulberry32(hashSeed(`${sessionSeed}:${cycle}:route`));
      let route=[...ROUTES[Math.floor(rnd()*ROUTES.length)]];
      // Mutate a curated grammar instead of shuffling effects blindly. Each visit still gets a different route.
      if(rnd()>.66&&route.length>3)route.splice(1,1);
      if(rnd()>.58){const pool=rnd()>.22?['ascii','asciiSquare','asciiBraille','asciiBlock']:EFFECTS,insert=pool[Math.floor(rnd()*pool.length)],at=1+Math.floor(rnd()*Math.max(1,route.length-2));if(!route.slice(0,-1).includes(insert))route.splice(at,0,insert)}
      if(rnd()>.64)route[route.length-1]=REBUILDS[Math.floor(rnd()*REBUILDS.length)];
      return route;
    }

    function beginCycle(now){
      route=generateRoute();const rnd=mulberry32(hashSeed(`${sessionSeed}:${cycle}:timing`));seeds=route.map((_,i)=>Math.floor(rnd()*1e9)+i);stage=0;stageStart=now;stageDuration=1050+rnd()*1150;
    }
    function advance(now){
      stage++;
      if(stage>=route.length){cycle++;stage=-1;const rnd=mulberry32(hashSeed(`${sessionSeed}:${cycle}:pause`));pauseUntil=now+2800+rnd()*3000;return}
      const rnd=mulberry32(hashSeed(`${sessionSeed}:${cycle}:${stage}:duration`));stageStart=now;const rebuilding=route[stage]?.startsWith('rebuild');stageDuration=(rebuilding?2800:760)+rnd()*(rebuilding?2300:1700);
    }

    function renderPipeline(now,p){
      copy(workA,base);let src=workA,dst=workB;
      for(let i=0;i<stage;i++){
        if(route[i]?.startsWith('rebuild'))continue;applyEffect(dst,src,route[i],seeds[i],now,1);[src,dst]=[dst,src];
      }
      if(route[stage]?.startsWith('rebuild'))renderRebuild(dst,src,seeds[stage],now,p,route[stage]);else applyEffect(dst,src,route[stage],seeds[stage],now,p);
      return dst;
    }

    function frame(now){
      if(disposed)return;resize();const ctx=canvas.getContext('2d');ctx.clearRect(0,0,size.w,size.h);
      if(reduced){ctx.drawImage(base,0,0);return}
      if(stage<0){ctx.drawImage(base,0,0);if(now>=pauseUntil)beginCycle(now);raf=requestAnimationFrame(frame);return}
      let raw=(now-stageStart)/stageDuration;
      if(raw>=1){advance(now);raw=0;if(stage<0){ctx.drawImage(base,0,0);raf=requestAnimationFrame(frame);return}}
      const p=smoothstep(raw),output=renderPipeline(now,p);ctx.drawImage(output,0,0);raf=requestAnimationFrame(frame);
    }

    resize();drawBase();pauseUntil=performance.now()+2100;
    if(reduced){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,size.w,size.h);ctx.drawImage(base,0,0)}else raf=requestAnimationFrame(frame);
    if(typeof ResizeObserver!=='undefined'){ro=new ResizeObserver(()=>{if(resize()&&reduced){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,size.w,size.h);ctx.drawImage(base,0,0)}});ro.observe(canvas)}
    const onResize=()=>{if(resize()&&reduced){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,size.w,size.h);ctx.drawImage(base,0,0)}};window.addEventListener('resize',onResize);
    return()=>{disposed=true;cancelAnimationFrame(raf);ro?.disconnect();window.removeEventListener('resize',onResize)};
  },[]);

  return <canvas ref={ref} className="entryLiveCanvas" aria-hidden="true"/>;
}
