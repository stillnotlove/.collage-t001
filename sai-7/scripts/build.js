const fs = require('fs');
const path = require('path');
const src=path.resolve(__dirname,'../public');
const dest=path.resolve(__dirname,'../dist');
if(!fs.existsSync(path.join(src,'index.html')) || !fs.existsSync(path.join(src,'app.js')) || !fs.existsSync(path.join(src,'styles.css'))) throw new Error('Missing core site files');
fs.rmSync(dest,{recursive:true,force:true});
fs.cpSync(src,dest,{recursive:true});
console.log('SAI static site built to dist/');
