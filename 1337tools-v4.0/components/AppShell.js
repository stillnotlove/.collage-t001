'use client';
import {useState} from 'react';
import FieldTool from './FieldTool';
import CollageEditor from './CollageEditor';

export default function AppShell(){
  const [tool,setTool]=useState('field');
  const [incoming,setIncoming]=useState(null);
  if(tool==='compose')return <CollageEditor initialFile={incoming} onSwitchField={()=>{setIncoming(null);setTool('field')}}/>;
  return <FieldTool onCompose={()=>{setIncoming(null);setTool('compose')}} onSendToCompose={file=>{setIncoming(file);setTool('compose')}}/>;
}
