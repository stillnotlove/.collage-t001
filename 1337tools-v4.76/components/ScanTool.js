'use client';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {RATIOS,clamp} from '../lib/editorCore';
import {downloadBlob,isEditableTarget,reportToolError} from '../lib/browserUtils';
import {
  SCAN_DIRECTIONS,SCAN_OUTPUTS,SCAN_PAPER,SCAN_PRESET,createScanCanvas,randomizeScanParams,
  renderScanSource,applyScanBand,renderScanPreview,createEmptyScanSurface,renderScanSnapshot,
} from '../lib/scanEngine';
import ContinuePanel from './ContinuePanel';
import MicroHudGroup from './MicroHudGroup';
import RangeInputs from './RangeInputs';

const DEFAULT_VIEW={scale:100,x:0,y:0};
const SAMPLE_STEPS=720;
const SCAN_RANGES={
  scanSpeed:['Scan speed',8,90],
  intensity:['Distortion amount',0,100],
  stretch:['Stretch',0,100],
  smear:['Smear',0,100],
  wave:['Wave',0,100],
  lineShift:['Line shift',0,100],
  grain:['Grain',0,100],
  banding:['Banding',0,100],
  softness:['Optical softness',0,100],
  contrast:['Contrast',-40,80],
  threshold:['Threshold',0,100],
  edgeShadow:['Edge shadow',0,100],
};
const rnd=(lo,hi)=>Math.round(lo+Math.random()*(hi-lo));

function ScanRange({name,value,onChange}){
  const [label,min,max,step=1]=SCAN_RANGES[name];
  return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span></div><RangeInputs min={min} max={max} step={step} value={value} onChange={onChange}/></label>;
}
function ScanSelect({label,value,onChange,options}){
  return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><b>{value}</b></div><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(v=><option value={v} key={v}>{v}</option>)}</select></label>;
}

export default function ScanTool({onIndex,onHome,onSendToEditor,onContinue,trail=[],initialFile,initialRatio='4 / 5',initialToken}){
  const [params,setParams]=useState({...SCAN_PRESET});
  const [direction,setDirection]=useState(SCAN_DIRECTIONS[0]);
  const [output,setOutput]=useState(SCAN_OUTPUTS[0]);
  const [paper,setPaper]=useState(SCAN_PAPER[0]);
  const [sourceName,setSourceName]=useState('NO SOURCE');
  const [sourceReady,setSourceReady]=useState(false);
  const [view,setView]=useState(DEFAULT_VIEW);
  const [ratio,setRatio]=useState(initialRatio||'4 / 5');
  const [machineSeed,setMachineSeed]=useState(()=>rnd(1,0x7ffffffe));
  const [progress,setProgress]=useState(0);
  const progressRef=useRef(0);
  const [scanning,setScanning]=useState(false);
  const [busy,setBusy]=useState(false);
  const [dragOver,setDragOver]=useState(false);
  const [isDragging,setIsDragging]=useState(false);

  const canvasRef=useRef(null),fileRef=useRef(null),imgRef=useRef(null),origFileRef=useRef(null),urlRef=useRef(null),loadSeq=useRef(0),jobRef=useRef(false);
  const previewBuffersRef=useRef({source:null,result:null,width:0,height:0});
  const samplesRef=useRef(Array.from({length:SAMPLE_STEPS},()=>null));
  const scannedStepsRef=useRef(0);
  const scanRafRef=useRef(0),lastScanTsRef=useRef(0);
  const pointerRef=useRef({down:false,id:null,startX:0,startY:0,baseX:0,baseY:0,lastClientX:0,lastClientY:0,lastTime:0,velX:0,velY:0});
  const viewRef=useRef(DEFAULT_VIEW);

  const processLabel=(trail?.length?trail:['SCAN']).join(' → ');
  const doc=useMemo(()=>{const r=RATIOS[ratio]||RATIOS['4 / 5'];return {w:r.width,h:r.height,label:r.label};},[ratio]);
  const hasScan=progress>0;

  useEffect(()=>{viewRef.current=view},[view]);
  useEffect(()=>{progressRef.current=progress},[progress]);

  const setP=(name,v)=>setParams(prev=>({...prev,[name]:v}));

  const ensurePreviewBuffers=useCallback(()=>{
    const c=canvasRef.current;if(!c)return null;
    const host=c.parentElement||c;
    const r=host.getBoundingClientRect();
    if(r.width<2||r.height<2)return null;
    const pixelRatio=Math.min(2,window.devicePixelRatio||1);
    const maxEdge=980;
    const scale=Math.min(1,maxEdge/(Math.max(r.width,r.height)*pixelRatio));
    const width=Math.max(1,Math.round(r.width*pixelRatio*scale));
    const height=Math.max(1,Math.round(r.height*pixelRatio*scale));
    if(c.width!==width || c.height!==height){c.width=width;c.height=height}
    const buf=previewBuffersRef.current;
    const resized=buf.width!==width || buf.height!==height || !buf.source || !buf.result;
    if(resized){
      buf.width=width;buf.height=height;
      buf.source=createScanCanvas(width,height);
      buf.result=createScanCanvas(width,height);
      createEmptyScanSurface(buf.result,paper);
    }
    return {width,height,resized};
  },[paper]);

  const drawPlaceholder=useCallback(()=>{
    const c=canvasRef.current;if(!c)return;
    const ready=ensurePreviewBuffers();
    if(!ready)return;
    const ctx=c.getContext('2d');
    ctx.fillStyle=paper;ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle='#222';ctx.font=`bold ${Math.max(11,c.width*.025)}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('DROP / PASTE ONE IMAGE',c.width/2,c.height/2-12);
    ctx.font=`${Math.max(9,c.width*.017)}px monospace`;
    ctx.fillText('start scan → drag the sheet while the bar passes',c.width/2,c.height/2+18);
  },[ensurePreviewBuffers,paper]);

  const redrawPreview=useCallback((forceRebuild=false)=>{
    const ready=ensurePreviewBuffers();
    if(!ready)return;
    const c=canvasRef.current,buf=previewBuffersRef.current;
    if(!sourceReady||!imgRef.current){drawPlaceholder();return;}
    try{
      renderScanSource(buf.source,{image:imgRef.current,view:viewRef.current,paper,output,softness:params.softness,contrast:params.contrast,threshold:params.threshold});
      if(forceRebuild){
        createEmptyScanSurface(buf.result,paper);
        if(scannedStepsRef.current>0){
          renderScanSnapshot(buf.result,{image:imgRef.current,view:viewRef.current,paper,output,direction,params,samples:samplesRef.current,progress:progressRef.current,machineSeed,transparent:false});
        }
      }
      renderScanPreview(c,{sourceCanvas:buf.source,resultCanvas:buf.result,progress:progressRef.current,direction,showStripe:scanning});
    }catch(err){reportToolError('SCAN preview',err)}
  },[ensurePreviewBuffers,sourceReady,drawPlaceholder,paper,output,params,direction,machineSeed,scanning]);

  function resetSession(nextPaper=paper){
    samplesRef.current=Array.from({length:SAMPLE_STEPS},()=>null);
    scannedStepsRef.current=0;
    progressRef.current=0;
    setProgress(0);
    const buf=previewBuffersRef.current;
    if(buf.result)createEmptyScanSurface(buf.result,nextPaper);
  }

  const loadFile=useCallback((file,{keepOriginal=false}={})=>{
    if(!file)return Promise.resolve(false);
    const id=++loadSeq.current;
    return new Promise(resolve=>{
      if(urlRef.current){URL.revokeObjectURL(urlRef.current);urlRef.current=null}
      const url=URL.createObjectURL(file),img=new Image();
      img.onload=()=>{
        if(id!==loadSeq.current){URL.revokeObjectURL(url);resolve(false);return;}
        urlRef.current=url;imgRef.current=img;
        if(!keepOriginal)origFileRef.current=file;
        viewRef.current=DEFAULT_VIEW;setView(DEFAULT_VIEW);
        setSourceReady(true);setSourceName(file.name||'PASTED IMAGE');
        resetSession();
        setScanning(false);
        redrawPreview(true);
        resolve(true);
      };
      img.onerror=()=>{URL.revokeObjectURL(url);if(id===loadSeq.current)reportToolError('SCAN image load',new Error('Unsupported or damaged image'));resolve(false)};
      img.src=url;
    });
  },[redrawPreview]);

  useEffect(()=>()=>{loadSeq.current++;if(urlRef.current)URL.revokeObjectURL(urlRef.current);cancelAnimationFrame(scanRafRef.current)},[]);
  useEffect(()=>{if(initialFile)loadFile(initialFile);if(initialRatio)setRatio(initialRatio)},[initialFile,initialRatio,initialToken,loadFile]);
  useEffect(()=>{
    const paste=e=>{
      if(isEditableTarget())return;
      const file=[...(e.clipboardData?.files||[])].find(f=>f.type?.startsWith('image/'))||[...(e.clipboardData?.items||[])].find(f=>f.type?.startsWith('image/'))?.getAsFile?.();
      if(file){e.preventDefault();loadFile(file)}
    };
    window.addEventListener('paste',paste);return()=>window.removeEventListener('paste',paste);
  },[loadFile]);

  useEffect(()=>{redrawPreview(true)},[ratio,redrawPreview]);
  useEffect(()=>{
    const c=canvasRef.current;if(!c)return;
    const schedule=()=>redrawPreview(true);
    schedule();
    const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(schedule):null;
    ro?.observe(c.parentElement||c);window.addEventListener('resize',schedule);
    return()=>{ro?.disconnect();window.removeEventListener('resize',schedule)};
  },[redrawPreview]);

  useEffect(()=>{
    if(!sourceReady || !imgRef.current)return;
    redrawPreview(true);
  },[params,output,paper,direction,machineSeed,sourceReady,redrawPreview]);

  useEffect(()=>{
    if(!scanning || !sourceReady || !imgRef.current)return;
    lastScanTsRef.current=0;
    const tick=ts=>{
      if(!scanning)return;
      if(!lastScanTsRef.current)lastScanTsRef.current=ts;
      const dt=Math.min(64,ts-lastScanTsRef.current); lastScanTsRef.current=ts;
      const speed=clamp((+params.scanSpeed||0)/100,0.05,0.95);
      const delta=dt*(0.00016 + speed*0.00072);
      const prev=progressRef.current;
      const next=clamp(prev+delta,0,1);
      const fromStep=scannedStepsRef.current;
      const toStep=Math.min(SAMPLE_STEPS,Math.floor(next*SAMPLE_STEPS));
      if(toStep>fromStep){
        const ptr=pointerRef.current;
        for(let step=fromStep;step<toStep;step++){
          const baseJ=((step*9301+machineSeed)%233280)/233280;
          samplesRef.current[step]={
            x:viewRef.current.x,y:viewRef.current.y,scale:viewRef.current.scale,
            vx:ptr.velX,vy:ptr.velY,
            j1:(baseJ+.13)%1,j2:(baseJ*.71+.37)%1,j3:(baseJ*.43+.61)%1,j4:(baseJ*.89+.17)%1,
          };
        }
        scannedStepsRef.current=toStep;
        const buf=previewBuffersRef.current;
        renderScanSource(buf.source,{image:imgRef.current,view:viewRef.current,paper,output,softness:params.softness,contrast:params.contrast,threshold:params.threshold});
        applyScanBand({targetCanvas:buf.result,sourceCanvas:buf.source,direction,fromStep,toStep,samples:samplesRef.current,params,machineSeed,previewStepOffset:fromStep});
      }
      progressRef.current=next; setProgress(next);
      redrawPreview(false);
      pointerRef.current.velX*=0.84;pointerRef.current.velY*=0.84;
      if(next>=1){setScanning(false);return;}
      scanRafRef.current=requestAnimationFrame(tick);
    };
    scanRafRef.current=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(scanRafRef.current);
  },[scanning,sourceReady,params,paper,output,direction,machineSeed,redrawPreview]);

  function onDrop(e){e.preventDefault();e.stopPropagation();setDragOver(false);const f=[...(e.dataTransfer?.files||[])].find(x=>x.type?.startsWith('image/'));if(f)loadFile(f)}

  function randomize(){
    setParams(randomizeScanParams(Date.now()));
    setMachineSeed(rnd(1,0x7ffffffe));
    setScanning(false);
    resetSession();
    redrawPreview(true);
  }
  function reroll(){
    setMachineSeed(rnd(1,0x7ffffffe));
    setScanning(false);
    resetSession();
    redrawPreview(true);
  }
  function resetAll(){
    setParams({...SCAN_PRESET});setDirection(SCAN_DIRECTIONS[0]);setOutput(SCAN_OUTPUTS[0]);setPaper(SCAN_PAPER[0]);
    viewRef.current=DEFAULT_VIEW;setView(DEFAULT_VIEW);setMachineSeed(rnd(1,0x7ffffffe));setScanning(false);resetSession();redrawPreview(true);
  }
  function clearPass(){setScanning(false);resetSession();redrawPreview(true)}
  function startScan(){
    if(!sourceReady||!imgRef.current)return;
    if(progressRef.current>=1)clearPass();
    setScanning(s=>s?false:true);
  }

  async function task(callback,label){
    if(jobRef.current || !imgRef.current)return;
    jobRef.current=true;setBusy(true);
    try{await callback()}catch(err){reportToolError(label,err)}finally{jobRef.current=false;setBusy(false)}
  }
  function renderBlob(transparent=false){
    if(!imgRef.current)throw new Error('Upload an image first');
    if(scannedStepsRef.current<=0)throw new Error('Run a scan first');
    const c=createScanCanvas(doc.w,doc.h);
    renderScanSnapshot(c,{image:imgRef.current,view:viewRef.current,paper,output,direction,params,samples:samplesRef.current,progress,machineSeed,transparent});
    return new Promise((resolve,reject)=>c.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG encode failed')),'image/png'));
  }
  const exportPng=(transparent=false)=>task(async()=>{
    const blob=await renderBlob(transparent);downloadBlob(blob,`1337-scan-${transparent?'alpha-':''}${Date.now()}.png`);
  },'SCAN export');
  const sendToEditor=()=>task(async()=>{
    const blob=await renderBlob(false),file=new File([blob],`SCAN-${Date.now()}.png`,{type:'image/png'});onSendToEditor?.(file,ratio);
  },'SCAN → EDITOR');
  const continueTo=target=>task(async()=>{
    const blob=await renderBlob(false),file=new File([blob],`SCAN-${target}-${Date.now()}.png`,{type:'image/png'});onContinue?.('scan',target,file,ratio);
  },'SCAN CONTINUE');
  const restoreOriginal=()=>task(async()=>{if(origFileRef.current)await loadFile(origFileRef.current,{keepOriginal:false})},'SCAN restore original');

  function pointerDown(e){
    if(!sourceReady)return;
    const host=canvasRef.current?.parentElement;if(!host)return;
    host.setPointerCapture?.(e.pointerId);
    pointerRef.current={...pointerRef.current,down:true,id:e.pointerId,startX:e.clientX,startY:e.clientY,baseX:viewRef.current.x,baseY:viewRef.current.y,lastClientX:e.clientX,lastClientY:e.clientY,lastTime:performance.now(),velX:0,velY:0};
    setIsDragging(true);
  }
  function pointerMove(e){
    const ptr=pointerRef.current;if(!ptr.down||ptr.id!==e.pointerId)return;
    const host=canvasRef.current?.parentElement;if(!host)return;
    const r=host.getBoundingClientRect();
    const nextX=clamp(ptr.baseX + ((e.clientX-ptr.startX)/Math.max(1,r.width))*100,-100,100);
    const nextY=clamp(ptr.baseY + ((e.clientY-ptr.startY)/Math.max(1,r.height))*100,-100,100);
    const now=performance.now();
    ptr.velX=clamp((e.clientX-ptr.lastClientX)/Math.max(1,r.width),-1,1)*2.2;
    ptr.velY=clamp((e.clientY-ptr.lastClientY)/Math.max(1,r.height),-1,1)*2.2;
    ptr.lastClientX=e.clientX;ptr.lastClientY=e.clientY;ptr.lastTime=now;
    viewRef.current={...viewRef.current,x:nextX,y:nextY};
    setView(viewRef.current);
    if(!scanning)redrawPreview(true);
    else redrawPreview(false);
  }
  function pointerUp(e){
    const ptr=pointerRef.current;if(ptr.id!==e.pointerId)return;
    pointerRef.current={...ptr,down:false,id:null,velX:ptr.velX*.5,velY:ptr.velY*.5};
    setIsDragging(false);
  }

  return <main className="fieldShell scanShell scanInteractiveShell">
    <aside className="fieldHud">
      <button type="button" className="toolBrandHome" onClick={onHome} aria-label="Back to 1337tools home"><div className="brand"><span className="brand1337"><span className="brandOneNudge">1</span>337</span><span className="brandTools">tools</span></div></button>
      <button type="button" className="wide fieldBack" onClick={onIndex}>← INDEX</button>
      <button type="button" className="wide primary fieldHero" onClick={randomize}>RANDOMIZE SCAN ↯</button>
      <button type="button" className="wide" onClick={reroll}>NEW MACHINE / REROLL</button>

      <MicroHudGroup title="SOURCE" storageKey="scan-v2-source" defaultOpen>
        <button className="wide" type="button" onClick={()=>fileRef.current?.click()}>+ SOURCE IMAGE</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>{loadFile(e.target.files?.[0]);e.target.value=''}}/>
        <div className="note">{sourceName}<br/>drop anywhere / Ctrl/Cmd+V</div>
        <ScanSelect label="Direction" value={direction} options={SCAN_DIRECTIONS} onChange={setDirection}/>
        <ScanSelect label="Output" value={output} options={SCAN_OUTPUTS} onChange={setOutput}/>
        <ScanRange name="scanSpeed" value={params.scanSpeed} onChange={v=>setP('scanSpeed',v)}/>
        <label className="fieldControl"><div className="fieldControlHead"><span>Image scale</span></div><RangeInputs min={25} max={400} value={view.scale} onChange={v=>{viewRef.current={...viewRef.current,scale:v};setView(viewRef.current);if(!scanning)redrawPreview(true)}}/></label>
        <div className="note">START SCAN, then drag the sheet while the scan bar passes across the canvas.</div>
      </MicroHudGroup>

      <MicroHudGroup title="DEFORMATION" storageKey="scan-v2-deform" defaultOpen>
        {['intensity','stretch','smear','wave','lineShift'].map(k=><ScanRange key={k} name={k} value={params[k]} onChange={v=>setP(k,v)}/>) }
      </MicroHudGroup>
      <MicroHudGroup title="TEXTURE" storageKey="scan-v2-texture" defaultOpen>
        {['grain','banding','softness','contrast','threshold','edgeShadow'].map(k=><ScanRange key={k} name={k} value={params[k]} onChange={v=>setP(k,v)}/>) }
        <div className="fieldBgPresets">{SCAN_PAPER.map((v,i)=><button type="button" key={v} onClick={()=>setPaper(v)} className={paper===v?'active':''}>{['WARM','WHITE','AGED','PAPER'][i]}</button>)}</div>
      </MicroHudGroup>
      <MicroHudGroup title="CANVAS" storageKey="scan-v2-canvas">
        <ScanSelect label="Ratio" value={ratio} options={Object.keys(RATIOS)} onChange={setRatio}/>
        <div className="note">{doc.w} × {doc.h}px · {doc.label}</div>
      </MicroHudGroup>
      <MicroHudGroup title="SCAN" storageKey="scan-v2-machine" defaultOpen accent>
        <div className="note">MACHINE #{machineSeed}<br/>PASS {Math.round(progress*100)}%</div>
        <button className="wide primary" type="button" disabled={!sourceReady||busy} onClick={startScan}>{scanning?'PAUSE SCAN':'START SCAN'}</button>
        <button className="wide" type="button" disabled={!sourceReady||busy||!hasScan} onClick={clearPass}>CLEAR PASS</button>
        <button className="wide" type="button" disabled={!sourceReady||busy} onClick={restoreOriginal}>RESTORE ORIGINAL</button>
        <button className="wide" type="button" onClick={resetAll}>RESET SETTINGS</button>
      </MicroHudGroup>
      <MicroHudGroup title="OUTPUT" storageKey="scan-v2-output" accent defaultOpen>
        <button className="wide primary" type="button" disabled={!sourceReady||busy||!hasScan} onClick={sendToEditor}>SEND TO EDITOR</button>
        <ContinuePanel current="scan" disabled={!sourceReady||busy||!hasScan} onChoose={continueTo}/>
        <div className="two"><button type="button" disabled={!sourceReady||busy||!hasScan} onClick={()=>exportPng(false)}>PNG</button><button type="button" disabled={!sourceReady||busy||!hasScan} onClick={()=>exportPng(true)}>PNG α</button></div>
        <div className="note">Export uses the current scan pass in high resolution.</div>
      </MicroHudGroup>
    </aside>
    <section className="fieldWorkspace">
      <header className="fieldTop fieldTop41"><div><button type="button" onClick={onIndex}>INDEX</button><span>1337TOOLS / 06 SCAN / DRAG SCAN</span></div><div><b>{processLabel}</b></div></header>
      <div className={`fieldStage scanStage ${dragOver?'fieldDropActive':''} ${isDragging?'scanDragging':''}`}
        onDragEnter={e=>{e.preventDefault();setDragOver(true)}} onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOver(false)}} onDrop={onDrop}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
        <div className="fieldCanvasWrap" style={{aspectRatio:`${doc.w} / ${doc.h}`}}><canvas className="fieldCanvas scanCanvas" ref={canvasRef}/></div>
      </div>
    </section>
  </main>;
}
