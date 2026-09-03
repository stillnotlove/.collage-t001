export default function manifest(){
  return {
    name:'1337tools',
    short_name:'1337tools',
    description:'Process-first image tools',
    start_url:'/',
    scope:'/',
    display:'standalone',
    background_color:'#0038ff',
    theme_color:'#0038ff',
    icons:[
      {src:'/icon-48.png?v=64',sizes:'48x48',type:'image/png',purpose:'any'},
      {src:'/icon-192.png?v=64',sizes:'192x192',type:'image/png',purpose:'any'},
      {src:'/icon-512.png?v=64',sizes:'512x512',type:'image/png',purpose:'any'}
    ],
  };
}
