'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {RATIOS,clamp,hashSeed,mulberry32} from '../lib/editorCore';
import {downloadBlob,isEditableTarget,reportToolError} from '../lib/browserUtils';
import ContinuePanel from './ContinuePanel';
import MicroHudGroup from './MicroHudGroup';
import RangeInputs from './RangeInputs';

const MODES=['PULL','VORTEX','WAVE'];
const BLENDS=['NORMAL','MULTIPLY','SCREEN','DIFFERENCE','EXCLUSION','OVERLAY'];
const DEFAULTS={mode:'VORTEX',amount:72,scale:42,force:64,chaos:38};
const DEFAULT_FX={blend:'NORMAL',exposure:0,contrast:100,mono:0,invert:0,hue:0,posterize:0,blur:0,noise:0};

export default function FieldTool({onIndex,onHome,onSendToEditor,onContinue,trail=[],initialFile,initialRatio='4 / 5',initialToken}){
  const [source,setSource]=useState(null);
  const [sourceName,setSourceName]=useState('NO SOURCE');
  const [params,setParams]=useState(DEFAULTS);
  const [fx,setFx]=useState(DEFAULT_FX);
  const [locks,setLocks]=useState({amount:false,scale:false,force:false,chaos:false,mode:false});
  const [seed,setSeed]=useState(()=>Math.floor(Math.random()*1e9));
  const [point,setPoint]=useState({x:.5,y:.5});
  const [dragging,setDragging]=useState(false);
  const [dragOver,setDragOver]=useState(false);
  const [exporting,setExporting]=useState(false);
  const [ratio,setRatio]=useState(initialRatio||'4 / 5');
  const [bgColor,setBgColor]=useState('#f0ede4');
  const canvasRef=useRef(null),fileRef=useRef(null),imgRef=useRef(null),urlRef=useRef(null),loadSeq=useRef(0),fxCache=useRef({key:'',canvas:null});

  const doc=useMemo(()=>{const d=RATIOS[ratio]||RATIOS['4 / 5'];return {w:d.width,h:d.height,label:d.label}},[ratio]);
  const processLabel=(trail?.length?trail:['FIELD']).join(' → ');

  function setP(key,value){setParams(p=>({...p,[key]:value}))}
  function setFxP(key,value){setFx(p=>({...p,[key]:value}));fxCache.current={key:'',canvas:null}}
  function toggleLock(key){setLocks(l=>({...l,[key]:!l[key]}))}

  async function loadFile(file){
    if(!file||!file.type?.startsWith('image/'))return false;
    const seq=++loadSeq.current,previous=urlRef.current,url=URL.createObjectURL(file),img=new Image();
    return await new Promise(resolve=>{
      img.onload=()=>{if(seq!==loadSeq.current){URL.revokeObjectURL(url);resolve(false);return}if(previous)URL.revokeObjectURL(previous);urlRef.current=url;imgRef.current=img;fxCache.current={key:'',canvas:null};setSource(url);setSourceName(file.name||'PASTED IMAGE');resolve(true)};
      img.onerror=()=>{URL.revokeObjectURL(url);if(seq===loadSeq.current)reportToolError('FIELD image load',new Error('Unsupported or damaged image'));resolve(false)};
      img.src=url;
    });
  }

  useEffect(()=>()=>{loadSeq.current++;if(urlRef.current)URL.revokeObjectURL(urlRef.current)},[]);
  useEffect(()=>{if(initialFile)loadFile(initialFile);if(initialRatio)setRatio(initialRatio)},[initialFile,initialRatio,initialToken]);

  useEffect(()=>{
    const onPaste=e=>{
      if(isEditableTarget())return;
      const file=[...e.clipboardData.files].find(f=>f.type.startsWith('image/'))||[...e.clipboardData.items].find(i=>i.type.startsWith('image/'))?.getAsFile?.();
      if(file){e.preventDefault();loadFile(file)}
    };
    window.addEventListener('paste',onPaste);return()=>window.removeEventListener('paste',onPaste);
  },[]);

  function droppedFile(dt){
    return [...(dt?.files||[])].find(f=>f.type?.startsWith('image/'))||
      [...(dt?.items||[])].find(i=>i.kind==='file'&&i.type?.startsWith('image/'))?.getAsFile?.()||null;
  }
  function handleDrop(e){
    e.preventDefault();e.stopPropagation();setDragOver(false);
    const file=droppedFile(e.dataTransfer);if(file)loadFile(file);
  }

  function randomFx(){
    const next={
      blend:BLENDS[Math.floor(Math.random()*BLENDS.length)],
      exposure:Math.round(-28+Math.random()*70),
      contrast:Math.round(65+Math.random()*175),
      mono:Math.random()>.55?Math.round(35+Math.random()*65):0,
      invert:Math.random()>.78?Math.round(55+Math.random()*45):0,
      hue:Math.random()>.32?Math.round(-180+Math.random()*360):0,
      posterize:Math.random()>.5?Math.round(3+Math.random()*8):0,
      blur:Math.random()>.72?Math.round(Math.random()*7):0,
      noise:Math.random()>.32?Math.round(8+Math.random()*48):0
    };
    setFx(next);fxCache.current={key:'',canvas:null};
  }

  function randomize(){
    setParams(p=>({
      mode:locks.mode?p.mode:MODES[Math.floor(Math.random()*MODES.length)],
      amount:locks.amount?p.amount:Math.round(28+Math.random()*110),
      scale:locks.scale?p.scale:Math.round(18+Math.random()*62),
      force:locks.force?p.force:Math.round(20+Math.random()*78),
      chaos:locks.chaos?p.chaos:Math.round(8+Math.random()*90)
    }));
    randomFx();
    setPoint({x:.18+Math.random()*.64,y:.14+Math.random()*.72});
    setSeed(Math.floor(Math.random()*1e9));
  }

  function reroll(){setSeed(Math.floor(Math.random()*1e9))}
  function blendMode(v){return ({NORMAL:'source-over',MULTIPLY:'multiply',SCREEN:'screen',DIFFERENCE:'difference',EXCLUSION:'exclusion',OVERLAY:'overlay'})[v]||'source-over'}

  function processedSource(maxSide=900){
    const img=imgRef.current;if(!img)return null;
    const key=[source,maxSide,fx.exposure,fx.contrast,fx.mono,fx.invert,fx.hue,fx.posterize,fx.blur].join(':');
    if(fxCache.current.key===key&&fxCache.current.canvas)return fxCache.current.canvas;

    const iw=img.naturalWidth||1,ih=img.naturalHeight||1,sc=Math.min(1,maxSide/Math.max(iw,ih));
    const w=Math.max(1,Math.round(iw*sc)),h=Math.max(1,Math.round(ih*sc));
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,w,h);
    const im=x.getImageData(0,0,w,h),d=im.data;
    const exp=Math.pow(2,(+fx.exposure||0)/50),contrast=Math.max(0,(Number.isFinite(+fx.contrast)?+fx.contrast:100)/100);
    const gray=clamp((+fx.mono||0)/100,0,1),inv=clamp((+fx.invert||0)/100,0,1);
    const angle=(+fx.hue||0)*Math.PI/180,co=Math.cos(angle),si=Math.sin(angle);
    const m=[
      .213+co*.787-si*.213,.715-co*.715-si*.715,.072-co*.072+si*.928,
      .213-co*.213+si*.143,.715+co*.285+si*.140,.072-co*.072-si*.283,
      .213-co*.213-si*.787,.715-co*.715+si*.715,.072+co*.928+si*.072
    ];
    const rawLevels=Math.round(+fx.posterize||0),levels=rawLevels>0?Math.max(2,rawLevels):0;
    for(let i=0;i<d.length;i+=4){
      let r=d[i]*exp,g=d[i+1]*exp,b=d[i+2]*exp;
      r=(r-128)*contrast+128;g=(g-128)*contrast+128;b=(b-128)*contrast+128;
      const lum=r*.2126+g*.7152+b*.0722;
      r=r*(1-gray)+lum*gray;g=g*(1-gray)+lum*gray;b=b*(1-gray)+lum*gray;
      const hr=r*m[0]+g*m[1]+b*m[2],hg=r*m[3]+g*m[4]+b*m[5],hb=r*m[6]+g*m[7]+b*m[8];
      r=hr*(1-inv)+(255-hr)*inv;g=hg*(1-inv)+(255-hg)*inv;b=hb*(1-inv)+(255-hb)*inv;
      if(levels>=2){const step=255/(levels-1);r=Math.round(r/step)*step;g=Math.round(g/step)*step;b=Math.round(b/step)*step}
      d[i]=clamp(r,0,255);d[i+1]=clamp(g,0,255);d[i+2]=clamp(b,0,255);
    }
    x.putImageData(im,0,0);

    let out=c;const blur=+fx.blur||0;
    if(blur>0){
      const factor=Math.max(.12,1/(1+blur*.42));
      const tiny=document.createElement('canvas');tiny.width=Math.max(2,Math.round(w*factor));tiny.height=Math.max(2,Math.round(h*factor));
      const tx=tiny.getContext('2d');tx.imageSmoothingEnabled=true;tx.imageSmoothingQuality='high';tx.drawImage(c,0,0,tiny.width,tiny.height);
      const soft=document.createElement('canvas');soft.width=w;soft.height=h;const sx=soft.getContext('2d');sx.imageSmoothingEnabled=true;sx.imageSmoothingQuality='high';sx.drawImage(tiny,0,0,w,h);out=soft;
    }
    fxCache.current={key,canvas:out};return out;
  }

  function drawNoise(ctx,w,h,mask){
    const amount=Math.max(0,+fx.noise||0);if(!amount||!mask)return;
    const noise=document.createElement('canvas');noise.width=w;noise.height=h;const nx=noise.getContext('2d');
    const rnd=mulberry32(hashSeed(`${seed}:field-noise:${amount}`)),count=Math.round((w*h/320)*(amount/100));
    for(let i=0;i<count;i++){
      nx.fillStyle=rnd()>.5?'rgba(0,0,0,.28)':'rgba(255,255,255,.30)';
      const s=Math.max(.5,Math.min(w,h)*(.00045+rnd()*.0006));nx.fillRect(rnd()*w,rnd()*h,s,s);
    }
    nx.globalCompositeOperation='destination-in';nx.drawImage(mask,0,0);nx.globalCompositeOperation='source-over';
    ctx.save();ctx.globalCompositeOperation='soft-light';ctx.drawImage(noise,0,0);ctx.restore();
  }

  function render(ctx,w,h,{clean=false,transparent=false}={}){
    ctx.clearRect(0,0,w,h);
    if(!transparent){ctx.fillStyle=bgColor||'#f0ede4';ctx.fillRect(0,0,w,h)}
    const img=imgRef.current;
    if(!img){ctx.fillStyle=transparent?'rgba(255,255,255,.95)':'#111';ctx.textAlign='center';ctx.font=`900 ${Math.max(24,w*.035)}px Arial Black, Arial`;ctx.fillText('DROP / PASTE ONE IMAGE',w/2,h/2-10);return}

    const layer=document.createElement('canvas');layer.width=w;layer.height=h;const lx=layer.getContext('2d');
    const src=processedSource(Math.min(1400,Math.max(w,h)));
    const rnd=mulberry32(hashSeed(`${seed}:${params.mode}:${params.amount}:${params.chaos}`));
    const count=Math.round(params.amount),aspect=w/h,cols=Math.max(3,Math.ceil(Math.sqrt(count*aspect*1.2))),rows=Math.ceil(count/cols);
    const chaos=params.chaos/100,force=params.force/100,baseSize=Math.min(w,h)*(params.scale/100)*.25,ar=(src.width||1)/(src.height||1),px=point.x*w,py=point.y*h;
    const noiseMask=fx.noise>0?document.createElement('canvas'):null,maskCtx=noiseMask?(noiseMask.width=w,noiseMask.height=h,noiseMask.getContext('2d')):null;
    let drawn=0;
    for(let gy=0;gy<rows&&drawn<count;gy++)for(let gx=0;gx<cols&&drawn<count;gx++,drawn++){
      const cellX=(gx+.5)/cols*w,cellY=(gy+.5)/rows*h,jx=(rnd()-.5)*(w/cols)*1.7*chaos,jy=(rnd()-.5)*(h/rows)*1.7*chaos;
      let x=cellX+jx,y=cellY+jy;const dx=(x-px)/w,dy=(y-py)/h,dist=Math.min(1.4,Math.hypot(dx,dy)*1.55),near=1-clamp(dist,0,1);
      let angle=0,localScale=.45+near*1.45*force;
      if(params.mode==='PULL'){angle=Math.atan2(y-py,x-px)+Math.PI/2;x+=(px-x)*near*.18*force;y+=(py-y)*near*.18*force}
      else if(params.mode==='VORTEX'){const a=Math.atan2(y-py,x-px),twist=(1-dist)*Math.PI*1.55*force,rad=Math.hypot(x-px,y-py);x=px+Math.cos(a+twist)*rad;y=py+Math.sin(a+twist)*rad;angle=a+twist+Math.PI/2}
      else{const wave=Math.sin((x/w)*Math.PI*(3+force*7)+seed*.00001);y+=wave*h*.055*force;angle=wave*.75*force;localScale=.55+(wave*.5+.5)*1.15*force}
      angle+=(rnd()-.5)*Math.PI*1.7*chaos;
      const s=baseSize*clamp(localScale*(.78+rnd()*.48*chaos),.18,2.1),iw=ar>=1?s:s*ar,ih=ar>=1?s/ar:s;
      const alpha=clamp(.28+near*.72+(rnd()-.5)*.42*chaos,.08,1);
      lx.save();lx.translate(x,y);lx.rotate(angle);lx.globalAlpha=alpha;lx.globalCompositeOperation=blendMode(fx.blend);lx.drawImage(src,-iw/2,-ih/2,iw,ih);lx.restore();
      if(maskCtx){maskCtx.save();maskCtx.translate(x,y);maskCtx.rotate(angle);maskCtx.globalAlpha=alpha;maskCtx.drawImage(src,-iw/2,-ih/2,iw,ih);maskCtx.restore()}
    }
    drawNoise(lx,w,h,noiseMask);
    ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.drawImage(layer,0,0);ctx.restore();
    if(!clean){ctx.save();ctx.strokeStyle='#ffd800';ctx.lineWidth=Math.max(2,w*.002);ctx.beginPath();ctx.arc(px,py,Math.max(7,w*.008),0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(px-18,py);ctx.lineTo(px+18,py);ctx.moveTo(px,py-18);ctx.lineTo(px,py+18);ctx.stroke();ctx.restore()}
  }

  useEffect(()=>{
    const c=canvasRef.current;if(!c)return;let raf=0;
    const redraw=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const rect=c.getBoundingClientRect();if(rect.width<2||rect.height<2)return;const dpr=Math.min(2,window.devicePixelRatio||1);c.width=Math.max(1,Math.round(rect.width*dpr));c.height=Math.max(1,Math.round(rect.height*dpr));render(c.getContext('2d'),c.width,c.height,{transparent:false})})};
    redraw();const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(redraw):null;ro?.observe(c.parentElement||c);window.addEventListener('resize',redraw);
    return()=>{cancelAnimationFrame(raf);ro?.disconnect();window.removeEventListener('resize',redraw)};
  },[source,params,fx,seed,point,ratio,bgColor]);

  function pointFromEvent(e){const r=canvasRef.current.getBoundingClientRect();setPoint({x:clamp((e.clientX-r.left)/r.width,0,1),y:clamp((e.clientY-r.top)/r.height,0,1)})}
  async function renderBlob({transparent=false}={}){const c=document.createElement('canvas');c.width=doc.w;c.height=doc.h;render(c.getContext('2d'),doc.w,doc.h,{clean:true,transparent});return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('PNG encode failed')),'image/png'))}
  async function exportPng(transparent=false){if(exporting)return;setExporting(true);try{const blob=await renderBlob({transparent});downloadBlob(blob,`1337-field-${transparent?'transparent-':''}${Date.now()}.png`)}catch(err){reportToolError('FIELD export',err)}finally{setExporting(false)}}
  async function sendToEditor(){if(!imgRef.current||exporting)return;setExporting(true);try{const blob=await renderBlob({transparent:false}),file=new File([blob],`FIELD-${Date.now()}.png`,{type:'image/png'});onSendToEditor?.(file,ratio)}catch(err){reportToolError('FIELD → EDITOR',err)}finally{setExporting(false)}}
  async function continueTo(target){if(!imgRef.current||exporting)return;setExporting(true);try{const blob=await renderBlob({transparent:false}),file=new File([blob],`FIELD-${target}-${Date.now()}.png`,{type:'image/png'});onContinue?.('field',target,file,ratio)}catch(err){reportToolError(`FIELD → ${String(target).toUpperCase()}`,err)}finally{setExporting(false)}}

  return <main className="fieldShell fieldShell41">
    <aside className="fieldHud">
      <button type="button" className="toolBrandHome" onClick={onHome} aria-label="Back to 1337tools home"><div className="brand"><span className="brand1337"><span className="brandOneNudge">1</span>337</span><span className="brandTools">tools</span></div></button>
      <button className="wide fieldBack" onClick={onIndex}>← INDEX</button>
      <button className="wide primary fieldHero" onClick={randomize}>RANDOMIZE SYSTEM ↯</button>
      <button className="wide" onClick={reroll}>REROLL SEED</button>

      <MicroHudGroup title="INPUT" storageKey="field-input" defaultOpen><button className="wide" onClick={()=>fileRef.current?.click()}>+ SOURCE IMAGE</button><input ref={fileRef} type="file" hidden accept="image/*" onChange={e=>{loadFile(e.target.files?.[0]);e.target.value=''}}/><div className="note">{sourceName}<br/>drop anywhere / Ctrl/Cmd+V</div></MicroHudGroup>

      <MicroHudGroup title="RULE" storageKey="field-rule" defaultOpen>
        <FieldSelect label="Mode" value={params.mode} locked={locks.mode} onLock={()=>toggleLock('mode')} onChange={v=>setP('mode',v)} options={MODES}/>
        <FieldRange label="Amount" min={12} max={160} value={params.amount} locked={locks.amount} onLock={()=>toggleLock('amount')} onChange={v=>setP('amount',+v)}/>
        <FieldRange label="Scale" min={8} max={100} value={params.scale} locked={locks.scale} onLock={()=>toggleLock('scale')} onChange={v=>setP('scale',+v)}/>
        <FieldRange label="Force" min={0} max={100} value={params.force} locked={locks.force} onLock={()=>toggleLock('force')} onChange={v=>setP('force',+v)}/>
        <FieldRange label="Order ↔ Chaos" min={0} max={100} value={params.chaos} locked={locks.chaos} onLock={()=>toggleLock('chaos')} onChange={v=>setP('chaos',+v)}/>
      </MicroHudGroup>

      <MicroHudGroup title="FX" storageKey="field-fx">
        <div className="two"><button onClick={randomFx}>RANDOM FX</button><button onClick={()=>{setFx(DEFAULT_FX);fxCache.current={key:'',canvas:null}}}>RESET FX</button></div>
        <SimpleSelect label="Blend" value={fx.blend} options={BLENDS} onChange={v=>setFxP('blend',v)}/>
        <SimpleRange label="Exposure" min={-60} max={80} value={fx.exposure} onChange={v=>setFxP('exposure',+v)}/>
        <SimpleRange label="Contrast" min={0} max={240} value={fx.contrast} onChange={v=>setFxP('contrast',+v)}/>
        <SimpleRange label="Mono" min={0} max={100} value={fx.mono} onChange={v=>setFxP('mono',+v)}/>
        <SimpleRange label="Invert" min={0} max={100} value={fx.invert} onChange={v=>setFxP('invert',+v)}/>
        <SimpleRange label="Hue" min={-180} max={180} value={fx.hue} onChange={v=>setFxP('hue',+v)}/>
        <SimpleRange label="Posterize" min={0} max={12} value={fx.posterize} onChange={v=>setFxP('posterize',+v)}/>
        <SimpleRange label="Blur" min={0} max={12} value={fx.blur} onChange={v=>setFxP('blur',+v)}/>
        <SimpleRange label="Noise" min={0} max={100} value={fx.noise} onChange={v=>setFxP('noise',+v)}/>
      </MicroHudGroup>

      <MicroHudGroup title="CANVAS" storageKey="field-canvas">
        <label className="fieldControl"><div className="fieldControlHead"><span>Ratio</span><b>{doc.label}</b></div><select value={ratio} onChange={e=>setRatio(e.target.value)}>{Object.entries(RATIOS).map(([v,d])=><option value={v} key={v}>{d.label}</option>)}</select></label>
        <label className="fieldControl"><div className="fieldControlHead"><span>Background</span><b>{bgColor.toUpperCase()}</b></div><div className="asciiColorRow"><input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)}/><input value={bgColor.toUpperCase()} readOnly aria-label="Field background hex"/></div></label>
        <div className="fieldBgPresets"><button type="button" onClick={()=>setBgColor('#f0ede4')}>PAPER</button><button type="button" onClick={()=>setBgColor('#ffffff')}>WHITE</button><button type="button" onClick={()=>setBgColor('#0038ff')}>BLUE</button><button type="button" onClick={()=>setBgColor('#111111')}>BLACK</button></div>
        <div className="note">{doc.w} × {doc.h}px · PNG α stays transparent.</div>
      </MicroHudGroup>

      <MicroHudGroup title="OUTPUT" storageKey="field-output" accent><button className="wide primary" disabled={!source||exporting} onClick={sendToEditor}>SEND TO EDITOR</button><ContinuePanel current="field" disabled={!source||exporting} onChoose={continueTo}/><div className="two"><button disabled={!source||exporting} onClick={()=>exportPng(false)}>{exporting?'…':'PNG'}</button><button disabled={!source||exporting} onClick={()=>exportPng(true)}>{exporting?'…':'PNG α'}</button></div><div className="note">CONTINUE keeps the selected background. PNG α removes it.</div></MicroHudGroup>
    </aside>

    <section className="fieldWorkspace">
      <header className="fieldTop fieldTop41"><div><button onClick={onIndex}>INDEX</button><span>1337TOOLS / 01 FIELD / {params.mode}</span></div><div><b>{processLabel}</b></div></header>
      <div className={`fieldStage ${dragOver?'fieldDropActive':''}`} onDragEnter={e=>{e.preventDefault();setDragOver(true)}} onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOver(false)}} onDrop={handleDrop}>
        <div className="fieldCanvasWrap" style={{aspectRatio:`${doc.w} / ${doc.h}`}}><canvas ref={canvasRef} className="fieldCanvas fieldCanvasTransparent" onPointerDown={e=>{setDragging(true);e.currentTarget.setPointerCapture?.(e.pointerId);pointFromEvent(e)}} onPointerMove={e=>dragging&&pointFromEvent(e)} onPointerUp={()=>setDragging(false)} onPointerCancel={()=>setDragging(false)}/></div>
      </div>
    </section>
  </main>;
}

function FieldRange({label,value,onChange,locked,onLock,min,max}){return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><button type="button" className={locked?'lockedOn':''} onClick={onLock}>{locked?'LOCKED':'LOCK'}</button></div><RangeInputs min={min} max={max} value={value} onChange={onChange}/></label>}
function FieldSelect({label,value,onChange,locked,onLock,options}){return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><button type="button" className={locked?'lockedOn':''} onClick={onLock}>{locked?'LOCKED':'LOCK'}</button></div><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(v=><option key={v}>{v}</option>)}</select></label>}
function SimpleRange({label,value,onChange,min,max}){return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span></div><RangeInputs min={min} max={max} value={value} onChange={onChange}/></label>}
function SimpleSelect({label,value,onChange,options}){return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><b>{value}</b></div><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(v=><option key={v}>{v}</option>)}</select></label>}
