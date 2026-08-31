'use client';
import {useEffect,useState} from 'react';
import FieldTool from './FieldTool';
import CollageEditor from './CollageEditor';

const MODES=[
  {id:'field',n:'01',name:'FIELD'},
  {id:'editor',n:'02',name:'EDITOR'},
];

export default function AppShell(){
  const [screen,setScreen]=useState('entry');
  const [editorFile,setEditorFile]=useState(null);

  useEffect(()=>{
    const prevent=e=>e.preventDefault();
    window.addEventListener('dragover',prevent);
    window.addEventListener('drop',prevent);
    return()=>{window.removeEventListener('dragover',prevent);window.removeEventListener('drop',prevent)};
  },[]);
  function enter(){if(screen==='entry')setScreen('index')}
  function openEditor(file=null){setEditorFile(file);setScreen('editor')}

  if(screen==='entry')return <EntryScreen onEnter={enter}/>;
  if(screen==='index')return <IndexScreen onOpen={setScreen}/>;
  if(screen==='field')return <FieldTool onIndex={()=>setScreen('index')} onSendToEditor={openEditor}/>;
  return <CollageEditor initialFile={editorFile} onIndex={()=>{setEditorFile(null);setScreen('index')}}/>;
}

function Brand(){return <div className="brand systemBrand"><span className="brand1337">1337</span><span className="brandTools">tools</span></div>}

function EntryScreen({onEnter}){
  useEffect(()=>{
    const key=e=>{if(!e.metaKey&&!e.ctrlKey&&!e.altKey)onEnter()};
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[onEnter]);
  return <main className="entryScreen entryMinimal" onPointerDown={onEnter} role="button" tabIndex="0" aria-label="Enter 1337tools">
    <div className="entryMinimalBrand"><Brand/><i aria-hidden="true"/></div>
  </main>
}

function IndexScreen({onOpen}){
  const [hovered,setHovered]=useState('field');
  const active=MODES.find(x=>x.id===hovered)||MODES[0];
  return <main className="indexScreen indexMinimal" data-active={active.id}>
    <header className="minimalHeader"><Brand/><span>4.7</span></header>
    <nav className="minimalModes" aria-label="1337tools">
      {MODES.map(m=><button key={m.id} type="button" className={`minimalMode ${m.id===hovered?'isHovered':''} isActive`} onMouseEnter={()=>setHovered(m.id)} onFocus={()=>setHovered(m.id)} onClick={()=>onOpen(m.id)}>
        <span>{m.n}</span><strong>{m.name}</strong><b>↗</b>
      </button>)}
    </nav>
    <div className="minimalGhost" aria-hidden="true"><span>{active.n}</span><b>{active.name}</b></div>
  </main>
}
