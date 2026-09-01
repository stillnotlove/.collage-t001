import './globals.css';

export const metadata={
  title:{default:'1337tools',template:'%s · 1337tools'},
  applicationName:'1337tools',
  description:'1337tools — process-first image tools',
  openGraph:{title:'1337tools',siteName:'1337tools',description:'Process-first image tools',type:'website'},
  twitter:{card:'summary',title:'1337tools',description:'Process-first image tools'},
  icons:{icon:[{url:'/icon.svg',type:'image/svg+xml'}]},
  appleWebApp:{title:'1337tools',capable:true,statusBarStyle:'default'},
};

export const viewport={themeColor:'#0038ff'};

export default function RootLayout({children}){
  return <html lang="en"><body>{children}</body></html>;
}
