'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {RATIOS,clamp,hashSeed,mulberry32} from '../lib/editorCore';
import {downloadBlob,reportToolError} from '../lib/browserUtils';

const MODES=['ASCII','BLOCKS','BRAILLE','CODE'];
const COLOR_MODES=['WHITE','YELLOW','SOURCE'];
const PRESETS={
  ASCII:'@%#*+=-:. ',
  BLOCKS:'█▓▒░ ',
  BRAILLE:'⣿⣾⣶⣤⣄⣀ ',
  CODE:'01{}[]/\\<>+=-:;,. '
};
const DEFAULTS={mode:'ASCII',density:88,scale:108,contrast:115,brightness:0,chaos:10,colorMode:'WHITE'};

export default function AsciiTool({onIndex,onSendToEditor}){
  const [source,setSource]=useState(null),[sourceName,setSourceName]=useState('NO SOURCE');
  const [params,setParams]=useState(DEFAULTS),[charset,setCharset]=useState(PRESETS.ASCII),[seed,setSeed]=useState(()=>Math.floor(Math.random()*1e9));
  const [dragOver,setDragOver]=useState(false),[exporting,setExporting]=useState(false);
  const [ratio,setRatio]=useState('4 / 5');
  const canvasRef=useRef(null),fileRef=useRef(null),imgRef=useRef(null),urlRef=useRef(null);
  const doc=useMemo(()=>{const d=RATIOS[ratio]||RATIOS['4 / 5'];return {w:d.width,h:d.height,label:d.label}},[ratio]);

  function setP(k,v){setParams(p=>({...p,[k]:v}))}
  async function loadFile(file){
    if(!file||!file.type?.startsWith('image/'))return;
    if(urlRef.current)URL.revokeObjectURL(urlRef.current);
    const url=URL.createObjectURL(file);urlRef.current=url;
    const img=new Image();img.onload=()=>{imgRef.current=img;setSource(url);setSourceName(file.name||'PASTED IMAGE');setSeed(Math.floor(Math.random()*1e9))};img.src=url;
  }
  useEffect(()=>()=>{if(urlRef.current)URL.revokeObjectURL(urlRef.current)},[]);
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
    const mode=MODES[Math.floor(Math.random()*MODES.length)];
    setParams({
      mode,
      density:Math.round(42+Math.random()*96),
      scale:Math.round(78+Math.random()*72),
      contrast:Math.round(70+Math.random()*120),
      brightness:Math.round(-28+Math.random()*56),
      chaos:Math.round(Math.random()*58),
      colorMode:COLOR_MODES[Math.floor(Math.random()*COLOR_MODES.length)]
    });
    setCharset(PRESETS[mode]);
    reroll();
  }

  function drawCover(ctx,img,w,h){
    const ar=(img.naturalWidth||1)/(img.naturalHeight||1),tar=w/h;
    let sw=img.naturalWidth,sh=img.naturalHeight,sx=0,sy=0;
    if(ar>tar){sw=sh*tar;sx=(img.naturalWidth-sw)/2}else{sh=sw/tar;sy=(img.naturalHeight-sh)/2}
    ctx.drawImage(img,sx,sy,sw,sh,0,0,w,h);
  }

  function sampledCells(cols,rows){
    const img=imgRef.current;if(!img)return null;
    const c=document.createElement('canvas');c.width=cols;c.height=rows;const x=c.getContext('2d',{willReadFrequently:true});
    drawCover(x,img,cols,rows);
    const d=x.getImageData(0,0,cols,rows).data;
    const cells=[];
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

  function render(ctx,w,h,{transparent=true}={}){
    ctx.clearRect(0,0,w,h);if(!transparent){ctx.fillStyle='#0c1a86';ctx.fillRect(0,0,w,h)}
    const img=imgRef.current;
    if(!img){ctx.fillStyle='rgba(255,255,255,.95)';ctx.textAlign='center';ctx.font=`900 ${Math.max(24,w*.035)}px Arial Black, Arial`;ctx.fillText('DROP / PASTE ONE IMAGE',w/2,h/2-10);return}
    const cols=Math.max(12,Math.round(params.density)),rows=Math.max(12,Math.round(cols*(h/w)*1.36));
    const cellW=w/cols,cellH=h/rows,charString=(charset&&charset.length?charset:PRESETS.ASCII),charSet=[...charString],rnd=mulberry32(hashSeed(`${seed}:${params.mode}:${charString}:${params.chaos}`));
    const cells=sampledCells(cols,rows);if(!cells||!charSet.length)return;
    const chaos=(+params.chaos||0)/100,fontSize=Math.max(6,cellW*(+params.scale||100)/100*1.18);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${fontSize}px 'Courier New', monospace`;
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const c=cells[y*cols+x];if(!c||c.a<=.01)continue;
      const lum=c.lum,idxFloat=((255-lum)/255)*(charSet.length-1);let idx=Math.round(idxFloat);
      if(chaos>0){idx+=Math.round((rnd()-.5)*2*Math.max(1,(charSet.length-1)*.12*chaos))}
      idx=Math.max(0,Math.min(charSet.length-1,idx));const ch=charSet[idx]||' ';if(ch===' ')continue;
      const jx=(rnd()-.5)*cellW*.34*chaos,jy=(rnd()-.5)*cellH*.34*chaos,rot=(rnd()-.5)*0.28*chaos;
      ctx.save();ctx.globalAlpha=clamp(c.a,0,1);ctx.fillStyle=params.colorMode==='SOURCE'?`rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`:params.colorMode==='YELLOW'?'#ffd800':'#ffffff';ctx.translate((x+.5)*cellW+jx,(y+.54)*cellH+jy);ctx.rotate(rot);ctx.fillText(ch,0,0);ctx.restore();
    }
  }

  useEffect(()=>{
    const c=canvasRef.current;if(!c)return;let raf=0;const redraw=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const r=c.getBoundingClientRect();if(r.width<2||r.height<2)return;const dpr=Math.min(2,window.devicePixelRatio||1);c.width=Math.max(1,Math.round(r.width*dpr));c.height=Math.max(1,Math.round(r.height*dpr));render(c.getContext('2d'),c.width,c.height,{transparent:true})})};
    redraw();const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(redraw):null;ro?.observe(c.parentElement||c);window.addEventListener('resize',redraw);return()=>{cancelAnimationFrame(raf);ro?.disconnect();window.removeEventListener('resize',redraw)};
  },[source,params,charset,seed,ratio]);

  async function renderBlob({transparent=false}={}){
    const c=document.createElement('canvas');c.width=doc.w;c.height=doc.h;render(c.getContext('2d'),doc.w,doc.h,{transparent});
    return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('PNG encode failed')),'image/png'));
  }
  async function exportPng(transparent=false){
    if(exporting)return;setExporting(true);try{const b=await renderBlob({transparent});downloadBlob(b,`1337-ascii-${transparent?'transparent-':''}${Date.now()}.png`)}catch(err){reportToolError('ASCII export',err)}finally{setExporting(false)}
  }
  async function sendToEditor(){
    if(!imgRef.current||exporting)return;setExporting(true);try{const b=await renderBlob({transparent:true}),f=new File([b],`ASCII-${Date.now()}.png`,{type:'image/png'});onSendToEditor?.(f,ratio)}catch(err){reportToolError('ASCII → EDITOR',err)}finally{setExporting(false)}
  }

  return <main className="fieldShell asciiShell">
    <aside className="fieldHud">
      <div className="brand"><span className="brand1337">1337</span><span className="brandTools">tools</span><small>4.14 / 03 ASCII</small></div>
      <button className="wide fieldBack" onClick={onIndex}>← INDEX</button>
      <button className="wide primary fieldHero" onClick={randomize}>RANDOMIZE ASCII ↯</button>
      <button className="wide" onClick={reroll}>REROLL SEED</button>

      <section><div className="title">INPUT</div><button className="wide" onClick={()=>fileRef.current?.click()}>+ SOURCE IMAGE</button><input ref={fileRef} type="file" hidden accept="image/*" onChange={e=>{loadFile(e.target.files?.[0]);e.target.value=''}}/><div className="note">{sourceName}<br/>drop anywhere / Ctrl/Cmd+V</div></section>

      <section><div className="title">ASCII</div>
        <AsciiSelect label="Mode" value={params.mode} options={MODES} onChange={v=>{setP('mode',v);setCharset(PRESETS[v])}}/>
        <AsciiSelect label="Color" value={params.colorMode} options={COLOR_MODES} onChange={v=>setP('colorMode',v)}/>
        <AsciiRange label="Density" min={18} max={180} value={params.density} onChange={v=>setP('density',+v)}/>
        <AsciiRange label="Scale" min={40} max={180} value={params.scale} onChange={v=>setP('scale',+v)}/>
        <AsciiRange label="Contrast" min={20} max={220} value={params.contrast} onChange={v=>setP('contrast',+v)}/>
        <AsciiRange label="Brightness" min={-100} max={100} value={params.brightness} onChange={v=>setP('brightness',+v)}/>
        <AsciiRange label="Chaos" min={0} max={100} value={params.chaos} onChange={v=>setP('chaos',+v)}/>
        <label className="fieldControl"><div className="fieldControlHead"><span>Charset</span><b>{[...charset].length}</b></div><input value={charset} onChange={e=>setCharset(e.target.value)} /></label>
      </section>

      <section><div className="title">CANVAS</div><label className="fieldControl"><div className="fieldControlHead"><span>Ratio</span><b>{doc.label}</b></div><select value={ratio} onChange={e=>setRatio(e.target.value)}>{Object.entries(RATIOS).map(([v,d])=><option value={v} key={v}>{d.label}</option>)}</select></label><div className="note">{doc.w} × {doc.h}px</div></section>

      <section><div className="title">OUTPUT</div><button className="wide primary" disabled={!source||exporting} onClick={sendToEditor}>SEND TO EDITOR</button><div className="two"><button disabled={!source||exporting} onClick={()=>exportPng(false)}>{exporting?'…':'PNG'}</button><button disabled={!source||exporting} onClick={()=>exportPng(true)}>{exporting?'…':'PNG α'}</button></div><div className="note">PNG α = export without background.</div></section>
    </aside>

    <section className="fieldWorkspace">
      <header className="fieldTop fieldTop41"><div><button onClick={onIndex}>INDEX</button><span>1337TOOLS / 03 ASCII / {params.mode}</span></div><div><b>{params.colorMode}</b></div></header>
      <div className={`fieldStage ${dragOver?'fieldDropActive':''}`} onDragEnter={e=>{e.preventDefault();setDragOver(true)}} onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOver(false)}} onDrop={drop}>
        <div className="fieldCanvasWrap" style={{aspectRatio:`${doc.w} / ${doc.h}`}}><canvas ref={canvasRef} className="fieldCanvas fieldCanvasTransparent"/></div>
      </div>
    </section>
  </main>;
}

function AsciiRange({label,value,onChange,min,max}){return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><b>{value}</b></div><div className="fieldRangeRow"><input type="range" min={min} max={max} value={value} onChange={e=>onChange(e.target.value)}/><input type="number" min={min} max={max} value={value} onChange={e=>onChange(e.target.value)}/></div></label>}
function AsciiSelect({label,value,onChange,options}){return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><b>{value}</b></div><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(v=><option key={v}>{v}</option>)}</select></label>}
