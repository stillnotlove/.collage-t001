'use client';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {RATIOS} from '../lib/editorCore';
import {downloadBlob,isEditableTarget,reportToolError} from '../lib/browserUtils';
import {exportWeaveCanvas,randomizeWeave,renderWeavePreview,WEAVE_DEFAULT_PARAMS,WEAVE_DEFAULT_VIEW,WEAVE_MODES} from '../lib/weaveEngine';
import ContinuePanel from './ContinuePanel';
import MicroHudGroup from './MicroHudGroup';
import RangeInputs from './RangeInputs';

const asBlob=(canvas)=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Unable to encode PNG')),'image/png'));
const CONTROL={
  count:['Band count',2,48],gap:['Gap',0,40],mix:['A coverage',10,90],softness:['Blend softness',0,40],amplitude:['Wave amplitude',0,70],frequency:['Wave frequency',0,80],phase:['Phase',0,100],jitter:['Irregularity',0,30],
  scale:['Scale',25,300],x:['Offset X',-100,100],y:['Offset Y',-100,100]
};

function WeaveRange({name,value,onChange}){
  const [label,min,max]=CONTROL[name];
  return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><b>{value}{name==='mix'?'%':''}</b></div><RangeInputs min={min} max={max} value={value} onChange={onChange}/></label>;
}

function cloneView(v){return {scale:v.scale,x:v.x,y:v.y}}

export default function WeaveTool({onIndex,onHome,onSendToEditor,onContinue,trail=[],initialFile,initialRatio='4 / 5',initialToken}){
  const [ratio,setRatio]=useState(initialRatio||'4 / 5');
  const [params,setParams]=useState({...WEAVE_DEFAULT_PARAMS}), paramsRef=useRef({...WEAVE_DEFAULT_PARAMS});
  const [viewA,setViewA]=useState({...WEAVE_DEFAULT_VIEW}), viewARef=useRef({...WEAVE_DEFAULT_VIEW});
  const [viewB,setViewB]=useState({...WEAVE_DEFAULT_VIEW}), viewBRef=useRef({...WEAVE_DEFAULT_VIEW});
  const [sourceAName,setSourceAName]=useState('NO SOURCE A');
  const [sourceBName,setSourceBName]=useState('NO SOURCE B');
  const [readyA,setReadyA]=useState(false), [readyB,setReadyB]=useState(false), [busy,setBusy]=useState(false), [dragOver,setDragOver]=useState(false);
  const [seed,setSeed]=useState(Math.floor(Math.random()*1e9));
  const canvasRef=useRef(null), fileARef=useRef(null), fileBRef=useRef(null), jobRef=useRef(false);
  const imgARef=useRef(null), imgBRef=useRef(null), urlARef=useRef(null), urlBRef=useRef(null), loadSeqA=useRef(0), loadSeqB=useRef(0);
  const doc=useMemo(()=>{const r=RATIOS[ratio]||RATIOS['4 / 5']; return {w:r.width,h:r.height,label:r.label};},[ratio]);
  const ready=readyA&&readyB&&imgARef.current&&imgBRef.current;
  const processLabel=(trail?.length?trail:['WEAVE']).join(' → ');

  const draw=useCallback(()=>{
    const canvas=canvasRef.current;
    if(!canvas)return;
    const host=canvas.parentElement, rect=host.getBoundingClientRect();
    if(rect.width<2||rect.height<2)return;
    const pixelRatio=Math.min(window.devicePixelRatio||1,2), maxEdge=1100;
    const s=Math.min(1,maxEdge/(Math.max(rect.width,rect.height)*pixelRatio));
    const w=Math.max(1,Math.round(rect.width*pixelRatio*s)), h=Math.max(1,Math.round(rect.height*pixelRatio*s));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const ctx=canvas.getContext('2d');
    if(!ready){
      ctx.fillStyle='#f5f3ed'; ctx.fillRect(0,0,w,h);
      ctx.fillStyle='#181818'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font=`700 ${Math.max(12,w*.022)}px monospace`; ctx.fillText('LOAD TWO IMAGES',w/2,h/2-12);
      ctx.font=`${Math.max(10,w*.015)}px monospace`; ctx.fillText('SOURCE A + SOURCE B → WEAVE',w/2,h/2+16);
      return;
    }
    renderWeavePreview(canvas,{imageA:imgARef.current,imageB:imgBRef.current,viewA:viewARef.current,viewB:viewBRef.current,params:paramsRef.current,transparent:false});
  },[ready]);

  const assignImage=useCallback((which,file,nameOverride='')=>{
    if(!file||!file.type?.startsWith('image/'))return;
    const seq=(which==='A'?++loadSeqA.current:++loadSeqB.current);
    const url=URL.createObjectURL(file), img=new Image();
    img.onload=()=>{
      if(seq!==(which==='A'?loadSeqA.current:loadSeqB.current)){URL.revokeObjectURL(url);return;}
      if(which==='A'){
        if(urlARef.current)URL.revokeObjectURL(urlARef.current); urlARef.current=url; imgARef.current=img; setSourceAName(nameOverride||file.name||'SOURCE A'); setReadyA(true); viewARef.current={...WEAVE_DEFAULT_VIEW}; setViewA({...WEAVE_DEFAULT_VIEW});
      }else{
        if(urlBRef.current)URL.revokeObjectURL(urlBRef.current); urlBRef.current=url; imgBRef.current=img; setSourceBName(nameOverride||file.name||'SOURCE B'); setReadyB(true); viewBRef.current={...WEAVE_DEFAULT_VIEW}; setViewB({...WEAVE_DEFAULT_VIEW});
      }
      requestAnimationFrame(draw);
    };
    img.onerror=()=>{URL.revokeObjectURL(url); reportToolError('WEAVE image load',new Error('Unable to decode image')); };
    img.src=url;
  },[draw]);

  const loadFile=useCallback((file,which='AUTO')=>{
    if(which==='AUTO'){
      if(!readyA)assignImage('A',file);
      else if(!readyB)assignImage('B',file);
      else assignImage('B',file);
    }else assignImage(which,file);
  },[assignImage,readyA,readyB]);

  useEffect(()=>{ if(initialFile){ loadFile(initialFile,'A'); setTimeout(()=>loadFile(initialFile,'B'),20); } },[initialFile,initialToken,loadFile]);
  useEffect(()=>{ if(initialRatio)setRatio(initialRatio); },[initialRatio,initialToken]);
  useEffect(()=>{
    const paste=e=>{
      if(isEditableTarget())return;
      const file=[...(e.clipboardData?.files||[])].find(f=>f.type?.startsWith('image/'))||[...(e.clipboardData?.items||[])].find(i=>i.type?.startsWith('image/'))?.getAsFile?.();
      if(file){e.preventDefault(); loadFile(file,'AUTO');}
    };
    window.addEventListener('paste',paste);
    return()=>window.removeEventListener('paste',paste);
  },[loadFile]);
  useEffect(()=>{
    const c=canvasRef.current; if(!c)return;
    const ro=typeof ResizeObserver==='undefined'?null:new ResizeObserver(()=>draw()); ro?.observe(c.parentElement);
    const onResize=()=>draw(); window.addEventListener('resize',onResize); draw();
    return()=>{ro?.disconnect(); window.removeEventListener('resize',onResize);};
  },[draw,ratio]);
  useEffect(()=>()=>{ if(urlARef.current)URL.revokeObjectURL(urlARef.current); if(urlBRef.current)URL.revokeObjectURL(urlBRef.current); ++loadSeqA.current; ++loadSeqB.current; },[]);

  function updateParam(k,v){ const next={...paramsRef.current,[k]:v}; paramsRef.current=next; setParams(next); draw(); }
  function updateView(which,patch){
    if(which==='A'){ const next={...viewARef.current,...patch}; viewARef.current=next; setViewA(next); }
    else { const next={...viewBRef.current,...patch}; viewBRef.current=next; setViewB(next); }
    draw();
  }
  function swapSources(){
    const ia=imgARef.current, ib=imgBRef.current, ua=urlARef.current, ub=urlBRef.current, na=sourceAName, nb=sourceBName, ra=readyA, rb=readyB, va=cloneView(viewARef.current), vb=cloneView(viewBRef.current);
    imgARef.current=ib; imgBRef.current=ia; urlARef.current=ub; urlBRef.current=ua; setSourceAName(nb); setSourceBName(na); setReadyA(rb); setReadyB(ra);
    viewARef.current=vb; viewBRef.current=va; setViewA(vb); setViewB(va); draw();
  }
  function copyAToB(){ if(!imgARef.current)return; imgBRef.current=imgARef.current; setReadyB(true); setSourceBName(`${sourceAName} COPY`); viewBRef.current={...viewARef.current}; setViewB({...viewARef.current}); draw(); }
  function resetAll(){ paramsRef.current={...WEAVE_DEFAULT_PARAMS}; setParams({...WEAVE_DEFAULT_PARAMS}); viewARef.current={...WEAVE_DEFAULT_VIEW}; viewBRef.current={...WEAVE_DEFAULT_VIEW}; setViewA({...WEAVE_DEFAULT_VIEW}); setViewB({...WEAVE_DEFAULT_VIEW}); draw(); }
  function randomize(){ const next=randomizeWeave(Date.now()); paramsRef.current=next; setParams(next); setSeed(Date.now()); draw(); }

  async function resultBlob(alpha=false){ const c=exportWeaveCanvas({imageA:imgARef.current,imageB:imgBRef.current,ratio:{width:doc.w,height:doc.h},viewA:viewARef.current,viewB:viewBRef.current,params:paramsRef.current,transparent:alpha}); return asBlob(c); }
  const task=async(fn,label)=>{ if(jobRef.current||!ready)return; jobRef.current=true; setBusy(true); try{ await fn(); } catch(e){ reportToolError(label,e); } finally { jobRef.current=false; setBusy(false); } };
  const exportPng=(alpha=false)=>task(async()=>downloadBlob(await resultBlob(alpha),`1337-weave-${alpha?'alpha-':''}${Date.now()}.png`),'WEAVE export');
  const sendEditor=()=>task(async()=>{ const b=await resultBlob(false); onSendToEditor?.(new File([b],`WEAVE-${Date.now()}.png`,{type:'image/png'}),ratio); },'WEAVE → EDITOR');
  const continueTo=target=>task(async()=>{ const b=await resultBlob(false); onContinue?.('weave',target,new File([b],`WEAVE-${target}-${Date.now()}.png`,{type:'image/png'}),ratio); },'WEAVE CONTINUE');
  const onDrop=e=>{ e.preventDefault(); e.stopPropagation(); setDragOver(false); const f=[...(e.dataTransfer?.files||[])].find(x=>x.type?.startsWith('image/')); if(f)loadFile(f,'AUTO'); };

  return <main className="fieldShell weaveShell">
    <aside className="fieldHud">
      <button type="button" className="toolBrandHome" onClick={onHome} aria-label="Back to 1337tools home"><div className="brand"><span className="brand1337"><span className="brandOneNudge">1</span>337</span><span className="brandTools">tools</span></div></button>
      <button type="button" className="wide fieldBack" onClick={onIndex}>← INDEX</button>
      <div className="scanActions"><button type="button" className="wide primary" disabled={!ready||busy} onClick={randomize}>RANDOMIZE ↯</button><button type="button" className="wide" disabled={busy} onClick={swapSources}>SWAP A / B</button></div>
      <MicroHudGroup title="SOURCE A" storageKey="weave-v1-source-a" defaultOpen>
        <button type="button" className="wide" onClick={()=>fileARef.current?.click()}>+ SOURCE A</button>
        <input type="file" hidden accept="image/*" ref={fileARef} onChange={e=>{loadFile(e.target.files?.[0],'A');e.target.value='';}}/>
        <div className="note">{sourceAName}</div>
        <WeaveRange name="scale" value={viewA.scale} onChange={v=>updateView('A',{scale:v})}/>
        <WeaveRange name="x" value={viewA.x} onChange={v=>updateView('A',{x:v})}/>
        <WeaveRange name="y" value={viewA.y} onChange={v=>updateView('A',{y:v})}/>
      </MicroHudGroup>
      <MicroHudGroup title="SOURCE B" storageKey="weave-v1-source-b" defaultOpen>
        <button type="button" className="wide" onClick={()=>fileBRef.current?.click()}>+ SOURCE B</button>
        <input type="file" hidden accept="image/*" ref={fileBRef} onChange={e=>{loadFile(e.target.files?.[0],'B');e.target.value='';}}/>
        <div className="note">{sourceBName}</div>
        <div className="two"><button type="button" disabled={!readyA||busy} onClick={copyAToB}>A → B</button><button type="button" disabled={!readyB||busy} onClick={swapSources}>SWAP</button></div>
        <WeaveRange name="scale" value={viewB.scale} onChange={v=>updateView('B',{scale:v})}/>
        <WeaveRange name="x" value={viewB.x} onChange={v=>updateView('B',{x:v})}/>
        <WeaveRange name="y" value={viewB.y} onChange={v=>updateView('B',{y:v})}/>
      </MicroHudGroup>
      <MicroHudGroup title="PATTERN" storageKey="weave-v1-pattern" defaultOpen>
        <div className="scanPresetSwitch">{WEAVE_MODES.map(m=><button key={m} type="button" className={params.mode===m?'active':''} onClick={()=>updateParam('mode',m)}>{m}</button>)}</div>
        <div className="scanModeSwitch"><button type="button" className={params.direction==='VERTICAL'?'active':''} onClick={()=>updateParam('direction','VERTICAL')}>VERTICAL</button><button type="button" className={params.direction==='HORIZONTAL'?'active':''} onClick={()=>updateParam('direction','HORIZONTAL')}>HORIZONTAL</button></div>
        <WeaveRange name="count" value={params.count} onChange={v=>updateParam('count',v)}/>
        <WeaveRange name="gap" value={params.gap} onChange={v=>updateParam('gap',v)}/>
        <WeaveRange name="mix" value={params.mix} onChange={v=>updateParam('mix',v)}/>
        <WeaveRange name="softness" value={params.softness} onChange={v=>updateParam('softness',v)}/>
        <WeaveRange name="phase" value={params.phase} onChange={v=>updateParam('phase',v)}/>
      </MicroHudGroup>
      <MicroHudGroup title="DEFORMATION" storageKey="weave-v1-deformation">
        <WeaveRange name="amplitude" value={params.amplitude} onChange={v=>updateParam('amplitude',v)}/>
        <WeaveRange name="frequency" value={params.frequency} onChange={v=>updateParam('frequency',v)}/>
        <WeaveRange name="jitter" value={params.jitter} onChange={v=>updateParam('jitter',v)}/>
        <div className="note">WEAVE v1 interlaces two images into one structure. STRIPS = clean bands, GRID = checker interlock, WAVES = softer flowing weave.</div>
      </MicroHudGroup>
      <MicroHudGroup title="CANVAS" storageKey="weave-v1-canvas">
        <label className="fieldControl"><div className="fieldControlHead"><span>Ratio</span></div><select value={ratio} onChange={e=>setRatio(e.target.value)}>{Object.keys(RATIOS).map(r=><option key={r} value={r}>{r}</option>)}</select></label>
        <div className="note">{doc.w} × {doc.h}px · {doc.label}</div>
      </MicroHudGroup>
      <MicroHudGroup title="OUTPUT" storageKey="weave-v1-output" accent defaultOpen>
        <div className="note">MODE {params.mode} · {params.direction} · seed {seed}</div>
        <button type="button" className="wide primary" disabled={!ready||busy} onClick={sendEditor}>SEND TO EDITOR</button>
        <ContinuePanel current="weave" disabled={!ready||busy} onChoose={continueTo}/>
        <div className="two"><button type="button" disabled={!ready||busy} onClick={()=>exportPng(false)}>PNG</button><button type="button" disabled={!ready||busy} onClick={()=>exportPng(true)}>PNG α</button></div>
        <button type="button" className="wide" disabled={busy} onClick={resetAll}>RESET SETTINGS</button>
      </MicroHudGroup>
    </aside>
    <section className="fieldWorkspace">
      <header className="fieldTop fieldTop41"><div><button type="button" onClick={onIndex}>INDEX</button><span>1337TOOLS / 08 WEAVE / IMAGE INTERLACE TOOL</span></div><div><b>{processLabel}</b></div></header>
      <div className={`fieldStage weaveStage ${dragOver?'fieldDropActive':''}`} onDragEnter={e=>{e.preventDefault();setDragOver(true)}} onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOver(false)}} onDrop={onDrop}>
        <div className="fieldCanvasWrap weaveCanvasWrap" style={{aspectRatio:`${doc.w} / ${doc.h}`}}><canvas className="fieldCanvas weaveCanvas" ref={canvasRef}/></div>
      </div>
    </section>
  </main>;
}
