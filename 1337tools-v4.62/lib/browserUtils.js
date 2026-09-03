export function downloadBlob(blob,filename){
  if(!blob)throw new Error('Empty export');
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;a.style.display='none';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1800);
}

export function reportToolError(label,err){
  console.error(`${label} failed`,err);
  if(typeof alert==='function')alert(`${label} failed: ${err?.message||'unknown error'}`);
}

export function isEditableTarget(target=typeof document!=='undefined'?document.activeElement:null){
  if(!target||typeof target.closest!=='function')return false;
  return !!target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
}
