'use client';
import {fx0,dotNoiseBackground,scratchBackground} from '../../lib/effects';

export default function ImageLayer({l}){
  const f={...fx0,...l.fx},th=f.threshold/100,filter=`brightness(${1+f.exposure/100}) contrast(${f.contrast/100+th*5+f.xerox/80}) saturate(${f.saturation/100}) grayscale(${Math.max(f.grayscale/100,th,f.xerox/120)}) blur(${f.blur}px)`;
  const maskSize=l.fit==='fill'?'100% 100%':l.fit==='contain'?'contain':'cover',seed=l.fxSeed||l.id;
  const mask={WebkitMaskImage:`url("${l.src}")`,maskImage:`url("${l.src}")`,WebkitMaskRepeat:'no-repeat',maskRepeat:'no-repeat',WebkitMaskPosition:'center',maskPosition:'center',WebkitMaskSize:maskSize,maskSize};
  return <div className="imageFrame" style={{borderRadius:`${l.radius||0}%`}}><img src={l.src} alt={l.name||''} draggable={false} style={{objectFit:l.fit||'cover',filter}}/><div className="fxMask" data-mask-src={l.src} style={mask}>
    {f.grain>0&&<i className="fx grain" style={{opacity:f.grain/150}}/>}
    {f.noise>0&&<i className="fx proceduralFx" style={{opacity:f.noise/105,backgroundImage:dotNoiseBackground(seed,f.noise),mixBlendMode:'soft-light'}}/>}
    {f.scratches>0&&<i className="fx proceduralFx" style={{opacity:f.scratches/105,backgroundImage:scratchBackground(seed,f.scratches),mixBlendMode:'screen'}}/>}
    {f.halftone>0&&<i className="fx halftone" style={{opacity:f.halftone/115}}/>}
    {f.xerox>0&&<i className="fx xerox" style={{opacity:f.xerox/120}}/>}
    {f.fade>0&&<i className="fx fade" style={{opacity:f.fade/180}}/>}
  </div></div>;
}
