'use client';

import {useEffect,useRef} from 'react';
import {hashSeed,mulberry32} from '../lib/editorCore';

const ASCII_VARIANTS=['glyph','block','braille','square'];
const ASCII_STYLES=['tight','airy','ghost','stagger'];
const SLICE_VARIANTS=['bands','wide','micro'];
const SLICE_PATTERNS=['ripple','hinge','sweep','comb'];
const ECHO_VARIANTS=['trail','stack','spray','swell'];

// Deliberately keep ASCII as the bridge between different motion families.
// That avoids the expensive two-effect transition path while preserving a large
// amount of visual randomness through per-effect variants and motion seeds.
const ROUTE_TEMPLATES=[
  ['ascii','slice','ascii'],
  ['ascii','echo','ascii'],
  ['slice','ascii','echo'],
  ['echo','ascii','slice'],
  ['slice','ascii','slice'],
  ['echo','ascii','echo'],
];

function makeCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c}
function clamp01(v){return Math.max(0,Math.min(1,v))}
function smootherstep(v){v=clamp01(v);return v*v*v*(v*(v*6-15)+10)}
function easeRange(p,a,b){return smootherstep((p-a)/Math.max(.0001,b-a))}

export default function EntryLiveMark(){
  const ref=useRef(null);

  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;

    let raf=0,ro=null,idleJob=0,disposed=false,resizeDirty=true,pauseAt=0,lastPaint=0;
    let size={w:1,h:1,scale:1};
    let base=makeCanvas(1,1),sample=makeCanvas(1,1),sourceMix=makeCanvas(1,1);
    let current=null,nextPrepared=null,cycleIndex=0,nodeIndex=0,phase='hold',phaseStart=performance.now(),phaseDuration=1800;
    const sessionSeed=Math.floor(Math.random()*1e9),sessionStart=performance.now();
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    function resize(){
      const r=canvas.getBoundingClientRect();if(r.width<2||r.height<2)return false;
      // Main performance rule: render at CSS-ish resolution, never at full Retina/4K backing resolution.
      // The mark is high-contrast typography, so 1366×820 is visually enough and substantially cheaper.
      const scale=Math.min(1,1366/Math.max(1,r.width),820/Math.max(1,r.height));
      const w=Math.max(1,Math.round(r.width*scale)),h=Math.max(1,Math.round(r.height*scale));
      if(w===size.w&&h===size.h&&Math.abs(scale-size.scale)<.0001)return false;
      size={w,h,scale};canvas.width=w;canvas.height=h;
      base=makeCanvas(w,h);sample=makeCanvas(1,1);sourceMix=makeCanvas(w,h);
      drawBase();
      cancelPrepare();
      cycleIndex=0;current=buildCycle(cycleIndex);nextPrepared=null;nodeIndex=0;phase='hold';phaseStart=performance.now();phaseDuration=holdDuration(current.nodes[0],0);
      scheduleNext();
      return true;
    }

    function drawBase(){
      const {w,h}=size,ctx=base.getContext('2d');ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;
      const portrait=h>w,maxWidth=w*(portrait?.90:.80),maxHeight=h*(portrait?.24:.35);
      let fs=Math.min(maxHeight,w*.20),total=0,metrics={ascent:0,descent:0};
      for(let n=0;n<8;n++){
        ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;
        const oneM=ctx.measureText('1'),threeM=ctx.measureText('3'),sevenM=ctx.measureText('7');
        const gap13=-fs*.055,gap33=Math.max(1.2,fs*.014),gap37=-fs*.072;
        ctx.font=`300 ${fs}px Helvetica Neue, Helvetica, Arial, sans-serif`;
        const toolsM=ctx.measureText('tools'),gap=fs*.055;
        total=oneM.width+gap13+threeM.width+gap33+threeM.width+gap37+sevenM.width+gap+toolsM.width;
        metrics={
          ascent:Math.max(oneM.actualBoundingBoxAscent||fs*.72,threeM.actualBoundingBoxAscent||fs*.72,sevenM.actualBoundingBoxAscent||fs*.72,toolsM.actualBoundingBoxAscent||fs*.72),
          descent:Math.max(oneM.actualBoundingBoxDescent||fs*.12,threeM.actualBoundingBoxDescent||fs*.12,sevenM.actualBoundingBoxDescent||fs*.12,toolsM.actualBoundingBoxDescent||fs*.12),
        };
        const fit=Math.min(maxWidth/Math.max(1,total),maxHeight/Math.max(1,metrics.ascent+metrics.descent),1);
        if(fit>.997)break;fs*=fit;
      }
      ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;
      const oneM=ctx.measureText('1'),threeM=ctx.measureText('3'),sevenM=ctx.measureText('7');
      const gap13=-fs*.055,gap33=Math.max(1.2,fs*.014),gap37=-fs*.072;
      ctx.font=`300 ${fs}px Helvetica Neue, Helvetica, Arial, sans-serif`;
      const toolsM=ctx.measureText('tools'),gap=fs*.055;
      metrics={
        ascent:Math.max(oneM.actualBoundingBoxAscent||fs*.72,threeM.actualBoundingBoxAscent||fs*.72,sevenM.actualBoundingBoxAscent||fs*.72,toolsM.actualBoundingBoxAscent||fs*.72),
        descent:Math.max(oneM.actualBoundingBoxDescent||fs*.12,threeM.actualBoundingBoxDescent||fs*.12,sevenM.actualBoundingBoxDescent||fs*.12,toolsM.actualBoundingBoxDescent||fs*.12),
      };
      total=oneM.width+gap13+threeM.width+gap33+threeM.width+gap37+sevenM.width+gap+toolsM.width;
      const baseline=h/2+(metrics.ascent-metrics.descent)/2;
      let x=(w-total)/2;
      ctx.textBaseline='alphabetic';ctx.fillStyle='#fff';
      ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;
      ctx.fillText('1',x,baseline);x+=oneM.width+gap13;
      ctx.fillText('3',x,baseline);x+=threeM.width+gap33;
      ctx.fillText('3',x,baseline);x+=threeM.width+gap37;
      ctx.fillText('7',x,baseline);x+=sevenM.width+gap;
      ctx.font=`300 ${fs}px Helvetica Neue, Helvetica, Arial, sans-serif`;ctx.fillText('tools',x,baseline);
      const d=Math.max(4,Math.min(12,fs*.043));ctx.save();ctx.translate(Math.min(w-d*2,x+toolsM.width+d*2.2),baseline+metrics.descent+d*.65);ctx.rotate(Math.PI/4);ctx.fillStyle='#ffd800';ctx.fillRect(-d/2,-d/2,d,d);ctx.restore();
    }

    function renderAsciiFrame(desc){
      const target=makeCanvas(size.w,size.h),{w,h}=size,ctx=target.getContext('2d');
      const rnd=mulberry32(hashSeed(`${desc.seed}:ascii:${desc.variant}:${desc.style}`));
      ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;ctx.globalAlpha=.08;ctx.drawImage(base,0,0);ctx.globalAlpha=1;
      const style=desc.style;
      const sizeMul=style==='airy'?1.12:style==='tight'?.94:1;
      const alphaBase=style==='ghost'?.38:style==='airy'?.52:.6;
      const alphaRange=style==='ghost'?.22:style==='tight'?.32:.28;
      const jitter=style==='stagger'?.72:style==='ghost'?.46:.56;
      const rowShift=style==='stagger'?.16:0,yDrift=style==='ghost'?.13:0,skipLow=style==='airy'?.90:.84;
      const cellBase=desc.variant==='braille'?6:desc.variant==='square'?7.2:desc.variant==='block'?8.2:6.8;
      const cell=Math.max(5,Math.round((cellBase+rnd()*(desc.variant==='braille'?3.5:4.8))*sizeMul*size.scale));
      const cols=Math.max(1,Math.ceil(w/cell)),rows=Math.max(1,Math.ceil(h/cell));
      if(sample.width!==cols||sample.height!==rows){sample.width=cols;sample.height=rows}
      const sx=sample.getContext('2d',{willReadFrequently:true});sx.clearRect(0,0,cols,rows);sx.drawImage(base,0,0,cols,rows);const px=sx.getImageData(0,0,cols,rows).data;
      const charsets={glyph:[...'@#%*+=-:.'],square:[...'■▪▫·'],block:[...'█▓▒░'],braille:[...'⣿⣷⣯⣟⣛⣚⣀']};
      const chars=charsets[desc.variant]||charsets.glyph;
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.font=`700 ${cell*(desc.variant==='braille'?1.22:1.05)}px IBM Plex Mono, Courier New, monospace`;
      for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
        const q=(gy*cols+gx)*4,a=px[q+3]/255;if(a<.07)continue;
        const lum=(px[q]*.2126+px[q+1]*.7152+px[q+2]*.0722)/255;
        const idx=Math.min(chars.length-1,Math.max(0,Math.floor((1-lum)*(chars.length-1)+rnd()*jitter)));
        if(a<.16&&rnd()>skipLow)continue;
        ctx.globalAlpha=alphaBase+alphaRange*a;
        ctx.fillText(chars[idx]||chars[0],(gx+.5)*cell+(gy%2?1:-1)*rowShift*cell,(gy+.5)*cell+Math.sin(gx*.5+gy*.35)*yDrift*cell);
      }
      ctx.globalAlpha=1;return target;
    }

    function makeSliceConfig(desc){
      const {w,h}=size,rnd=mulberry32(hashSeed(`${desc.seed}:slice:${desc.variant}:${desc.pattern}`));
      const bands=desc.variant==='wide'?8+Math.floor(rnd()*5):desc.variant==='micro'?16+Math.floor(rnd()*8):10+Math.floor(rnd()*8);
      const bh=h/bands,baseAmp=desc.variant==='wide'?w*.03:desc.variant==='micro'?w*.013:w*.021;
      const cfg={bands,bh,amp:baseAmp*(.72+rnd()*.55),speed:.42+rnd()*.22,phase:rnd()*Math.PI*2,altSpeed:.78+rnd()*.28,altPhase:rnd()*Math.PI*2,pattern:desc.pattern,meta:[]};
      for(let i=0;i<bands;i++)cfg.meta.push({phase:rnd()*Math.PI*2,swing:.74+rnd()*.42,lift:.028+rnd()*.05,bias:(rnd()-.5)*.24,lane:rnd()});
      return cfg;
    }

    function makeEchoConfig(desc){
      const {w,h}=size,rnd=mulberry32(hashSeed(`${desc.seed}:echo:${desc.variant}`)),variant=desc.variant;
      const copies=(variant==='stack'?4:variant==='spray'?6:variant==='swell'?5:4)+Math.floor(rnd()*2);
      const cfg={copies,axis:rnd()>.5?1:-1,spread:w*(variant==='stack'?.0036:variant==='spray'?.0062:variant==='swell'?.0056:(.0046+rnd()*.0048)),speed:.45+rnd()*.18,phase:rnd()*Math.PI*2,osc:.58+rnd()*.24,variant,meta:[]};
      for(let i=1;i<=copies;i++)cfg.meta.push({depth:i/copies,arc:(rnd()-.5)*h*(variant==='spray'?.011:.0055),phase:rnd()*Math.PI*2,scale:variant==='swell'?(1-.005*i+rnd()*.003):(1-.0015*i),alphaScale:.92+rnd()*.22});
      return cfg;
    }

    function makeDescriptor(kind,rnd,usedAscii){
      const seed=Math.floor(rnd()*1e9);
      if(kind==='ascii'){
        const available=ASCII_VARIANTS.filter(v=>!usedAscii.has(v)),pool=available.length?available:ASCII_VARIANTS,variant=pool[Math.floor(rnd()*pool.length)];usedAscii.add(variant);
        const desc={kind,variant,style:ASCII_STYLES[Math.floor(rnd()*ASCII_STYLES.length)],seed};desc.frame=renderAsciiFrame(desc);return desc;
      }
      if(kind==='slice'){
        const desc={kind,variant:SLICE_VARIANTS[Math.floor(rnd()*SLICE_VARIANTS.length)],pattern:SLICE_PATTERNS[Math.floor(rnd()*SLICE_PATTERNS.length)],seed};desc.cfg=makeSliceConfig(desc);return desc;
      }
      const desc={kind:'echo',variant:ECHO_VARIANTS[Math.floor(rnd()*ECHO_VARIANTS.length)],seed};desc.cfg=makeEchoConfig(desc);return desc;
    }

    function buildCycle(index){
      const rnd=mulberry32(hashSeed(`${sessionSeed}:${index}:route`)),template=ROUTE_TEMPLATES[Math.floor(rnd()*ROUTE_TEMPLATES.length)],usedAscii=new Set();
      return {index,nodes:[{kind:'clean'},...template.map(kind=>makeDescriptor(kind,rnd,usedAscii)),{kind:'clean'}]};
    }

    function cancelPrepare(){
      if(!idleJob)return;
      if('cancelIdleCallback' in window)window.cancelIdleCallback(idleJob);else clearTimeout(idleJob);
      idleJob=0;
    }

    function scheduleNext(){
      cancelPrepare();
      const prepare=()=>{idleJob=0;if(disposed||nextPrepared)return;nextPrepared=buildCycle(cycleIndex+1)};
      if('requestIdleCallback' in window)idleJob=window.requestIdleCallback(prepare,{timeout:1600});
      else idleJob=window.setTimeout(prepare,260);
    }

    function holdDuration(desc,index){
      const rnd=mulberry32(hashSeed(`${sessionSeed}:${current?.index??cycleIndex}:hold:${index}:${desc.kind}:${desc.seed||0}`));
      if(desc.kind==='clean')return 1650+rnd()*950;
      if(desc.kind==='slice')return 1180+rnd()*680;
      if(desc.kind==='echo')return 930+rnd()*620;
      return 760+rnd()*520;
    }

    function transitionDuration(from,to,index){
      const rnd=mulberry32(hashSeed(`${sessionSeed}:${current?.index??cycleIndex}:tr:${index}:${from.kind}:${to.kind}`));
      if(from.kind==='ascii'||to.kind==='ascii')return 1380+rnd()*520;
      return 1120+rnd()*420;
    }

    function blendSource(target,a,b,p){
      const ctx=target.getContext('2d');ctx.clearRect(0,0,size.w,size.h);ctx.globalAlpha=1-p;ctx.drawImage(a,0,0);ctx.globalAlpha=p;ctx.drawImage(b,0,0);ctx.globalAlpha=1;
    }

    function renderSlice(target,desc,timeSec,intensity=1,source=base){
      const {w}=size,ctx=target.getContext('2d'),cfg=desc.cfg;
      ctx.clearRect(0,0,size.w,size.h);ctx.imageSmoothingEnabled=true;
      const pulse=.32+.68*(.5-.5*Math.cos(timeSec*Math.PI*2*cfg.speed+cfg.phase)),micro=.42+.58*(.5-.5*Math.cos(timeSec*Math.PI*2*cfg.altSpeed+cfg.altPhase));
      for(let i=0;i<cfg.bands;i++){
        const band=cfg.meta[i],order=i/Math.max(1,cfg.bands-1),profile=.44+.56*Math.sin(order*Math.PI);
        const stagger=.66+.34*Math.sin(timeSec*(1.1+band.swing*.35)+band.phase+order*Math.PI*(cfg.pattern==='sweep'?1.45:cfg.pattern==='comb'?2.2:1));
        const lanePulse=.76+.24*Math.sin(timeSec*(1.55+band.lane*.55)+band.phase*1.2);
        let dir=cfg.pattern==='sweep'?1:cfg.pattern==='hinge'?(i<cfg.bands/2?-1:1):cfg.pattern==='comb'?(Math.floor(i/2)%2===0?1:-1):(i%2===0?1:-1);
        let offset=dir*cfg.amp*profile*pulse*stagger*lanePulse*intensity;
        if(cfg.pattern==='hinge')offset*=.45+Math.abs(order-.5)*1.55;
        if(cfg.pattern==='sweep')offset*=.54+.46*smootherstep(.5-.5*Math.cos(timeSec*.9+order*1.6+cfg.altPhase));
        if(cfg.pattern==='comb')offset*=.84+.26*Math.sin(order*Math.PI*4+cfg.altPhase);
        const lift=Math.sin(timeSec*(.82+band.swing*.12)+band.phase+band.bias)*cfg.bh*band.lift*micro*intensity,y=i*cfg.bh;
        ctx.globalAlpha=.975;ctx.drawImage(source,0,y,w,cfg.bh,offset,y+lift,w,cfg.bh+.8);
      }
      ctx.globalAlpha=1;
    }

    function renderEcho(target,desc,timeSec,intensity=1,source=base){
      const ctx=target.getContext('2d'),cfg=desc.cfg;
      ctx.clearRect(0,0,size.w,size.h);ctx.imageSmoothingEnabled=true;
      const pulse=.35+.65*(.5-.5*Math.cos(timeSec*Math.PI*2*cfg.speed+cfg.phase)),sway=.38+.62*(.5-.5*Math.cos(timeSec*Math.PI*2*cfg.osc+cfg.phase*.7));
      ctx.globalAlpha=1;ctx.drawImage(source,0,0);
      for(let i=1;i<=cfg.copies;i++){
        const meta=cfg.meta[i-1],k=meta.depth;
        let dx=cfg.axis*cfg.spread*i*pulse*intensity;if(cfg.variant==='stack')dx*=.78;if(cfg.variant==='spray')dx*=1.08+.18*Math.sin(timeSec*1.3+meta.phase);
        const dy=(Math.sin(timeSec*.65+i*.9+meta.phase)*size.h*.0024*i+meta.arc*sway)*intensity,alpha=(.14*(1-k)+.035)*meta.alphaScale*intensity;
        ctx.save();ctx.translate(dx,dy);ctx.scale(meta.scale,meta.scale);ctx.globalAlpha=alpha;ctx.drawImage(source,0,0,size.w,size.h);ctx.restore();
      }
      ctx.globalAlpha=1;
    }

    function renderNode(desc,target,timeSec){
      const ctx=target.getContext('2d');
      if(desc.kind==='clean'){ctx.clearRect(0,0,size.w,size.h);ctx.globalAlpha=1;ctx.drawImage(base,0,0);return}
      if(desc.kind==='ascii'){ctx.clearRect(0,0,size.w,size.h);ctx.globalAlpha=1;ctx.drawImage(desc.frame,0,0);return}
      if(desc.kind==='slice'){renderSlice(target,desc,timeSec,1,base);return}
      renderEcho(target,desc,timeSec,1,base);
    }

    function renderTransition(from,to,p,timeSec){
      const ctx=canvas.getContext('2d'),e=smootherstep(p);

      // Clean ↔ ASCII: only two source draws.
      if(from.kind==='clean'&&to.kind==='ascii'){blendSource(canvas,base,to.frame,e);return}
      if(from.kind==='ascii'&&to.kind==='clean'){blendSource(canvas,from.frame,base,e);return}

      // Clean ↔ motion: no secondary frame; motion amplitude simply grows/shrinks.
      if(from.kind==='clean'&&to.kind==='slice'){renderSlice(canvas,to,timeSec,e,base);return}
      if(from.kind==='slice'&&to.kind==='clean'){renderSlice(canvas,from,timeSec,1-e,base);return}
      if(from.kind==='clean'&&to.kind==='echo'){renderEcho(canvas,to,timeSec,e,base);return}
      if(from.kind==='echo'&&to.kind==='clean'){renderEcho(canvas,from,timeSec,1-e,base);return}

      // Motion → ASCII: blend the SOURCE once, then animate that same source through
      // the outgoing geometry. No strip compositor, no duplicated full-frame motion render.
      if((from.kind==='slice'||from.kind==='echo')&&to.kind==='ascii'){
        const material=easeRange(e,.02,.84),settle=1-easeRange(e,.52,1);
        blendSource(sourceMix,base,to.frame,material);
        if(from.kind==='slice')renderSlice(canvas,from,timeSec,settle,sourceMix);else renderEcho(canvas,from,timeSec,settle,sourceMix);
        return;
      }

      // ASCII → motion: reverse the exact same idea. The ASCII material becomes the clean
      // wordmark while the next geometry grows around it, so there is no visual state jump.
      if(from.kind==='ascii'&&(to.kind==='slice'||to.kind==='echo')){
        const material=easeRange(e,.04,.88),motion=easeRange(e,.18,1);
        blendSource(sourceMix,from.frame,base,material);
        if(to.kind==='slice')renderSlice(canvas,to,timeSec,motion,sourceMix);else renderEcho(canvas,to,timeSec,motion,sourceMix);
        return;
      }

      // Route grammar avoids direct SLICE↔ECHO transitions. Keep a cheap fallback anyway.
      ctx.clearRect(0,0,size.w,size.h);ctx.globalAlpha=1-e;renderNode(from,sourceMix,timeSec);ctx.drawImage(sourceMix,0,0);ctx.globalAlpha=e;renderNode(to,sourceMix,timeSec);ctx.drawImage(sourceMix,0,0);ctx.globalAlpha=1;
    }

    function swapCycle(now){
      cycleIndex++;
      current=nextPrepared||buildCycle(cycleIndex);nextPrepared=null;nodeIndex=0;phase='hold';phaseStart=now;phaseDuration=holdDuration(current.nodes[0],0);scheduleNext();
    }

    function advance(now){
      if(phase==='hold'){
        if(nodeIndex>=current.nodes.length-1){swapCycle(now);return}
        phase='transition';phaseStart=now;phaseDuration=transitionDuration(current.nodes[nodeIndex],current.nodes[nodeIndex+1],nodeIndex);return;
      }
      nodeIndex++;phase='hold';phaseStart=now;phaseDuration=holdDuration(current.nodes[nodeIndex],nodeIndex);
    }

    function frame(now){
      if(disposed)return;
      // Cap work at ~60fps even on 120Hz/144Hz displays. This removes unnecessary duplicate paints.
      if(now-lastPaint<15.2){raf=requestAnimationFrame(frame);return}lastPaint=now;
      if(resizeDirty){resizeDirty=false;resize()}
      const ctx=canvas.getContext('2d');ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.imageSmoothingEnabled=true;
      if(reduced){ctx.clearRect(0,0,size.w,size.h);ctx.drawImage(base,0,0);raf=requestAnimationFrame(frame);return}
      let guard=0;while((now-phaseStart)>=phaseDuration&&guard++<10)advance(phaseStart+phaseDuration);
      const timeSec=(now-sessionStart)/1000;
      if(phase==='hold')renderNode(current.nodes[nodeIndex],canvas,timeSec);
      else renderTransition(current.nodes[nodeIndex],current.nodes[nodeIndex+1],clamp01((now-phaseStart)/Math.max(1,phaseDuration)),timeSec);
      raf=requestAnimationFrame(frame);
    }

    resizeDirty=false;resize();
    if(!current){current=buildCycle(0);phaseStart=performance.now();phaseDuration=holdDuration(current.nodes[0],0);scheduleNext()}
    raf=requestAnimationFrame(frame);

    const markResize=()=>{resizeDirty=true};
    if(typeof ResizeObserver!=='undefined'){ro=new ResizeObserver(markResize);ro.observe(canvas)}
    window.addEventListener('resize',markResize);
    const onVisibility=()=>{
      if(document.hidden){pauseAt=performance.now();cancelAnimationFrame(raf);raf=0;return}
      const now=performance.now();if(pauseAt){phaseStart+=now-pauseAt;pauseAt=0}lastPaint=0;resizeDirty=true;if(!raf)raf=requestAnimationFrame(frame);
    };
    document.addEventListener('visibilitychange',onVisibility);

    return()=>{disposed=true;cancelAnimationFrame(raf);cancelPrepare();ro?.disconnect();window.removeEventListener('resize',markResize);document.removeEventListener('visibilitychange',onVisibility)};
  },[]);

  return <canvas ref={ref} className="entryLiveCanvas" aria-hidden="true"/>;
}
