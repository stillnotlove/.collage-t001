'use client';

// v4.83: catalog labels are static. The entire hover treatment is a single
// lightweight CSS highlight, with no canvas allocation or animation loop.
export default function ModeHoverLabel({label}){
  return <span className="modeFxLabel"><span className="modeFxBase">{label}</span></span>;
}
