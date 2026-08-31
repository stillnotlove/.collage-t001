'use client';
import {useEffect,useMemo,useState} from 'react';
import FieldTool from './FieldTool';
import SliceTool from './SliceTool';
import AsciiTool from './AsciiTool';
import CollageEditor from './CollageEditor';

const MODES=[
  {id:'field',n:'01',name:'FIELD'},
  {id:'slice',n:'02',name:'SLICE'},
  {id:'ascii',n:'03',name:'ASCII'},
  {id:'editor',n:'04',name:'EDITOR'},
];
const TOOL_NAMES={field:'FIELD',slice:'SLICE',ascii:'ASCII',editor:'EDITOR'};

export default function AppShell(){
  const [screen,setScreen]=useState('entry');
  const [editorFile,setEditorFile]=useState(null);
  const [editorRatio,setEditorRatio]=useState('4 / 5');
  const [transfer,setTransfer]=useState({file:null,ratio:'4 / 5',token:0});
  const [trail,setTrail]=useState([]);

  useEffect(()=>{
    const prevent=e=>e.preventDefault();
    window.addEventListener('dragover',prevent);
    window.addEventListener('drop',prevent);
    return()=>{window.removeEventListener('dragover',prevent);window.removeEventListener('drop',prevent)};
  },[]);

  function enter(){if(screen==='entry')setScreen('index')}
  function resetEditor(){setEditorFile(null);setEditorRatio('4 / 5')}
  function openFromIndex(target){
    setTransfer({file:null,ratio:'4 / 5',token:Date.now()});
    setTrail([TOOL_NAMES[target]||String(target).toUpperCase()]);
    if(target==='editor'){resetEditor()}
    setScreen(target);
  }
  function openEditor(file=null,ratio='4 / 5',nextTrail=null){
    setEditorFile(file);setEditorRatio(ratio||'4 / 5');
    if(nextTrail?.length)setTrail(nextTrail);
    else setTrail(t=>t?.length?t:['EDITOR']);
    setScreen('editor');
  }
  function handleContinue(from,target,file=null,ratio='4 / 5'){
    const nextTrail=[...(trail?.length?trail:[TOOL_NAMES[from]||String(from).toUpperCase()]),TOOL_NAMES[target]||String(target).toUpperCase()];
    if(target==='editor'){openEditor(file,ratio,nextTrail);return}
    setTransfer({file,ratio:ratio||'4 / 5',token:Date.now()});
    setTrail(nextTrail);
    setScreen(target);
  }
  const shared={trail,onContinue:handleContinue};
  const incoming=useMemo(()=>({initialFile:transfer.file,initialRatio:transfer.ratio,initialToken:transfer.token}),[transfer]);

  if(screen==='entry')return <EntryScreen onEnter={enter}/>;
  if(screen==='index')return <IndexScreen onOpen={openFromIndex}/>;
  if(screen==='field')return <FieldTool onIndex={()=>setScreen('index')} onSendToEditor={(f,r)=>openEditor(f,r,[...(trail?.length?trail:['FIELD']),'EDITOR'])} {...shared} {...incoming}/>;
  if(screen==='slice')return <SliceTool onIndex={()=>setScreen('index')} onSendToEditor={(f,r)=>openEditor(f,r,[...(trail?.length?trail:['SLICE']),'EDITOR'])} {...shared} {...incoming}/>;
  if(screen==='ascii')return <AsciiTool onIndex={()=>setScreen('index')} onSendToEditor={(f,r)=>openEditor(f,r,[...(trail?.length?trail:['ASCII']),'EDITOR'])} {...shared} {...incoming}/>;
  return <CollageEditor initialFile={editorFile} initialRatio={editorRatio} onIndex={()=>{resetEditor();setTrail([]);setScreen('index')}}/>;
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
    <header className="minimalHeader"><Brand/><span>4.15</span></header>
    <nav className="minimalModes" aria-label="1337tools">
      {MODES.map(m=><button key={m.id} type="button" className={`minimalMode ${m.id===hovered?'isHovered':''} isActive`} onMouseEnter={()=>setHovered(m.id)} onFocus={()=>setHovered(m.id)} onClick={()=>onOpen(m.id)}>
        <span>{m.n}</span><strong>{m.name}</strong><b>↗</b>
      </button>)}
    </nav>
    <div className="minimalGhost" aria-hidden="true"><span>{active.n}</span><b>{active.name}</b></div>
  </main>
}
