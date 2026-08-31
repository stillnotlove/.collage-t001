'use client';

import {useEffect,useRef,useState} from 'react';
import {clamp,fonts,hashSeed,mulberry32} from '../lib/editorCore';

const DEFAULTS={
  mode:'WORD',text:'TYPE',fontFamily:fonts[1][0],fontWeight:800,size:235,tracking:8,
  stretchX:100,stretchY:100,slant:0,baseline:14,rotation:10,chaos:32,copies:1,
  fill:'#111111',outline:'#111111',outlineWidth:0
};

export default function TypeTool({onIndex,onSendToEditor}){
  const [p,setP]=useState(DEFAULTS);
  const [seed,setSeed]=useState(()=>Math.floor(Math.random()*1e9));
  const [exporting,setExporting]=useState(false);
  const canvasRef=useRef(null);

  const patch=(k,v)=>setP(s=>({...s,[k]:v}));

  function reroll(){setSeed(Math.floor(Math.random()*1e9))}
  function randomize(){
    const font=fonts[Math.floor(Math.random()*fonts.length)][0];
    setP(s=>({...s,
      fontFamily:font,
      fontWeight:[300,400,500,600,700,800,900][Math.floor(Math.random()*7)],
      tracking:Math.round(-18+Math.random()*62),
      stretchX:Math.round(45+Math.random()*175),
      stretchY:Math.round(55+Math.random()*150),
      slant:Math.round(-28+Math.random()*56),
      baseline:Math.round(Math.random()*70),
      rotation:Math.round(Math.random()*42),
      chaos:Math.round(12+Math.random()*86),
      copies:s.mode==='GLYPH'?Math.round(1+Math.random()*10):1
    }));
    reroll();
  }

  function render(ctx,w,h,{transparent=false}={}){
    ctx.clearRect(0,0,w,h);
    if(!transparent){ctx.fillStyle='#f0ede4';ctx.fillRect(0,0,w,h)}
    const rnd=mulberry32(hashSeed(`${seed}:${p.mode}:${p.text}:${p.fontFamily}`));
    const chaos=p.chaos/100;
    const text=(p.mode==='GLYPH'?(String(p.text||'A').trim()[0]||'A'):String(p.text||'TYPE'));
    const baseSize=Math.max(20,p.size/1200*w);
    const centerX=w/2,centerY=h/2;
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';

    const paint=(char,x,y,rot,sx,sy,alpha=1)=>{
      ctx.save();ctx.translate(x,y);ctx.rotate(rot*Math.PI/180);ctx.transform(1,0,Math.tan((p.slant||0)*Math.PI/180),1,0,0);ctx.scale(sx,sy);ctx.globalAlpha=alpha;
      ctx.font=`${p.fontWeight} ${baseSize}px ${p.fontFamily}`;
      if(p.outlineWidth>0){ctx.lineWidth=Math.max(1,p.outlineWidth/100*w*.018);ctx.strokeStyle=p.outline;ctx.strokeText(char,0,0)}
      ctx.fillStyle=p.fill;ctx.fillText(char,0,0);ctx.restore();
    };

    if(p.mode==='GLYPH'){
      const count=Math.max(1,p.copies||1),spread=Math.min(w,h)*(.05+.27*chaos);
      for(let i=0;i<count;i++){
        const a=count===1?0:(i/count)*Math.PI*2+(rnd()-.5)*1.2*chaos;
        const r=count===1?0:spread*(.25+rnd()*.85);
        const x=centerX+Math.cos(a)*r+(rnd()-.5)*spread*.5*chaos;
        const y=centerY+Math.sin(a)*r+(rnd()-.5)*spread*.5*chaos;
        const rot=(rnd()-.5)*p.rotation*2;
        const sx=(p.stretchX/100)*(1+(rnd()-.5)*.8*chaos)*(rnd()<.16*chaos?-1:1);
        const sy=(p.stretchY/100)*(1+(rnd()-.5)*.7*chaos);
        paint(text,x,y,rot,sx,sy,clamp(.42+rnd()*.72,.15,1));
      }
      return;
    }

    const chars=[...text];
    ctx.font=`${p.fontWeight} ${baseSize}px ${p.fontFamily}`;
    const widths=chars.map(ch=>ctx.measureText(ch||' ').width);
    const trackingPx=p.tracking/1200*w;
    const total=widths.reduce((a,b)=>a+b,0)+Math.max(0,chars.length-1)*trackingPx;
    let cursor=centerX-total/2;
    chars.forEach((ch,i)=>{
      const cw=widths[i],x=cursor+cw/2;
      const wave=Math.sin((i/(Math.max(1,chars.length-1)))*Math.PI*2+seed*.00001);
      const y=centerY+wave*(p.baseline/100)*h*.08+(rnd()-.5)*(p.baseline/100)*h*.12*chaos;
      const rot=wave*p.rotation*.35+(rnd()-.5)*p.rotation*2*chaos;
      const sx=(p.stretchX/100)*(1+(rnd()-.5)*.65*chaos);
      const sy=(p.stretchY/100)*(1+(rnd()-.5)*.55*chaos);
      paint(ch,x,y,rot,sx,sy,1);
      cursor+=cw+trackingPx;
    });
  }

  useEffect(()=>{
    let cancelled=false;
    const draw=async()=>{
      if(document.fonts){try{await document.fonts.ready}catch{}}
      if(cancelled)return;
      const c=canvasRef.current;if(!c)return;const r=c.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
      c.width=Math.max(1,Math.round(r.width*dpr));c.height=Math.max(1,Math.round(r.height*dpr));render(c.getContext('2d'),c.width,c.height);
    };
    draw();return()=>{cancelled=true};
  },[p,seed]);

  async function renderBlob(){
    const c=document.createElement('canvas');c.width=1200;c.height=1500;render(c.getContext('2d'),1200,1500,{transparent:true});
    return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('PNG encode failed')),'image/png'));
  }
  async function exportPng(){
    if(exporting)return;setExporting(true);try{const blob=await renderBlob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`1337-type-${Date.now()}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200)}finally{setExporting(false)}
  }
  async function sendToEditor(){
    if(exporting)return;setExporting(true);try{const blob=await renderBlob();onSendToEditor?.(new File([blob],`TYPE-${Date.now()}.png`,{type:'image/png'}))}finally{setExporting(false)}
  }

  return <main className="typeShell">
    <aside className="typeHud">
      <div className="brand"><span className="brand1337">1337</span><span className="brandTools">tools</span><small>4.4 / 03 TYPE</small></div>
      <button className="wide fieldBack" onClick={onIndex}>← INDEX</button>
      <button className="wide primary typeHero" onClick={randomize}>RANDOMIZE LETTERS ↯</button>
      <button className="wide" onClick={reroll}>REROLL SEED</button>

      <section><div className="title">MODE</div><div className="typeMode"><button className={p.mode==='WORD'?'active':''} onClick={()=>patch('mode','WORD')}>WORD</button><button className={p.mode==='GLYPH'?'active':''} onClick={()=>patch('mode','GLYPH')}>GLYPH</button></div></section>
      <section><div className="title">SOURCE</div><label>Text<input value={p.text} maxLength={p.mode==='GLYPH'?4:40} onChange={e=>patch('text',e.target.value)}/></label><label>Font<select value={p.fontFamily} onChange={e=>patch('fontFamily',e.target.value)}>{fonts.map(([v,n])=><option key={n} value={v}>{n}</option>)}</select></label><TypeRange label="Weight" min={100} max={900} step={100} value={p.fontWeight} onChange={v=>patch('fontWeight',+v)}/><TypeRange label="Size" min={80} max={520} value={p.size} onChange={v=>patch('size',+v)}/></section>
      <section><div className="title">MUTATE</div><TypeRange label="Tracking" min={-80} max={140} value={p.tracking} onChange={v=>patch('tracking',+v)}/><TypeRange label="Width" min={25} max={260} value={p.stretchX} onChange={v=>patch('stretchX',+v)}/><TypeRange label="Height" min={25} max={260} value={p.stretchY} onChange={v=>patch('stretchY',+v)}/><TypeRange label="Slant" min={-45} max={45} value={p.slant} onChange={v=>patch('slant',+v)}/><TypeRange label="Baseline" min={0} max={100} value={p.baseline} onChange={v=>patch('baseline',+v)}/><TypeRange label="Rotation" min={0} max={90} value={p.rotation} onChange={v=>patch('rotation',+v)}/><TypeRange label="Order ↔ Chaos" min={0} max={100} value={p.chaos} onChange={v=>patch('chaos',+v)}/>{p.mode==='GLYPH'&&<TypeRange label="Copies" min={1} max={16} value={p.copies} onChange={v=>patch('copies',+v)}/>}</section>
      <section><div className="title">INK</div><div className="two"><label>Fill<input type="color" value={p.fill} onChange={e=>patch('fill',e.target.value)}/></label><label>Outline<input type="color" value={p.outline} onChange={e=>patch('outline',e.target.value)}/></label></div><TypeRange label="Outline" min={0} max={40} value={p.outlineWidth} onChange={v=>patch('outlineWidth',+v)}/></section>
      <section><div className="title">OUTPUT</div><button className="wide primary" disabled={exporting} onClick={sendToEditor}>SEND TO EDITOR</button><button className="wide" disabled={exporting} onClick={exportPng}>{exporting?'RENDERING…':'EXPORT PNG'}</button></section>
    </aside>
    <section className="typeWorkspace"><header className="fieldTop fieldTop41"><div><button onClick={onIndex}>INDEX</button><span>1337TOOLS / 03 TYPE / {p.mode}</span></div><b>{p.mode==='WORD'?'WORD MUTATION':'GLYPH MUTATION'}</b></header><div className="typeStage"><div className="typeCanvasWrap"><canvas ref={canvasRef} className="typeCanvas"/></div></div></section>
  </main>;
}

function TypeRange({label,value,onChange,min,max,step=1}){return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><b>{value}</b></div><div className="fieldRangeRow"><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(e.target.value)}/><input type="number" min={min} max={max} step={step} value={value} onChange={e=>onChange(e.target.value)}/></div></label>}
