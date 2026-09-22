'use client';

import {useEffect,useRef,useState} from 'react';
import {clamp} from '../lib/editorCore';

function normalize(value,min,max,step=1){
  const n=Number(value),lo=Number(min),hi=Number(max);if(!Number.isFinite(n)||!Number.isFinite(lo)||!Number.isFinite(hi))return null;
  let out=clamp(n,lo,hi),inc=Number(step);
  if(Number.isFinite(inc)&&inc>0){
    out=lo+Math.round((out-lo)/inc)*inc;
    const decimals=(String(step).split('.')[1]||'').length;
    if(decimals)out=Number(out.toFixed(Math.min(decimals,8)));
    out=clamp(out,lo,hi);
  }
  return out;
}

export default function RangeInputs({value,onChange,min=0,max=100,step=1,rowClass='fieldRangeRow',numberClass='',onBegin,onEnd,onNumberDoubleClick}){
  const [draft,setDraft]=useState(String(value));
  const editing=useRef(false);

  useEffect(()=>{if(!editing.current)setDraft(String(value))},[value]);

  function rangeChange(e){
    const n=normalize(e.target.value,min,max,step);if(n!==null)onChange?.(n);
  }
  function numberChange(e){
    const raw=e.target.value;setDraft(raw);
    if(raw===''||raw==='-'||raw==='.'||raw==='-.')return;
    const n=normalize(raw,min,max,step);if(n!==null)onChange?.(n);
  }
  function focus(){editing.current=true;setDraft(String(value));onBegin?.()}
  function finish(){
    const n=normalize(draft,min,max,step);
    if(n===null)setDraft(String(value));else{onChange?.(n);setDraft(String(n))}
    editing.current=false;onEnd?.();
  }
  function keyDown(e){if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur()}}

  return <div className={rowClass}>
    <input type="range" min={min} max={max} step={step} value={value} onPointerDown={onBegin} onPointerUp={onEnd} onPointerCancel={onEnd} onChange={rangeChange}/>
    <input className={numberClass} type="number" min={min} max={max} step={step} value={editing.current?draft:value} onFocus={focus} onBlur={finish} onKeyDown={keyDown} onDoubleClick={onNumberDoubleClick} onChange={numberChange}/>
  </div>;
}
