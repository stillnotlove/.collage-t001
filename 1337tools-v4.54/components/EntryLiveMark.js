'use client';

import {useEffect,useRef} from 'react';
import {hashSeed,mulberry32} from '../lib/editorCore';

const ASCII_VARIANTS=['glyph','block','braille','square'];
const ASCII_STYLES=['tight','airy','ghost','stagger'];
const SLICE_VARIANTS=['bands','wide','micro'];
const SLICE_PATTERNS=['ripple','hinge','sweep','comb'];
const ECHO_VARIANTS=['trail','stack','spray','swell'];
const ROUTE_TEMPLATES=[
  ['ascii','slice','ascii'],
  ['slice','ascii','echo'],
  ['echo','ascii','slice'],
  ['ascii','echo','ascii'],
  ['slice','echo','ascii'],
  ['echo','slice','ascii'],
  ['ascii','slice','echo'],
  ['echo','ascii','echo'],
  ['slice','ascii','slice'],
  ['slice','echo','slice'],
  ['echo','slice','echo'],
  ['ascii','echo','slice'],
];

function makeCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c}
function clamp01(v){return Math.max(0,Math.min(1,v))}
function smootherstep(v){v=clamp01(v);return v*v*v*(v*(v*6-15)+10)}
function lerp(a,b,t){return a+(b-a)*t}

export default function EntryLiveMark(){
  const ref=useRef(null);

  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;
    let raf=0,ro=null,disposed=false,resizeDirty=true,pauseAt=0,routeResumeShift=0;
    let size={w:1,h:1,dpr:1};
    let base=makeCanvas(1,1),sample=makeCanvas(1,1),frameA=makeCanvas(1,1),frameB=makeCanvas(1,1),frameC=makeCanvas(1,1);
    const sessionSeed=Math.floor(Math.random()*1e9),sessionStart=performance.now();
    let cycle=0,route=null,segmentIndex=0,routeStartedAt=sessionStart;
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    function resize(){
      const r=canvas.getBoundingClientRect();if(r.width<2||r.height<2)return false;
      const dpr=Math.max(.72,Math.min(1.35,window.devicePixelRatio||1,1900/Math.max(1,r.width),1150/Math.max(1,r.height)));
      const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
      if(w===size.w&&h===size.h&&dpr===size.dpr)return false;
      size={w,h,dpr};canvas.width=w;canvas.height=h;
      base=makeCanvas(w,h);sample=makeCanvas(1,1);frameA=makeCanvas(w,h);frameB=makeCanvas(w,h);frameC=makeCanvas(w,h);
      drawBase();buildRoute();segmentIndex=0;routeStartedAt=performance.now();routeResumeShift=0;return true;
    }

    function drawBase(){
      const {w,h}=size,ctx=base.getContext('2d');ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;
      const portrait=h>w,maxWidth=w*(portrait?.90:.80),maxHeight=h*(portrait?.24:.35);
      let fs=Math.min(maxHeight,w*.20),total=0,metrics={ascent:0,descent:0};
      for(let n=0;n<8;n++){
        ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;
        const oneM=ctx.measureText('1'),threeM=ctx.measureText('3'),sevenM=ctx.measureText('7');
        const one=oneM.width,three=threeM.width,seven=sevenM.width;
        const gap13=-fs*.055,gap33=Math.max(1.6,fs*.014),gap37=-fs*.072;
        ctx.font=`300 ${fs}px Helvetica Neue, Helvetica, Arial, sans-serif`;
        const toolsM=ctx.measureText('tools'),tools=toolsM.width,gap=fs*.055;
        total=one+gap13+three+gap33+three+gap37+seven+gap+tools;
        metrics={
          ascent:Math.max(oneM.actualBoundingBoxAscent||fs*.72,threeM.actualBoundingBoxAscent||fs*.72,sevenM.actualBoundingBoxAscent||fs*.72,toolsM.actualBoundingBoxAscent||fs*.72),
          descent:Math.max(oneM.actualBoundingBoxDescent||fs*.12,threeM.actualBoundingBoxDescent||fs*.12,sevenM.actualBoundingBoxDescent||fs*.12,toolsM.actualBoundingBoxDescent||fs*.12),
        };
        const textH=metrics.ascent+metrics.descent,fit=Math.min(maxWidth/Math.max(1,total),maxHeight/Math.max(1,textH),1);
        if(fit>.997)break;fs*=fit;
      }
      ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;
      const oneM=ctx.measureText('1'),threeM=ctx.measureText('3'),sevenM=ctx.measureText('7');
      const oneW=oneM.width,threeW=threeM.width,sevenW=sevenM.width;
      const gap13=-fs*.055,gap33=Math.max(1.6,fs*.014),gap37=-fs*.072;
      ctx.font=`300 ${fs}px Helvetica Neue, Helvetica, Arial, sans-serif`;
      const toolsM=ctx.measureText('tools'),toolsW=toolsM.width,gap=fs*.055;
      metrics={
        ascent:Math.max(oneM.actualBoundingBoxAscent||fs*.72,threeM.actualBoundingBoxAscent||fs*.72,sevenM.actualBoundingBoxAscent||fs*.72,toolsM.actualBoundingBoxAscent||fs*.72),
        descent:Math.max(oneM.actualBoundingBoxDescent||fs*.12,threeM.actualBoundingBoxDescent||fs*.12,sevenM.actualBoundingBoxDescent||fs*.12,toolsM.actualBoundingBoxDescent||fs*.12),
      };
      total=oneW+gap13+threeW+gap33+threeW+gap37+sevenW+gap+toolsW;
      const baseline=h/2+(metrics.ascent-metrics.descent)/2;
      let x=(w-total)/2;
      ctx.textBaseline='alphabetic';ctx.fillStyle='#fff';
      ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;
      ctx.fillText('1',x,baseline);x+=oneW+gap13;
      ctx.fillText('3',x,baseline);x+=threeW+gap33;
      ctx.fillText('3',x,baseline);x+=threeW+gap37;
      ctx.fillText('7',x,baseline);x+=sevenW+gap;
      ctx.font=`300 ${fs}px Helvetica Neue, Helvetica, Arial, sans-serif`;
      ctx.fillText('tools',x,baseline);
      const d=Math.max(5,Math.min(13,fs*.043));
      ctx.save();
      ctx.translate(Math.min(w-d*2,x+toolsW+d*2.2),baseline+metrics.descent+d*.65);
      ctx.rotate(Math.PI/4);
      ctx.fillStyle='#ffd800';
      ctx.fillRect(-d/2,-d/2,d,d);
      ctx.restore();
    }

    function getAsciiConfig(desc){
      const rnd=mulberry32(hashSeed(`${desc.seed}:ascii:${desc.variant}:${desc.style||'tight'}`));
      const style=desc.style||'tight';
      return {
        rnd,
        style,
        sizeMul:style==='airy'?1.12:style==='tight'?.94:1,
        alphaBase:style==='ghost'?.38:style==='airy'?.52:.6,
        alphaRange:style==='ghost'?.22:style==='tight'?.32:.28,
        jitter:style==='stagger'?.72:style==='ghost'?.46:.56,
        rowShift:style==='stagger'?.16:0,
        yDrift:style==='ghost'?.13:0,
        skipLow:style==='airy'?.90:.84,
      };
    }

    function renderAscii(target,desc){
      const {w,h}=size,ctx=target.getContext('2d'),cfg=getAsciiConfig(desc),rnd=cfg.rnd;
      ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;
      ctx.globalAlpha=.08;ctx.drawImage(base,0,0);ctx.globalAlpha=1;
      const cellBase=desc.variant==='braille'?6:desc.variant==='square'?7.2:desc.variant==='block'?8.2:6.8;
      const cell=Math.max(5,Math.round((cellBase+rnd()*(desc.variant==='braille'?3.5:4.8))*cfg.sizeMul*size.dpr));
      const cols=Math.max(1,Math.ceil(w/cell)),rows=Math.max(1,Math.ceil(h/cell));
      if(sample.width!==cols||sample.height!==rows){sample.width=cols;sample.height=rows}
      const sx=sample.getContext('2d',{willReadFrequently:true});
      sx.clearRect(0,0,cols,rows);sx.drawImage(base,0,0,cols,rows);
      const px=sx.getImageData(0,0,cols,rows).data;
      const charsets={glyph:[...'@#%*+=-:.'],square:[...'■▪▫·'],block:[...'█▓▒░'],braille:[...'⣿⣷⣯⣟⣛⣚⣀']};
      const chars=charsets[desc.variant]||charsets.glyph;
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.font=`700 ${cell*(desc.variant==='braille'?1.22:1.05)}px IBM Plex Mono, Courier New, monospace`;
      for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
        const q=(gy*cols+gx)*4,a=px[q+3]/255;if(a<.07)continue;
        const lum=(px[q]*.2126+px[q+1]*.7152+px[q+2]*.0722)/255;
        const idx=Math.min(chars.length-1,Math.max(0,Math.floor((1-lum)*(chars.length-1)+rnd()*cfg.jitter)));
        if(a<.16&&rnd()>cfg.skipLow)continue;
        const ox=(gy%2?1:-1)*cfg.rowShift*cell;
        const oy=Math.sin(gx*.5+gy*.35)*cfg.yDrift*cell;
        ctx.globalAlpha=cfg.alphaBase+cfg.alphaRange*a;
        ctx.fillText(chars[idx]||chars[0],(gx+.5)*cell+ox,(gy+.5)*cell+oy);
      }
      ctx.globalAlpha=1;
    }

    function getSliceConfig(desc){
      const {w,h}=size,rnd=mulberry32(hashSeed(`${desc.seed}:slice:${desc.variant}:${desc.pattern}`));
      const bands=desc.variant==='wide'?8+Math.floor(rnd()*6):desc.variant==='micro'?18+Math.floor(rnd()*10):11+Math.floor(rnd()*10);
      const bh=h/bands;
      const baseAmp=desc.variant==='wide'?w*.03:desc.variant==='micro'?w*.013:w*.021;
      const amp=baseAmp*(.72+rnd()*.55),speed=.42+rnd()*.22,phase=rnd()*Math.PI*2,altSpeed=.78+rnd()*.28,altPhase=rnd()*Math.PI*2;
      const meta=[];
      for(let i=0;i<bands;i++)meta.push({phase:rnd()*Math.PI*2,swing:.74+rnd()*.42,lift:.028+rnd()*.05,bias:(rnd()-.5)*.24,lane:rnd()});
      return {bands,bh,amp,speed,phase,altSpeed,altPhase,meta,pattern:desc.pattern};
    }

    function computeSliceOffset(cfg,index,timeSec,intensity=1){
      const band=cfg.meta[index],order=index/Math.max(1,cfg.bands-1);
      const pulse=.32+.68*(.5-.5*Math.cos(timeSec*Math.PI*2*cfg.speed+cfg.phase));
      const micro=.42+.58*(.5-.5*Math.cos(timeSec*Math.PI*2*cfg.altSpeed+cfg.altPhase));
      const profile=.44+.56*Math.sin(order*Math.PI);
      const stagger=.66+.34*Math.sin(timeSec*(1.1+band.swing*.35)+band.phase+order*Math.PI*(cfg.pattern==='sweep'?1.45:cfg.pattern==='comb'?2.2:1));
      const lanePulse=.76+.24*Math.sin(timeSec*(1.55+band.lane*.55)+band.phase*1.2);
      let dir=cfg.pattern==='sweep'?1:cfg.pattern==='hinge'?(index<cfg.bands/2?-1:1):cfg.pattern==='comb'?(Math.floor(index/2)%2===0?1:-1):(index%2===0?1:-1);
      let offset=dir*cfg.amp*profile*pulse*stagger*lanePulse*intensity;
      if(cfg.pattern==='hinge')offset*=.45+Math.abs(order-.5)*1.55;
      if(cfg.pattern==='sweep')offset*=.54+.46*smootherstep(.5-.5*Math.cos(timeSec*.9+order*1.6+cfg.altPhase));
      if(cfg.pattern==='comb')offset*=.84+.26*Math.sin(order*Math.PI*4+cfg.altPhase);
      const lift=Math.sin(timeSec*(.82+band.swing*.12)+band.phase+band.bias)*cfg.bh*band.lift*micro*intensity;
      return {offset,lift};
    }

    function renderSlice(target,desc,timeSec,intensity=1,source=base){
      const {w}=size,ctx=target.getContext('2d'),cfg=getSliceConfig(desc);
      ctx.clearRect(0,0,size.w,size.h);ctx.imageSmoothingEnabled=true;
      for(let i=0;i<cfg.bands;i++){
        const y=i*cfg.bh,{offset,lift}=computeSliceOffset(cfg,i,timeSec,intensity);
        ctx.globalAlpha=.975;
        ctx.drawImage(source,0,y,w,cfg.bh,offset,y+lift,w,cfg.bh+.9);
      }
      ctx.globalAlpha=1;
    }

    function getEchoConfig(desc){
      const {w,h}=size,rnd=mulberry32(hashSeed(`${desc.seed}:echo:${desc.variant}`));
      const variant=desc.variant||'trail';
      const copies=(variant==='stack'?5:variant==='spray'?7:variant==='swell'?6:4)+Math.floor(rnd()*(variant==='stack'?2:3));
      const axis=rnd()>.5?1:-1,spread=w*(variant==='stack'?.0036:variant==='spray'?.0064:variant==='swell'?.0058:(.0048+rnd()*.0052)),speed=.45+rnd()*.18,phase=rnd()*Math.PI*2,osc=.58+rnd()*.24;
      const meta=[];
      for(let i=1;i<=copies;i++)meta.push({depth:i/copies,arc:(rnd()-.5)*h*(variant==='spray'?.012:.006),phase:rnd()*Math.PI*2,scale:variant==='swell'?(1-.006*i+rnd()*.004):(1-.002*i),alphaScale:.92+rnd()*.26});
      return {copies,axis,spread,speed,phase,osc,variant,meta};
    }

    function drawEchoLayer(ctx,source,dx,dy,scale,alpha){
      const {w,h}=size;ctx.save();ctx.translate(dx,dy);ctx.scale(scale,scale);ctx.globalAlpha=alpha;ctx.drawImage(source,0,0,w,h);ctx.restore();
    }

    function renderEcho(target,desc,timeSec,intensity=1,source=base){
      const ctx=target.getContext('2d'),cfg=getEchoConfig(desc);
      ctx.clearRect(0,0,size.w,size.h);ctx.imageSmoothingEnabled=true;
      const pulse=.35+.65*(.5-.5*Math.cos(timeSec*Math.PI*2*cfg.speed+cfg.phase));
      const sway=.38+.62*(.5-.5*Math.cos(timeSec*Math.PI*2*cfg.osc+cfg.phase*.7));
      ctx.globalAlpha=1;ctx.drawImage(source,0,0);
      for(let i=1;i<=cfg.copies;i++){
        const meta=cfg.meta[i-1],k=meta.depth;
        let dx=cfg.axis*cfg.spread*i*pulse*intensity;
        if(cfg.variant==='stack')dx*=.78;
        if(cfg.variant==='spray')dx*=1.08+.18*Math.sin(timeSec*1.3+meta.phase);
        const dy=(Math.sin(timeSec*.65+i*.9+meta.phase)*size.h*.0024*i+meta.arc*sway)*intensity;
        const alpha=(.14*(1-k)+.035)*meta.alphaScale*intensity;
        drawEchoLayer(ctx,source,dx,dy,meta.scale,alpha);
      }
      ctx.globalAlpha=1;
    }

    function makeDescriptor(kind,rnd,usedAscii){
      const seed=Math.floor(rnd()*1e9);
      if(kind==='ascii'){
        const available=ASCII_VARIANTS.filter(v=>!usedAscii.has(v));
        const pool=available.length?available:ASCII_VARIANTS;
        const variant=pool[Math.floor(rnd()*pool.length)];usedAscii.add(variant);
        return {kind,variant,style:ASCII_STYLES[Math.floor(rnd()*ASCII_STYLES.length)],seed,frame:null};
      }
      if(kind==='slice')return {kind,variant:SLICE_VARIANTS[Math.floor(rnd()*SLICE_VARIANTS.length)],pattern:SLICE_PATTERNS[Math.floor(rnd()*SLICE_PATTERNS.length)],seed};
      return {kind:'echo',variant:ECHO_VARIANTS[Math.floor(rnd()*ECHO_VARIANTS.length)],seed};
    }

    function holdDuration(desc){
      const rnd=mulberry32(hashSeed(`${sessionSeed}:${cycle}:hold:${desc.kind}:${desc.seed||0}`));
      if(desc.kind==='clean')return 1650+rnd()*1050;
      if(desc.kind==='slice')return 1180+rnd()*720;
      if(desc.kind==='echo')return 930+rnd()*640;
      return 760+rnd()*540;
    }

    function transitionDuration(from,to){
      const rnd=mulberry32(hashSeed(`${sessionSeed}:${cycle}:transition:${from.kind}:${to.kind}:${from.seed||0}:${to.seed||0}`));
      if((from.kind==='ascii'&&to.kind==='clean')||(from.kind==='clean'&&to.kind==='ascii'))return 1240+rnd()*460;
      if(from.kind==='ascii'||to.kind==='ascii')return 1420+rnd()*560;
      if((from.kind==='slice'||from.kind==='echo')&&(to.kind==='slice'||to.kind==='echo'))return 1240+rnd()*520;
      return 1120+rnd()*560;
    }

    function buildRoute(){
      const rnd=mulberry32(hashSeed(`${sessionSeed}:${cycle}:route`));
      const template=ROUTE_TEMPLATES[Math.floor(rnd()*ROUTE_TEMPLATES.length)],usedAscii=new Set();
      const nodes=[{kind:'clean'},...template.map(kind=>makeDescriptor(kind,rnd,usedAscii)),{kind:'clean'}];
      for(const node of nodes)if(node.kind==='ascii'){node.frame=makeCanvas(size.w,size.h);renderAscii(node.frame,node)}
      const segments=[];let cursor=0;
      for(let i=0;i<nodes.length;i++){
        const hold=holdDuration(nodes[i]);segments.push({type:'hold',node:nodes[i],start:cursor,end:cursor+hold,duration:hold});cursor+=hold;
        if(i<nodes.length-1){
          const tr=transitionDuration(nodes[i],nodes[i+1]);
          segments.push({type:'transition',from:nodes[i],to:nodes[i+1],start:cursor,end:cursor+tr,duration:tr,seed:hashSeed(`${cycle}:${i}:${nodes[i].kind}:${nodes[i+1].kind}`)});
          cursor+=tr;
        }
      }
      route={nodes,segments,total:cursor};
    }

    function renderNode(node,target,timeSec,intensity=1){
      const ctx=target.getContext('2d');ctx.clearRect(0,0,size.w,size.h);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.imageSmoothingEnabled=true;
      if(!node||node.kind==='clean'){ctx.drawImage(base,0,0);return}
      if(node.kind==='ascii'){ctx.drawImage(node.frame,0,0);return}
      if(node.kind==='slice'){renderSlice(target,node,timeSec,intensity);return}
      renderEcho(target,node,timeSec,intensity);
    }

    function renderLiveNodeFrame(node,target,timeSec,intensity=1){
      if(!node||node.kind==='clean'){const ctx=target.getContext('2d');ctx.clearRect(0,0,size.w,size.h);ctx.drawImage(base,0,0);return}
      if(node.kind==='ascii'){const ctx=target.getContext('2d');ctx.clearRect(0,0,size.w,size.h);ctx.drawImage(node.frame,0,0);return}
      if(node.kind==='slice'){renderSlice(target,node,timeSec,intensity);return}
      renderEcho(target,node,timeSec,intensity);
    }

    function compositeStripReveal(ctx,fromFrame,toFrame,p,seed,prefer='auto'){
      const {w,h}=size,rnd=mulberry32(hashSeed(`${seed}:strip:${prefer}`));
      const mode=prefer==='horizontal'?0:prefer==='vertical'?1:Math.floor(rnd()*3);
      const horizontal=mode!==1;
      const centered=mode===2;
      const count=horizontal?(14+Math.floor(rnd()*9)):(18+Math.floor(rnd()*8));
      ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;ctx.globalAlpha=1;ctx.drawImage(fromFrame,0,0);
      for(let i=0;i<count;i++){
        const order=centered?Math.abs((i/Math.max(1,count-1))-.5)*1.9:(i/count);
        const stagger=rnd()*.24+order*.16;
        const local=smootherstep(clamp01((p-stagger)/Math.max(.2,.82-stagger)));
        if(local<=.004)continue;
        const alpha=.12+.88*local;
        const drift=(1-local)*(rnd()-.5)*(horizontal?w*.009:h*.009);
        ctx.globalAlpha=alpha;
        if(horizontal){
          const y=Math.floor(i*h/count),hh=Math.ceil(h/count)+1;
          ctx.drawImage(toFrame,0,y,w,hh,drift,y,w,hh);
        }else{
          const x=Math.floor(i*w/count),ww=Math.ceil(w/count)+1;
          ctx.drawImage(toFrame,x,0,ww,h,x,drift,ww,h);
        }
      }
      ctx.globalAlpha=.18*p;ctx.drawImage(toFrame,0,0);
      ctx.globalAlpha=1;
    }

    function compositeMotionBlend(ctx,fromFrame,toFrame,p,seed){
      const {w,h}=size,rnd=mulberry32(hashSeed(`${seed}:motion-blend`));
      ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;
      const fadeOut=1-smootherstep(clamp01((p-.12)/.88));
      const fadeIn=smootherstep(clamp01((p-.03)/.86));
      ctx.globalAlpha=.2+.8*fadeOut;ctx.drawImage(fromFrame,0,0);
      ctx.globalAlpha=.08+.92*fadeIn;ctx.drawImage(toFrame,0,0);
      const horizontal=rnd()>.45,count=horizontal?(10+Math.floor(rnd()*8)):(14+Math.floor(rnd()*7));
      for(let i=0;i<count;i++){
        const stagger=rnd()*.2+(i/count)*.11;
        const local=smootherstep(clamp01((p-stagger)/Math.max(.22,.8-stagger)));
        if(local<=.01)continue;
        ctx.globalAlpha=.22*local;
        if(horizontal){
          const y=Math.floor(i*h/count),hh=Math.ceil(h/count)+1;
          ctx.drawImage(toFrame,0,y,w,hh,0,y,w,hh);
        }else{
          const x=Math.floor(i*w/count),ww=Math.ceil(w/count)+1;
          ctx.drawImage(toFrame,x,0,ww,h,x,0,ww,h);
        }
      }
      ctx.globalAlpha=1;
    }

    function compositeSoftMix(ctx,fromFrame,toFrame,p){
      ctx.clearRect(0,0,size.w,size.h);ctx.imageSmoothingEnabled=true;
      const eased=smootherstep(p);
      ctx.globalAlpha=1-eased;ctx.drawImage(fromFrame,0,0);
      ctx.globalAlpha=eased;ctx.drawImage(toFrame,0,0);
      ctx.globalAlpha=1;
    }

    function renderTransition(segment,elapsedInSegment,timeSec){
      const p=smootherstep(clamp01(elapsedInSegment/Math.max(1,segment.duration)));
      const from=segment.from,to=segment.to;
      const fromMotion=from.kind==='slice'||from.kind==='echo';
      const toMotion=to.kind==='slice'||to.kind==='echo';
      const fromIntensity=fromMotion?lerp(1,.56,p):1;
      const toIntensity=toMotion?lerp(.48,1,p):1;
      renderLiveNodeFrame(from,frameA,timeSec,fromIntensity);
      renderLiveNodeFrame(to,frameB,timeSec,toIntensity);
      const ctx=canvas.getContext('2d');
      if(from.kind==='ascii'||to.kind==='ascii'){
        const prefer=(from.kind==='slice'||to.kind==='slice')?'horizontal':'auto';
        compositeStripReveal(ctx,frameA,frameB,p,segment.seed,prefer);
        return;
      }
      if(fromMotion&&toMotion){compositeMotionBlend(ctx,frameA,frameB,p,segment.seed);return}
      compositeSoftMix(ctx,frameA,frameB,p);
    }

    function getElapsed(now){return now-routeStartedAt-routeResumeShift}

    function advanceRoute(now){
      const elapsed=getElapsed(now);
      if(route&&elapsed<route.total)return elapsed;
      cycle++;
      buildRoute();
      routeStartedAt=now;
      routeResumeShift=0;
      segmentIndex=0;
      return 0;
    }

    function frame(now){
      if(disposed)return;
      if(resizeDirty){resizeDirty=false;resize()}
      if(reduced){const ctx=canvas.getContext('2d');ctx.clearRect(0,0,size.w,size.h);ctx.drawImage(base,0,0);raf=requestAnimationFrame(frame);return}
      const elapsed=advanceRoute(now),timeSec=(now-sessionStart)/1000;
      while(segmentIndex<route.segments.length-1&&elapsed>=route.segments[segmentIndex].end)segmentIndex++;
      while(segmentIndex>0&&elapsed<route.segments[segmentIndex].start)segmentIndex--;
      const segment=route.segments[segmentIndex];
      if(segment.type==='hold')renderNode(segment.node,canvas,timeSec,1);
      else renderTransition(segment,elapsed-segment.start,timeSec);
      raf=requestAnimationFrame(frame);
    }

    const drawStatic=()=>{const ctx=canvas.getContext('2d');ctx.clearRect(0,0,size.w,size.h);ctx.drawImage(base,0,0)};
    resizeDirty=false;resize();buildRoute();segmentIndex=0;routeStartedAt=performance.now();routeResumeShift=0;
    if(reduced)drawStatic();
    raf=requestAnimationFrame(frame);
    const markResize=()=>{resizeDirty=true;if(reduced){resizeDirty=false;if(resize())drawStatic()}};
    if(typeof ResizeObserver!=='undefined'){ro=new ResizeObserver(markResize);ro.observe(canvas)}
    window.addEventListener('resize',markResize);
    const onVisibility=()=>{
      if(document.hidden){pauseAt=performance.now();cancelAnimationFrame(raf);raf=0;return}
      const now=performance.now();if(pauseAt){routeStartedAt+=now-pauseAt;pauseAt=0}
      resizeDirty=true;if(!raf)raf=requestAnimationFrame(frame);
    };
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{disposed=true;cancelAnimationFrame(raf);ro?.disconnect();window.removeEventListener('resize',markResize);document.removeEventListener('visibilitychange',onVisibility)};
  },[]);

  return <canvas ref={ref} className="entryLiveCanvas" aria-hidden="true"/>;
}
