'use client';

import {useEffect,useRef} from 'react';
import {hashSeed,mulberry32} from '../lib/editorCore';

function makeCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c}
function clamp01(v){return Math.max(0,Math.min(1,v))}
function ease(v){v=clamp01(v);return v*v*(3-2*v)}

export default function ModeHoverLabel({mode,label,active}){
  const wrapRef=useRef(null),canvasRef=useRef(null),seedRef=useRef(Math.floor(Math.random()*1e9)),wasActive=useRef(false);

  useEffect(()=>{
    if(active&&!wasActive.current)seedRef.current=Math.floor(Math.random()*1e9);
    wasActive.current=active;
  },[active]);

  useEffect(()=>{
    const wrap=wrapRef.current,canvas=canvasRef.current;if(!wrap||!canvas)return;
    let raf=0,ro=null,start=performance.now(),disposed=false;
    let source=makeCanvas(1,1),mask=makeCanvas(1,1),size={w:1,h:1,dpr:1};

    function resize(){
      const r=wrap.getBoundingClientRect();if(r.width<2||r.height<2)return false;
      const dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
      if(w===size.w&&h===size.h)return false;
      size={w,h,dpr};canvas.width=w;canvas.height=h;source=makeCanvas(w,h);mask=makeCanvas(w,h);drawSource();return true;
    }
    function drawSource(){
      const {w,h}=size,ctx=source.getContext('2d');ctx.clearRect(0,0,w,h);
      let fs=h*.88;ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillStyle='#0038ff';
      ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;
      let m=ctx.measureText(label);if(m.width>w*.985){fs*=w*.985/m.width;ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;m=ctx.measureText(label)}
      const ascent=m.actualBoundingBoxAscent||fs*.72,descent=m.actualBoundingBoxDescent||fs*.12;
      const y=h/2+(ascent-descent)*.04;
      ctx.fillText(label,0,y);
      const mx=mask.getContext('2d');mx.clearRect(0,0,w,h);mx.drawImage(source,0,0);
    }

    function drawAscii(ctx,p,time){
      const {w,h,dpr}=size,rnd=mulberry32(hashSeed(`${seedRef.current}:${mode}:ascii`));
      const variants=[
        {chars:[...'@#%*+=-:.'],cell:8.4},
        {chars:[...'■▪▫· '],cell:10.2},
        {chars:[...'⣿⣷⣯⣟⣛⣚⣀ '],cell:8.2},
      ];
      const v=variants[Math.floor(rnd()*variants.length)],cell=Math.max(5,Math.round(v.cell*dpr));
      const cols=Math.max(1,Math.ceil(w/cell)),rows=Math.max(1,Math.ceil(h/cell));
      const sample=makeCanvas(cols,rows),sx=sample.getContext('2d',{willReadFrequently:true});sx.drawImage(source,0,0,cols,rows);const px=sx.getImageData(0,0,cols,rows).data;
      ctx.globalAlpha=1-p;ctx.drawImage(source,0,0);ctx.globalAlpha=p;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#0038ff';ctx.font=`700 ${cell*1.18}px IBM Plex Mono, Courier New, monospace`;
      const phase=time*.001;
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
        const q=(y*cols+x)*4,a=px[q+3]/255;if(a<.05)continue;
        const density=clamp01(a*.92+.08*Math.sin(x*.37+y*.21+phase));if(rnd()>density*.98)continue;
        const lum=(px[q]*.2126+px[q+1]*.7152+px[q+2]*.0722)/255,idx=Math.min(v.chars.length-1,Math.floor((1-lum)*(v.chars.length-1)+rnd()*.8));const ch=v.chars[idx]||v.chars[0];if(ch===' ')continue;
        ctx.globalAlpha=p*(.62+.38*density);ctx.fillText(ch,(x+.5)*cell,(y+.5)*cell);
      }
      ctx.globalAlpha=1;
    }

    function drawSlice(ctx,p){
      const {w,h}=size,rnd=mulberry32(hashSeed(`${seedRef.current}:${mode}:slice`)),angle=(12+rnd()*16)*Math.PI/180,centerY=h*(.46+rnd()*.08),slope=Math.tan(angle),shift=w*(.016+rnd()*.026)*p;
      const yLeft=centerY-slope*w*.5,yRight=centerY+slope*w*.5;
      ctx.save();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w,0);ctx.lineTo(w,yRight);ctx.lineTo(0,yLeft);ctx.closePath();ctx.clip();ctx.drawImage(source,shift,-shift*.08);ctx.restore();
      ctx.save();ctx.beginPath();ctx.moveTo(0,yLeft);ctx.lineTo(w,yRight);ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.clip();ctx.drawImage(source,-shift,shift*.08);ctx.restore();
      if(p>.22){ctx.save();ctx.globalAlpha=.18*p;ctx.translate(w*.004*p,0);ctx.drawImage(source,0,0);ctx.restore()}
    }

    function drawEditor(ctx,p,time){
      const {w,h,dpr}=size,rnd=mulberry32(hashSeed(`${seedRef.current}:${mode}:editor`));
      const rot=(rnd()-.5)*.018*p,scaleX=1+(rnd()>.5?1:-1)*.018*p,scaleY=1-(rnd()>.5?1:-1)*.008*p;
      ctx.save();ctx.translate(w/2,h/2);ctx.rotate(rot);ctx.scale(scaleX,scaleY);ctx.drawImage(source,-w/2,-h/2);ctx.restore();
      const pad=Math.max(3,5*dpr),boxY=h*.07,boxH=h*.86,boxW=w*.982;
      ctx.save();ctx.strokeStyle='#0038ff';ctx.lineWidth=Math.max(1,1.25*dpr);ctx.globalAlpha=.3+.7*p;ctx.setLineDash([Math.max(3,5*dpr),Math.max(2,3*dpr)]);ctx.strokeRect(pad,boxY,boxW-pad*2,boxH);ctx.setLineDash([]);
      const s=Math.max(3,5*dpr),pts=[[pad,boxY],[boxW-pad,boxY],[pad,boxY+boxH],[boxW-pad,boxY+boxH],[w/2,boxY],[w/2,boxY+boxH]];
      ctx.fillStyle='#0038ff';for(const [x,y] of pts){ctx.fillRect(x-s/2,y-s/2,s,s)}
      const blink=.55+.45*Math.sin(time*.006);ctx.globalAlpha=p*blink;ctx.strokeStyle='#0038ff';ctx.beginPath();ctx.moveTo(w*.72,h*.18);ctx.lineTo(w*.77,h*.1);ctx.lineTo(w*.765,h*.17);ctx.stroke();ctx.restore();
    }

    function drawField(ctx,p,time){
      const {w,h,dpr}=size,rnd=mulberry32(hashSeed(`${seedRef.current}:${mode}:field`)),cols=18+Math.floor(rnd()*10),rows=7+Math.floor(rnd()*5),cw=w/cols,ch=h/rows,attractor={x:w*(.55+rnd()*.22),y:h*(.42+rnd()*.18)};
      ctx.globalAlpha=.24*(1-p);ctx.drawImage(source,0,0);ctx.globalAlpha=1;
      const phase=time*.0012;
      for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
        const sx=gx*cw,sy=gy*ch,cx=sx+cw/2,cy=sy+ch/2,dx=attractor.x-cx,dy=attractor.y-cy,dist=Math.max(1,Math.hypot(dx,dy)),pull=(.018+.055*(1-dist/Math.hypot(w,h)))*p,wave=Math.sin(gx*.7+gy*.41+phase)*cw*.13*p,ox=dx*pull+wave,oy=dy*pull*.55;
        ctx.save();ctx.translate(cx+ox,cy+oy);ctx.rotate(Math.atan2(dy,dx)*.025*p);ctx.globalAlpha=.72+.28*(1-p);ctx.drawImage(source,sx,sy,cw+.7*dpr,ch+.7*dpr,-cw/2,-ch/2,cw+.7*dpr,ch+.7*dpr);ctx.restore();
      }
      ctx.save();ctx.globalAlpha=.65*p;ctx.strokeStyle='#0038ff';ctx.lineWidth=Math.max(1,dpr);ctx.beginPath();ctx.arc(attractor.x,attractor.y,Math.max(3,4*dpr),0,Math.PI*2);ctx.stroke();ctx.restore();
    }

    function frame(now){
      if(disposed)return;resize();const ctx=canvas.getContext('2d');ctx.clearRect(0,0,size.w,size.h);
      const elapsed=now-start,p=active?ease(Math.min(1,elapsed/320)):0;
      if(!active){raf=requestAnimationFrame(frame);return}
      if(mode==='ascii')drawAscii(ctx,p,now);else if(mode==='slice')drawSlice(ctx,p);else if(mode==='editor')drawEditor(ctx,p,now);else drawField(ctx,p,now);
      raf=requestAnimationFrame(frame);
    }

    resize();start=performance.now();raf=requestAnimationFrame(frame);
    if(typeof ResizeObserver!=='undefined'){ro=new ResizeObserver(()=>resize());ro.observe(wrap)}
    return()=>{disposed=true;cancelAnimationFrame(raf);ro?.disconnect()};
  },[active,label,mode]);

  return <span className={`modeFxLabel ${active?'isActive':''}`} ref={wrapRef}>
    <span className="modeFxBase">{label}</span>
    <canvas ref={canvasRef} className="modeFxCanvas" aria-hidden="true"/>
  </span>;
}
