'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {RATIOS,clamp,hashSeed,mulberry32} from '../lib/editorCore';
import {downloadBlob,reportToolError} from '../lib/browserUtils';
import ContinuePanel from './ContinuePanel';
import MicroHudGroup from './MicroHudGroup';

const MODES=['TRAIL','TUNNEL','ORBIT'];
const BLENDS=['NORMAL','SCREEN','MULTIPLY','DIFFERENCE','EXCLUSION'];
const DEFAULTS={mode:'TRAIL',copies:12,scale:96,offsetX:18,offsetY:3,rotation:1.8,fade:72,spread:58,chaos:10,blend:'NORMAL'};
const DEFAULT_VIEW={scale:100,x:0,y:0};

export default function EchoTool({onIndex,onHome,onSendToEditor,onContinue,trail=[],initialFile,initialRatio='4 / 5',initialToken}){
  const [source,setSource]=useState(null),[sourceName,setSourceName]=useState('NO SOURCE');
  const [params,setParams]=useState(DEFAULTS),[sourceView,setSourceView]=useState(DEFAULT_VIEW);
  const [seed,setSeed]=useState(()=>Math.floor(Math.random()*1e9)),[ratio,setRatio]=useState(initialRatio||'4 / 5');
  const [bgColor,setBgColor]=useState('#f0ede4'),[dragOver,setDragOver]=useState(false),[exporting,setExporting]=useState(false);
  const canvasRef=useRef(null),fileRef=useRef(null),imgRef=useRef(null),urlRef=useRef(null);
  const doc=useMemo(()=>{const d=RATIOS[ratio]||RATIOS['4 / 5'];return {w:d.width,h:d.height,label:d.label}},[ratio]);
  const processLabel=(trail?.length?trail:['ECHO']).join(' → ');

  function setP(k,v){setParams(p=>({...p,[k]:v}))}
  function setView(k,v){setSourceView(p=>({...p,[k]:+v}))}
  function reroll(){setSeed(Math.floor(Math.random()*1e9))}
  function randomize(){
    const mode=MODES[Math.floor(Math.random()*MODES.length)];
    setParams({
      mode,
      copies:Math.round(5+Math.random()*23),
      scale:Math.round(86+Math.random()*25),
      offsetX:Math.round(-42+Math.random()*84),
      offsetY:Math.round(-32+Math.random()*64),
      rotation:Math.round((-7+Math.random()*14)*10)/10,
      fade:Math.round(45+Math.random()*48),
      spread:Math.round(24+Math.random()*76),
      chaos:Math.round(Math.random()*48),
      blend:BLENDS[Math.floor(Math.random()*BLENDS.length)]
    });
    reroll();
  }

  async function loadFile(file){
    if(!file||!file.type?.startsWith('image/'))return;
    if(urlRef.current)URL.revokeObjectURL(urlRef.current);
    const url=URL.createObjectURL(file);urlRef.current=url;
    const img=new Image();
    img.onload=()=>{imgRef.current=img;setSource(url);setSourceName(file.name||'PASTED IMAGE');setSeed(Math.floor(Math.random()*1e9))};
    img.onerror=()=>{if(urlRef.current===url)urlRef.current=null;URL.revokeObjectURL(url);reportToolError('ECHO image load',new Error('Unsupported or damaged image'))};
    img.src=url;
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
  function blendMode(v){return ({NORMAL:'source-over',SCREEN:'screen',MULTIPLY:'multiply',DIFFERENCE:'difference',EXCLUSION:'exclusion'})[v]||'source-over'}

  function drawSource(ctx,img,w,h){
    const iw=img.naturalWidth||1,ih=img.naturalHeight||1,fit=Math.min(w/iw,h/ih),zoom=Math.max(.05,(+sourceView.scale||100)/100);
    const dw=iw*fit*zoom,dh=ih*fit*zoom;
    const maxShiftX=Math.max(w,dw)*.48,maxShiftY=Math.max(h,dh)*.48;
    const dx=(w-dw)/2+(+sourceView.x||0)/100*maxShiftX,dy=(h-dh)/2+(+sourceView.y||0)/100*maxShiftY;
    ctx.drawImage(img,dx,dy,dw,dh);
  }
  function makeSource(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;drawSource(c.getContext('2d'),imgRef.current,w,h);return c}

  function render(ctx,w,h,{transparent=false}={}){
    ctx.clearRect(0,0,w,h);if(!transparent){ctx.fillStyle=bgColor||'#f0ede4';ctx.fillRect(0,0,w,h)}
    const img=imgRef.current;
    if(!img){ctx.fillStyle=transparent?'rgba(255,255,255,.95)':'#111';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`900 ${Math.max(24,w*.035)}px Arial Black, Arial`;ctx.fillText('DROP / PASTE ONE IMAGE',w/2,h/2);return}
    const src=makeSource(w,h),rnd=mulberry32(hashSeed(`${seed}:${JSON.stringify(params)}:${JSON.stringify(sourceView)}`));
    const copies=Math.max(1,Math.round(+params.copies||1)),fade=clamp((+params.fade||0)/100,0,1),spread=clamp((+params.spread||0)/100,0,1),chaos=clamp((+params.chaos||0)/100,0,1);
    const scaleStep=Math.max(.25,(+params.scale||100)/100),rotStep=(+params.rotation||0)*Math.PI/180,baseDx=w*(+params.offsetX||0)/100*.10,baseDy=h*(+params.offsetY||0)/100*.10;
    ctx.save();ctx.globalCompositeOperation=blendMode(params.blend);
    for(let i=copies;i>=1;i--){
      const t=i/Math.max(1,copies),j=(rnd()-.5)*2*chaos;
      let sc=Math.pow(scaleStep,i),rot=rotStep*i,dx=baseDx*i*spread,dy=baseDy*i*spread;
      if(params.mode==='TUNNEL'){
        dx=baseDx*i*.18*spread;dy=baseDy*i*.18*spread;rot=rotStep*i*.45;
      }else if(params.mode==='ORBIT'){
        const a=rotStep*i*3.5+i*.42+seed*.000001,r=Math.min(w,h)*(.015+.17*spread)*t;
        dx=Math.cos(a)*r+baseDx*i*.12;dy=Math.sin(a)*r+baseDy*i*.12;rot=a*.22;
        sc=Math.pow(scaleStep,Math.max(1,i*.58));
      }
      sc=clamp(sc*(1+j*.035),.055,7);
      const alpha=clamp((1-t*.84)*(fade*.86+.08)+.035,.025,.86);
      ctx.save();ctx.translate(w/2+dx+(rnd()-.5)*w*.018*chaos,h/2+dy+(rnd()-.5)*h*.018*chaos);ctx.rotate(rot+(rnd()-.5)*.08*chaos);ctx.scale(sc,sc);ctx.globalAlpha=alpha;ctx.drawImage(src,-w/2,-h/2);ctx.restore();
    }
    ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.drawImage(src,0,0);ctx.restore();
  }

  useEffect(()=>{
    const c=canvasRef.current;if(!c)return;let raf=0;
    const redraw=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const r=c.getBoundingClientRect();if(r.width<2||r.height<2)return;const dpr=Math.min(2,window.devicePixelRatio||1);c.width=Math.max(1,Math.round(r.width*dpr));c.height=Math.max(1,Math.round(r.height*dpr));render(c.getContext('2d'),c.width,c.height,{transparent:false})})};
    redraw();const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(redraw):null;ro?.observe(c.parentElement||c);window.addEventListener('resize',redraw);
    return()=>{cancelAnimationFrame(raf);ro?.disconnect();window.removeEventListener('resize',redraw)};
  },[source,params,sourceView,seed,ratio,bgColor]);

  async function renderBlob({transparent=false}={}){const c=document.createElement('canvas');c.width=doc.w;c.height=doc.h;render(c.getContext('2d'),doc.w,doc.h,{transparent});return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('PNG encode failed')),'image/png'))}
  async function exportPng(transparent=false){if(exporting)return;setExporting(true);try{const b=await renderBlob({transparent});downloadBlob(b,`1337-echo-${transparent?'transparent-':''}${Date.now()}.png`)}catch(err){reportToolError('ECHO export',err)}finally{setExporting(false)}}
  async function sendToEditor(){if(!imgRef.current||exporting)return;setExporting(true);try{const b=await renderBlob({transparent:false}),f=new File([b],`ECHO-${Date.now()}.png`,{type:'image/png'});onSendToEditor?.(f,ratio)}catch(err){reportToolError('ECHO → EDITOR',err)}finally{setExporting(false)}}
  async function continueTo(target){if(!imgRef.current||exporting)return;setExporting(true);try{const b=await renderBlob({transparent:false}),f=new File([b],`ECHO-${target}-${Date.now()}.png`,{type:'image/png'});onContinue?.('echo',target,f,ratio)}catch(err){reportToolError(`ECHO → ${String(target).toUpperCase()}`,err)}finally{setExporting(false)}}

  return <main className="fieldShell echoShell">
    <aside className="fieldHud">
      <button type="button" className="toolBrandHome" onClick={onHome} aria-label="Back to 1337tools home"><div className="brand"><span className="brand1337">1337</span><span className="brandTools">tools</span><small>4.24 / 05 ECHO</small></div></button>
      <button className="wide fieldBack" onClick={onIndex}>← INDEX</button>
      <button className="wide primary fieldHero" onClick={randomize}>RANDOMIZE ECHO ↯</button>
      <button className="wide" onClick={reroll}>REROLL SEED</button>

      <MicroHudGroup title="INPUT" storageKey="echo-input" defaultOpen><button className="wide" onClick={()=>fileRef.current?.click()}>+ SOURCE IMAGE</button><input ref={fileRef} type="file" hidden accept="image/*" onChange={e=>{loadFile(e.target.files?.[0]);e.target.value=''}}/><div className="note">{sourceName}<br/>drop anywhere / Ctrl/Cmd+V</div>
        <EchoRange label="Image scale" min={25} max={300} value={sourceView.scale} onChange={v=>setView('scale',v)}/><EchoRange label="Image X" min={-100} max={100} value={sourceView.x} onChange={v=>setView('x',v)}/><EchoRange label="Image Y" min={-100} max={100} value={sourceView.y} onChange={v=>setView('y',v)}/><button className="wide" onClick={()=>setSourceView(DEFAULT_VIEW)}>RESET IMAGE VIEW</button>
      </MicroHudGroup>

      <MicroHudGroup title="ECHO" storageKey="echo-main" defaultOpen>
        <EchoSelect label="Mode" value={params.mode} options={MODES} onChange={v=>setP('mode',v)}/><EchoSelect label="Blend" value={params.blend} options={BLENDS} onChange={v=>setP('blend',v)}/>
        <EchoRange label="Copies" min={2} max={36} value={params.copies} onChange={v=>setP('copies',+v)}/><EchoRange label="Scale step" min={70} max={120} value={params.scale} onChange={v=>setP('scale',+v)}/><EchoRange label="Offset X" min={-100} max={100} value={params.offsetX} onChange={v=>setP('offsetX',+v)}/><EchoRange label="Offset Y" min={-100} max={100} value={params.offsetY} onChange={v=>setP('offsetY',+v)}/><EchoRange label="Rotation" min={-15} max={15} step={0.1} value={params.rotation} onChange={v=>setP('rotation',+v)}/><EchoRange label="Fade" min={0} max={100} value={params.fade} onChange={v=>setP('fade',+v)}/><EchoRange label="Spread" min={0} max={100} value={params.spread} onChange={v=>setP('spread',+v)}/><EchoRange label="Chaos" min={0} max={100} value={params.chaos} onChange={v=>setP('chaos',+v)}/>
      </MicroHudGroup>

      <MicroHudGroup title="CANVAS" storageKey="echo-canvas"><label className="fieldControl"><div className="fieldControlHead"><span>Ratio</span><b>{doc.label}</b></div><select value={ratio} onChange={e=>setRatio(e.target.value)}>{Object.entries(RATIOS).map(([v,d])=><option value={v} key={v}>{d.label}</option>)}</select></label><label className="fieldControl"><div className="fieldControlHead"><span>Background</span><b>{bgColor}</b></div><div className="asciiColorRow"><input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)}/><input value={bgColor.toUpperCase()} readOnly aria-label="Background hex"/></div></label><div className="fieldBgPresets"><button onClick={()=>setBgColor('#f0ede4')}>PAPER</button><button onClick={()=>setBgColor('#ffffff')}>WHITE</button><button onClick={()=>setBgColor('#0038ff')}>BLUE</button><button onClick={()=>setBgColor('#000000')}>BLACK</button></div><div className="note">{doc.w} × {doc.h}px</div></MicroHudGroup>

      <MicroHudGroup title="OUTPUT" storageKey="echo-output" accent><button className="wide primary" disabled={!source||exporting} onClick={sendToEditor}>SEND TO EDITOR</button><ContinuePanel current="echo" disabled={!source||exporting} onChoose={continueTo}/><div className="two"><button disabled={!source||exporting} onClick={()=>exportPng(false)}>{exporting?'…':'PNG'}</button><button disabled={!source||exporting} onClick={()=>exportPng(true)}>{exporting?'…':'PNG α'}</button></div><div className="note">PNG α removes the selected background.</div></MicroHudGroup>
    </aside>

    <section className="fieldWorkspace"><header className="fieldTop fieldTop41"><div><button onClick={onIndex}>INDEX</button><span>1337TOOLS / 05 ECHO / {params.mode}</span></div><div><b>{processLabel}</b></div></header><div className={`fieldStage echoStage ${dragOver?'fieldDropActive':''}`} onDragEnter={e=>{e.preventDefault();setDragOver(true)}} onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOver(false)}} onDrop={drop}><div className="fieldCanvasWrap" style={{aspectRatio:`${doc.w} / ${doc.h}`}}><canvas ref={canvasRef} className="fieldCanvas echoCanvas"/></div></div></section>
  </main>;
}

function EchoRange({label,value,onChange,min,max,step=1}){return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><b>{value}</b></div><div className="fieldRangeRow"><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(e.target.value)}/><input type="number" min={min} max={max} step={step} value={value} onChange={e=>onChange(e.target.value)}/></div></label>}
function EchoSelect({label,value,onChange,options}){return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><b>{value}</b></div><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(v=><option key={v}>{v}</option>)}</select></label>}
