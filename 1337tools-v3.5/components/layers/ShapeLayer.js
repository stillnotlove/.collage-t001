'use client';

export default function ShapeLayer({l}){
  const sw=Math.max(0,+l.strokeWidth||0),fill=l.fill||'#111',stroke=l.stroke||fill;
  const common={fill,stroke,strokeWidth:sw,strokeLinejoin:'round'};
  if(l.shape==='line')return <svg className="shapeSvg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="4" y1="50" x2="96" y2="50" stroke={stroke} strokeWidth={8+sw*2} strokeLinecap={l.lineCap||'round'}/><line x1="4" y1="50" x2="96" y2="50" stroke={fill} strokeWidth="8" strokeLinecap={l.lineCap||'round'}/></svg>;
  if(l.shape==='circle')return <svg className="shapeSvg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="50" cy="50" rx="47" ry="47" {...common}/></svg>;
  if(l.shape==='triangle')return <svg className="shapeSvg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points="50,4 96,96 4,96" {...common}/></svg>;
  if(l.shape==='star')return <svg className="shapeSvg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points="50,2 61,36 97,36 68,57 79,92 50,71 21,92 32,57 3,36 39,36" {...common}/></svg>;
  if(l.shape==='cross')return <svg className="shapeSvg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M36 4H64V36H96V64H64V96H36V64H4V36H36Z" {...common}/></svg>;
  return <svg className="shapeSvg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="4" y="4" width="92" height="92" rx={l.radius||0} {...common}/></svg>;
}
