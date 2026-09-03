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
      {url:'/favicon.ico',type:'image/x-icon'},
      {url:'/icon-48.png',sizes:'48x48',type:'image/png'},
      {url:'/icon-192.png',sizes:'192x192',type:'image/png'}
    ],
    shortcut:'/favicon.ico',
    apple:[{url:'/apple-icon.png',sizes:'180x180',type:'image/png'}]
  },
  appleWebApp:{title:'1337tools',capable:true,statusBarStyle:'default'},
};

export const viewport={themeColor:'#0038ff'};

export default function RootLayout({children}){
  return <html lang="en"><head>
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon.png"/>
    <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#0038ff"/>
  </head><body>{children}</body></html>;
}
