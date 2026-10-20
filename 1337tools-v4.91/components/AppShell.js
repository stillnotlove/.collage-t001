'use client';
import {useEffect,useMemo,useState} from 'react';
import { track } from '@vercel/analytics';
import FieldTool from './FieldTool';
import SliceTool from './SliceTool';
import AsciiTool from './AsciiTool';
import EchoTool from './EchoTool';
import ScanTool from './ScanTool';
import GlassTool from './GlassTool';
import CollageEditor from './CollageEditor';
import EntryLiveMark from './EntryLiveMark';
import ModeHoverLabel from './ModeHoverLabel';

const MODES=[
  {id:'field',n:'01',name:'FIELD',meta:'image scattering / magnetic layout'},
  {id:'slice',n:'02',name:'SLICE',meta:'horizontal fracture / poster cut'},
  {id:'ascii',n:'03',name:'ASCII',meta:'glyph rendering / braille / blocks'},
  {id:'editor',n:'04',name:'EDITOR',meta:'collage editing / layers / stamps'},
  {id:'glass',n:'05',name:'GLASS',meta:'optical refraction / interactive lenses'},
  {id:'echo',n:'06',name:'ECHO',meta:'trails / repetition / remove bg'},
  {id:'scan',n:'07',name:'SCAN',meta:'interactive scanning / drag distortion'},
];
const TOOL_NAMES={field:'FIELD',slice:'SLICE',ascii:'ASCII',editor:'EDITOR',echo:'ECHO',scan:'SCAN',glass:'GLASS'};

export default function AppShell(){
  const [screen,setScreen]=useState('entry');
  const [indexOrigin,setIndexOrigin]=useState('tool');
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

  useEffect(()=>{
    const tool=TOOL_NAMES[screen];
    if(!tool)return;
    track('tool_open',{tool});
  },[screen]);

  function enter(){if(screen==='entry'){setIndexOrigin('entry');setScreen('index')}}
  function showIndex(){setIndexOrigin('tool');setScreen('index')}
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
  if(screen==='index')return <IndexScreen onOpen={openFromIndex} onHome={goHome} onCredits={()=>setScreen('credits')} fromEntry={indexOrigin==='entry'}/>;
  if(screen==='credits')return <CreditsScreen onBack={showIndex} onHome={goHome}/>;
  if(screen==='field')return <FieldTool onHome={goHome} onIndex={showIndex} onSendToEditor={(f,r)=>openEditor(f,r,[...(trail?.length?trail:['FIELD']),'EDITOR'])} {...shared} {...incoming}/>;
  if(screen==='slice')return <SliceTool onHome={goHome} onIndex={showIndex} onSendToEditor={(f,r)=>openEditor(f,r,[...(trail?.length?trail:['SLICE']),'EDITOR'])} {...shared} {...incoming}/>;
  if(screen==='ascii')return <AsciiTool onHome={goHome} onIndex={showIndex} onSendToEditor={(f,r)=>openEditor(f,r,[...(trail?.length?trail:['ASCII']),'EDITOR'])} {...shared} {...incoming}/>;
  if(screen==='scan')return <ScanTool onHome={goHome} onIndex={showIndex} onSendToEditor={(f,r)=>openEditor(f,r,[...(trail?.length?trail:['SCAN']),'EDITOR'])} {...shared} {...incoming}/>;
  if(screen==='glass')return <GlassTool onHome={goHome} onIndex={showIndex} onSendToEditor={(f,r)=>openEditor(f,r,[...(trail?.length?trail:['GLASS']),'EDITOR'])} {...shared} {...incoming}/>;
  if(screen==='echo')return <EchoTool onHome={goHome} onIndex={showIndex} onSendToEditor={(f,r)=>openEditor(f,r,[...(trail?.length?trail:['ECHO']),'EDITOR'])} {...shared} {...incoming}/>;
  return <CollageEditor initialFile={editorFile} initialRatio={editorRatio} trail={trail} onHome={goHome} onIndex={()=>{resetEditor();setTrail([]);showIndex()}}/>;
}

function LogoWord({className=''}){
  return <div className={`brand systemBrand ${className}`}><span className="brand1337"><span className="brandOneNudge">1</span>337</span><span className="brandTools">tools</span></div>;
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

function IndexScreen({onOpen,onHome,onCredits,fromEntry=false}){
  const [hovered,setHovered]=useState(null);
  const active=MODES.find(m=>m.id===hovered)||MODES[0];
  return <main className="indexScreen indexMinimal catalogIndex" data-active={active.id}>
    <header className="minimalHeader"><Brand onClick={onHome}/><span>4.91</span></header>
    {fromEntry?<div className="indexEntryCurtain" aria-hidden="true"><div className="entryLiveMark"><EntryLiveMark/></div></div>:null}
    <div className="catalogAtmosphere" aria-hidden="true">
      <i className="atmoSheet atmoSheetA"/>
      <i className="atmoSheet atmoSheetB"/>
      <i className="atmoLoop"/>
      <i className="atmoRail atmoRailA"/>
      <i className="atmoRail atmoRailB"/>
    </div>
    <section className="toolCatalog" aria-label="1337tools catalog">
      <div className="catalogPrelude" aria-hidden="true">
        <span>visual processing system</span>
      </div>
      <nav className="minimalModes toolGrid" aria-label="1337tools" onMouseLeave={()=>setHovered(null)} onWheelCapture={()=>setHovered(null)}>
        {MODES.map(m=><button key={m.id} type="button" data-mode={m.id} aria-label={`Open ${m.name}`} className="minimalMode toolCard isActive" onMouseEnter={()=>setHovered(m.id)} onFocus={()=>setHovered(m.id)} onBlur={()=>setHovered(null)} onClick={()=>onOpen(m.id)}>
          <span className="modeNo">{m.n}</span>
          <small className="modeMeta">{m.meta}</small>
          <strong className="modeLabelWrap"><ModeHoverLabel label={m.name}/></strong>
        </button>)}
      </nav>
      <footer className="catalogFooter"><button type="button" onClick={onCredits}>CREDITS ↗</button></footer>
    </section>
    <div className="minimalGhost" aria-hidden="true"><span>{active.n}</span><b>{active.name}</b><i>{active.meta}</i></div>
  </main>;
}


function CreditsScreen({onBack,onHome}){
  return <main className="creditsScreen">
    <header className="creditsHeader"><Brand onClick={onHome}/><button type="button" onClick={onBack}>TOOLS</button></header>
    <section className="creditsCenter">
      <div className="creditsTitle"><span className="creditsWordmark"><b className="credits1337"><span className="creditsOneNudge">1</span>337</b><i className="creditsTools">tools</i></span> <span className="creditsBy">by</span> <a href="https://www.instagram.com/stillnotlove?igsi=MWYyZmVxZDVnbHR4aw%3D%3D&utm_source=qr" target="_blank" rel="noreferrer">.stillnotlove</a></div>
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
