'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {RATIOS,clamp,hashSeed,mulberry32} from '../lib/editorCore';
import {downloadBlob,reportToolError} from '../lib/browserUtils';
import ContinuePanel from './ContinuePanel';
import MicroHudGroup from './MicroHudGroup';

const MODES=['ASCII','BLOCKS','BRAILLE','CODE'];
const STYLES=['RAW','STRAIGHT'];
const COLOR_MODES=['WHITE','BLUE','YELLOW','SOURCE'];
const PRESETS={
  RAW:{
    ASCII:'@%#*+=-:. ',
    BLOCKS:'█▓▒░ ',
    BRAILLE:'⣿⣾⣶⣤⣄⣀ ',
    CODE:'01{}[]/\\<>+=-:;,. '
  },
  STRAIGHT:{
    ASCII:'@#WMBRXVYI+=;:,. ',
    BLOCKS:'█▉▊▋▌▍▎▏ ',
    BRAILLE:'⣿⣷⣯⣟⣛⣚⣀ ',
    CODE:'#MWN01[]{}\\/|+=-:. '
  }
};
const DEFAULTS={mode:'ASCII',style:'RAW',density:88,scale:108,contrast:115,brightness:0,chaos:10,colorMode:'BLUE'};
const DEFAULT_VIEW={scale:100,x:0,y:0};

export default function AsciiTool({onIndex,onHome,onSendToEditor,onContinue,trail=[],initialFile,initialRatio='4 / 5',initialToken}){
  const [source,setSource]=useState(null),[sourceName,setSourceName]=useState('NO SOURCE');
  const [params,setParams]=useState(DEFAULTS),[charset,setCharset]=useState(PRESETS.RAW.ASCII),[seed,setSeed]=useState(()=>Math.floor(Math.random()*1e9));
  const [sourceView,setSourceView]=useState(DEFAULT_VIEW),[bgColor,setBgColor]=useState('#f0ede4');
  const [dragOver,setDragOver]=useState(false),[exporting,setExporting]=useState(false);
  const [ratio,setRatio]=useState(initialRatio||'4 / 5');
  const canvasRef=useRef(null),fileRef=useRef(null),imgRef=useRef(null),urlRef=useRef(null),loadSeq=useRef(0);
  const doc=useMemo(()=>{const d=RATIOS[ratio]||RATIOS['4 / 5'];return {w:d.width,h:d.height,label:d.label}},[ratio]);
  const processLabel=(trail?.length?trail:['ASCII']).join(' → ');

  function setP(k,v){setParams(p=>({...p,[k]:v}))}
  function setView(k,v){setSourceView(s=>({...s,[k]:+v}))}
  function defaultCharset(style=params.style,mode=params.mode){return PRESETS[style]?.[mode]||PRESETS.RAW.ASCII}

  async function loadFile(file){
    if(!file||!file.type?.startsWith('image/'))return false;
    const seq=++loadSeq.current,previous=urlRef.current,url=URL.createObjectURL(file),img=new Image();
    return await new Promise(resolve=>{
      img.onload=()=>{if(seq!==loadSeq.current){URL.revokeObjectURL(url);resolve(false);return}if(previous)URL.revokeObjectURL(previous);urlRef.current=url;imgRef.current=img;setSource(url);setSourceName(file.name||'PASTED IMAGE');setSourceView(DEFAULT_VIEW);setSeed(Math.floor(Math.random()*1e9));resolve(true)};
      img.onerror=()=>{URL.revokeObjectURL(url);if(seq===loadSeq.current)reportToolError('ASCII image load',new Error('Unsupported or damaged image'));resolve(false)};
      img.src=url;
    });
  }
  useEffect(()=>()=>{loadSeq.current++;if(urlRef.current)URL.revokeObjectURL(urlRef.current)},[]);
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
    const style=STYLES[Math.floor(Math.random()*STYLES.length)];
    const mode=MODES[Math.floor(Math.random()*MODES.length)];
    setParams({
      mode,style,
      density:Math.round(42+Math.random()*96),
      scale:Math.round(70+Math.random()*210),
      contrast:Math.round(70+Math.random()*120),
      brightness:Math.round(-28+Math.random()*56),
      chaos:style==='STRAIGHT'?Math.round(Math.random()*16):Math.round(Math.random()*58),
      colorMode:COLOR_MODES[Math.floor(Math.random()*COLOR_MODES.length)]
    });
    setCharset(defaultCharset(style,mode));
    reroll();
  }

  function sourceRect(img,w,h){
    const iw=img?.naturalWidth||1,ih=img?.naturalHeight||1;
    const base=Math.min(w/iw,h/ih),zoom=clamp((+sourceView.scale||100)/100,.05,8),scale=base*zoom;
    const dw=Math.max(1,iw*scale),dh=Math.max(1,ih*scale);
    const dx=(w-dw)/2+(+sourceView.x||0)/100*w*.5;
    const dy=(h-dh)/2+(+sourceView.y||0)/100*h*.5;
    return {dx,dy,dw,dh};
  }
  function buildSourceCanvas(w,h){
    const img=imgRef.current;if(!img)return null;
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));
    const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';
    const r=sourceRect(img,c.width,c.height);x.drawImage(img,r.dx,r.dy,r.dw,r.dh);
    return c;
  }
  function sampleImage(cols,rows,w,h){
    const full=buildSourceCanvas(w,h);if(!full)return null;
    const c=document.createElement('canvas');c.width=cols;c.height=rows;const x=c.getContext('2d',{willReadFrequently:true});
    x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(full,0,0,cols,rows);
    const d=x.getImageData(0,0,cols,rows).data,cells=[];
    const contrast=Math.max(0.05,(+params.contrast||100)/100),bright=(+params.brightness||0)*2.55;
    for(let i=0;i<cols*rows;i++){
      let r=d[i*4],g=d[i*4+1],b=d[i*4+2],a=d[i*4+3]/255;
      r=(r-128)*contrast+128+bright;g=(g-128)*contrast+128+bright;b=(b-128)*contrast+128+bright;
      r=clamp(r,0,255);g=clamp(g,0,255);b=clamp(b,0,255);
      const lum=clamp(r*.2126+g*.7152+b*.0722,0,255);
      cells.push({r,g,b,a,lum});
    }
    return cells;
  }
  function foreground(c){
    if(params.colorMode==='SOURCE')return `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`;
    if(params.colorMode==='WHITE')return '#ffffff';
    if(params.colorMode==='YELLOW')return '#ffd800';
    return '#1738d9';
  }

  function render(ctx,w,h,{transparent=false}={}){
    ctx.clearRect(0,0,w,h);
    if(!transparent){ctx.fillStyle=bgColor||'#f0ede4';ctx.fillRect(0,0,w,h)}
    const img=imgRef.current;
    if(!img){
      ctx.fillStyle=transparent?'rgba(255,255,255,.95)':'#111';
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`900 ${Math.max(24,w*.035)}px Arial Black, Arial`;
      ctx.fillText('DROP / PASTE ONE IMAGE',w/2,h/2);return;
    }
    const style=params.style||'RAW',cols=Math.max(12,Math.round(params.density));
    // Use the actual monospace cell aspect instead of forcing the source through a tall grid.
    // This keeps faces/posters from looking squeezed while preserving the ASCII character feel.
    const rowFactor=style==='STRAIGHT'?.60:.64;
    const rows=Math.max(8,Math.round(cols*(h/w)*rowFactor));
    const cellW=w/cols,cellH=h/rows,charString=(charset&&charset.length?charset:defaultCharset()),charSet=[...charString];
    const cells=sampleImage(cols,rows,w,h);if(!cells||!charSet.length)return;
    const rnd=mulberry32(hashSeed(`${seed}:${params.mode}:${params.style}:${charString}:${params.chaos}:${sourceView.scale}:${sourceView.x}:${sourceView.y}`));
    const chaos=style==='STRAIGHT'?Math.min(.16,(+params.chaos||0)/300):(+params.chaos||0)/100;
    const scale=clamp((+params.scale||100)/100,.2,5),fontSize=Math.max(4,cellH*.92*scale);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${style==='STRAIGHT'?700:800} ${fontSize}px 'Courier New', 'IBM Plex Mono', monospace`;
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const c=cells[y*cols+x];if(!c||c.a<=.01)continue;
      let idx=Math.round(((255-c.lum)/255)*(charSet.length-1));
      if(chaos>0)idx+=Math.round((rnd()-.5)*2*Math.max(1,(charSet.length-1)*(style==='STRAIGHT'?.04:.12)*chaos));
      idx=Math.max(0,Math.min(charSet.length-1,idx));const ch=charSet[idx]||' ';if(ch===' ')continue;
      const jx=style==='STRAIGHT'?(rnd()-.5)*cellW*.04*chaos:(rnd()-.5)*cellW*.34*chaos;
      const jy=style==='STRAIGHT'?(rnd()-.5)*cellH*.035*chaos:(rnd()-.5)*cellH*.34*chaos;
      const rot=style==='STRAIGHT'?0:(rnd()-.5)*0.28*chaos;
      ctx.save();ctx.globalAlpha=clamp(c.a,0,1);ctx.fillStyle=foreground(c);ctx.translate((x+.5)*cellW+jx,(y+.52)*cellH+jy);ctx.rotate(rot);ctx.fillText(ch,0,0);ctx.restore();
    }
  }

  useEffect(()=>{
    const c=canvasRef.current;if(!c)return;let raf=0;
    const redraw=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const r=c.getBoundingClientRect();if(r.width<2||r.height<2)return;const dpr=Math.min(2,window.devicePixelRatio||1);c.width=Math.max(1,Math.round(r.width*dpr));c.height=Math.max(1,Math.round(r.height*dpr));render(c.getContext('2d'),c.width,c.height,{transparent:false})})};
    redraw();const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(redraw):null;ro?.observe(c.parentElement||c);window.addEventListener('resize',redraw);
    return()=>{cancelAnimationFrame(raf);ro?.disconnect();window.removeEventListener('resize',redraw)};
  },[source,params,charset,seed,ratio,sourceView,bgColor]);

  async function renderBlob({transparent=false}={}){
    const c=document.createElement('canvas');c.width=doc.w;c.height=doc.h;render(c.getContext('2d'),doc.w,doc.h,{transparent});
    return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('PNG encode failed')),'image/png'));
  }
  async function exportPng(transparent=false){
    if(exporting)return;setExporting(true);
    try{const b=await renderBlob({transparent});downloadBlob(b,`1337-ascii-${transparent?'transparent-':''}${Date.now()}.png`)}
    catch(err){reportToolError('ASCII export',err)}finally{setExporting(false)}
  }
  async function sendToEditor(){
    if(!imgRef.current||exporting)return;setExporting(true);
    try{const b=await renderBlob({transparent:false}),f=new File([b],`ASCII-${Date.now()}.png`,{type:'image/png'});onSendToEditor?.(f,ratio)}
    catch(err){reportToolError('ASCII → EDITOR',err)}finally{setExporting(false)}
  }
  async function continueTo(target){
    if(!imgRef.current||exporting)return;setExporting(true);
    try{const b=await renderBlob({transparent:false}),f=new File([b],`ASCII-${target}-${Date.now()}.png`,{type:'image/png'});onContinue?.('ascii',target,f,ratio)}
    catch(err){reportToolError(`ASCII → ${String(target).toUpperCase()}`,err)}finally{setExporting(false)}
  }

  return <main className="fieldShell asciiShell">
    <aside className="fieldHud">
      <button type="button" className="toolBrandHome" onClick={onHome} aria-label="Back to 1337tools home"><div className="brand"><span className="brand1337">1337</span><span className="brandTools">tools</span></div></button>
      <button className="wide fieldBack" onClick={onIndex}>← INDEX</button>
      <button className="wide primary fieldHero" onClick={randomize}>RANDOMIZE ASCII ↯</button>
      <button className="wide" onClick={reroll}>REROLL SEED</button>

      <MicroHudGroup title="INPUT" storageKey="ascii-input" defaultOpen><button className="wide" onClick={()=>fileRef.current?.click()}>+ SOURCE IMAGE</button><input ref={fileRef} type="file" hidden accept="image/*" onChange={e=>{loadFile(e.target.files?.[0]);e.target.value=''}}/><div className="note">{sourceName}<br/>drop anywhere / Ctrl/Cmd+V</div>
        <AsciiRange label="Image scale" min={25} max={400} value={sourceView.scale} onChange={v=>setView('scale',v)}/>
        <AsciiRange label="Image X" min={-100} max={100} value={sourceView.x} onChange={v=>setView('x',v)}/>
        <AsciiRange label="Image Y" min={-100} max={100} value={sourceView.y} onChange={v=>setView('y',v)}/>
        <button className="wide" onClick={()=>setSourceView(DEFAULT_VIEW)}>RESET IMAGE VIEW</button>
      </MicroHudGroup>

      <MicroHudGroup title="ASCII" storageKey="ascii-main" defaultOpen>
        <AsciiSelect label="Mode" value={params.mode} options={MODES} onChange={v=>{setP('mode',v);setCharset(defaultCharset(params.style,v))}}/>
        <div className="fieldControl"><div className="fieldControlHead"><span>Style</span><b>{params.style}</b></div><div className="asciiStyleSwitch">{STYLES.map(v=><button type="button" key={v} className={params.style===v?'active':''} onClick={()=>{setP('style',v);setCharset(defaultCharset(v,params.mode));if(v==='STRAIGHT'&&params.chaos>24)setP('chaos',24)}}>{v}</button>)}</div></div>
        <AsciiSelect label="Color" value={params.colorMode} options={COLOR_MODES} onChange={v=>setP('colorMode',v)}/>
        <AsciiRange label="Density" min={18} max={180} value={params.density} onChange={v=>setP('density',+v)}/>
        <AsciiRange label="Scale" min={20} max={500} value={params.scale} onChange={v=>setP('scale',+v)}/>
        <AsciiRange label="Contrast" min={20} max={220} value={params.contrast} onChange={v=>setP('contrast',+v)}/>
        <AsciiRange label="Brightness" min={-100} max={100} value={params.brightness} onChange={v=>setP('brightness',+v)}/>
        <AsciiRange label="Chaos" min={0} max={100} value={params.chaos} onChange={v=>setP('chaos',+v)}/>
        <label className="fieldControl"><div className="fieldControlHead"><span>Charset</span><b>{[...charset].length}</b></div><input value={charset} onChange={e=>setCharset(e.target.value)} /></label>
      </MicroHudGroup>

      <MicroHudGroup title="CANVAS" storageKey="ascii-canvas">
        <label className="fieldControl"><div className="fieldControlHead"><span>Ratio</span><b>{doc.label}</b></div><select value={ratio} onChange={e=>setRatio(e.target.value)}>{Object.entries(RATIOS).map(([v,d])=><option value={v} key={v}>{d.label}</option>)}</select></label>
        <label className="fieldControl"><div className="fieldControlHead"><span>Background</span><b>{bgColor}</b></div><div className="asciiColorRow"><input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)}/><input value={bgColor.toUpperCase()} readOnly aria-label="Background hex"/></div></label>
        <div className="note">{doc.w} × {doc.h}px</div>
      </MicroHudGroup>

      <MicroHudGroup title="OUTPUT" storageKey="ascii-output" accent><button className="wide primary" disabled={!source||exporting} onClick={sendToEditor}>SEND TO EDITOR</button><ContinuePanel current="ascii" disabled={!source||exporting} onChoose={continueTo}/><div className="two"><button disabled={!source||exporting} onClick={()=>exportPng(false)}>{exporting?'…':'PNG'}</button><button disabled={!source||exporting} onClick={()=>exportPng(true)}>{exporting?'…':'PNG α'}</button></div><div className="note">CONTINUE keeps the selected background. PNG α removes it.</div></MicroHudGroup>
    </aside>

    <section className="fieldWorkspace">
      <header className="fieldTop fieldTop41"><div><button onClick={onIndex}>INDEX</button><span>1337TOOLS / 03 ASCII / {params.mode}</span></div><div><b>{processLabel}</b></div></header>
      <div className={`fieldStage asciiStage ${dragOver?'fieldDropActive':''}`} onDragEnter={e=>{e.preventDefault();setDragOver(true)}} onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOver(false)}} onDrop={drop}><div className="fieldCanvasWrap" style={{aspectRatio:`${doc.w} / ${doc.h}`}}><canvas ref={canvasRef} className="fieldCanvas asciiCanvas"/></div></div>
    </section>
  </main>;
}

function AsciiRange({label,value,onChange,min,max}){return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><b>{value}</b></div><div className="fieldRangeRow"><input type="range" min={min} max={max} value={value} onChange={e=>onChange(e.target.value)}/><input type="number" min={min} max={max} value={value} onChange={e=>onChange(e.target.value)}/></div></label>}
function AsciiSelect({label,value,onChange,options}){return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><b>{value}</b></div><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(v=><option key={v}>{v}</option>)}</select></label>}
