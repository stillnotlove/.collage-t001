'use client';
import {useEffect,useMemo,useState} from 'react';
import FieldTool from './FieldTool';
import SliceTool from './SliceTool';
import AsciiTool from './AsciiTool';
import EchoTool from './EchoTool';
import CollageEditor from './CollageEditor';
import EntryLiveMark from './EntryLiveMark';
import ModeHoverLabel from './ModeHoverLabel';

const MODES=[
  {id:'field',n:'01',name:'FIELD'},
  {id:'slice',n:'02',name:'SLICE'},
  {id:'ascii',n:'03',name:'ASCII'},
  {id:'editor',n:'04',name:'EDITOR'},
  {id:'echo',n:'05',name:'ECHO'},
];
const TOOL_NAMES={field:'FIELD',slice:'SLICE',ascii:'ASCII',editor:'EDITOR',echo:'ECHO'};

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
  function goHome(){setTransfer({file:null,ratio:'4 / 5',token:Date.now()});setTrail([]);resetEditor();setScreen('entry')}
  function resetEditor(){setEditorFile(null);setEditorRatio('4 / 5')}
  function openFromIndex(target){
    setTransfer({file:null,ratio:'4 / 5',token:Date.now()});
    setTrail([TOOL_NAMES[target]||String(target).toUpperCase()]);
    if(target==='editor')resetEditor();
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
  if(screen==='index')return <IndexScreen onOpen={openFromIndex} onHome={goHome} onCredits={()=>setScreen('credits')}/>;
  if(screen==='credits')return <CreditsScreen onBack={()=>setScreen('index')} onHome={goHome}/>;
  if(screen==='field')return <FieldTool onHome={goHome} onIndex={()=>setScreen('index')} onSendToEditor={(f,r)=>openEditor(f,r,[...(trail?.length?trail:['FIELD']),'EDITOR'])} {...shared} {...incoming}/>;
  if(screen==='slice')return <SliceTool onHome={goHome} onIndex={()=>setScreen('index')} onSendToEditor={(f,r)=>openEditor(f,r,[...(trail?.length?trail:['SLICE']),'EDITOR'])} {...shared} {...incoming}/>;
  if(screen==='ascii')return <AsciiTool onHome={goHome} onIndex={()=>setScreen('index')} onSendToEditor={(f,r)=>openEditor(f,r,[...(trail?.length?trail:['ASCII']),'EDITOR'])} {...shared} {...incoming}/>;
  if(screen==='echo')return <EchoTool onHome={goHome} onIndex={()=>setScreen('index')} onSendToEditor={(f,r)=>openEditor(f,r,[...(trail?.length?trail:['ECHO']),'EDITOR'])} {...shared} {...incoming}/>;
  return <CollageEditor initialFile={editorFile} initialRatio={editorRatio} trail={trail} onHome={goHome} onIndex={()=>{resetEditor();setTrail([]);setScreen('index')}}/>;
}

function LogoWord({className=''}){
  return <div className={`brand systemBrand ${className}`}><span className="brand1337"><span className="brandOne">1</span><span className="brand337">337</span></span><span className="brandTools">tools</span></div>;
}
function Brand({onClick}){return onClick?<button type="button" className="brandHome" onClick={onClick} aria-label="Back to 1337tools home"><LogoWord/></button>:<LogoWord/>}

function EntryScreen({onEnter}){
  useEffect(()=>{
    const key=e=>{if(!e.metaKey&&!e.ctrlKey&&!e.altKey)onEnter()};
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[onEnter]);
  return <main className="entryScreen entryMinimal entryLive" onPointerDown={onEnter} role="button" tabIndex="0" aria-label="Enter 1337tools">
    <div className="entryLiveMark"><EntryLiveMark/></div>
  </main>;
}

function IndexScreen({onOpen,onHome,onCredits}){
  const [hovered,setHovered]=useState(null);
  const active=MODES.find(x=>x.id===hovered)||MODES[0];
  return <main className="indexScreen indexMinimal catalogIndex" data-active={active.id}>
    <header className="minimalHeader"><Brand onClick={onHome}/><span>4.31</span></header>
    <section className="toolCatalog" aria-label="1337tools catalog">
      <nav className="minimalModes toolGrid" aria-label="1337tools">
        {MODES.map(m=><button key={m.id} type="button" aria-label={`Open ${m.name}`} className={`minimalMode toolCard ${m.id===hovered?'isHovered':''} isActive`} onMouseEnter={()=>setHovered(m.id)} onFocus={()=>setHovered(m.id)} onMouseLeave={()=>setHovered(null)} onBlur={()=>setHovered(null)} onClick={()=>onOpen(m.id)}>
          <span className="modeNo">{m.n}</span><strong className="modeLabelWrap"><ModeHoverLabel mode={m.id} label={m.name} active={m.id===hovered}/></strong>
        </button>)}
      </nav>
      <footer className="catalogFooter"><button type="button" onClick={onCredits}>CREDITS</button></footer>
    </section>
    <div className="minimalGhost" aria-hidden="true"><span>{active.n}</span><b>{active.name}</b></div>
  </main>;
}


function CreditsScreen({onBack,onHome}){
  return <main className="creditsScreen">
    <header className="creditsHeader"><Brand onClick={onHome}/><button type="button" onClick={onBack}>TOOLS</button></header>
    <section className="creditsCenter">
      <div className="creditsTitle">1337tools <span>by</span> <a href="https://www.instagram.com/stillnotlove?igsi=MWYyZmVxZDVnbHR4aw%3D%3D&utm_source=qr" target="_blank" rel="noreferrer">.stillnotlove</a></div>
      <nav className="creditsLinks" aria-label="stillnotlove links">
        <a href="https://www.instagram.com/stillnotlove?igsi=MWYyZmVxZDVnbHR4aw%3D%3D&utm_source=qr" target="_blank" rel="noreferrer">instagram</a>
        <a href="https://t.me/stillnotlove" target="_blank" rel="noreferrer">telegram</a>
      </nav>
      <div className="creditsStatements">
        <p>all rights fucked.</p>
        <p>design is your privellege.</p>
      </div>
    </section>
  </main>;
}
