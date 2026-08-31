'use client';

import {useEffect,useRef,useState} from 'react';
import {clamp,fonts,hashSeed,mulberry32} from '../lib/editorCore';

const DEFAULTS={
  mode:'WORD',text:'TYPE',fontFamily:fonts[1][0],fontWeight:800,size:235,tracking:10,
  stretchX:100,stretchY:100,slant:0,baseline:10,rotation:6,chaos:28,copies:1,
  roundness:10,inflate:0,cutH:0,cutV:0,slice:0,sliceAt:52,
  fill:'#111111',outline:'#111111',outlineWidth:0
};

const glyphCache=new Map();
function cacheGlyph(key,make){
  if(glyphCache.has(key))return glyphCache.get(key);
  const value=make();glyphCache.set(key,value);
  if(glyphCache.size>180)glyphCache.delete(glyphCache.keys().next().value);
  return value;
}
const offscreen=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};

function glyphMask(char,opt){
  const key=JSON.stringify([char,opt.fontFamily,opt.fontWeight,Math.round(opt.roundness),Math.round(opt.inflate),Math.round(opt.cutH),Math.round(opt.cutV),Math.round(opt.slice),Math.round(opt.sliceAt)]);
  return cacheGlyph(key,()=>{
    const W=420,H=520,base=offscreen(W,H),b=base.getContext('2d');
    b.clearRect(0,0,W,H);b.fillStyle='#fff';b.textAlign='center';b.textBaseline='middle';b.font=`${opt.fontWeight} 390px ${opt.fontFamily}`;b.fillText(char||' ',W/2,H*.51);

    let mask=base;
    const round=clamp(+opt.roundness||0,0,100),inflate=clamp(+opt.inflate||0,-60,80);
    if(round>0||inflate!==0){
      const blur=offscreen(W,H),x=blur.getContext('2d',{willReadFrequently:true});
      x.filter=`blur(${(round/100)*16+Math.abs(inflate)*.018}px)`;x.drawImage(base,0,0);x.filter='none';
      const im=x.getImageData(0,0,W,H),d=im.data,threshold=clamp(142-inflate*1.35,28,232);
      for(let i=0;i<d.length;i+=4){const a=d[i+3]>=threshold?255:0;d[i]=255;d[i+1]=255;d[i+2]=255;d[i+3]=a}
      x.putImageData(im,0,0);mask=blur;
    }

    if(opt.cutH>0||opt.cutV>0){
      const cut=offscreen(W,H),x=cut.getContext('2d');x.drawImage(mask,0,0);x.globalCompositeOperation='destination-out';
      if(opt.cutH>0){const th=H*(opt.cutH/100)*.13;x.fillRect(0,H*.49-th/2,W,th)}
      if(opt.cutV>0){const tw=W*(opt.cutV/100)*.13;x.fillRect(W*.5-tw/2,0,tw,H)}
      x.globalCompositeOperation='source-over';mask=cut;
    }

    if(Math.abs(opt.slice)>0){
      const sliced=offscreen(W,H),x=sliced.getContext('2d'),at=clamp(opt.sliceAt,15,85)/100*H,shift=opt.slice/100*W*.32;
      x.drawImage(mask,0,0,W,at,0,0,W,at);
      x.drawImage(mask,0,at,W,H-at,shift,at,W,H-at);
      mask=sliced;
    }
    return mask;
  });
}

function tinted(mask,color,cache,key){
  const k=`${key}:${color}`;if(cache.has(k))return cache.get(k);
  const c=offscreen(mask.width,mask.height),x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,c.width,c.height);x.globalCompositeOperation='destination-in';x.drawImage(mask,0,0);x.globalCompositeOperation='source-over';cache.set(k,c);return c;
}

export default function TypeTool({onIndex,onSendToEditor}){
  const [p,setP]=useState(DEFAULTS);
  const [seed,setSeed]=useState(()=>Math.floor(Math.random()*1e9));
  const [exporting,setExporting]=useState(false);
  const canvasRef=useRef(null);
  const patch=(k,v)=>setP(s=>({...s,[k]:v}));

  function reroll(){setSeed(Math.floor(Math.random()*1e9))}
  function randomize(){
    const font=fonts[Math.floor(Math.random()*fonts.length)][0];
    setP(s=>({...s,
      fontFamily:font,
      fontWeight:[300,400,500,600,700,800,900][Math.floor(Math.random()*7)],
      tracking:Math.round(-4+Math.random()*46),
      stretchX:Math.round(58+Math.random()*130),stretchY:Math.round(62+Math.random()*125),
      slant:Math.round(-26+Math.random()*52),baseline:Math.round(Math.random()*55),rotation:Math.round(Math.random()*28),
      chaos:Math.round(14+Math.random()*82),roundness:Math.round(Math.random()*82),inflate:Math.round(-24+Math.random()*68),
      cutH:Math.random()>.62?Math.round(3+Math.random()*22):0,cutV:Math.random()>.72?Math.round(3+Math.random()*20):0,
      slice:Math.random()>.42?Math.round(-48+Math.random()*96):0,sliceAt:Math.round(34+Math.random()*34),
      copies:s.mode==='GLYPH'?Math.round(1+Math.random()*4):1
    }));
    reroll();
  }

  function render(ctx,w,h,{transparent=false}={}){
    ctx.clearRect(0,0,w,h);if(!transparent){ctx.fillStyle='#f0ede4';ctx.fillRect(0,0,w,h)}
    const rnd=mulberry32(hashSeed(`${seed}:${p.mode}:${p.text}:${p.fontFamily}`)),chaos=p.chaos/100;
    const text=p.mode==='GLYPH'?(String(p.text||'A').trim()[0]||'A'):String(p.text||'TYPE');
    const baseSize=Math.max(24,p.size/1200*w),centerX=w/2,centerY=h/2,colorCache=new Map();
    const measure=offscreen(2,2).getContext('2d');measure.font=`${p.fontWeight} ${baseSize}px ${p.fontFamily}`;

    const specFor=(i=0)=>{
      const v=()=>rnd()*2-1;
      const amount=chaos*(p.mode==='WORD'?1:.35);
      return {
        fontFamily:p.fontFamily,fontWeight:p.fontWeight,
        roundness:clamp(p.roundness+v()*42*amount,0,100),inflate:clamp(p.inflate+v()*35*amount,-60,80),
        cutH:clamp(p.cutH+Math.max(0,v())*20*amount,0,40),cutV:clamp(p.cutV+Math.max(0,v())*18*amount,0,40),
        slice:clamp(p.slice+v()*46*amount,-100,100),sliceAt:clamp(p.sliceAt+v()*18*amount,15,85),
        rot:v()*p.rotation*amount,baseline:v()*p.baseline*amount,
        sx:(p.stretchX/100)*(1+v()*.34*amount),sy:(p.stretchY/100)*(1+v()*.30*amount),i
      };
    };

    const paint=(char,x,y,spec,alpha=1)=>{
      const mask=glyphMask(char,spec),maskKey=JSON.stringify([char,spec.fontFamily,spec.fontWeight,Math.round(spec.roundness),Math.round(spec.inflate),Math.round(spec.cutH),Math.round(spec.cutV),Math.round(spec.slice),Math.round(spec.sliceAt)]),fill=tinted(mask,p.fill,colorCache,maskKey),outline=p.outlineWidth>0?tinted(mask,p.outline,colorCache,`${maskKey}:outline`):null;
      const drawH=baseSize*1.34,drawW=drawH*(mask.width/mask.height),ow=Math.max(.5,p.outlineWidth/100*w*.013);
      ctx.save();ctx.translate(x,y);ctx.rotate(spec.rot*Math.PI/180);ctx.transform(1,0,Math.tan((p.slant||0)*Math.PI/180),1,0,0);ctx.scale(spec.sx,spec.sy);ctx.globalAlpha=alpha;
      if(outline){const steps=12;for(let j=0;j<steps;j++){const a=j/steps*Math.PI*2;ctx.drawImage(outline,-drawW/2+Math.cos(a)*ow,-drawH/2+Math.sin(a)*ow,drawW,drawH)}}
      ctx.drawImage(fill,-drawW/2,-drawH/2,drawW,drawH);ctx.restore();
    };

    if(p.mode==='GLYPH'){
      const count=Math.max(1,p.copies||1),spread=Math.min(w,h)*(.035+.18*chaos);
      for(let i=0;i<count;i++){
        const s=specFor(i),a=count===1?0:i/count*Math.PI*2+(rnd()-.5)*.5*chaos,r=count===1?0:spread*(.2+rnd()*.85);
        paint(text,centerX+Math.cos(a)*r,centerY+Math.sin(a)*r,s,count===1?1:clamp(.52+rnd()*.48,.3,1));
      }
      return;
    }

    const chars=[...text],specs=chars.map((_,i)=>specFor(i));
    const advances=chars.map((ch,i)=>Math.max(baseSize*.18,measure.measureText(ch||' ').width*specs[i].sx)+(p.tracking/1200*w));
    const total=advances.reduce((a,b)=>a+b,0),scale=total>w*.86?w*.86/total:1;let cursor=centerX-total*scale/2;
    chars.forEach((ch,i)=>{
      const adv=advances[i]*scale,s=specs[i],wave=Math.sin(i/Math.max(1,chars.length-1)*Math.PI*2+seed*.00001);
      s.sx*=scale;s.sy*=scale;s.rot+=wave*p.rotation*.15;
      const x=cursor+adv/2,y=centerY+wave*(p.baseline/100)*h*.055+s.baseline/100*h*.08;
      paint(ch,x,y,s,1);cursor+=adv;
    });
  }

  useEffect(()=>{
    let cancelled=false;const draw=async()=>{if(document.fonts){try{await document.fonts.ready}catch{}}if(cancelled)return;const c=canvasRef.current;if(!c)return;const r=c.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);c.width=Math.max(1,Math.round(r.width*dpr));c.height=Math.max(1,Math.round(r.height*dpr));render(c.getContext('2d'),c.width,c.height)};
    draw();return()=>{cancelled=true};
  },[p,seed]);

  async function renderBlob(){if(document.fonts){try{await document.fonts.ready}catch{}}const c=offscreen(1200,1500);render(c.getContext('2d'),1200,1500,{transparent:true});return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('PNG encode failed')),'image/png'))}
  async function exportPng(){if(exporting)return;setExporting(true);try{const blob=await renderBlob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`1337-type-${Date.now()}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200)}finally{setExporting(false)}}
  async function sendToEditor(){if(exporting)return;setExporting(true);try{const blob=await renderBlob();onSendToEditor?.(new File([blob],`TYPE-${Date.now()}.png`,{type:'image/png'}))}finally{setExporting(false)}}

  return <main className="typeShell">
    <aside className="typeHud">
      <div className="brand"><span className="brand1337">1337</span><span className="brandTools">tools</span><small>4.5 / 03 TYPE</small></div>
      <button className="wide fieldBack" onClick={onIndex}>← INDEX</button>
      <button className="wide primary typeHero" onClick={randomize}>{p.mode==='WORD'?'RANDOMIZE WORD ↯':'GENERATE GLYPH ↯'}</button>
      <button className="wide" onClick={reroll}>REROLL SHAPE</button>

      <section><div className="title">MODE</div><div className="typeMode"><button className={p.mode==='WORD'?'active':''} onClick={()=>patch('mode','WORD')}>WORD</button><button className={p.mode==='GLYPH'?'active':''} onClick={()=>patch('mode','GLYPH')}>GLYPH</button></div></section>
      <section><div className="title">SOURCE</div><label>{p.mode==='GLYPH'?'Glyph':'Word'}<input value={p.text} maxLength={p.mode==='GLYPH'?1:40} onChange={e=>patch('text',e.target.value)}/></label><label>Base font<select value={p.fontFamily} onChange={e=>patch('fontFamily',e.target.value)}>{fonts.map(([v,n])=><option key={n} value={v}>{n}</option>)}</select></label><TypeRange label="Source weight" min={100} max={900} step={100} value={p.fontWeight} onChange={v=>patch('fontWeight',+v)}/><TypeRange label="Size" min={80} max={520} value={p.size} onChange={v=>patch('size',+v)}/></section>
      <section><div className="title">GLYPH FORM</div><TypeRange label="Roundness" min={0} max={100} value={p.roundness} onChange={v=>patch('roundness',+v)}/><TypeRange label="Inflate / Erode" min={-60} max={80} value={p.inflate} onChange={v=>patch('inflate',+v)}/><TypeRange label="Width" min={25} max={260} value={p.stretchX} onChange={v=>patch('stretchX',+v)}/><TypeRange label="Height" min={25} max={260} value={p.stretchY} onChange={v=>patch('stretchY',+v)}/><TypeRange label="Slant" min={-45} max={45} value={p.slant} onChange={v=>patch('slant',+v)}/><TypeRange label="Horizontal cut" min={0} max={40} value={p.cutH} onChange={v=>patch('cutH',+v)}/><TypeRange label="Vertical cut" min={0} max={40} value={p.cutV} onChange={v=>patch('cutV',+v)}/><TypeRange label="Slice offset" min={-100} max={100} value={p.slice} onChange={v=>patch('slice',+v)}/><TypeRange label="Slice position" min={15} max={85} value={p.sliceAt} onChange={v=>patch('sliceAt',+v)}/></section>
      <section><div className="title">WORD SYSTEM</div><TypeRange label="Tracking" min={-20} max={140} value={p.tracking} onChange={v=>patch('tracking',+v)}/><TypeRange label="Baseline" min={0} max={100} value={p.baseline} onChange={v=>patch('baseline',+v)}/><TypeRange label="Rotation" min={0} max={90} value={p.rotation} onChange={v=>patch('rotation',+v)}/><TypeRange label="Order ↔ Chaos" min={0} max={100} value={p.chaos} onChange={v=>patch('chaos',+v)}/>{p.mode==='GLYPH'&&<TypeRange label="Echo copies" min={1} max={8} value={p.copies} onChange={v=>patch('copies',+v)}/>}</section>
      <section><div className="title">INK</div><div className="two"><label>Fill<input type="color" value={p.fill} onChange={e=>patch('fill',e.target.value)}/></label><label>Outline<input type="color" value={p.outline} onChange={e=>patch('outline',e.target.value)}/></label></div><TypeRange label="Outline" min={0} max={40} value={p.outlineWidth} onChange={v=>patch('outlineWidth',+v)}/></section>
      <section><div className="title">OUTPUT</div><button className="wide primary" disabled={exporting} onClick={sendToEditor}>SEND TO EDITOR</button><button className="wide" disabled={exporting} onClick={exportPng}>{exporting?'RENDERING…':'EXPORT PNG'}</button></section>
    </aside>
    <section className="typeWorkspace"><header className="fieldTop fieldTop41"><div><button onClick={onIndex}>INDEX</button><span>1337TOOLS / 03 TYPE / {p.mode}</span></div><b>{p.mode==='WORD'?'WORD → GLYPH SYSTEM':'GLYPH GENERATOR'}</b></header><div className="typeStage"><div className="typeCanvasWrap"><canvas ref={canvasRef} className="typeCanvas"/></div></div></section>
  </main>;
}

function TypeRange({label,value,onChange,min,max,step=1}){return <label className="fieldControl"><div className="fieldControlHead"><span>{label}</span><b>{value}</b></div><div className="fieldRangeRow"><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(e.target.value)}/><input type="number" min={min} max={max} step={step} value={value} onChange={e=>onChange(e.target.value)}/></div></label>}
