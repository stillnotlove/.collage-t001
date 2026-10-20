export default function manifest(){
  return {
    name:'1337tools',
    short_name:'1337tools',
    description:'Process-first image tools',
    start_url:'/',
    scope:'/',
    display:'standalone',
    background_color:'#0047de',
    theme_color:'#0047de',
    icons:[
      {src:'/icon.png',sizes:'512x512',type:'image/png',purpose:'any'},
    ],
  };
}
