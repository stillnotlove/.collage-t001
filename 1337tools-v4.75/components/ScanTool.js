'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {RATIOS,clamp} from '../lib/editorCore';
import {downloadBlob,isEditableTarget,reportToolError} from '../lib/browserUtils';
import {SCAN_PRESETS,SCAN_MODES,SCAN_PAPER,createScanCanvas,renderScan} from '../lib/scanEngine';
import ContinuePanel from './ContinuePanel';
import MicroHudGroup from './MicroHudGroup';
import RangeInputs from './RangeInputs';

const DEFAULT_VIEW={scale:100,x:0,y:0};
const SCAN_RANGES={
  intensity:['Intensity',0,100],exposure:['Exposure',-80,80],contrast:['Contrast',-80,100],threshold:['Threshold',0,100],
  grain:['Toner grain',0,100],streaks:['Roller streaks',0,100],dust:['Glass dust / scratches',0,100],banding:['Scan banding',0,100],
  skew:['Skew',-5,5,.05],wobble:['Line wobble',0,100],softness:['Optical softness',0,100],lidShadow:['Lid shadow',0,100],edgeFade:['Edge fade',0,100]
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
  const [mode,setMode]=useState('FLATBED');
  const [params,setParams]=useState({...SCAN_PRESETS.FLATBED});
  const [output,setOutput]=useState('B/W'),[paper,setPaper]=useState(SCAN_PAPER[0]);
  const [sourceName,setSourceName]=useState('NO SOURCE'),[sourceReady,setSourceReady]=useState(false);
  const [view,setView]=useState(DEFAULT_VIEW),[ratio,setRatio]=useState(initialRatio||'4 / 5');
  const [seed,setSeed]=useState(()=>rnd(1,0x7ffffffe)),[generation,setGeneration]=useState(0);
  const [busy,setBusy]=useState(false),[dragOver,setDragOver]=useState(false);
  const canvasRef=useRef(null),fileRef=useRef(null),imgRef=useRef(null),origFileRef=useRef(null),urlRef=useRef(null),loadSeq=useRef(0),jobRef=useRef(false);
  const doc=useMemo(()=>{const d=RATIOS[ratio]||RATIOS['4 / 5'];return {w:d.width,h:d.height,label:d.label}},[ratio]);
  const processLabel=(trail?.length?trail:['SCAN']).join(' → ');

  function setP(name,value){setParams(p=>({...p,[name]:value}))}
  function changeMode(next){setMode(next);setParams({...SCAN_PRESETS[next]});}
  function randomize(){
    const next=SCAN_MODES[rnd(0,SCAN_MODES.length-1)],base=SCAN_PRESETS[next];
    setMode(next);setOutput(Math.random()<.72?'B/W':'COLOR');
    setParams({...base,intensity:rnd(42,100),exposure:rnd(-25,15),contrast:rnd(2,88),threshold:rnd(0,90),grain:rnd(2,85),streaks:rnd(2,88),dust:rnd(0,70),banding:rnd(0,65),skew:rnd(-180,180)/100,wobble:rnd(0,75),softness:rnd(0,55),lidShadow:rnd(0,80),edgeFade:rnd(0,80)});
    setSeed(rnd(1,0x7ffffffe));
  }
  function reroll(){setSeed(rnd(1,0x7ffffffe))}
  function reset(){setMode('FLATBED');setParams({...SCAN_PRESETS.FLATBED});setOutput('B/W');setPaper(SCAN_PAPER[0]);setView(DEFAULT_VIEW);setSeed(rnd(1,0x7ffffffe))}

  async function loadFile(file,{keepOriginal=false,nextGeneration=0,keepView=false}={}){
    if(!file||!file.type?.startsWith('image/'))return false;
    const id=++loadSeq.current,url=URL.createObjectURL(file),img=new Image();
    return await new Promise(resolve=>{
      img.onload=()=>{
        if(id!==loadSeq.current){URL.revokeObjectURL(url);resolve(false);return}
        if(urlRef.current)URL.revokeObjectURL(urlRef.current);
        urlRef.current=url;imgRef.current=img;
        if(!keepOriginal)origFileRef.current=file;
        if(!keepView)setView(DEFAULT_VIEW);
        setSourceReady(true);setSourceName(file.name||'PASTED IMAGE');setGeneration(nextGeneration);
        resolve(true);
      };
      img.onerror=()=>{
        URL.revokeObjectURL(url);
        if(id===loadSeq.current)reportToolError('SCAN image load',new Error('Unsupported or damaged image'));
        resolve(false);
      };
      img.src=url;
    });
  }
  useEffect(()=>()=>{loadSeq.current++;if(urlRef.current)URL.revokeObjectURL(urlRef.current)},[]);
  useEffect(()=>{if(initialFile)loadFile(initialFile);if(initialRatio)setRatio(initialRatio)},[initialFile,initialRatio,initialToken]);
  useEffect(()=>{
    const paste=e=>{
      if(isEditableTarget())return;
      const file=[...(e.clipboardData?.files||[])].find(f=>f.type?.startsWith('image/'))||[...(e.clipboardData?.items||[])].find(f=>f.type?.startsWith('image/'))?.getAsFile?.();
      if(file){e.preventDefault();loadFile(file)}
    };
    window.addEventListener('paste',paste);return()=>window.removeEventListener('paste',paste);
  },[]);
  function onDrop(e){e.preventDefault();e.stopPropagation();setDragOver(false);const f=[...(e.dataTransfer?.files||[])].find(x=>x.type?.startsWith('image/'));if(f)loadFile(f)}

  useEffect(()=>{
    let frame=0;const c=canvasRef.current;if(!c)return;
    const draw=()=>{
      if(!c.isConnected)return;
      const host=c.parentElement,r=host.getBoundingClientRect();if(r.width<2||r.height<2)return;
      const maxEdge=950,pixelRatio=Math.min(2,window.devicePixelRatio||1);
      const scale=Math.min(1,maxEdge/(Math.max(r.width,r.height)*pixelRatio));
      c.width=Math.max(1,Math.round(r.width*pixelRatio*scale));c.height=Math.max(1,Math.round(r.height*pixelRatio*scale));
      try{
        if(imgRef.current)renderScan(c,{image:imgRef.current,params,seed,generation,view,paper,output});
        else {const ctx=c.getContext('2d');ctx.fillStyle=paper;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#222';ctx.font=`bold ${Math.max(11,c.width*.025)}px monospace`;ctx.textAlign='center';ctx.fillText('DROP / PASTE ONE IMAGE',c.width/2,c.height/2)}
      }catch(err){reportToolError('SCAN preview',err)}
    };
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(draw)};
    schedule();const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(schedule):null;
    ro?.observe(c.parentElement||c);window.addEventListener('resize',schedule);
    return()=>{cancelAnimationFrame(frame);ro?.disconnect();window.removeEventListener('resize',schedule)};
  },[sourceReady,sourceName,params,seed,generation,ratio,view,paper,output]);

  function renderBlob(transparent=false){
    if(!imgRef.current)throw new Error('Upload an image first');
    const c=createScanCanvas(doc.w,doc.h);
    renderScan(c,{image:imgRef.current,params,seed,generation,view,paper,output,transparent});
    return new Promise((resolve,reject)=>c.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG encode failed')),'image/png'));
  }
  async function task(callback,label){
    if(jobRef.current||!imgRef.current)return;jobRef.current=true;setBusy(true);
    try{await callback()}catch(err){reportToolError(label,err)}finally{jobRef.current=false;setBusy(false)}
  }
  const exportPng=(transparent=false)=>task(async()=>{
    const blob=await renderBlob(transparent);downloadBlob(blob,`1337-scan-${transparent?'alpha-':''}${Date.now()}.png`);
  },'SCAN export');
  const sendToEditor=()=>task(async()=>{
    const blob=await renderBlob(false),file=new File([blob],`SCAN-${Date.now()}.png`,{type:'image/png'});
    onSendToEditor?.(file,ratio);
  },'SCAN → EDITOR');
  const continueTo=target=>task(async()=>{
    const blob=await renderBlob(false),file=new File([blob],`SCAN-${target}-${Date.now()}.png`,{type:'image/png'});
    onContinue?.('scan',target,file,ratio);
  },'SCAN CONTINUE');
  const copyAgain=()=>task(async()=>{
    const previous=loadSeq.current;
    const blob=await renderBlob(false);
    if(previous!==loadSeq.current)return; // user changed source while encoding
    const file=new File([blob],`SCAN-GEN-${generation+1}.png`,{type:'image/png'});
    // The processed output becomes the next input: actual cumulative degradation.
    await loadFile(file,{keepOriginal:true,nextGeneration:generation+1,keepView:false});
  },'SCAN copy again');
  const restoreOriginal=()=>task(async()=>{
    if(origFileRef.current)await loadFile(origFileRef.current,{keepOriginal:false,nextGeneration:0});
  },'SCAN restore original');

  return <main className="fieldShell scanShell">
    <aside className="fieldHud">
      <button type="button" className="toolBrandHome" onClick={onHome} aria-label="Back to 1337tools home"><div className="brand"><span className="brand1337"><span className="brandOneNudge">1</span>337</span><span className="brandTools">tools</span></div></button>
      <button type="button" className="wide fieldBack" onClick={onIndex}>← INDEX</button>
      <button type="button" className="wide primary fieldHero" onClick={randomize}>RANDOMIZE SCAN ↯</button>
      <button type="button" className="wide" onClick={reroll}>NEW MACHINE / REROLL</button>

      <MicroHudGroup title="SOURCE" storageKey="scan-v1-input" defaultOpen>
        <button className="wide" type="button" onClick={()=>fileRef.current?.click()}>+ SOURCE IMAGE</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>{loadFile(e.target.files?.[0]);e.target.value=''}}/>
        <div className="note">{sourceName}<br/>drop anywhere / Ctrl/Cmd+V</div>
        <ScanSelect label="Mode" value={mode} options={SCAN_MODES} onChange={changeMode}/>
        <ScanSelect label="Output" value={output} options={['B/W','COLOR']} onChange={setOutput}/>
        <ScanRange name="intensity" value={params.intensity} onChange={v=>setP('intensity',v)}/>
        <label className="fieldControl"><div className="fieldControlHead"><span>Image scale</span></div><RangeInputs min={25} max={400} value={view.scale} onChange={v=>setView(a=>({...a,scale:v}))}/></label>
        <label className="fieldControl"><div className="fieldControlHead"><span>Image X</span></div><RangeInputs min={-100} max={100} value={view.x} onChange={v=>setView(a=>({...a,x:v}))}/></label>
        <label className="fieldControl"><div className="fieldControlHead"><span>Image Y</span></div><RangeInputs min={-100} max={100} value={view.y} onChange={v=>setView(a=>({...a,y:v}))}/></label>
      </MicroHudGroup>

      <MicroHudGroup title="TONE" storageKey="scan-v1-tone" defaultOpen>
        {['exposure','contrast','threshold'].map(k=><ScanRange key={k} name={k} value={params[k]} onChange={v=>setP(k,v)}/>)}
      </MicroHudGroup>
      <MicroHudGroup title="DEFECTS" storageKey="scan-v1-defects">
        {['grain','streaks','dust','banding'].map(k=><ScanRange key={k} name={k} value={params[k]} onChange={v=>setP(k,v)}/>)}
      </MicroHudGroup>
      <MicroHudGroup title="GEOMETRY" storageKey="scan-v1-geometry">
        {['skew','wobble','softness'].map(k=><ScanRange key={k} name={k} value={params[k]} onChange={v=>setP(k,v)}/>)}
      </MicroHudGroup>
      <MicroHudGroup title="PAPER" storageKey="scan-v1-paper">
        {['lidShadow','edgeFade'].map(k=><ScanRange key={k} name={k} value={params[k]} onChange={v=>setP(k,v)}/>)}
        <div className="fieldBgPresets">{SCAN_PAPER.map((v,i)=><button type="button" key={v} onClick={()=>setPaper(v)} className={paper===v?'active':''}>{['WARM','WHITE','AGED','PAPER'][i]}</button>)}</div>
      </MicroHudGroup>
      <MicroHudGroup title="CANVAS" storageKey="scan-v1-canvas">
        <ScanSelect label="Ratio" value={ratio} options={Object.keys(RATIOS)} onChange={setRatio}/>
        <div className="note">{doc.w} × {doc.h}px · {doc.label}</div>
      </MicroHudGroup>
      <MicroHudGroup title="MACHINE" storageKey="scan-v1-machine" defaultOpen>
        <div className="note">MACHINE #{seed} · GENERATION {generation}</div>
        <button className="wide primary" type="button" disabled={!sourceReady||busy} onClick={copyAgain}>{busy?'PROCESSING…':'COPY AGAIN ↻'}</button>
        <button className="wide" type="button" disabled={!sourceReady||!generation||busy} onClick={restoreOriginal}>RESTORE ORIGINAL</button>
        <button className="wide" type="button" onClick={reset}>RESET SETTINGS</button>
        <div className="note">COPY AGAIN scans the previous output. Damage accumulates between generations. NEW MACHINE changes recurring defects.</div>
      </MicroHudGroup>
      <MicroHudGroup title="OUTPUT" storageKey="scan-v1-output" accent defaultOpen>
        <button className="wide primary" type="button" disabled={!sourceReady||busy} onClick={sendToEditor}>SEND TO EDITOR</button>
        <ContinuePanel current="scan" disabled={!sourceReady||busy} onChoose={continueTo}/>
        <div className="two"><button type="button" disabled={!sourceReady||busy} onClick={()=>exportPng(false)}>PNG</button><button type="button" disabled={!sourceReady||busy} onClick={()=>exportPng(true)}>PNG α</button></div>
        <div className="note">PNG α keys out light paper. All scans stay in your browser.</div>
      </MicroHudGroup>
    </aside>
    <section className="fieldWorkspace">
      <header className="fieldTop fieldTop41"><div><button type="button" onClick={onIndex}>INDEX</button><span>1337TOOLS / 06 SCAN / {mode}</span></div><div><b>{processLabel}</b></div></header>
      <div className={`fieldStage scanStage ${dragOver?'fieldDropActive':''}`}
        onDragEnter={e=>{e.preventDefault();setDragOver(true)}} onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOver(false)}} onDrop={onDrop}>
        <div className="fieldCanvasWrap" style={{aspectRatio:`${doc.w} / ${doc.h}`}}><canvas className="fieldCanvas scanCanvas" ref={canvasRef}/></div>
      </div>
    </section>
  </main>;
}
