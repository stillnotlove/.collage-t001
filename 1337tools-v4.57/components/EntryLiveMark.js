'use client';

import {useEffect,useRef} from 'react';

function makeCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w);c.height=Math.max(1,h);return c}

export default function EntryLiveMark(){
  const ref=useRef(null);

  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;
    let ro=null;
    let size={w:1,h:1,dpr:1};
    let base=makeCanvas(1,1),sample=makeCanvas(1,1);

    function drawBase(){
      const {w,h}=size,ctx=base.getContext('2d');
      ctx.clearRect(0,0,w,h);
      ctx.imageSmoothingEnabled=true;
      const maxWidth=w*.82,maxHeight=h*.34;
      let fs=Math.min(maxHeight,w*.18),total=0,metrics={ascent:0,descent:0};
      for(let n=0;n<8;n++){
        ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;
        const oneM=ctx.measureText('1'),threeM=ctx.measureText('3'),sevenM=ctx.measureText('7');
        const gap13=-fs*.055,gap33=Math.max(1.6,fs*.014),gap37=-fs*.072;
        ctx.font=`300 ${fs}px Helvetica Neue, Helvetica, Arial, sans-serif`;
        const toolsM=ctx.measureText('tools');
        const gap=fs*.055;
        total=oneM.width+gap13+threeM.width+gap33+threeM.width+gap37+sevenM.width+gap+toolsM.width;
        metrics={
          ascent:Math.max(oneM.actualBoundingBoxAscent||fs*.72,threeM.actualBoundingBoxAscent||fs*.72,sevenM.actualBoundingBoxAscent||fs*.72,toolsM.actualBoundingBoxAscent||fs*.72),
          descent:Math.max(oneM.actualBoundingBoxDescent||fs*.12,threeM.actualBoundingBoxDescent||fs*.12,sevenM.actualBoundingBoxDescent||fs*.12,toolsM.actualBoundingBoxDescent||fs*.12),
        };
        const textH=metrics.ascent+metrics.descent;
        const fit=Math.min(maxWidth/Math.max(1,total),maxHeight/Math.max(1,textH),1);
        if(fit>.997)break;fs*=fit;
      }
      ctx.fillStyle='#fff';
      const baseline=h/2+(metrics.ascent-metrics.descent)/2;
      let x=(w-total)/2;
      ctx.textBaseline='alphabetic';
      ctx.font=`900 ${fs}px Arial Black, Arial, Helvetica, sans-serif`;
      const oneM=ctx.measureText('1'),threeM=ctx.measureText('3'),sevenM=ctx.measureText('7');
      const gap13=-fs*.055,gap33=Math.max(1.6,fs*.014),gap37=-fs*.072;
      ctx.fillText('1',x,baseline);x+=oneM.width+gap13;
      ctx.fillText('3',x,baseline);x+=threeM.width+gap33;
      ctx.fillText('3',x,baseline);x+=threeM.width+gap37;
      ctx.fillText('7',x,baseline);x+=sevenM.width+fs*.055;
      ctx.font=`300 ${fs}px Helvetica Neue, Helvetica, Arial, sans-serif`;
      ctx.fillText('tools',x,baseline);
    }

    function renderStaticAscii(){
      const {w,h}=size,ctx=canvas.getContext('2d');
      ctx.clearRect(0,0,w,h);
      ctx.fillStyle='#1438ff';
      ctx.fillRect(0,0,w,h);
      drawBase();
      const portrait=h>w;
      const cell=Math.max(6,Math.round((portrait?8:9)*size.dpr));
      const cols=Math.max(1,Math.floor(w/cell));
      const rows=Math.max(1,Math.floor(h/cell));
      if(sample.width!==cols||sample.height!==rows){sample.width=cols;sample.height=rows}
      const sx=sample.getContext('2d',{willReadFrequently:true});
      sx.clearRect(0,0,cols,rows);
      sx.drawImage(base,0,0,cols,rows);
      const px=sx.getImageData(0,0,cols,rows).data;
      const chars=[...'@#%*+=:.'];
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillStyle='#fff';
      ctx.font=`700 ${cell*1.02}px IBM Plex Mono, Courier New, monospace`;
      for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
        const q=(gy*cols+gx)*4;
        const a=px[q+3]/255;
        if(a<.08)continue;
        const lum=(px[q]*.2126+px[q+1]*.7152+px[q+2]*.0722)/255;
        const idx=Math.min(chars.length-1,Math.max(0,Math.floor((1-lum)*(chars.length-1))));
        ctx.globalAlpha=.88+.12*a;
        ctx.fillText(chars[idx]||chars[0],(gx+.5)*cell,(gy+.5)*cell);
      }
      ctx.globalAlpha=1;
    }

    function resize(){
      const r=canvas.getBoundingClientRect();if(r.width<2||r.height<2)return false;
      const dpr=Math.max(.8,Math.min(1.2,window.devicePixelRatio||1,1600/Math.max(1,r.width),900/Math.max(1,r.height)));
      const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
      if(w===size.w&&h===size.h&&dpr===size.dpr)return false;
      size={w,h,dpr};
      canvas.width=w;canvas.height=h;
      base=makeCanvas(w,h);
      sample=makeCanvas(1,1);
      renderStaticAscii();
      return true;
    }

    resize();
    const onResize=()=>{resize()};
    if(typeof ResizeObserver!=='undefined'){ro=new ResizeObserver(onResize);ro.observe(canvas)}
    window.addEventListener('resize',onResize);
    return()=>{ro?.disconnect();window.removeEventListener('resize',onResize)};
  },[]);

  return <canvas ref={ref} className="entryLiveCanvas" aria-hidden="true"/>;
}
