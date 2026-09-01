'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {RATIOS,clamp,hashSeed,mulberry32} from '../lib/editorCore';
import {downloadBlob,reportToolError} from '../lib/browserUtils';
import ContinuePanel from './ContinuePanel';
import MicroHudGroup from './MicroHudGroup';

const MODES=['ROWS','COLUMNS','GRID'];
const ORDERS=['ORIGINAL','SHUFFLE','REVERSE','BRIGHTNESS'];
const DEFAULTS={mode:'COLUMNS',slices:18,gap:0,offset:34,stretch:18,chaos:34,mirror:18,dropout:4,duplicate:8,order:'SHUFFLE'};

export default function SliceTool({onIndex,onSendToEditor,onContinue,trail=[],initialFile,initialRatio='4 / 5',initialToken}){
  const [source,setSource]=useState(null),[sourceName,setSourceName]=useState('NO SOURCE');
  const [params,setParams]=useState(DEFAULTS),[seed,setSeed]=useState(()=>Math.floor(Math.random()*1e9));
  const [dragOver,setDragOver]=useState(false),[exporting,setExporting]=useState(false);
  const [ratio,setRatio]=useState(initialRatio||'4 / 5');
  const canvasRef=useRef(null),fileRef=useRef(null),imgRef=useRef(null),urlRef=useRef(null);
  const doc=useMemo(()=>{const d=RATIOS[ratio]||RATIOS['4 / 5'];return {w:d.width,h:d.height,label:d.label}},[ratio]);
  const processLabel=(trail?.length?trail:['SLICE']).join(' → ');

  function setP(k,v){setParams(p=>({...p,[k]:v}))}
  async function loadFile(file){
    if(!file||!file.type?.startsWith('image/'))return;
    if(urlRef.current)URL.revokeObjectURL(urlRef.current);
    const url=URL.createObjectURL(file);urlRef.current=url;
    const img=new Image();img.onload=()=>{imgRef.current=img;setSource(url);setSourceName(file.name||'PASTED IMAGE');setSeed(Math.floor(Math.random()*1e9))};img.onerror=()=>{if(urlRef.current===url)urlRef.current=null;URL.revokeObjectURL(url);reportToolError('SLICE image load',new Error('Unsupported or damaged image'))};img.src=url;
  }
  useEffect(()=>()=>{if(urlRef.current)URL.revokeObjectURL(urlRef.current)},[]);
  useEffect(()=>{if(initialFile)loadFile(initialFile);if(initialRatio)setRatio(initialRatio)},[initialFile,initialRatio,initialToken]);
  useEffect(()=>{
    const onPaste=e=>{
      const tag=document.activeElement?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;
      const f=[...e.clipboardData.files].find(x=>x.type.startsWith('image/'))||[...e.clipboardData.items].find(i=>i.type.startsWith('image/'))?.getAsFile?.();
      if(f){e.preventDefault();loadFile(f)}
    };
    window.addEventListener('paste',onPaste);return()=>window.removeEventListener('paste',onPaste);
  },[]);

  function drop(e){e.preventDefault();e.stopPropagation();setDragOver(false);const f=[...(e.dataTransfer?.files||[])].find(x=>x.type?.startsWith('image/'));if(f)loadFile(f)}
  function reroll(){setSeed(Math.floor(Math.random()*1e9))}
  function randomize(){
    setParams({
      mode:MODES[Math.floor(Math.random()*MODES.length)],
      slices:Math.round(7+Math.random()*35),gap:Math.round(Math.random()*10),offset:Math.round(10+Math.random()*80),
      stretch:Math.round(-30+Math.random()*115),chaos:Math.round(12+Math.random()*86),mirror:Math.round(Math.random()*70),
      dropout:Math.round(Math.random()*24),duplicate:Math.round(Math.random()*35),order:ORDERS[Math.floor(Math.random()*ORDERS.length)]
    });reroll();
  }

  function drawCover(ctx,img,w,h){
    const ar=(img.naturalWidth||1)/(img.naturalHeight||1),tar=w/h;let sw=img.naturalWidth,sh=img.naturalHeight,sx=0,sy=0;
    if(ar>tar){sw=sh*tar;sx=(img.naturalWidth-sw)/2}else{sh=sw/tar;sy=(img.naturalHeight-sh)/2}
    ctx.drawImage(img,sx,sy,sw,sh,0,0,w,h);
  }
  function sourceCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;drawCover(c.getContext('2d'),imgRef.current,w,h);return c}
  function shuffled(items,rnd){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  function render(ctx,w,h,{transparent=false}={}){
    ctx.clearRect(0,0,w,h);if(!transparent){ctx.fillStyle='#f0ede4';ctx.fillRect(0,0,w,h)}
    const img=imgRef.current;if(!img){ctx.fillStyle='#111';ctx.textAlign='center';ctx.font=`900 ${Math.max(24,w*.035)}px Arial Black, Arial`;ctx.fillText('DROP / PASTE ONE IMAGE',w/2,h/2);return}
    const src=sourceCanvas(w,h),rnd=mulberry32(hashSeed(`${seed}:${params.mode}:${params.slices}:${params.chaos}`));
    const chaos=params.chaos/100,gap=params.gap/100,off=params.offset/100,stretch=params.stretch/100;let pieces=[];
    if(params.mode==='ROWS'){
      const n=Math.max(2,Math.round(params.slices)),sh=h/n;for(let i=0;i<n;i++)pieces.push({i,sx:0,sy:i*sh,sw:w,sh,dx:0,dy:i*sh,dw:w,dh:sh});
    }else if(params.mode==='COLUMNS'){
      const n=Math.max(2,Math.round(params.slices)),sw=w/n;for(let i=0;i<n;i++)pieces.push({i,sx:i*sw,sy:0,sw,sh:h,dx:i*sw,dy:0,dw:sw,dh:h});
    }else{
      const n=Math.max(2,Math.round(Math.sqrt(Math.max(4,params.slices)))),sw=w/n,sh=h/n;let i=0;
      for(let gy=0;gy<n;gy++)for(let gx=0;gx<n;gx++,i++)pieces.push({i,sx:gx*sw,sy:gy*sh,sw,sh,dx:gx*sw,dy:gy*sh,dw:sw,dh:sh});
    }

    let sources=[...pieces];
    if(params.order==='SHUFFLE')sources=shuffled(sources,rnd);
    if(params.order==='REVERSE')sources=sources.reverse();
    if(params.order==='BRIGHTNESS'){
      const px=src.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data;
      const lum=p=>{const cx=Math.min(w-1,Math.max(0,Math.round(p.sx+p.sw/2))),cy=Math.min(h-1,Math.max(0,Math.round(p.sy+p.sh/2))),q=(cy*w+cx)*4;return px[q]*.2126+px[q+1]*.7152+px[q+2]*.0722};
      sources=sources.map(p=>({...p,lum:lum(p)})).sort((a,b)=>a.lum-b.lum);
    }

    pieces.forEach((dest,index)=>{
      if(rnd()*100<params.dropout)return;const s=sources[index%sources.length],wave=Math.sin((index+1)*1.71+seed*.00001),j=(rnd()-.5)*2;
      let dx=dest.dx,dy=dest.dy,dw=dest.dw,dh=dest.dh;
      if(params.mode==='ROWS'){
        dx+=(wave*.7+j*chaos)*w*.22*off;dw*=clamp(1+stretch*(.5+(rnd()*2-1)*chaos),.2,2.6);dx-=(dw-dest.dw)/2;const g=dest.sh*gap;dy+=g/2;dh=Math.max(1,dh-g);
      }else if(params.mode==='COLUMNS'){
        dy+=(wave*.7+j*chaos)*h*.18*off;dh*=clamp(1+stretch*(.5+(rnd()*2-1)*chaos),.2,2.6);dy-=(dh-dest.dh)/2;const g=dest.sw*gap;dx+=g/2;dw=Math.max(1,dw-g);
      }else{
        dx+=(wave+j*chaos)*w*.12*off;dy+=(Math.cos(index*1.33)+j*chaos)*h*.1*off;const sc=clamp(1+stretch*(.35+(rnd()*2-1)*chaos),.25,2.4);
        dw*=sc;dh*=sc;dx-=(dw-dest.dw)/2;dy-=(dh-dest.dh)/2;const gx=dest.sw*gap,gy=dest.sh*gap;dx+=gx/2;dy+=gy/2;dw=Math.max(1,dw-gx);dh=Math.max(1,dh-gy);
      }
      const mirror=rnd()*100<params.mirror;
      ctx.save();ctx.translate(dx+dw/2,dy+dh/2);if(mirror)ctx.scale(params.mode==='ROWS'?-1:1,params.mode==='ROWS'?1:-1);ctx.globalAlpha=clamp(1-rnd()*.32*chaos,.25,1);ctx.drawImage(src,s.sx,s.sy,s.sw,s.sh,-dw/2,-dh/2,dw,dh);ctx.restore();
      if(rnd()*100<params.duplicate){ctx.save();ctx.globalAlpha=.28+.3*rnd();ctx.globalCompositeOperation=rnd()>.55?'difference':'source-over';const ddx=(rnd()-.5)*w*.08*(.3+chaos),ddy=(rnd()-.5)*h*.08*(.3+chaos);ctx.drawImage(src,s.sx,s.sy,s.sw,s.sh,dx+ddx,dy+ddy,dw,dh);ctx.restore()}
    });
  }

  useEffect(()=>{const c=canvasRef.current;if(!c)return;let raf=0;const redraw=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const r=c.getBoundingClientRect();if(r.width<2||r.height<2)return;const dpr=Math.min(2,window.devicePixelRatio||1);c.width=Math.max(1,Math.round(r.width*dpr));c.height=Math.max(1,Math.round(r.height*dpr));render(c.getContext('2d'),c.width,c.height,{transparent:false})})};redraw();const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(redraw):null;ro?.observe(c.parentElement||c);window.addEventListener('resize',redraw);return()=>{cancelAnimationFrame(raf);ro?.disconnect();window.removeEventListener('resize',redraw)}},[source,params,seed,ratio]);
  async function renderBlob({transparent=false}={}){const c=document.createElement('canvas');c.width=doc.w;c.height=doc.h;render(c.getContext('2d'),doc.w,doc.h,{transparent});return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('PNG encode failed')),'image/png'))}
  async function exportPng(transparent=false){if(exporting)return;setExporting(true);try{const b=await renderBlob({transparent});downloadBlob(b,`1337-slice-${transparent?'transparent-':''}${Date.now()}.png`)}catch(err){reportToolError('SLICE export',err)}finally{setExporting(false)}}
  async function sendToEditor(){if(!imgRef.current||exporting)return;setExporting(true);try{const b=await renderBlob({transparent:true}),f=new File([b],`SLICE-${Date.now()}.png`,{type:'image/png'});onSendToEditor?.(f,ratio)}catch(err){reportToolError('SLICE → EDITOR',err)}finally{setExporting(false)}}
  async function continueTo(target){if(!imgRef.current||exporting)return;setExporting(true);try{const b=await renderBlob({transparent:true}),f=new File([b],`SLICE-${target}-${Date.now()}.png`,{type:'image/png'});onContinue?.('slice',target,f,ratio)}catch(err){reportToolError(`SLICE → ${String(target).toUpperCase()}`,err)}finally{setExporting(false)}}

  return <main className="fieldShell sliceShell">
    <aside className="fieldHud">
      <div className="brand"><span className="brand1337">1337</span><span className="brandTools">tools</span><small>4.21 / 02 SLICE</small></div>
      <button className="wide fieldBack" onClick={onIndex}>← INDEX</button><button className="wide primary fieldHero" onClick={randomize}>RANDOMIZE SLICE ↯</button><button className="wide" onClick={reroll}>REROLL SEED</button>
      <MicroHudGroup title="INPUT" storageKey="slice-input" defaultOpen><button className="wide" onClick={()=>fileRef.current?.click()}>+ SOURCE IMAGE</button><input ref={fileRef} type="file" hidden accept="image/*" onChange={e=>{loadFile(e.target.files?.[0]);e.target.value=''}}/><div className="note">{sourceName}<br/>drop anywhere / Ctrl/Cmd+V</div></MicroHudGroup>
      <MicroHudGroup title="SLICE" storageKey="slice-main" defaultOpen>
        <SliceSelect label="Mode" value={params.mode} options={MODES} onChange={v=>setP('mode',v)}/><SliceSelect label="Order" value={params.order} options={ORDERS} onChange={v=>setP('order',v)}/>
        <SliceRange label="Slices" min={4} max={48} value={params.slices} onChange={v=>setP('slices',+v)}/><SliceRange label="Gap" min={0} max={20} value={params.gap} onChange={v=>setP('gap',+v)}/>
        <SliceRange label="Offset" min={0} max={100} value={params.offset} onChange={v=>setP('offset',+v)}/><SliceRange label="Stretch" min={-70} max={160} value={params.stretch} onChange={v=>setP('stretch',+v)}/>
        <SliceRange label="Mirror" min={0} max={100} value={params.mirror} onChange={v=>setP('mirror',+v)}/><SliceRange label="Dropout" min={0} max={70} value={params.dropout} onChange={v=>setP('dropout',+v)}/>
        <SliceRange label="Duplicate" min={0} max={80} value={params.duplicate} onChange={v=>setP('duplicate',+v)}/><SliceRange label="Order ↔ Chaos" min={0} max={100} value={params.chaos} onChange={v=>setP('chaos',+v)}/>
      </MicroHudGroup>
      <MicroHudGroup title="CANVAS" storageKey="slice-canvas"><label className="fieldControl"><div className="fieldControlHead"><span>Ratio</span><b>{doc.label}</b></div><select value={ratio} onChange={e=>setRatio(e.target.value)}>{Object.entries(RATIOS).map(([v,d])=><option value={v} key={v}>{d.label}</option>)}</select></label><div className="note">{doc.w} × {doc.h}px</div></MicroHudGroup>

      <MicroHudGroup title="OUTPUT" storageKey="slice-output" accent><button className="wide primary" disabled={!source||exporting} onClick={sendToEditor}>SEND TO EDITOR</button><ContinuePanel current="slice" disabled={!source||exporting} onChoose={continueTo}/><div className="two"><button disabled={!source||exporting} onClick={()=>exportPng(false)}>{exporting?'…':'PNG'}</button><button disabled={!source||exporting} onClick={()=>exportPng(true)}>{exporting?'…':'PNG α'}</button></div><div className="note">Continue sends the current rendered frame into the next tool.</div></MicroHudGroup>
    </aside>
    <section className="fieldWorkspace">
      <header className="fieldTop fieldTop41"><div><button onClick={onIndex}>INDEX</button><span>1337TOOLS / 02 SLICE / {params.mode}</span></div><div><b>{processLabel}</b></div></header>
      <div className={`fieldStage sliceStage ${dragOver?'fieldDropActive':''}`} onDragEnter={e=>{e.preventDefault();setDragOver(true)}} onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOver(false)}} onDrop={drop}><div className="fieldCanvasWrap" style={{aspectRatio:`${doc.w} / ${doc.h}`}}><canvas ref={canvasRef} className="fieldCanvas sliceCanvas"/></div></div>
    </section>
  </main>;
}

function SliceRange({label,value,onChange,min,max}){return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><b>{value}</b></div><div className="fieldRangeRow"><input type="range" min={min} max={max} value={value} onChange={e=>onChange(e.target.value)}/><input type="number" min={min} max={max} value={value} onChange={e=>onChange(e.target.value)}/></div></label>}
function SliceSelect({label,value,onChange,options}){return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><b>{value}</b></div><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(v=><option key={v}>{v}</option>)}</select></label>}
