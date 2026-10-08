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
      {src:'/icon.png',sizes:'512x512',type:'image/png',purpose:'any'},
    ],
  };
}
