'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import FieldTool from './FieldTool';

const MODES=[
  {id:'field',n:'01',name:'FIELD',desc:'one source → spatial system',status:'ACTIVE'},
  {id:'echo',n:'02',name:'ECHO',desc:'one source → repetition / decay / trail',status:'SOON'},
  {id:'type',n:'03',name:'TYPE',desc:'text → mutation / distortion / repetition',status:'SOON'},
  {id:'stamp',n:'04',name:'STAMP',desc:'gesture → procedural marks',status:'SOON'},
];

export default function AppShell(){
  const [screen,setScreen]=useState('entry');
  const [stageOpen,setStageOpen]=useState(false);
  const [stageItems,setStageItems]=useState([]);
  const urls=useRef(new Set());

  useEffect(()=>()=>{for(const u of urls.current)URL.revokeObjectURL(u);urls.current.clear()},[]);

  function addToStage(file){
    if(!file)return;
    const url=URL.createObjectURL(file);urls.current.add(url);
    setStageItems(items=>[...items,{id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`,name:file.name||'OUTPUT',url,opacity:1,blend:'normal'}]);
    setStageOpen(true);
  }
  function removeStage(id){
    setStageItems(items=>{const hit=items.find(x=>x.id===id);if(hit){URL.revokeObjectURL(hit.url);urls.current.delete(hit.url)}return items.filter(x=>x.id!==id)});
  }
  function patchStage(id,p){setStageItems(items=>items.map(x=>x.id===id?{...x,...p}:x))}
  function reorderStage(id,dir){setStageItems(items=>{const n=[...items],i=n.findIndex(x=>x.id===id),j=Math.max(0,Math.min(n.length-1,i+dir));if(i===j)return items;[n[i],n[j]]=[n[j],n[i]];return n})}

  if(screen==='entry')return <EntryScreen onEnter={()=>setScreen('index')}/>;
  if(screen==='index')return <IndexScreen stageCount={stageItems.length} onOpenStage={()=>setStageOpen(true)} onOpenField={()=>setScreen('field')} stageOpen={stageOpen} stageItems={stageItems} onCloseStage={()=>setStageOpen(false)} onRemove={removeStage} onPatch={patchStage} onReorder={reorderStage}/>;
  return <>
    <FieldTool onIndex={()=>setScreen('index')} onOpenStage={()=>setStageOpen(true)} stageCount={stageItems.length} onSendToStage={addToStage}/>
    <StageDrawer open={stageOpen} items={stageItems} onClose={()=>setStageOpen(false)} onRemove={removeStage} onPatch={patchStage} onReorder={reorderStage}/>
  </>;
}

function Brand({small}){return <div className="brand systemBrand"><span className="brand1337">1337</span><span className="brandTools">tools</span>{small&&<small>{small}</small>}</div>}

function EntryScreen({onEnter}){
  return <main className="entryScreen">
    <div className="entryGrid" aria-hidden="true"/>
    <header className="entryMeta"><span>ACCESS / OPEN</span><span>V4.1</span></header>
    <div className="entryCenter">
      <Brand/>
      <p>EXPERIMENTAL IMAGE SYSTEMS</p>
      <button className="entryButton" onClick={onEnter}>ENTER SYSTEM <span>↘</span></button>
    </div>
    <footer className="entryFoot"><span>INPUT → RULE → RANDOM → LOCK → REROLL → OUTPUT</span><span>SESSION / LOCAL</span></footer>
  </main>
}

function IndexScreen({onOpenField,stageCount,onOpenStage,stageOpen,stageItems,onCloseStage,onRemove,onPatch,onReorder}){
  const [hovered,setHovered]=useState('field');
  const active=MODES.find(x=>x.id===hovered)||MODES[0];
  return <main className="indexScreen">
    <header className="systemHeader"><Brand small="SYSTEM INDEX"/><div className="systemHeaderRight"><button onClick={onOpenStage}>STAGE · {String(stageCount).padStart(2,'0')}</button><span>ACCESS / OPEN</span></div></header>
    <section className="indexBody">
      <div className="indexIntro"><p>SELECT A SYSTEM</p><h1>MAKE THE PROCESS<br/>DO THE WORK.</h1><div className="indexManifest">NOT A TEMPLATE LIBRARY.<br/>NOT A PHOTOSHOP CLONE.<br/><b>FEED IT. MUTATE IT. KEEP WHAT HITS.</b></div></div>
      <div className="modeIndex">
        {MODES.map(m=><button key={m.id} className={`modeRow ${m.id===hovered?'hovered':''}`} onMouseEnter={()=>setHovered(m.id)} onFocus={()=>setHovered(m.id)} onClick={()=>m.id==='field'&&onOpenField()} disabled={m.status!=='ACTIVE'}>
          <span className="modeNo">{m.n}</span><strong>{m.name}</strong><em>{m.desc}</em><i>{m.status}</i><b>{m.status==='ACTIVE'?'↗':'—'}</b>
        </button>)}
        <button className="modeRow stageMode" onMouseEnter={()=>setHovered('stage')} onClick={onOpenStage}><span className="modeNo">05</span><strong>STAGE</strong><em>collect / layer / export</em><i>{stageCount?`${stageCount} ITEMS`:'EMPTY'}</i><b>↗</b></button>
      </div>
      <div className="indexPreview" data-mode={active.id}><div className="previewLabel">LIVE SYSTEM / {active.name}</div><div className="previewField"><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="previewCaption"><b>{active.n} / {active.name}</b><span>{active.desc}</span></div></div>
    </section>
    <footer className="indexFooter"><span>1337TOOLS / EXPERIMENTAL GRAPHIC SYSTEMS</span><span>INDEX / 001</span></footer>
    <StageDrawer open={stageOpen} items={stageItems} onClose={onCloseStage} onRemove={onRemove} onPatch={onPatch} onReorder={onReorder}/>
  </main>
}

function StageDrawer({open,items,onClose,onRemove,onPatch,onReorder}){
  const [exporting,setExporting]=useState(false);
  const sorted=useMemo(()=>items,[items]);
  async function exportStage(){
    if(!items.length||exporting)return;setExporting(true);
    try{
      const c=document.createElement('canvas');c.width=1200;c.height=1500;const x=c.getContext('2d');x.fillStyle='#f0ede4';x.fillRect(0,0,c.width,c.height);
      for(const item of items){const img=await loadImg(item.url);x.save();x.globalAlpha=item.opacity;x.globalCompositeOperation=canvasBlend(item.blend);x.drawImage(img,0,0,c.width,c.height);x.restore()}
      const blob=await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('encode failed')),'image/png'));
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`1337-stage-${Date.now()}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
    }finally{setExporting(false)}
  }
  return <div className={`stageOverlay ${open?'open':''}`} aria-hidden={!open}>
    <button className="stageScrim" onClick={onClose} aria-label="Close stage"/>
    <aside className="stageDrawer">
      <header><div><span>05 / STAGE</span><b>{String(items.length).padStart(2,'0')} OUTPUTS</b></div><button onClick={onClose}>CLOSE ×</button></header>
      <div className="stagePreview"><div className="stagePaper">{sorted.map((item,i)=><img key={item.id} src={item.url} alt="" style={{opacity:item.opacity,mixBlendMode:item.blend,zIndex:i+1}}/>) }{!items.length&&<div className="stageEmpty">SEND OUTPUTS<br/>FROM A SYSTEM</div>}</div></div>
      <div className="stageList">{[...items].reverse().map(item=><div className="stageItem" key={item.id}><div className="stageItemHead"><b>{item.name}</b><div><button onClick={()=>onReorder(item.id,1)}>↑</button><button onClick={()=>onReorder(item.id,-1)}>↓</button><button onClick={()=>onRemove(item.id)}>×</button></div></div><label>Opacity <input type="range" min="5" max="100" value={Math.round(item.opacity*100)} onChange={e=>onPatch(item.id,{opacity:+e.target.value/100})}/></label><label>Blend <select value={item.blend} onChange={e=>onPatch(item.id,{blend:e.target.value})}><option>normal</option><option>multiply</option><option>screen</option><option>overlay</option><option>difference</option></select></label></div>)}</div>
      <footer><button className="primary" disabled={!items.length||exporting} onClick={exportStage}>{exporting?'RENDERING…':'EXPORT STAGE'}</button><div>STAGE IS SHARED BY EVERY SYSTEM.</div></footer>
    </aside>
  </div>
}

function canvasBlend(v){return ({normal:'source-over',multiply:'multiply',screen:'screen',overlay:'overlay',difference:'difference'})[v]||'source-over'}
function loadImg(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src})}
