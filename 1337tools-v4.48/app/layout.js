import './globals.css';

export const metadata={
  metadataBase:new URL('https://1337tools.vercel.app'),
  title:{default:'1337tools',template:'%s · 1337tools'},
  applicationName:'1337tools',
  description:'1337tools — process-first image tools',
  alternates:{canonical:'/'},
  openGraph:{title:'1337tools',siteName:'1337tools',description:'Process-first image tools',type:'website',url:'/'},
  twitter:{card:'summary',title:'1337tools',description:'Process-first image tools'},
  icons:{
    icon:[
      {url:'/favicon.ico?v=48',type:'image/x-icon'},
      {url:'/icon-48.png?v=48',sizes:'48x48',type:'image/png'},
      {url:'/icon-192.png?v=48',sizes:'192x192',type:'image/png'},
      {url:'/icon-512.png?v=48',sizes:'512x512',type:'image/png'}
    ],
    shortcut:'/favicon.ico?v=48',
    apple:[{url:'/apple-icon.png?v=48',sizes:'180x180',type:'image/png'}]
  },
  appleWebApp:{title:'1337tools',capable:true,statusBarStyle:'default'},
};

export const viewport={themeColor:'#0038ff'};

export default function RootLayout({children}){
  return <html lang="en"><head><link rel="mask-icon" href="/safari-pinned-tab.svg?v=48" color="#0038ff"/></head><body>{children}</body></html>;
}
