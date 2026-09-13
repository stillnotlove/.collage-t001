'use client';

import {useEffect,useRef,useState} from 'react';

const OPTIONS=[
  {id:'field',label:'TO FIELD'},
  {id:'slice',label:'TO SLICE'},
  {id:'ascii',label:'TO ASCII'},
  {id:'editor',label:'TO EDITOR'},
  {id:'echo',label:'TO ECHO'},
];

export default function ContinuePanel({current,onChoose,disabled,label='CONTINUE'}){
  const [open,setOpen]=useState(false);
  const ref=useRef(null);

  useEffect(()=>{
    const onDown=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};
    const onKey=e=>{if(e.key==='Escape')setOpen(false)};
    window.addEventListener('pointerdown',onDown);
    window.addEventListener('keydown',onKey);
    return ()=>{window.removeEventListener('pointerdown',onDown);window.removeEventListener('keydown',onKey)};
  },[]);

  return <div className={`continuePanel ${open?'isOpen':''}`} ref={ref}>
    <button type="button" className="wide continueToggle" disabled={disabled} onClick={()=>setOpen(v=>!v)}>{label}</button>
    {open?<div className="continueMenu">
      {OPTIONS.filter(o=>o.id!==current).map(o=><button key={o.id} type="button" onClick={()=>{setOpen(false);onChoose?.(o.id)}}>{o.label}</button>)}
    </div>:null}
  </div>;
}
