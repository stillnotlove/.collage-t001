'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {RATIOS,clamp,hashSeed,mulberry32} from '../lib/editorCore';
import {downloadBlob,isEditableTarget,reportToolError} from '../lib/browserUtils';
import ContinuePanel from './ContinuePanel';
import MicroHudGroup from './MicroHudGroup';
import RangeInputs from './RangeInputs';

const MODES=['THRESHOLD','BAYER 4×4','BAYER 8×8','FLOYD','ATKINSON','NOISE'];
const DEFAULTS={mode:'BAYER 4×4',detail:92,levels:2,threshold:50,contrast:118,brightness:0,amount:100,noise:4,invert:false};
const BAYER4=[
  0,8,2,10,
  12,4,14,6,
  3,11,1,9,
  15,7,13,5,
];
const BAYER8=[
  0,48,12,60,3,51,15,63,
  32,16,44,28,35,19,47,31,
  8,56,4,52,11,59,7,55,
  40,24,36,20,43,27,39,23,
  2,50,14,62,1,49,13,61,
  34,18,46,30,33,17,45,29,
  10,58,6,54,9,57,5,53,
  42,26,38,22,41,25,37,21,
];

function hexRgb(hex){
  const v=String(hex||'#000000').replace('#','').trim();
  const s=v.length===3?v.split('').map(x=>x+x).join(''):v.padEnd(6,'0').slice(0,6);
  const n=parseInt(s,16);return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};
}
function mixColor(a,b,t){return {r:Math.round(a.r+(b.r-a.r)*t),g:Math.round(a.g+(b.g-a.g)*t),b:Math.round(a.b+(b.b-a.b)*t)}}
function quantize(v,levels){const steps=Math.max(1,levels-1);return Math.round(clamp(v,0,255)/255*steps)/steps*255}

export default function DitherTool({onIndex,onHome,onSendToEditor,onContinue,trail=[],initialFile,initialRatio='4 / 5',initialToken}){
  const [source,setSource]=useState(null),[sourceName,setSourceName]=useState('NO SOURCE');
  const [params,setParams]=useState(DEFAULTS),[seed,setSeed]=useState(()=>Math.floor(Math.random()*1e9));
  const [paperColor,setPaperColor]=useState('#f0ede4'),[inkColor,setInkColor]=useState('#111111');
  const [ratio,setRatio]=useState(initialRatio||'4 / 5'),[dragOver,setDragOver]=useState(false),[exporting,setExporting]=useState(false);
  const canvasRef=useRef(null),fileRef=useRef(null),imgRef=useRef(null),urlRef=useRef(null),loadSeq=useRef(0);
  const doc=useMemo(()=>{const d=RATIOS[ratio]||RATIOS['4 / 5'];return {w:d.width,h:d.height,label:d.label}},[ratio]);
  const processLabel=(trail?.length?trail:['DITHER']).join(' → ');

  function setP(k,v){setParams(p=>({...p,[k]:v}))}
  async function loadFile(file){
    if(!file||!file.type?.startsWith('image/'))return false;
    const seq=++loadSeq.current,previous=urlRef.current,url=URL.createObjectURL(file),img=new Image();
    return await new Promise(resolve=>{
      img.onload=()=>{if(seq!==loadSeq.current){URL.revokeObjectURL(url);resolve(false);return}if(previous)URL.revokeObjectURL(previous);urlRef.current=url;imgRef.current=img;setSource(url);setSourceName(file.name||'PASTED IMAGE');setSeed(Math.floor(Math.random()*1e9));resolve(true)};
      img.onerror=()=>{URL.revokeObjectURL(url);if(seq===loadSeq.current)reportToolError('DITHER image load',new Error('Unsupported or damaged image'));resolve(false)};
      img.src=url;
    });
  }
  useEffect(()=>()=>{loadSeq.current++;if(urlRef.current)URL.revokeObjectURL(urlRef.current)},[]);
  useEffect(()=>{if(initialFile)loadFile(initialFile);if(initialRatio)setRatio(initialRatio)},[initialFile,initialRatio,initialToken]);
  useEffect(()=>{
    const onPaste=e=>{
      if(isEditableTarget())return;
      const f=[...e.clipboardData.files].find(x=>x.type.startsWith('image/'))||[...e.clipboardData.items].find(i=>i.type.startsWith('image/'))?.getAsFile?.();
      if(f){e.preventDefault();loadFile(f)}
    };
    window.addEventListener('paste',onPaste);return()=>window.removeEventListener('paste',onPaste);
  },[]);

  function drop(e){e.preventDefault();e.stopPropagation();setDragOver(false);const f=[...(e.dataTransfer?.files||[])].find(x=>x.type?.startsWith('image/'));if(f)loadFile(f)}
  function reroll(){setSeed(Math.floor(Math.random()*1e9))}
  function randomize(){
    const palettes=[['#f0ede4','#111111'],['#ffffff','#0038ff'],['#0038ff','#ffffff'],['#000000','#ffffff'],['#ffd800','#0038ff']];
    const palette=palettes[Math.floor(Math.random()*palettes.length)];
    setParams({
      mode:MODES[Math.floor(Math.random()*MODES.length)],
      detail:Math.round(42+Math.random()*120),levels:Math.round(2+Math.random()*3),threshold:Math.round(36+Math.random()*30),
      contrast:Math.round(82+Math.random()*100),brightness:Math.round(-22+Math.random()*44),amount:Math.round(72+Math.random()*28),
      noise:Math.round(Math.random()*24),invert:Math.random()>.78
    });
    setPaperColor(palette[0]);setInkColor(palette[1]);reroll();
  }

  function drawCover(ctx,img,w,h){
    const iw=img.naturalWidth||1,ih=img.naturalHeight||1,ar=iw/ih,tar=w/h;let sw=iw,sh=ih,sx=0,sy=0;
    if(ar>tar){sw=sh*tar;sx=(iw-sw)/2}else{sh=sw/tar;sy=(ih-sh)/2}
    ctx.drawImage(img,sx,sy,sw,sh,0,0,w,h);
  }

  function processMono(src,w,h){
    const image=src.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h),data=image.data;
    const values=new Float32Array(w*h),original=new Float32Array(w*h),contrast=Math.max(.05,(+params.contrast||100)/100),brightness=(+params.brightness||0)*2.55;
    const rnd=mulberry32(hashSeed(`${seed}:${params.mode}:${params.detail}:${params.noise}`));
    for(let i=0;i<w*h;i++){
      const q=i*4,lum=data[q]*.2126+data[q+1]*.7152+data[q+2]*.0722;
      let v=(lum-128)*contrast+128+brightness;
      if(params.noise>0)v+=(rnd()-.5)*2*(+params.noise||0)*2.1;
      values[i]=original[i]=clamp(v,0,255);
    }
    const levels=Math.max(2,Math.round(+params.levels||2)),threshold=clamp((+params.threshold||50)/100,0,1),amount=clamp((+params.amount||100)/100,0,1);
    const mode=params.mode;
    const result=new Float32Array(values.length);
    if(mode==='FLOYD'||mode==='ATKINSON'){
      const work=new Float32Array(values);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const i=y*w+x,old=clamp(work[i]+(threshold-.5)*-90,0,255),next=quantize(old,levels),err=(old-next)*amount;result[i]=next;
        const add=(xx,yy,k)=>{if(xx>=0&&xx<w&&yy>=0&&yy<h)work[yy*w+xx]+=err*k};
        if(mode==='FLOYD'){
          add(x+1,y,7/16);add(x-1,y+1,3/16);add(x,y+1,5/16);add(x+1,y+1,1/16);
        }else{
          add(x+1,y,1/8);add(x+2,y,1/8);add(x-1,y+1,1/8);add(x,y+1,1/8);add(x+1,y+1,1/8);add(x,y+2,1/8);
        }
      }
    }else{
      const matrix=mode==='BAYER 8×8'?BAYER8:BAYER4,size=mode==='BAYER 8×8'?8:4,max=size*size;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const i=y*w+x,v=values[i];let shifted=v;
        if(mode==='BAYER 4×4'||mode==='BAYER 8×8'){
          const m=(matrix[(y%size)*size+(x%size)]+.5)/max-.5;shifted=v+m*255*amount;
        }else if(mode==='NOISE'){
          shifted=v+(rnd()-.5)*255*amount;
        }else{
          shifted=v+(threshold-.5)*-150;
        }
        result[i]=quantize(shifted,levels);
      }
    }
    for(let i=0;i<result.length;i++)result[i]=original[i]*(1-amount)+result[i]*amount;
    return {result,alpha:data};
  }

  function render(ctx,w,h,{transparent=false}={}){
    ctx.clearRect(0,0,w,h);
    if(!transparent){ctx.fillStyle=paperColor;ctx.fillRect(0,0,w,h)}
    const img=imgRef.current;if(!img){ctx.fillStyle=transparent?'rgba(255,255,255,.95)':'#111';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`900 ${Math.max(24,w*.035)}px Arial Black, Arial`;ctx.fillText('DROP / PASTE ONE IMAGE',w/2,h/2);return}
    const lowW=Math.max(18,Math.min(220,Math.round(+params.detail||92))),lowH=Math.max(18,Math.round(lowW*h/w));
    const src=document.createElement('canvas');src.width=lowW;src.height=lowH;drawCover(src.getContext('2d'),img,lowW,lowH);
    const {result}=processMono(src,lowW,lowH),out=document.createElement('canvas');out.width=lowW;out.height=lowH,ox=out.getContext('2d'),id=ox.createImageData(lowW,lowH),paper=hexRgb(paperColor),ink=hexRgb(inkColor);
    for(let i=0;i<result.length;i++){
      let t=clamp(result[i]/255,0,1);if(params.invert)t=1-t;
      const c=mixColor(ink,paper,t),q=i*4;id.data[q]=c.r;id.data[q+1]=c.g;id.data[q+2]=c.b;id.data[q+3]=transparent?Math.round((1-t)*255):255;
    }
    ox.putImageData(id,0,0);ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(out,0,0,w,h);ctx.restore();
  }

  useEffect(()=>{
    const c=canvasRef.current;if(!c)return;let raf=0;
    const redraw=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const r=c.getBoundingClientRect();if(r.width<2||r.height<2)return;const dpr=Math.min(2,window.devicePixelRatio||1);c.width=Math.max(1,Math.round(r.width*dpr));c.height=Math.max(1,Math.round(r.height*dpr));render(c.getContext('2d'),c.width,c.height,{transparent:false})})};
    redraw();const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(redraw):null;ro?.observe(c.parentElement||c);window.addEventListener('resize',redraw);
    return()=>{cancelAnimationFrame(raf);ro?.disconnect();window.removeEventListener('resize',redraw)};
  },[source,params,seed,ratio,paperColor,inkColor]);

  async function renderBlob({transparent=false}={}){const c=document.createElement('canvas');c.width=doc.w;c.height=doc.h;render(c.getContext('2d'),doc.w,doc.h,{transparent});return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('PNG encode failed')),'image/png'))}
  async function exportPng(transparent=false){if(exporting)return;setExporting(true);try{const b=await renderBlob({transparent});downloadBlob(b,`1337-dither-${transparent?'transparent-':''}${Date.now()}.png`)}catch(err){reportToolError('DITHER export',err)}finally{setExporting(false)}}
  async function sendToEditor(){if(!imgRef.current||exporting)return;setExporting(true);try{const b=await renderBlob({transparent:false}),f=new File([b],`DITHER-${Date.now()}.png`,{type:'image/png'});onSendToEditor?.(f,ratio)}catch(err){reportToolError('DITHER → EDITOR',err)}finally{setExporting(false)}}
  async function continueTo(target){if(!imgRef.current||exporting)return;setExporting(true);try{const b=await renderBlob({transparent:false}),f=new File([b],`DITHER-${target}-${Date.now()}.png`,{type:'image/png'});onContinue?.('dither',target,f,ratio)}catch(err){reportToolError(`DITHER → ${String(target).toUpperCase()}`,err)}finally{setExporting(false)}}

  return <main className="fieldShell ditherShell">
    <aside className="fieldHud">
      <button type="button" className="toolBrandHome" onClick={onHome} aria-label="Back to 1337tools home"><div className="brand"><span className="brand1337"><span className="brandOneNudge">1</span>337</span><span className="brandTools">tools</span></div></button>
      <button className="wide fieldBack" onClick={onIndex}>← INDEX</button>
      <button className="wide primary fieldHero" onClick={randomize}>RANDOMIZE DITHER ↯</button>
      <button className="wide" onClick={reroll}>REROLL SEED</button>

      <MicroHudGroup title="INPUT" storageKey="dither-input" defaultOpen><button className="wide" onClick={()=>fileRef.current?.click()}>+ SOURCE IMAGE</button><input ref={fileRef} type="file" hidden accept="image/*" onChange={e=>{loadFile(e.target.files?.[0]);e.target.value=''}}/><div className="note">{sourceName}<br/>drop anywhere / Ctrl/Cmd+V</div></MicroHudGroup>

      <MicroHudGroup title="DITHER" storageKey="dither-main" defaultOpen>
        <DitherSelect label="Mode" value={params.mode} options={MODES} onChange={v=>setP('mode',v)}/>
        <DitherRange label="Detail" min={24} max={220} value={params.detail} onChange={v=>setP('detail',+v)}/>
        <DitherRange label="Levels" min={2} max={6} value={params.levels} onChange={v=>setP('levels',+v)}/>
        <DitherRange label="Threshold" min={0} max={100} value={params.threshold} onChange={v=>setP('threshold',+v)}/>
        <DitherRange label="Contrast" min={30} max={240} value={params.contrast} onChange={v=>setP('contrast',+v)}/>
        <DitherRange label="Brightness" min={-60} max={60} value={params.brightness} onChange={v=>setP('brightness',+v)}/>
        <DitherRange label="Amount" min={0} max={100} value={params.amount} onChange={v=>setP('amount',+v)}/>
        <DitherRange label="Noise" min={0} max={60} value={params.noise} onChange={v=>setP('noise',+v)}/>
        <label className="check"><input type="checkbox" checked={params.invert} onChange={e=>setP('invert',e.target.checked)}/><span>INVERT</span></label>
      </MicroHudGroup>

      <MicroHudGroup title="INK / PAPER" storageKey="dither-colors">
        <DitherColor label="Ink" value={inkColor} onChange={setInkColor}/><DitherColor label="Paper" value={paperColor} onChange={setPaperColor}/>
        <div className="fieldBgPresets"><button onClick={()=>{setInkColor('#111111');setPaperColor('#f0ede4')}}>PAPER</button><button onClick={()=>{setInkColor('#0038ff');setPaperColor('#ffffff')}}>BLUE</button><button onClick={()=>{setInkColor('#ffffff');setPaperColor('#0038ff')}}>REV</button><button onClick={()=>{setInkColor('#0038ff');setPaperColor('#ffd800')}}>1337</button></div>
      </MicroHudGroup>

      <MicroHudGroup title="CANVAS" storageKey="dither-canvas"><label className="fieldControl"><div className="fieldControlHead"><span>Ratio</span><b>{doc.label}</b></div><select value={ratio} onChange={e=>setRatio(e.target.value)}>{Object.entries(RATIOS).map(([v,d])=><option value={v} key={v}>{d.label}</option>)}</select></label><div className="note">{doc.w} × {doc.h}px</div></MicroHudGroup>

      <MicroHudGroup title="OUTPUT" storageKey="dither-output" accent><button className="wide primary" disabled={!source||exporting} onClick={sendToEditor}>SEND TO EDITOR</button><ContinuePanel current="dither" disabled={!source||exporting} onChoose={continueTo}/><div className="two"><button disabled={!source||exporting} onClick={()=>exportPng(false)}>{exporting?'…':'PNG'}</button><button disabled={!source||exporting} onClick={()=>exportPng(true)}>{exporting?'…':'PNG α'}</button></div><div className="note">PNG α keeps only the ink density; paper becomes transparent.</div></MicroHudGroup>
    </aside>

    <section className="fieldWorkspace"><header className="fieldTop fieldTop41"><div><button onClick={onIndex}>INDEX</button><span>1337TOOLS / 06 DITHER / {params.mode}</span></div><div><b>{processLabel}</b></div></header><div className={`fieldStage ditherStage ${dragOver?'fieldDropActive':''}`} onDragEnter={e=>{e.preventDefault();setDragOver(true)}} onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOver(false)}} onDrop={drop}><div className="fieldCanvasWrap" style={{aspectRatio:`${doc.w} / ${doc.h}`}}><canvas ref={canvasRef} className="fieldCanvas ditherCanvas"/></div></div></section>
  </main>;
}

function DitherRange({label,value,onChange,min,max,step=1}){return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span></div><RangeInputs min={min} max={max} step={step} value={value} onChange={onChange}/></label>}
function DitherSelect({label,value,onChange,options}){return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><b>{value}</b></div><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(v=><option key={v}>{v}</option>)}</select></label>}
function DitherColor({label,value,onChange}){return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><b>{value.toUpperCase()}</b></div><div className="asciiColorRow"><input type="color" value={value} onChange={e=>onChange(e.target.value)}/><input value={value.toUpperCase()} readOnly aria-label={`${label} hex`}/></div></label>}
