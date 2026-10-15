'use client';

import {useEffect,useState} from 'react';

export default function MicroHudGroup({title,children,storageKey,defaultOpen=false,accent=false}){
  const key=`1337tools:microhud:${storageKey||String(title).toLowerCase()}`;
  const [open,setOpen]=useState(defaultOpen);
  useEffect(()=>{try{const saved=localStorage.getItem(key);if(saved!==null)setOpen(saved==='1')}catch{}},[key]);
  function toggle(){setOpen(v=>{const next=!v;try{localStorage.setItem(key,next?'1':'0')}catch{}return next})}
  return <section className={`microHudGroup ${open?'open':''} ${accent?'accent':''}`}>
    <button type="button" className="microHudToggle" onClick={toggle} aria-expanded={open}><span>{title}</span><i>{open?'−':'+'}</i></button>
    <div className="microHudClip" aria-hidden={!open}><div className="microHudInner">{children}</div></div>
  </section>;
}
