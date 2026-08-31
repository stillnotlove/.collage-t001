'use client';
import {useEffect,useRef,useState} from 'react';
import FieldTool from './FieldTool';
import CollageEditor from './CollageEditor';
import TypeTool from './TypeTool';

const MODES=[
  {id:'field',n:'01',name:'FIELD'},
  {id:'editor',n:'02',name:'EDITOR'},
  {id:'type',n:'03',name:'TYPE'},
];

export default function AppShell(){
  const [screen,setScreen]=useState('entry');
  const [entryLeaving,setEntryLeaving]=useState(false);
  const [editorFile,setEditorFile]=useState(null);
  const enterTimer=useRef(null);

  function enter(){
    if(entryLeaving||screen!=='entry')return;
    setEntryLeaving(true);
    enterTimer.current=setTimeout(()=>setScreen('index'),680);
  }
  function openEditor(file=null){setEditorFile(file);setScreen('editor')}

  useEffect(()=>()=>clearTimeout(enterTimer.current),[]);

  if(screen==='entry')return <EntryScreen leaving={entryLeaving} onEnter={enter}/>;
  if(screen==='index')return <IndexScreen onOpen={setScreen}/>;
  if(screen==='field')return <FieldTool onIndex={()=>setScreen('index')} onSendToEditor={openEditor}/>;
  if(screen==='type')return <TypeTool onIndex={()=>setScreen('index')} onSendToEditor={openEditor}/>;
  return <CollageEditor initialFile={editorFile} onIndex={()=>{setEditorFile(null);setScreen('index')}}/>;
}

function Brand(){return <div className="brand systemBrand"><span className="brand1337">1337</span><span className="brandTools">tools</span></div>}

function EntryScreen({onEnter,leaving}){
  useEffect(()=>{
    const key=e=>{if(!e.metaKey&&!e.ctrlKey&&!e.altKey)onEnter()};
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[onEnter]);
  return <main className={`entryScreen entryMinimal ${leaving?'isLeaving':''}`} onPointerDown={onEnter} role="button" tabIndex="0" aria-label="Enter 1337tools">
    <div className="entryMinimalBrand"><Brand/><i aria-hidden="true"/></div>
  </main>
}

function IndexScreen({onOpen}){
  const [hovered,setHovered]=useState('field');
  const active=MODES.find(x=>x.id===hovered)||MODES[0];
  return <main className="indexScreen indexMinimal indexArrive" data-active={active.id}>
    <header className="minimalHeader"><Brand/><span>4.5</span></header>
    <nav className="minimalModes" aria-label="1337tools">
      {MODES.map(m=><button key={m.id} type="button" className={`minimalMode ${m.id===hovered?'isHovered':''} isActive`} onMouseEnter={()=>setHovered(m.id)} onFocus={()=>setHovered(m.id)} onClick={()=>onOpen(m.id)}>
        <span>{m.n}</span><strong>{m.name}</strong><b>↗</b>
      </button>)}
    </nav>
    <div className="minimalGhost" aria-hidden="true"><span>{active.n}</span><b>{active.name}</b></div>
  </main>
}
