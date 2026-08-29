import {toPng,toJpeg} from 'html-to-image';

async function sourceToDataUrl(src){
  if(!src||src.startsWith('data:'))return src;
  const r=await fetch(src);if(!r.ok)throw new Error(`image fetch ${r.status}`);const b=await r.blob();
  return await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(fr.error||new Error('FileReader failed'));fr.readAsDataURL(b)});
}
function waitImage(img){return img.complete&&img.naturalWidth?Promise.resolve():new Promise((res,rej)=>{img.onload=()=>res();img.onerror=()=>rej(new Error('image decode failed'))})}

export async function exportScene(node,{kind='png',background='#fff',docWidth=1200,docHeight=1500}={}){
  if(!node)throw new Error('canvas node missing');
  if(document.fonts?.ready)await document.fonts.ready;
  const rect=node.getBoundingClientRect(),clone=node.cloneNode(true);
  clone.classList.add('exportClone');clone.classList.remove('stampCursor');
  clone.querySelectorAll('.handle,.rotateStem,.multiBox,.marquee,.empty').forEach(n=>n.remove());
  clone.querySelectorAll('.selected,.primarySelected').forEach(n=>n.classList.remove('selected','primarySelected'));
  clone.style.position='fixed';clone.style.left='-100000px';clone.style.top='0';clone.style.margin='0';clone.style.transform='none';clone.style.width=`${rect.width}px`;clone.style.height=`${rect.height}px`;clone.style.aspectRatio='auto';clone.style.maxHeight='none';clone.style.boxShadow='none';clone.style.background=background;
  document.body.appendChild(clone);
  try{
    const imgs=[...clone.querySelectorAll('img')];
    await Promise.all(imgs.map(async img=>{img.src=await sourceToDataUrl(img.src);await waitImage(img)}));
    const masks=[...clone.querySelectorAll('[data-mask-src]')];
    await Promise.all(masks.map(async el=>{const src=el.getAttribute('data-mask-src');if(!src)return;const data=await sourceToDataUrl(src);el.style.webkitMaskImage=`url("${data}")`;el.style.maskImage=`url("${data}")`}));
    const opts={
      width:rect.width,height:rect.height,canvasWidth:docWidth,canvasHeight:docHeight,pixelRatio:1,
      backgroundColor:background,cacheBust:false,skipFonts:false,
      filter:n=>!(n?.classList?.contains('handle')||n?.classList?.contains('rotateStem')||n?.classList?.contains('multiBox')||n?.classList?.contains('marquee'))
    };
    return kind==='jpg'?await toJpeg(clone,{...opts,quality:.94}):await toPng(clone,opts);
  }finally{clone.remove()}
}
