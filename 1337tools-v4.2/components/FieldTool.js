'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {clamp,hashSeed,mulberry32} from '../lib/editorCore';

const MODES=['PULL','VORTEX','WAVE'];
const DEFAULTS={mode:'VORTEX',amount:72,scale:42,force:64,chaos:38};

export default function FieldTool({onIndex,onOpenStage,stageCount=0,onSendToStage}){
  const [source,setSource]=useState(null);
  const [sourceName,setSourceName]=useState('NO SOURCE');
  const [params,setParams]=useState(DEFAULTS);
  const [locks,setLocks]=useState({amount:false,scale:false,force:false,chaos:false,mode:false});
  const [seed,setSeed]=useState(()=>Math.floor(Math.random()*1e9));
  const [point,setPoint]=useState({x:.5,y:.5});
  const [dragging,setDragging]=useState(false);
  const [exporting,setExporting]=useState(false);
  const canvasRef=useRef(null),fileRef=useRef(null),imgRef=useRef(null),urlRef=useRef(null);

  const doc=useMemo(()=>({w:1200,h:1500}),[]);

  function setP(key,value){setParams(p=>({...p,[key]:value}))}
  function toggleLock(key){setLocks(l=>({...l,[key]:!l[key]}))}

  async function loadFile(file){
    if(!file||!file.type?.startsWith('image/'))return;
    if(urlRef.current)URL.revokeObjectURL(urlRef.current);
    const url=URL.createObjectURL(file);urlRef.current=url;
    const img=new Image();
    img.onload=()=>{imgRef.current=img;setSource(url);setSourceName(file.name||'PASTED IMAGE')};
    img.src=url;
  }

  useEffect(()=>()=>{if(urlRef.current)URL.revokeObjectURL(urlRef.current)},[]);

  useEffect(()=>{
    const onPaste=e=>{
      const tag=document.activeElement?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;
      const file=[...e.clipboardData.files].find(f=>f.type.startsWith('image/'))||[...e.clipboardData.items].find(i=>i.type.startsWith('image/'))?.getAsFile?.();
      if(file){e.preventDefault();loadFile(file)}
    };
    window.addEventListener('paste',onPaste);return()=>window.removeEventListener('paste',onPaste);
  },[]);

  function randomize(){
    setParams(p=>({
      mode:locks.mode?p.mode:MODES[Math.floor(Math.random()*MODES.length)],
      amount:locks.amount?p.amount:Math.round(28+Math.random()*110),
      scale:locks.scale?p.scale:Math.round(18+Math.random()*62),
      force:locks.force?p.force:Math.round(20+Math.random()*78),
      chaos:locks.chaos?p.chaos:Math.round(8+Math.random()*90)
    }));
    setPoint({x:.18+Math.random()*.64,y:.14+Math.random()*.72});
    setSeed(Math.floor(Math.random()*1e9));
  }

  function reroll(){setSeed(Math.floor(Math.random()*1e9))}

  function render(ctx,w,h,{clean=false,transparent=false}={}){
    ctx.clearRect(0,0,w,h);if(!transparent){ctx.fillStyle='#f0ede4';ctx.fillRect(0,0,w,h);}
    const img=imgRef.current;
    if(!img){
      ctx.fillStyle='#111';ctx.textAlign='center';ctx.font=`900 ${Math.max(24,w*.035)}px Arial Black, Arial`;
      ctx.fillText('DROP / PASTE ONE IMAGE',w/2,h/2-10);
      ctx.font=`400 ${Math.max(12,w*.014)}px Arial`;
      ctx.fillText('FIELD turns one source into a system.',w/2,h/2+28);
      return;
    }
    const rnd=mulberry32(hashSeed(`${seed}:${params.mode}:${params.amount}:${params.chaos}`));
    const count=Math.round(params.amount),aspect=w/h;
    const cols=Math.max(3,Math.ceil(Math.sqrt(count*aspect*1.2))),rows=Math.ceil(count/cols);
    const chaos=params.chaos/100,force=params.force/100;
    const baseSize=Math.min(w,h)*(params.scale/100)*.25;
    const ar=(img.naturalWidth||1)/(img.naturalHeight||1);
    const px=point.x*w,py=point.y*h;
    let drawn=0;
    for(let gy=0;gy<rows&&drawn<count;gy++){
      for(let gx=0;gx<cols&&drawn<count;gx++,drawn++){
        const cellX=(gx+.5)/cols*w,cellY=(gy+.5)/rows*h;
        const jx=(rnd()-.5)*(w/cols)*1.7*chaos,jy=(rnd()-.5)*(h/rows)*1.7*chaos;
        let x=cellX+jx,y=cellY+jy;
        const dx=(x-px)/w,dy=(y-py)/h,dist=Math.min(1.4,Math.hypot(dx,dy)*1.55),near=1-clamp(dist,0,1);
        let angle=0,localScale=.45+near*1.45*force;
        if(params.mode==='PULL'){
          angle=Math.atan2(y-py,x-px)+Math.PI/2;
          x+=(px-x)*near*.18*force;y+=(py-y)*near*.18*force;
        }else if(params.mode==='VORTEX'){
          const a=Math.atan2(y-py,x-px),twist=(1-dist)*Math.PI*1.55*force;
          const rad=Math.hypot(x-px,y-py);x=px+Math.cos(a+twist)*rad;y=py+Math.sin(a+twist)*rad;angle=a+twist+Math.PI/2;
        }else{
          const wave=Math.sin((x/w)*Math.PI*(3+force*7)+seed*.00001);y+=wave*h*.055*force;angle=wave*.75*force;
          localScale=.55+(wave*.5+.5)*1.15*force;
        }
        angle+=(rnd()-.5)*Math.PI*1.7*chaos;
        const s=baseSize*clamp(localScale*(.78+rnd()*.48*chaos),.18,2.1);
        const iw=ar>=1?s:s*ar,ih=ar>=1?s/ar:s;
        ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=clamp(.28+near*.72+(rnd()-.5)*.42*chaos,.08,1);
        ctx.drawImage(img,-iw/2,-ih/2,iw,ih);ctx.restore();
      }
    }
    if(!clean){
      ctx.save();ctx.strokeStyle='#ffd800';ctx.fillStyle='#ffd800';ctx.lineWidth=Math.max(2,w*.002);ctx.beginPath();ctx.arc(px,py,Math.max(7,w*.008),0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(px-18,py);ctx.lineTo(px+18,py);ctx.moveTo(px,py-18);ctx.lineTo(px,py+18);ctx.stroke();ctx.restore();
    }
  }

  useEffect(()=>{
    const c=canvasRef.current;if(!c)return;const rect=c.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);c.width=Math.max(1,Math.round(rect.width*dpr));c.height=Math.max(1,Math.round(rect.height*dpr));const ctx=c.getContext('2d');render(ctx,c.width,c.height);
  },[source,params,seed,point]);

  function pointFromEvent(e){
    const r=canvasRef.current.getBoundingClientRect();setPoint({x:clamp((e.clientX-r.left)/r.width,0,1),y:clamp((e.clientY-r.top)/r.height,0,1)});
  }

  async function renderBlob({transparent=false}={}){
    const c=document.createElement('canvas');c.width=doc.w;c.height=doc.h;const ctx=c.getContext('2d');render(ctx,doc.w,doc.h,{clean:true,transparent});
    return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('PNG encode failed')),'image/png'));
  }

  async function exportPng(){
    if(exporting)return;setExporting(true);try{const blob=await renderBlob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`1337-field-${Date.now()}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}finally{setExporting(false)}
  }

  async function sendToStage(){
    if(!imgRef.current)return;setExporting(true);try{const blob=await renderBlob({transparent:true});const file=new File([blob],`FIELD-${Date.now()}.png`,{type:'image/png'});onSendToStage?.(file)}finally{setExporting(false)}
  }

  return <main className="fieldShell fieldShell41">
    <aside className="fieldHud">
      <div className="brand"><span className="brand1337">1337</span><span className="brandTools">tools</span><small>4.2 / 01 FIELD</small></div>
      <button className="wide fieldBack" onClick={onIndex}>← SYSTEM INDEX</button>

      <div className="fieldStatement">ONE SOURCE.<br/>ONE RULE.<br/><b>KEEP REROLLING.</b></div>

      <button className="wide primary fieldHero" onClick={randomize}>RANDOMIZE SYSTEM ↯</button>
      <button className="wide" onClick={reroll}>REROLL SEED</button>

      <section><div className="title">INPUT</div><button className="wide" onClick={()=>fileRef.current?.click()}>+ SOURCE IMAGE</button><input ref={fileRef} type="file" hidden accept="image/*" onChange={e=>{loadFile(e.target.files?.[0]);e.target.value=''}}/><div className="note">{sourceName}<br/>or paste with Ctrl/Cmd+V</div></section>

      <section><div className="title">RULE</div>
        <FieldSelect label="Mode" value={params.mode} locked={locks.mode} onLock={()=>toggleLock('mode')} onChange={v=>setP('mode',v)} options={MODES}/>
        <FieldRange label="Amount" min={12} max={160} value={params.amount} locked={locks.amount} onLock={()=>toggleLock('amount')} onChange={v=>setP('amount',+v)}/>
        <FieldRange label="Scale" min={8} max={100} value={params.scale} locked={locks.scale} onLock={()=>toggleLock('scale')} onChange={v=>setP('scale',+v)}/>
        <FieldRange label="Force" min={0} max={100} value={params.force} locked={locks.force} onLock={()=>toggleLock('force')} onChange={v=>setP('force',+v)}/>
        <FieldRange label="Order ↔ Chaos" min={0} max={100} value={params.chaos} locked={locks.chaos} onLock={()=>toggleLock('chaos')} onChange={v=>setP('chaos',+v)}/>
      </section>

      <section><div className="title">OUTPUT</div><button className="wide primary" disabled={!source||exporting} onClick={sendToStage}>SEND TO STAGE · {String(stageCount).padStart(2,'0')}</button><button className="wide" disabled={!source||exporting} onClick={exportPng}>{exporting?'RENDERING…':'EXPORT PNG'}</button></section>
    </aside>

    <section className="fieldWorkspace">
      <header className="fieldTop fieldTop41"><div><button onClick={onIndex}>INDEX</button><span>1337TOOLS / 01 FIELD / {params.mode}</span></div><div><b>DRAG THE YELLOW POINT</b><button onClick={onOpenStage}>STAGE · {String(stageCount).padStart(2,'0')}</button></div></header>
      <div className="fieldStage">
        <div className="fieldCanvasWrap">
          <canvas ref={canvasRef} className="fieldCanvas" onPointerDown={e=>{setDragging(true);e.currentTarget.setPointerCapture?.(e.pointerId);pointFromEvent(e)}} onPointerMove={e=>dragging&&pointFromEvent(e)} onPointerUp={()=>setDragging(false)} onPointerCancel={()=>setDragging(false)}/>
        </div>
      </div>
    </section>
  </main>;
}

function FieldRange({label,value,onChange,locked,onLock,min,max}){
  return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><button type="button" className={locked?'lockedOn':''} onClick={onLock}>{locked?'LOCKED':'LOCK'}</button></div><div className="fieldRangeRow"><input type="range" min={min} max={max} value={value} onChange={e=>onChange(e.target.value)}/><input type="number" min={min} max={max} value={value} onChange={e=>onChange(e.target.value)}/></div></label>
}
function FieldSelect({label,value,onChange,locked,onLock,options}){
  return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><button type="button" className={locked?'lockedOn':''} onClick={onLock}>{locked?'LOCKED':'LOCK'}</button></div><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(v=><option key={v}>{v}</option>)}</select></label>
}
