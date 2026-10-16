'use client';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {RATIOS,clamp} from '../lib/editorCore';
import {downloadBlob,isEditableTarget,reportToolError} from '../lib/browserUtils';
import {SCAN_DIRECTIONS,SCAN_OUTPUTS,SCAN_PRESET,SCAN_STYLES,SCAN_STEPS,createScanCanvas,randomizeScanParams,renderScanSource,paintScanBand,renderScanPreview,renderScanSnapshot,makeAutoMotion} from '../lib/scanEngine';
import ContinuePanel from './ContinuePanel';
import MicroHudGroup from './MicroHudGroup';
import RangeInputs from './RangeInputs';

const DEFAULT_VIEW={scale:100,x:0,y:0};
const CONTROL={
  effect:['Scan effect',0,100],distortion:['Deformation',0,100],grain:['Fine grain',0,100],contrast:['Contrast',-50,80],
  speed:['Scan speed',10,90],stretch:['Stretch',0,100],smear:['Smear',0,100],banding:['Banding',0,100],softness:['Softness',0,100]
};
const uniqueSeed=()=>Math.floor(Math.random()*0x7fffffff)+1;
const asBlob=(canvas)=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Unable to encode PNG')),'image/png'));

function ScanRange({name,value,onChange}){
  const [label,min,max]=CONTROL[name];
  return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><b>{value}{name==='effect'?'%':''}</b></div><RangeInputs min={min} max={max} value={value} onChange={onChange}/></label>;
}

export default function ScanTool({onIndex,onHome,onSendToEditor,onContinue,trail=[],initialFile,initialRatio='4 / 5',initialToken}){
  const [params,setParams]=useState({...SCAN_PRESET}),paramsRef=useRef({...SCAN_PRESET});
  const [direction,setDirection]=useState(SCAN_DIRECTIONS[0]),directionRef=useRef(SCAN_DIRECTIONS[0]);
  const [output,setOutput]=useState(SCAN_OUTPUTS[0]),outputRef=useRef(SCAN_OUTPUTS[0]);
  const [view,setView]=useState({...DEFAULT_VIEW}),viewRef=useRef({...DEFAULT_VIEW});
  const [ratio,setRatio]=useState(initialRatio||'4 / 5');
  const [sourceName,setSourceName]=useState('NO SOURCE'),[ready,setReady]=useState(false);
  const [progress,setProgress]=useState(0),progressRef=useRef(0);
  const [scanning,setScanning]=useState(false),runningRef=useRef(false);
  const [dragging,setDragging]=useState(false),[busy,setBusy]=useState(false),[dragOver,setDragOver]=useState(false);
  const [seed,setSeed]=useState(uniqueSeed),seedRef=useRef(seed);
  const canvasRef=useRef(null),fileRef=useRef(null),imageRef=useRef(null),urlRef=useRef(null),loadSeq=useRef(0),jobRef=useRef(false);
  const samplesRef=useRef(Array(SCAN_STEPS).fill(null)),scannedRef=useRef(0),baseViewRef=useRef({...DEFAULT_VIEW});
  const buffersRef=useRef({w:0,h:0,base:null,live:null,result:null});
  const pointerRef=useRef({down:false,id:null,originX:0,originY:0,baseX:0,baseY:0,vx:0,vy:0});
  const autoRef=useRef(false),rafRef=useRef(0),previousTimeRef=useRef(0),speedRef=useRef(0);
  const doc=useMemo(()=>{const r=RATIOS[ratio]||RATIOS['4 / 5'];return {w:r.width,h:r.height,label:r.label};},[ratio]);
  const hasScan=progress>0;
  const processLabel=(trail?.length?trail:['SCAN']).join(' → ');

  const draw=useCallback(({rebuild=false}={})=>{
    const canvas=canvasRef.current;
    if(!canvas)return;
    const host=canvas.parentElement,rect=host.getBoundingClientRect();
    if(rect.width<2||rect.height<2)return;
    const pixelRatio=Math.min(window.devicePixelRatio||1,2),maxEdge=1000;
    const s=Math.min(1,maxEdge/(Math.max(rect.width,rect.height)*pixelRatio));
    const w=Math.max(1,Math.round(rect.width*pixelRatio*s)),h=Math.max(1,Math.round(rect.height*pixelRatio*s));
    const buf=buffersRef.current;
    const resize=buf.w!==w||buf.h!==h||!buf.base;
    if(resize){
      canvas.width=w;canvas.height=h;
      buf.w=w;buf.h=h;buf.base=createScanCanvas(w,h);buf.live=createScanCanvas(w,h);buf.result=createScanCanvas(w,h);
    }
    const image=imageRef.current;
    if(!image){
      const ctx=canvas.getContext('2d');ctx.fillStyle='#f5f3ed';ctx.fillRect(0,0,w,h);
      ctx.fillStyle='#222';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${Math.max(12,w*.023)}px monospace`;
      ctx.fillText('DROP / PASTE AN IMAGE',w/2,h/2-12);
      ctx.font=`${Math.max(10,w*.016)}px monospace`;ctx.fillText('START SCAN → DRAG THE SHEET',w/2,h/2+16);
      return;
    }
    if(resize||rebuild){
      renderScanSource(buf.base,{image,view:baseViewRef.current,output:outputRef.current});
      buf.result.getContext('2d').drawImage(buf.base,0,0);
      if(scannedRef.current>0){
        paintScanBand({targetCanvas:buf.result,baseCanvas:buf.base,image,direction:directionRef.current,samples:samplesRef.current,fromStep:0,toStep:scannedRef.current,params:paramsRef.current,seed:seedRef.current,output:outputRef.current,baseView:baseViewRef.current});
      }
    }
    renderScanSource(buf.live,{image,view:viewRef.current,output:outputRef.current});
    renderScanPreview(canvas,{baseCanvas:buf.base,resultCanvas:buf.result,liveCanvas:buf.live,progress:progressRef.current,direction:directionRef.current,scanning:runningRef.current});
  },[]);

  const stop=useCallback(()=>{
    runningRef.current=false;
    cancelAnimationFrame(rafRef.current);
    rafRef.current=0;previousTimeRef.current=0;
    setScanning(false);
  },[]);
  const clearPass=useCallback(()=>{
    stop();
    progressRef.current=0;setProgress(0);
    scannedRef.current=0;
    samplesRef.current=Array(SCAN_STEPS).fill(null);
    autoRef.current=false;
    baseViewRef.current={...viewRef.current};
    draw({rebuild:true});
  },[stop,draw]);

  const loadFile=useCallback((file)=>{
    if(!file||!file.type?.startsWith('image/'))return;
    const seq=++loadSeq.current;
    stop();
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{
      if(seq!==loadSeq.current){URL.revokeObjectURL(url);return;}
      if(urlRef.current)URL.revokeObjectURL(urlRef.current);
      urlRef.current=url;imageRef.current=img;
      const fresh={...DEFAULT_VIEW};viewRef.current=fresh;setView(fresh);baseViewRef.current={...fresh};
      setSourceName(file.name||'IMAGE');setReady(true);
      scannedRef.current=0;samplesRef.current=Array(SCAN_STEPS).fill(null);
      progressRef.current=0;setProgress(0);draw({rebuild:true});
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reportToolError('SCAN image load',new Error('Unable to decode image'))};
    img.src=url;
  },[stop,draw]);
  useEffect(()=>{if(initialFile)loadFile(initialFile);},[initialFile,initialToken,loadFile]);
  useEffect(()=>{if(initialRatio)setRatio(initialRatio);},[initialRatio,initialToken]);
  useEffect(()=>{
    const paste=e=>{
      if(isEditableTarget())return;
      const file=[...(e.clipboardData?.files||[])].find(f=>f.type?.startsWith('image/'))||[...(e.clipboardData?.items||[])].find(f=>f.type?.startsWith('image/'))?.getAsFile?.();
      if(file){e.preventDefault();loadFile(file)}
    };
    window.addEventListener('paste',paste);
    return()=>window.removeEventListener('paste',paste);
  },[loadFile]);
  useEffect(()=>{
    const c=canvasRef.current;
    if(!c)return;
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(()=>draw({rebuild:true}));
    observer?.observe(c.parentElement);
    const onResize=()=>draw({rebuild:true});window.addEventListener('resize',onResize);
    draw({rebuild:true});
    return()=>{observer?.disconnect();window.removeEventListener('resize',onResize)};
  },[draw,ratio]);
  useEffect(()=>()=>{stop();++loadSeq.current;if(urlRef.current)URL.revokeObjectURL(urlRef.current)},[stop]);

  const tick=useCallback((time)=>{
    if(!runningRef.current||!imageRef.current)return;
    if(!previousTimeRef.current)previousTimeRef.current=time;
    const dt=Math.min(55,Math.max(0,time-previousTimeRef.current));previousTimeRef.current=time;
    const duration=14500-paramsRef.current.speed*123;
    const next=clamp(progressRef.current+dt/Math.max(2000,duration),0,1);
    const from=scannedRef.current,to=Math.min(SCAN_STEPS,Math.floor(next*SCAN_STEPS));
    if(to>from){
      const ptr=pointerRef.current;
      let prev=samplesRef.current[from-1]||{x:baseViewRef.current.x,y:baseViewRef.current.y};
      for(let i=from;i<to;i++){
        const t=i/SCAN_STEPS;
        const auto=autoRef.current?makeAutoMotion(t,seedRef.current):{x:0,y:0};
        const x=clamp(viewRef.current.x+auto.x,-100,100),y=clamp(viewRef.current.y+auto.y,-100,100);
        const vx=clamp((x-prev.x)/24,-1.8,1.8),vy=clamp((y-prev.y)/24,-1.8,1.8);
        const sample={x,y,scale:viewRef.current.scale,vx,vy,j:((Math.imul(i+3,214013)^seedRef.current)>>>0)%997/997};
        samplesRef.current[i]=sample;prev=sample;
      }
      const buf=buffersRef.current;
      if(buf.result){paintScanBand({targetCanvas:buf.result,baseCanvas:buf.base,image:imageRef.current,direction:directionRef.current,samples:samplesRef.current,fromStep:from,toStep:to,params:paramsRef.current,seed:seedRef.current,output:outputRef.current,baseView:baseViewRef.current});}
      scannedRef.current=to;
    }
    progressRef.current=next;setProgress(next);draw();
    if(next>=1){stop();draw();return;}
    rafRef.current=requestAnimationFrame(tick);
  },[draw,stop]);

  const start=useCallback((auto=false)=>{
    if(!imageRef.current)return;
    if(runningRef.current){stop();draw();return;}
    if(progressRef.current>=1){
      scannedRef.current=0;samplesRef.current=Array(SCAN_STEPS).fill(null);
      progressRef.current=0;setProgress(0);baseViewRef.current={...viewRef.current};
      draw({rebuild:true});
    }
    if(progressRef.current===0||auto)autoRef.current=auto;
    runningRef.current=true;setScanning(true);previousTimeRef.current=0;
    rafRef.current=requestAnimationFrame(tick);
  },[draw,stop,tick]);

  function updateParam(k,v){
    const next={...paramsRef.current,[k]:v};paramsRef.current=next;setParams(next);draw({rebuild:true});
  }
  function preset(name){
    const next={...paramsRef.current,...SCAN_STYLES[name]};paramsRef.current=next;setParams(next);
    stop();clearPass();draw({rebuild:true});
  }
  function randomize(){
    stop();
    const newSeed=uniqueSeed(),next=randomizeScanParams(newSeed,paramsRef.current);
    seedRef.current=newSeed;setSeed(newSeed);
    paramsRef.current=next;setParams(next);
    scannedRef.current=0;samplesRef.current=Array(SCAN_STEPS).fill(null);
    progressRef.current=0;setProgress(0);baseViewRef.current={...viewRef.current};
    draw({rebuild:true});
    // A new random variation actually scans with generated sheet movement.
    start(true);
  }
  function changeOutput(next){outputRef.current=next;setOutput(next);draw({rebuild:true})}
  function changeDirection(next){stop();directionRef.current=next;setDirection(next);clearPass();draw({rebuild:true})}
  function reset(){
    stop();const next={...SCAN_PRESET};paramsRef.current=next;setParams(next);
    viewRef.current={...DEFAULT_VIEW};setView(viewRef.current);
    outputRef.current='B/W';setOutput('B/W');directionRef.current=SCAN_DIRECTIONS[0];setDirection(SCAN_DIRECTIONS[0]);
    clearPass();draw({rebuild:true});
  }
  function pointerDown(e){
    if(!imageRef.current)return;
    const el=canvasRef.current?.parentElement;if(!el)return;
    el.setPointerCapture?.(e.pointerId);
    const p=pointerRef.current;
    Object.assign(p,{down:true,id:e.pointerId,originX:e.clientX,originY:e.clientY,baseX:viewRef.current.x,baseY:viewRef.current.y,vx:0,vy:0});
    autoRef.current=false;setDragging(true);
  }
  function pointerMove(e){
    const p=pointerRef.current;if(!p.down||p.id!==e.pointerId)return;
    const r=canvasRef.current?.getBoundingClientRect();if(!r)return;
    const newView={...viewRef.current,x:clamp(p.baseX+(e.clientX-p.originX)/r.width*100,-100,100),y:clamp(p.baseY+(e.clientY-p.originY)/r.height*100,-100,100)};
    viewRef.current=newView;setView(newView);draw();
  }
  function pointerUp(e){const p=pointerRef.current;if(p.id!==e.pointerId)return;p.down=false;p.id=null;setDragging(false)}

  const task=async(fn,label)=>{
    if(jobRef.current||!imageRef.current||scannedRef.current===0)return;
    jobRef.current=true;setBusy(true);
    try{await fn()}catch(e){reportToolError(label,e)}finally{jobRef.current=false;setBusy(false)}
  };
  async function resultBlob(alpha=false){
    const canvas=createScanCanvas(doc.w,doc.h);
    renderScanSnapshot(canvas,{image:imageRef.current,baseView:baseViewRef.current,params:paramsRef.current,output:outputRef.current,direction:directionRef.current,samples:samplesRef.current,progress:scannedRef.current/SCAN_STEPS,seed:seedRef.current,transparent:alpha});
    return asBlob(canvas);
  }
  const exportPng=(alpha=false)=>task(async()=>{downloadBlob(await resultBlob(alpha),`1337-scan-${alpha?'alpha-':''}${Date.now()}.png`)},'SCAN export');
  const sendEditor=()=>task(async()=>{const b=await resultBlob();onSendToEditor?.(new File([b],`SCAN-${Date.now()}.png`,{type:'image/png'}),ratio)},'SCAN → EDITOR');
  const continueTo=target=>task(async()=>{const b=await resultBlob();onContinue?.('scan',target,new File([b],`SCAN-${target}-${Date.now()}.png`,{type:'image/png'}),ratio)},'SCAN CONTINUE');
  function onDrop(e){e.preventDefault();e.stopPropagation();setDragOver(false);const f=[...(e.dataTransfer?.files||[])].find(x=>x.type?.startsWith('image/'));if(f)loadFile(f)}

  return <main className="fieldShell scanShell scanInteractiveShell">
    <aside className="fieldHud">
      <button type="button" className="toolBrandHome" onClick={onHome} aria-label="Back to 1337tools home"><div className="brand"><span className="brand1337"><span className="brandOneNudge">1</span>337</span><span className="brandTools">tools</span></div></button>
      <button type="button" className="wide fieldBack" onClick={onIndex}>← INDEX</button>
      <div className="scanActions">
        <button type="button" className="wide primary" disabled={!ready||busy} onClick={()=>start()}>{scanning?'PAUSE SCAN':'START SCAN →'}</button>
        <button type="button" className="wide" disabled={!ready||busy} onClick={randomize}>RANDOMIZE ↯</button>
        <button type="button" className="wide" disabled={!ready||busy||!hasScan} onClick={clearPass}>CLEAR PASS</button>
      </div>
      <MicroHudGroup title="SOURCE" storageKey="scan-v3-source" defaultOpen>
        <button type="button" className="wide" onClick={()=>fileRef.current?.click()}>+ SOURCE IMAGE</button>
        <input type="file" hidden accept="image/*" ref={fileRef} onChange={e=>{loadFile(e.target.files?.[0]);e.target.value=''}}/>
        <div className="note">{sourceName}<br/>drop image / Cmd+V</div>
        <div className="fieldControl"><div className="fieldControlHead"><span>Scan direction</span></div><div className="scanModeSwitch">{SCAN_DIRECTIONS.map(d=><button type="button" key={d} className={direction===d?'active':''} onClick={()=>changeDirection(d)}>{d==='TOP → BOTTOM'?'↓ DOWN':'→ RIGHT'}</button>)}</div></div>
        <div className="fieldControl"><div className="fieldControlHead"><span>Color mode</span></div><div className="scanModeSwitch">{SCAN_OUTPUTS.map(o=><button type="button" key={o} className={output===o?'active':''} onClick={()=>changeOutput(o)}>{o}</button>)}</div></div>
        <ScanRange name="speed" value={params.speed} onChange={v=>updateParam('speed',v)}/>
        <label className="fieldControl"><div className="fieldControlHead"><span>Image scale</span><b>{view.scale}%</b></div><RangeInputs min={25} max={300} value={view.scale} onChange={v=>{const next={...viewRef.current,scale:v};viewRef.current=next;setView(next);if(!scannedRef.current)baseViewRef.current={...next};draw({rebuild:true})}}/></label>
      </MicroHudGroup>
      <MicroHudGroup title="SCAN EFFECT" storageKey="scan-v3-effect" defaultOpen>
        <ScanRange name="effect" value={params.effect} onChange={v=>updateParam('effect',v)}/>
        <ScanRange name="distortion" value={params.distortion} onChange={v=>updateParam('distortion',v)}/>
        <ScanRange name="grain" value={params.grain} onChange={v=>updateParam('grain',v)}/>
        <ScanRange name="contrast" value={params.contrast} onChange={v=>updateParam('contrast',v)}/>
        <div className="fieldControl"><div className="fieldControlHead"><span>Character</span></div><div className="scanPresetSwitch">{Object.keys(SCAN_STYLES).map(name=><button key={name} type="button" onClick={()=>preset(name)}>{name}</button>)}</div></div>
        <div className="note">SCAN EFFECT: 0% = original / 100% = full scanning effect.</div>
      </MicroHudGroup>
      <MicroHudGroup title="ADVANCED" storageKey="scan-v3-advanced">
        {['stretch','smear','banding','softness'].map(k=><ScanRange key={k} name={k} value={params[k]} onChange={v=>updateParam(k,v)}/>) }
        <button type="button" className="wide" onClick={reset}>RESET ALL SETTINGS</button>
      </MicroHudGroup>
      <MicroHudGroup title="CANVAS" storageKey="scan-v3-canvas">
        <label className="fieldControl"><div className="fieldControlHead"><span>Ratio</span></div><select value={ratio} onChange={e=>{setRatio(e.target.value);clearPass()}}>{Object.keys(RATIOS).map(r=><option key={r} value={r}>{r}</option>)}</select></label>
        <div className="note">{doc.w} × {doc.h}px · {doc.label}</div>
      </MicroHudGroup>
      <MicroHudGroup title="OUTPUT" storageKey="scan-v3-output" accent defaultOpen>
        <div className="note">SCAN {Math.round(progress*100)}% · drag the sheet while scanning</div>
        <button type="button" className="wide primary" disabled={!hasScan||busy} onClick={sendEditor}>SEND TO EDITOR</button>
        <ContinuePanel current="scan" disabled={!hasScan||busy} onChoose={continueTo}/>
        <div className="two"><button type="button" disabled={!hasScan||busy} onClick={()=>exportPng(false)}>PNG</button><button type="button" disabled={!hasScan||busy} onClick={()=>exportPng(true)}>PNG α</button></div>
      </MicroHudGroup>
    </aside>
    <section className="fieldWorkspace">
      <header className="fieldTop fieldTop41"><div><button type="button" onClick={onIndex}>INDEX</button><span>1337TOOLS / 06 SCAN / DRAG SCAN</span></div><div><b>{processLabel}</b></div></header>
      <div className={`fieldStage scanStage ${dragOver?'fieldDropActive':''} ${dragging?'scanDragging':''}`}
        onDragEnter={e=>{e.preventDefault();setDragOver(true)}} onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOver(false)}} onDrop={onDrop}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
        <div className="fieldCanvasWrap" style={{aspectRatio:`${doc.w} / ${doc.h}`}}><canvas className="fieldCanvas scanCanvas" ref={canvasRef}/></div>
      </div>
    </section>
  </main>;
}
