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
        const oneM=ctx.measureText('1'),threeM=ctx.measureText('3'),sevenM=ctx.measureText('7');
        const one=oneM.width,three=threeM.width,seven=sevenM.width;
        const gap13=-fs*.055,gap33=Math.max(1.6,fs*.014),gap37=-fs*.072;
        ctx.font=`300 ${fs}px Helvetica Neue, Helvetica, Arial, sans-serif`;
        const toolsM=ctx.measureText('tools'),tools=toolsM.width,gap=fs*.055;
        total=one+gap13+three+gap33+three+gap37+seven+gap+tools;
        metrics={ascent:Math.max(oneM.actualBoundingBoxAscent||fs*.72,threeM.actualBoundingBoxAscent||fs*.72,sevenM.actualBoundingBoxAscent||fs*.72,toolsM.actualBoundingBoxAscent||fs*.72),descent:Math.max(oneM.actualBoundingBoxDescent||fs*.12,threeM.actualBoundingBoxDescent||fs*.12,sevenM.actualBoundingBoxDescent||fs*.12,toolsM.actualBoundingBoxDescent||fs*.12)};
        const textH=metrics.ascent+metrics.descent,fit=Math.min(maxWidth/Math.max(1,total),maxHeight/Math.max(1,textH),1);
        if(fit>.997)break;fs*=fit;
      }
      ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;
      const oneM=ctx.measureText('1'),threeM=ctx.measureText('3'),sevenM=ctx.measureText('7');
      const oneW=oneM.width,threeW=threeM.width,sevenW=sevenM.width;
      const gap13=-fs*.055,gap33=Math.max(1.6,fs*.014),gap37=-fs*.072;
      ctx.font=`300 ${fs}px Helvetica Neue, Helvetica, Arial, sans-serif`;
      const toolsM=ctx.measureText('tools'),toolsW=toolsM.width,gap=fs*.055;
      metrics={ascent:Math.max(oneM.actualBoundingBoxAscent||fs*.72,threeM.actualBoundingBoxAscent||fs*.72,sevenM.actualBoundingBoxAscent||fs*.72,toolsM.actualBoundingBoxAscent||fs*.72),descent:Math.max(oneM.actualBoundingBoxDescent||fs*.12,threeM.actualBoundingBoxDescent||fs*.12,sevenM.actualBoundingBoxDescent||fs*.12,toolsM.actualBoundingBoxDescent||fs*.12)};
      total=oneW+gap13+threeW+gap33+threeW+gap37+sevenW+gap+toolsW;
      const baseline=h/2+(metrics.ascent-metrics.descent)/2;
      let x=(w-total)/2;
      ctx.textBaseline='alphabetic';ctx.fillStyle='#fff';
      ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;
      ctx.fillText('1',x,baseline);x+=oneW+gap13;
      ctx.fillText('3',x,baseline);x+=threeW+gap33;
      ctx.fillText('3',x,baseline);x+=threeW+gap37;
      ctx.fillText('7',x,baseline);x+=sevenW+gap;
      ctx.font=`300 ${fs}px Helvetica Neue, Helvetica, Arial, sans-serif`;ctx.fillText('tools',x,baseline);
      const d=Math.max(5,Math.min(13,fs*.043));ctx.save();ctx.translate(Math.min(w-d*2,x+toolsW+d*2.2),baseline+metrics.descent+d*.65);ctx.rotate(Math.PI/4);ctx.fillStyle='#ffd800';ctx.fillRect(-d/2,-d/2,d,d);ctx.restore();
    }

    function getAsciiConfig(desc){
      const rnd=mulberry32(hashSeed(`${desc.seed}:ascii:${desc.variant}:${desc.style||'tight'}`));
      const style=desc.style||'tight';
      return {
        style,
        jitter:style==='tight'?.74:style==='ghost'?.48:style==='airy'?.58:.66,
        sizeMul:style==='tight'?.92:style==='airy'?1.14:style==='ghost'?1.02:1,
        alphaBase:style==='ghost'?.42:style==='airy'?.56:.62,
        alphaRange:style==='ghost'?.28:style==='tight'?.34:.30,
        skipLow:style==='airy'?.90:style==='ghost'?.80:.84,
        rowShift:style==='stagger'?.18:style==='ghost'?.08:0,
        ghostDrift:style==='ghost'?.14:0,
        fontScale:desc.variant==='braille'?1.22:1.05,
        rnd,
      };
    }

    function renderAscii(target,desc){
      const {w,h}=size,ctx=target.getContext('2d'),config=getAsciiConfig(desc),rnd=config.rnd;ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;
      ctx.globalAlpha=.08;ctx.drawImage(base,0,0);ctx.globalAlpha=1;
      const cellBase=desc.variant==='braille'?6.0:desc.variant==='square'?7.2:desc.variant==='block'?8.2:6.8;
      const cell=Math.max(5,Math.round((cellBase+rnd()*(desc.variant==='braille'?3.5:4.8))*config.sizeMul*size.dpr));
      const cols=Math.max(1,Math.ceil(w/cell)),rows=Math.max(1,Math.ceil(h/cell));
      if(sample.width!==cols||sample.height!==rows){sample.width=cols;sample.height=rows}
      const sx=sample.getContext('2d',{willReadFrequently:true});sx.clearRect(0,0,cols,rows);sx.drawImage(base,0,0,cols,rows);const px=sx.getImageData(0,0,cols,rows).data;
      const charsets={glyph:[...'@#%*+=-:.'],square:[...'■▪▫·'],block:[...'█▓▒░'],braille:[...'⣿⣷⣯⣟⣛⣚⣀']};
      const chars=charsets[desc.variant]||charsets.glyph;
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.font=`700 ${cell*config.fontScale}px IBM Plex Mono, Courier New, monospace`;
      for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
        const q=(gy*cols+gx)*4,a=px[q+3]/255;if(a<.07)continue;
        const lum=(px[q]*.2126+px[q+1]*.7152+px[q+2]*.0722)/255;
        const idx=Math.min(chars.length-1,Math.max(0,Math.floor((1-lum)*(chars.length-1)+rnd()*config.jitter)));
        if(a<.16&&rnd()>config.skipLow)continue;
        const rowShift=(gy%2?1:-1)*config.rowShift*cell;
        const driftY=config.ghostDrift?Math.sin(gx*.55+gy*.32)*config.ghostDrift*cell:0;
        ctx.globalAlpha=config.alphaBase+config.alphaRange*a;
        ctx.fillText(chars[idx]||chars[0],(gx+.5)*cell+rowShift,(gy+.5)*cell+driftY);
      }
      ctx.globalAlpha=1;
    }

    function getSliceConfig(desc){
      const {w,h}=size,rnd=mulberry32(hashSeed(`${desc.seed}:slice:${desc.variant}:${desc.pattern||'ripple'}`));
      const pattern=desc.pattern||'ripple';
      const bands=desc.variant==='wide'?8+Math.floor(rnd()*6):desc.variant==='micro'?18+Math.floor(rnd()*10):11+Math.floor(rnd()*10);
      const bh=h/bands;
      const baseAmp=desc.variant==='wide'?w*.030:desc.variant==='micro'?w*.013:w*.021;
      const amp=baseAmp*(.72+rnd()*.55),speed=.42+rnd()*.22,globalPhase=rnd()*Math.PI*2,secondarySpeed=.78+rnd()*.28,crossPhase=rnd()*Math.PI*2;
      const bandMeta=[];
      for(let i=0;i<bands;i++)bandMeta.push({
        phase:rnd()*Math.PI*2,
        swing:.74+rnd()*.42,
        liftScale:.028+rnd()*.05,
        waveBias:(rnd()-.5)*.24,
        lane:rnd(),
        dir:pattern==='sweep'?1:pattern==='hinge'?(i<bands/2?-1:1):pattern==='comb'?(Math.floor(i/2)%2===0?1:-1):(i%2===0?1:-1),
      });
      return {pattern,bands,bh,amp,speed,globalPhase,secondarySpeed,crossPhase,bandMeta};
    }

    function renderSliceSource(target,source,desc,timeSec,intensity=1){
      const {w}=size,ctx=target.getContext('2d'),cfg=getSliceConfig(desc);ctx.clearRect(0,0,size.w,size.h);ctx.imageSmoothingEnabled=true;
      const pulse=.32+.68*(.5-.5*Math.cos(timeSec*Math.PI*2*cfg.speed+cfg.globalPhase));
      const microPulse=.42+.58*(.5-.5*Math.cos(timeSec*Math.PI*2*cfg.secondarySpeed+cfg.crossPhase));
      for(let i=0;i<cfg.bands;i++){
        const band=cfg.bandMeta[i],y=i*cfg.bh,order=i/Math.max(1,cfg.bands-1);
        const profile=.44+.56*Math.sin(order*Math.PI);
        const stagger=.66+.34*Math.sin(timeSec*(1.1+band.swing*.35)+band.phase+order*Math.PI*(cfg.pattern==='sweep'?1.45:cfg.pattern==='comb'?2.2:1));
        const lanePulse=.76+.24*Math.sin(timeSec*(1.55+band.lane*.55)+band.phase*1.2);
        let offset=band.dir*cfg.amp*profile*pulse*stagger*lanePulse*intensity;
        if(cfg.pattern==='hinge')offset*=.45+Math.abs(order-.5)*1.55;
        if(cfg.pattern==='sweep')offset*=.54+.46*smootherstep(.5-.5*Math.cos(timeSec*.9+order*1.6+cfg.crossPhase));
        if(cfg.pattern==='comb')offset*=.84+.26*Math.sin(order*Math.PI*4+cfg.crossPhase);
        const lift=Math.sin(timeSec*(.82+band.swing*.12)+band.phase+band.waveBias)*cfg.bh*band.liftScale*microPulse*intensity;
        ctx.globalAlpha=.975;ctx.drawImage(source,0,y,w,cfg.bh,offset,y+lift,w,cfg.bh+.8);
      }
      ctx.globalAlpha=1;
    }

    function renderSlice(target,desc,timeSec,intensity=1){renderSliceSource(target,base,desc,timeSec,intensity)}

    function getEchoConfig(desc){
      const {w,h}=size,rnd=mulberry32(hashSeed(`${desc.seed}:echo:${desc.variant||'trail'}`));
      const variant=desc.variant||'trail';
      const copies=(variant==='stack'?5:variant==='spray'?7:variant==='swell'?6:4)+Math.floor(rnd()*(variant==='stack'?2:3));
      const axis=rnd()>.5?1:-1,spread=w*(variant==='stack'?.0036:variant==='spray'?.0064:variant==='swell'?.0058:.0048+rnd()*.0052),speed=.45+rnd()*.18;
      const phase=rnd()*Math.PI*2,oscSpeed=.58+rnd()*.24;
      const copyMeta=[];
      for(let i=1;i<=copies;i++)copyMeta.push({
        depth:i/copies,
        arc:(rnd()-.5)*h*(variant==='spray'?.012:.006),
        phase:rnd()*Math.PI*2,
        scale:variant==='swell'?(1-.006*i+rnd()*.004):(1-.002*i),
        alphaScale:.92+rnd()*.26,
      });
      return {variant,copies,axis,spread,speed,phase,oscSpeed,copyMeta};
    }

    function drawEchoLayer(ctx,source,dx,dy,scale,alpha){
      const {w,h}=size;ctx.save();ctx.translate(dx,dy);ctx.scale(scale,scale);ctx.globalAlpha=alpha;ctx.drawImage(source,0,0,w,h);ctx.restore();
    }

    function renderEchoSource(target,source,desc,timeSec,intensity=1){
      const ctx=target.getContext('2d'),cfg=getEchoConfig(desc);ctx.clearRect(0,0,size.w,size.h);ctx.imageSmoothingEnabled=true;
      const pulse=.35+.65*(.5-.5*Math.cos(timeSec*Math.PI*2*cfg.speed+cfg.phase));
      const sway=.38+.62*(.5-.5*Math.cos(timeSec*Math.PI*2*cfg.oscSpeed+cfg.phase*.7));
      ctx.globalAlpha=1;ctx.drawImage(source,0,0);
      for(let i=1;i<=cfg.copies;i++){
        const meta=cfg.copyMeta[i-1],k=meta.depth;
        let dx=cfg.axis*cfg.spread*i*pulse*intensity;
        if(cfg.variant==='stack')dx*=.78;
        if(cfg.variant==='spray')dx*=1.08+.18*Math.sin(timeSec*1.3+meta.phase);
        const dy=(Math.sin(timeSec*.65+i*.9+meta.phase)*size.h*.0024*i+meta.arc*sway)*intensity;
        const alpha=(.14*(1-k)+.035)*meta.alphaScale*intensity;
        drawEchoLayer(ctx,source,dx,dy,meta.scale,alpha);
      }
      ctx.globalAlpha=1;
    }

    function renderEcho(target,desc,timeSec,intensity=1){renderEchoSource(target,base,desc,timeSec,intensity)}

    function makeDescriptor(kind,rnd,usedAscii){
      const seed=Math.floor(rnd()*1e9);
      if(kind==='ascii'){
        const available=ASCII_VARIANTS.filter(v=>!usedAscii.has(v));
        const pool=available.length?available:ASCII_VARIANTS;
        const variant=pool[Math.floor(rnd()*pool.length)];usedAscii.add(variant);return {kind,variant,style:ASCII_STYLES[Math.floor(rnd()*ASCII_STYLES.length)],seed,frame:null};
      }
      if(kind==='slice')return {kind,variant:SLICE_VARIANTS[Math.floor(rnd()*SLICE_VARIANTS.length)],pattern:SLICE_PATTERNS[Math.floor(rnd()*SLICE_PATTERNS.length)],seed};
      return {kind:'echo',variant:ECHO_VARIANTS[Math.floor(rnd()*ECHO_VARIANTS.length)],seed};
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
      if(desc.kind==='clean')return 1600+rnd()*1180;
      if(desc.kind==='slice')return 1220+rnd()*740;
      if(desc.kind==='echo')return 980+rnd()*700;
      return 820+rnd()*620;
    }

    function transitionDuration(from,to){
      const rnd=mulberry32(hashSeed(`${sessionSeed}:${cycle}:transition:${nodeIndex}:${from.kind}:${to.kind}`));
      if((from.kind==='slice'||from.kind==='echo')&&to.kind==='ascii')return 1720+rnd()*680;
      if(from.kind==='ascii'&&(to.kind==='slice'||to.kind==='echo'))return 1050+rnd()*650;
      if((from.kind==='slice'||from.kind==='echo')&&(to.kind==='slice'||to.kind==='echo'))return 1360+rnd()*560;
      return 1160+rnd()*700;
    }

    function renderNode(desc,target,timeSec,intensity=1){
      const ctx=target.getContext('2d');ctx.clearRect(0,0,size.w,size.h);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.imageSmoothingEnabled=true;
      if(!desc||desc.kind==='clean'){ctx.drawImage(base,0,0);return}
      if(desc.kind==='ascii'){ctx.drawImage(desc.frame,0,0);return}
      if(desc.kind==='slice'){renderSlice(target,desc,timeSec,intensity);return}
      renderEcho(target,desc,timeSec,intensity);
    }

    function mix(ctx,a,b,p){const eased=smootherstep(p);ctx.globalAlpha=1-eased;ctx.drawImage(a,0,0);ctx.globalAlpha=eased;ctx.drawImage(b,0,0);ctx.globalAlpha=1}

    function drawAsciiReveal(ctx,asciiFrame,p,seed,reverse=false){
      // v4.49 reveal grammar restored: simple staggered strips with no alternate sweep modes.
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
      const {w}=size,cfg=getSliceConfig(from);const pulse=.32+.68*(.5-.5*Math.cos(timeSec*Math.PI*2*cfg.speed+cfg.globalPhase));
      const microPulse=.42+.58*(.5-.5*Math.cos(timeSec*Math.PI*2*cfg.secondarySpeed+cfg.crossPhase));
      const settle=smootherstep(clamp01((p-.54)/.46));
      const motion=1-settle;
      ctx.clearRect(0,0,size.w,size.h);ctx.imageSmoothingEnabled=true;
      for(let i=0;i<cfg.bands;i++){
        const band=cfg.bandMeta[i],y=i*cfg.bh,order=i/Math.max(1,cfg.bands-1);
        const profile=.44+.56*Math.sin(order*Math.PI);
        const stagger=.66+.34*Math.sin(timeSec*(1.1+band.swing*.35)+band.phase+order*Math.PI*(cfg.pattern==='sweep'?1.45:cfg.pattern==='comb'?2.2:1));
        const lanePulse=.76+.24*Math.sin(timeSec*(1.55+band.lane*.55)+band.phase*1.2);
        let offset=band.dir*cfg.amp*profile*pulse*stagger*lanePulse*motion;
        if(cfg.pattern==='hinge')offset*=.45+Math.abs(order-.5)*1.55;
        if(cfg.pattern==='sweep')offset*=.54+.46*smootherstep(.5-.5*Math.cos(timeSec*.9+order*1.6+cfg.crossPhase));
        if(cfg.pattern==='comb')offset*=.84+.26*Math.sin(order*Math.PI*4+cfg.crossPhase);
        const lift=Math.sin(timeSec*(.82+band.swing*.12)+band.phase+band.waveBias)*cfg.bh*band.liftScale*microPulse*motion;
        const travel=cfg.pattern==='hinge'?Math.abs(order-.5)*.18:cfg.pattern==='sweep'?order*.2:cfg.pattern==='comb'?((i%3)/3)*.11:order*.13;
        const wave=.06*Math.sin(order*Math.PI*3+cfg.globalPhase+band.phase*.25);
        const local=smootherstep(clamp01((p-(.03+travel+wave))/.72));
        const dy=y+lift;
        if(local<.999){ctx.globalAlpha=.975*(1-local);ctx.drawImage(base,0,y,w,cfg.bh,offset,dy,w,cfg.bh+.9)}
        if(local>.001){ctx.globalAlpha=.975*local;ctx.drawImage(asciiFrame,0,y,w,cfg.bh,offset,dy,w,cfg.bh+.9)}
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
      const cfg=getEchoConfig(from),pulse=.35+.65*(.5-.5*Math.cos(timeSec*Math.PI*2*cfg.speed+cfg.phase)),sway=.38+.62*(.5-.5*Math.cos(timeSec*Math.PI*2*cfg.oscSpeed+cfg.phase*.7));
      const settle=smootherstep(clamp01((p-.56)/.44));
      const motion=1-settle;
      ctx.clearRect(0,0,size.w,size.h);ctx.imageSmoothingEnabled=true;

      // Trail first: same copy, same position, same alpha — only its source material morphs.
      for(let i=cfg.copies;i>=1;i--){
        const meta=cfg.copyMeta[i-1],k=meta.depth;
        let dx=cfg.axis*cfg.spread*i*pulse*motion;
        if(cfg.variant==='stack')dx*=.78;
        if(cfg.variant==='spray')dx*=1.08+.18*Math.sin(timeSec*1.3+meta.phase);
        const dy=(Math.sin(timeSec*.65+i*.9+meta.phase)*size.h*.0024*i+meta.arc*sway)*motion;
        const alpha=(.14*(1-k)+.035)*meta.alphaScale*motion;
        const travel=(cfg.variant==='stack'?(1-k)*.1:k*.16)+(cfg.variant==='spray'?Math.sin(i*.7)*.03:0);
        const local=smootherstep(clamp01((p-(.02+travel))/.68));
        if(local<.999)drawEchoLayer(ctx,base,dx,dy,meta.scale,alpha*(1-local));
        if(local>.001)drawEchoLayer(ctx,asciiFrame,dx,dy,meta.scale,alpha*local);
      }

      // Main wordmark converts a little later than the echoes, preserving continuity and depth.
      const core=smootherstep(clamp01((p-.1)/.72));
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
      // v4.49 exit model restored: motion grows underneath while ASCII strips dissolve later.
      const motionIn=smootherstep(clamp01((p-.02)/.74));
      ctx.globalAlpha=motionIn;ctx.drawImage(motionFrame,0,0);
      drawAsciiReveal(ctx,asciiFrame,clamp01((p-.26)/.74),seed,true);
      ctx.globalAlpha=1;
    }

    function overlapMotionToMotion(ctx,fromFrame,toFrame,p){
      // Both effects stay alive for the middle of the transition instead of freezing/crossfading.
      const out=1-smootherstep(clamp01((p-.64)/.36));
      const incoming=smootherstep(clamp01((p-.03)/.82));
      ctx.globalAlpha=.24+.76*out;ctx.drawImage(fromFrame,0,0);
      ctx.globalAlpha=.08+.92*incoming;ctx.drawImage(toFrame,0,0);
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
        const fromIntensity=fromIsMotion?(intoAscii?1:lerp(.38,1,1-p)):1;
        const toIntensity=toIsMotion?(outOfAscii?(.35+.65*p):lerp(.34,1,p)):1;
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
