'use client';
import {memo} from 'react';

function safeId(id){return String(id).replace(/[^a-zA-Z0-9_-]/g,'')}
function linesFor(l){return String(l.text??'').split('\n')}
function TextLines({l,fill,stroke='none',strokeWidth=0,paintOrder,clipPath}){
  const lines=linesFor(l),fs=Math.max(5,Math.min(88,(+l.fontSize||64)*.5)),lh=fs*(+l.lineHeight||.9),total=(lines.length-1)*lh,start=50-total/2+fs*.33;
  return <text x="50" y={start} textAnchor="middle" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" paintOrder={paintOrder} clipPath={clipPath} style={{fontFamily:l.fontFamily,fontWeight:l.fontWeight,letterSpacing:`${(+l.tracking||0)*.5}px`,whiteSpace:'pre'}} transform={`translate(50 50) scale(${l.scaleX||1} ${l.scaleY||1}) translate(-50 -50)`}>{lines.map((line,i)=><tspan key={i} x="50" dy={i?lh:0}>{line||' '}</tspan>)}</text>;
}

function TextLayer({l}){
  const mode=l.outlineMode||'center',ow=Math.max(0,+l.outline||0)*.65,id=`textclip-${safeId(l.id)}`;
  if(!ow)return <svg className="textSvg" viewBox="0 0 100 100" preserveAspectRatio="none"><TextLines l={l} fill={l.color}/></svg>;
  if(mode==='outside')return <svg className="textSvg" viewBox="0 0 100 100" preserveAspectRatio="none"><TextLines l={l} fill={l.outlineColor} stroke={l.outlineColor} strokeWidth={ow*2} paintOrder="stroke fill"/><TextLines l={l} fill={l.color}/></svg>;
  if(mode==='inside')return <svg className="textSvg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><clipPath id={id}><TextLines l={l} fill="#fff"/></clipPath></defs><TextLines l={l} fill={l.color}/><TextLines l={l} fill="none" stroke={l.outlineColor} strokeWidth={ow*2} clipPath={`url(#${id})`}/></svg>;
  return <svg className="textSvg" viewBox="0 0 100 100" preserveAspectRatio="none"><TextLines l={l} fill={l.color} stroke={l.outlineColor} strokeWidth={ow} paintOrder="stroke fill"/></svg>;
}

export default memo(TextLayer);
