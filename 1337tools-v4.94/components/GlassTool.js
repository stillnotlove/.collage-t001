'use client';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {RATIOS, clamp} from '../lib/editorCore';
import {downloadBlob, isEditableTarget, reportToolError} from '../lib/browserUtils';
import {createGlassCanvas, exportGlassCanvas, GLASS_DEFAULT_LENSES, GLASS_DEFAULT_PARAMS, GLASS_DEFAULT_VIEW, randomizeGlass, renderGlassPreview} from '../lib/glassEngine';
import ContinuePanel from './ContinuePanel';
import MicroHudGroup from './MicroHudGroup';
import RangeInputs from './RangeInputs';

const asBlob=(canvas)=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Unable to encode PNG')),'image/png'));
const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;

// Small alpha check only on file load; no readback during interactive rendering.
function imageHasTransparency(img){
  const c=document.createElement('canvas');c.width=80;c.height=80;
  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.clearRect(0,0,80,80);ctx.drawImage(img,0,0,80,80);
  const rgba=ctx.getImageData(0,0,80,80).data;
  for(let i=3;i<rgba.length;i+=4)if(rgba[i]<255)return true;
  return false;
}

function GlassRange({label,value,min=0,max=100,step=1,onChange}){
  return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><b>{value}{max===100&&min===0?'%':''}</b></div><RangeInputs min={min} max={max} step={step} value={value} onChange={onChange}/></label>;
}

export default function GlassTool({onIndex,onHome,onSendToEditor,onContinue,trail=[],initialFile,initialRatio='4 / 5',initialToken}){
  const [view,setView]=useState({...GLASS_DEFAULT_VIEW});
  const [params,setParams]=useState({...GLASS_DEFAULT_PARAMS});
  const [lenses,setLenses]=useState(GLASS_DEFAULT_LENSES.map(l=>({...l})));
  const [selectedId,setSelectedId]=useState(GLASS_DEFAULT_LENSES[0].id);
  const [ratio,setRatio]=useState(initialRatio||'4 / 5');
  const [sourceName,setSourceName]=useState('NO SOURCE');
  const [ready,setReady]=useState(false);
  const [dragOver,setDragOver]=useState(false);
  const [dragging,setDragging]=useState(false);
  const [busy,setBusy]=useState(false);
  const [showGuides,setShowGuides]=useState(true);
  const [sourceHasAlpha,setSourceHasAlpha]=useState(false);
  const sourceHasAlphaRef=useRef(false);
  const showGuidesRef=useRef(true), draggingRef=useRef(false);
  const [seed,setSeed]=useState(Math.floor(Math.random()*1e9));
  const canvasRef=useRef(null),fileRef=useRef(null),imageRef=useRef(null),urlRef=useRef(null),loadSeq=useRef(0),jobRef=useRef(false);
  const selectedRef=useRef(selectedId),viewRef=useRef(view),paramsRef=useRef(params),lensesRef=useRef(lenses),dragRef=useRef({down:false,id:null,offsetX:0,offsetY:0});
  const doc=useMemo(()=>{const r=RATIOS[ratio]||RATIOS['4 / 5'];return {w:r.width,h:r.height,label:r.label};},[ratio]);
  const processLabel=(trail?.length?trail:['GLASS']).join(' → ');

  useEffect(()=>{selectedRef.current=selectedId},[selectedId]);
  useEffect(()=>{viewRef.current=view},[view]);
  useEffect(()=>{paramsRef.current=params},[params]);
  useEffect(()=>{lensesRef.current=lenses},[lenses]);

  const draw=useCallback(()=>{
    const canvas=canvasRef.current;if(!canvas)return;const host=canvas.parentElement,rect=host.getBoundingClientRect();if(rect.width<2||rect.height<2)return;
    const dpr=Math.min(window.devicePixelRatio||1,2),maxEdge=1000,s=Math.min(1,maxEdge/(Math.max(rect.width,rect.height)*dpr));
    const w=Math.max(1,Math.round(rect.width*dpr*s)),h=Math.max(1,Math.round(rect.height*dpr*s));
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
    const ctx=canvas.getContext('2d');
    if(!imageRef.current){ctx.fillStyle='#f5f3ed';ctx.fillRect(0,0,w,h);ctx.fillStyle='#111';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${Math.max(12,w*.023)}px monospace`;ctx.fillText('DROP / PASTE AN IMAGE',w/2,h/2-12);ctx.font=`${Math.max(10,w*.016)}px monospace`;ctx.fillText('ADD LENSES → DRAG THEM',w/2,h/2+16);return;}
    renderGlassPreview(canvas,{image:imageRef.current,view:viewRef.current,lenses:lensesRef.current,params:paramsRef.current,selectedId:selectedRef.current,dragging:draggingRef.current,showGuides:showGuidesRef.current,transparent:sourceHasAlphaRef.current});
  },[]);

  useEffect(()=>{showGuidesRef.current=showGuides;draw();},[showGuides,draw]);
  useEffect(()=>{draggingRef.current=dragging;draw();},[dragging,draw]);
  useEffect(()=>{draw();},[selectedId,draw]);

  const loadFile=useCallback((file)=>{
    if(!file||!file.type?.startsWith('image/'))return;
    const seq=++loadSeq.current; const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{ if(seq!==loadSeq.current){URL.revokeObjectURL(url);return;} if(urlRef.current)URL.revokeObjectURL(urlRef.current); urlRef.current=url; imageRef.current=img; const alpha=imageHasTransparency(img);sourceHasAlphaRef.current=alpha;setSourceHasAlpha(alpha); setSourceName(file.name||'IMAGE'); setReady(true); setView({...GLASS_DEFAULT_VIEW}); viewRef.current={...GLASS_DEFAULT_VIEW}; draw(); };
    img.onerror=()=>{URL.revokeObjectURL(url);reportToolError('GLASS image load',new Error('Unable to decode image'))}; img.src=url;
  },[draw]);

  useEffect(()=>{if(initialFile)loadFile(initialFile)},[initialFile,initialToken,loadFile]);
  useEffect(()=>{if(initialRatio)setRatio(initialRatio)},[initialRatio,initialToken]);
  useEffect(()=>{
    const paste=e=>{ if(isEditableTarget())return; const file=[...(e.clipboardData?.files||[])].find(f=>f.type?.startsWith('image/'))||[...(e.clipboardData?.items||[])].find(f=>f.type?.startsWith('image/'))?.getAsFile?.(); if(file){e.preventDefault();loadFile(file);} };
    window.addEventListener('paste',paste); return()=>window.removeEventListener('paste',paste);
  },[loadFile]);
  useEffect(()=>{ const c=canvasRef.current; if(!c)return; const ro=typeof ResizeObserver==='undefined'?null:new ResizeObserver(()=>draw()); ro?.observe(c.parentElement); const onResize=()=>draw(); window.addEventListener('resize',onResize); draw(); return()=>{ro?.disconnect();window.removeEventListener('resize',onResize)}; },[draw,ratio]);
  useEffect(()=>()=>{++loadSeq.current; if(urlRef.current)URL.revokeObjectURL(urlRef.current)},[]);

  function updateParam(k,v){ const next={...paramsRef.current,[k]:v}; paramsRef.current=next; setParams(next); draw(); }
  function updateLens(id,patch){ const next=lensesRef.current.map(l=>l.id===id?{...l,...patch}:l); lensesRef.current=next; setLenses(next); draw(); }
  function addLens(){ const lens={id:uid(),x:50,y:50,radius:18,strength:50,softness:70,swirl:0,aberration:16,ellipseX:1,ellipseY:1}; const next=[...lensesRef.current,lens].slice(-3); lensesRef.current=next; setLenses(next); setSelectedId(lens.id); draw(); }
  function removeLens(){ if(lensesRef.current.length<=1)return; const next=lensesRef.current.filter(l=>l.id!==selectedRef.current); lensesRef.current=next; setLenses(next); setSelectedId(next[0]?.id||null); draw(); }
  function duplicateLens(){ const base=lensesRef.current.find(l=>l.id===selectedRef.current); if(!base||lensesRef.current.length>=3)return; const copy={...base,id:uid(),x:clamp(base.x+8,8,92),y:clamp(base.y+6,8,92)}; const next=[...lensesRef.current,copy]; lensesRef.current=next; setLenses(next); setSelectedId(copy.id); draw(); }
  function resetAll(){ const nextL=GLASS_DEFAULT_LENSES.map(l=>({...l,id:uid()})); const nextP={...GLASS_DEFAULT_PARAMS}; const nextV={...GLASS_DEFAULT_VIEW}; lensesRef.current=nextL; paramsRef.current=nextP; viewRef.current=nextV; setLenses(nextL); setSelectedId(nextL[0].id); setParams(nextP); setView(nextV); draw(); }
  function randomize(){ const token=Date.now(); setSeed(token); const rand=randomizeGlass(token); lensesRef.current=rand.lenses; paramsRef.current=rand.params; setLenses(rand.lenses); setSelectedId(rand.lenses[0]?.id||null); setParams(rand.params); draw(); }

  function pointerDown(e){
    if(!imageRef.current)return;
    const canvas=canvasRef.current; const rect=canvas.getBoundingClientRect(); const px=(e.clientX-rect.left)/rect.width*100, py=(e.clientY-rect.top)/rect.height*100;
    const hit=[...lensesRef.current].reverse().find(l=>{ const rx=l.radius*(l.ellipseX||1),ry=l.radius*(l.ellipseY||1); const nx=(px-l.x)/rx,ny=(py-l.y)/ry; return nx*nx+ny*ny<=1; });
    if(!hit)return;
    setSelectedId(hit.id); selectedRef.current=hit.id;
    dragRef.current={down:true,id:e.pointerId,offsetX:px-hit.x,offsetY:py-hit.y}; canvas.parentElement?.setPointerCapture?.(e.pointerId); setDragging(true);
  }
  function pointerMove(e){ const drag=dragRef.current; if(!drag.down||drag.id!==e.pointerId)return; const rect=canvasRef.current.getBoundingClientRect(); const px=(e.clientX-rect.left)/rect.width*100, py=(e.clientY-rect.top)/rect.height*100; updateLens(selectedRef.current,{x:clamp(px-drag.offsetX,4,96),y:clamp(py-drag.offsetY,4,96)}); }
  function pointerUp(e){ const drag=dragRef.current; if(drag.id!==e.pointerId)return; drag.down=false; drag.id=null; setDragging(false); }

  async function resultBlob(alpha=false){ const canvas=exportGlassCanvas({image:imageRef.current,ratio:{width:doc.w,height:doc.h},lenses:lensesRef.current,params:paramsRef.current,view:viewRef.current,transparent:alpha,showSurface:showGuidesRef.current}); return asBlob(canvas); }
  const task=async(fn,label)=>{ if(jobRef.current||!imageRef.current)return; jobRef.current=true; setBusy(true); try{await fn()}catch(e){reportToolError(label,e)} finally{jobRef.current=false; setBusy(false)} };
  const exportPng=(alpha=false)=>task(async()=>downloadBlob(await resultBlob(alpha),`1337-glass-${alpha?'alpha-':''}${Date.now()}.png`),'GLASS export');
  const sendEditor=()=>task(async()=>{ const b=await resultBlob(); onSendToEditor?.(new File([b],`GLASS-${Date.now()}.png`,{type:'image/png'}),ratio); },'GLASS → EDITOR');
  const continueTo=target=>task(async()=>{ const b=await resultBlob(); onContinue?.('glass',target,new File([b],`GLASS-${target}-${Date.now()}.png`,{type:'image/png'}),ratio); },'GLASS CONTINUE');
  const onDrop=e=>{e.preventDefault(); e.stopPropagation(); setDragOver(false); const f=[...(e.dataTransfer?.files||[])].find(x=>x.type?.startsWith('image/')); if(f)loadFile(f)};
  const selectedLens=lenses.find(l=>l.id===selectedId)||lenses[0];

  return <main className="fieldShell glassShell">
    <aside className="fieldHud">
      <button type="button" className="toolBrandHome" onClick={onHome} aria-label="Back to 1337tools home"><div className="brand"><span className="brand1337"><span className="brandOneNudge">1</span>337</span><span className="brandTools">tools</span></div></button>
      <button type="button" className="wide fieldBack" onClick={onIndex}>← INDEX</button>
      <div className="scanActions">
        <button type="button" className="wide primary" disabled={!ready||busy} onClick={randomize}>RANDOMIZE ↯</button>
        <button type="button" className="wide" disabled={!ready||busy||lenses.length>=3} onClick={duplicateLens}>DUPLICATE</button>
      </div>
      <MicroHudGroup title="SOURCE" storageKey="glass-v1-source" defaultOpen>
        <button type="button" className="wide" onClick={()=>fileRef.current?.click()}>+ SOURCE IMAGE</button>
        <input type="file" hidden accept="image/*" ref={fileRef} onChange={e=>{loadFile(e.target.files?.[0]);e.target.value=''}}/>
        <div className="note">{sourceName}<br/>drop image / Cmd+V</div>
        <GlassRange label="Image scale" min={25} max={300} value={view.scale} onChange={v=>{const next={...viewRef.current,scale:v}; viewRef.current=next; setView(next); draw(); }}/>
        <GlassRange label="Offset X" min={-100} max={100} value={view.x} onChange={v=>{const next={...viewRef.current,x:v}; viewRef.current=next; setView(next); draw(); }}/>
        <GlassRange label="Offset Y" min={-100} max={100} value={view.y} onChange={v=>{const next={...viewRef.current,y:v}; viewRef.current=next; setView(next); draw(); }}/>
      </MicroHudGroup>
      <MicroHudGroup title="GLASS" storageKey="glass-v1-lenses" defaultOpen>
        <div className="two"><button type="button" className={!showGuides?'active':''} onClick={()=>setShowGuides(v=>!v)}>{showGuides?'HIDE HUD → CLEAN':'SHOW HUD → EDIT'}</button><button type="button" disabled={!ready||busy||lenses.length>=3} onClick={addLens}>+ ADD LENS</button></div>
        <div className="scanPresetSwitch">{lenses.map((l,i)=><button key={l.id} type="button" className={l.id===selectedId?'active':''} onClick={()=>setSelectedId(l.id)}>LENS {i+1}</button>)}</div>
        {selectedLens?<>
          <GlassRange label="Radius" value={selectedLens.radius} min={8} max={34} onChange={v=>updateLens(selectedLens.id,{radius:v})}/>
          <GlassRange label="Strength" value={selectedLens.strength} onChange={v=>updateLens(selectedLens.id,{strength:v})}/>
          <GlassRange label="Softness" value={selectedLens.softness} onChange={v=>updateLens(selectedLens.id,{softness:v})}/>
          <GlassRange label="Swirl" value={selectedLens.swirl} min={-60} max={60} onChange={v=>updateLens(selectedLens.id,{swirl:v})}/>
          <GlassRange label="Chromatic" value={selectedLens.aberration} min={0} max={40} onChange={v=>updateLens(selectedLens.id,{aberration:v})}/>
          <GlassRange label="Ellipse X" value={Math.round((selectedLens.ellipseX||1)*100)} min={70} max={140} onChange={v=>updateLens(selectedLens.id,{ellipseX:Number((v/100).toFixed(2))})}/>
          <GlassRange label="Ellipse Y" value={Math.round((selectedLens.ellipseY||1)*100)} min={70} max={140} onChange={v=>updateLens(selectedLens.id,{ellipseY:Number((v/100).toFixed(2))})}/>
        </>:null}
        <div className="two"><button type="button" disabled={!ready||busy||lenses.length<=1} onClick={removeLens}>REMOVE</button><button type="button" disabled={!ready||busy} onClick={resetAll}>RESET</button></div>
      </MicroHudGroup>
      <MicroHudGroup title="CHARACTER" storageKey="glass-v1-character">
        <GlassRange label="Detail" value={params.detail} onChange={v=>updateParam('detail',v)}/>
        <GlassRange label="Lens highlight (EDIT)" value={params.edge} onChange={v=>updateParam('edge',v)}/>
        <GlassRange label="Micro grain" value={params.grain} min={0} max={24} onChange={v=>updateParam('grain',v)}/>
        <div className="note">CLEAR only. EDIT shows lens outlines and decorative reflections. CLEAN hides both, preserving refraction and chromatic distortion.</div>
      </MicroHudGroup>
      <MicroHudGroup title="CANVAS" storageKey="glass-v1-canvas">
        <label className="fieldControl"><div className="fieldControlHead"><span>Ratio</span></div><select value={ratio} onChange={e=>setRatio(e.target.value)}>{Object.keys(RATIOS).map(r=><option key={r} value={r}>{r}</option>)}</select></label>
        <div className="note">{doc.w} × {doc.h}px · {doc.label}</div>
      </MicroHudGroup>
      <MicroHudGroup title="OUTPUT" storageKey="glass-v1-output" accent defaultOpen>
        <div className="note">CLEAR · {showGuides?'EDIT VIEW':'CLEAN VIEW'} · LENSES {lenses.length}<br/>PNG / EDITOR never include control outlines. CLEAN also excludes visible lens sheen. PNG α preserves transparency.</div>
        <button type="button" className="wide primary" disabled={!ready||busy} onClick={sendEditor}>SEND TO EDITOR</button>
        <ContinuePanel current="glass" disabled={!ready||busy} onChoose={continueTo}/>
        <div className="two"><button type="button" disabled={!ready||busy} onClick={()=>exportPng(false)}>PNG</button><button type="button" disabled={!ready||busy} onClick={()=>exportPng(true)}>PNG α</button></div>
      </MicroHudGroup>
    </aside>
    <section className="fieldWorkspace">
      <header className="fieldTop fieldTop41"><div><button type="button" onClick={onIndex}>INDEX</button><span>1337TOOLS / 05 GLASS / REFRACTION TOOL</span></div><div><b>{processLabel}</b></div></header>
      <div className={`fieldStage glassStage ${dragOver?'fieldDropActive':''} ${dragging?'glassDragging':''}`}
        onDragEnter={e=>{e.preventDefault();setDragOver(true)}} onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOver(false)}} onDrop={onDrop}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
        <div className={`fieldCanvasWrap glassCanvasWrap ${sourceHasAlpha?'glassAlphaSource':''}`} style={{aspectRatio:`${doc.w} / ${doc.h}`}}><canvas className="fieldCanvas glassCanvas" ref={canvasRef}/></div>
      </div>
    </section>
  </main>;
}
