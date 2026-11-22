const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),out=path.join(root,'public');fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const skip=new Set(['public','node_modules','api','lib','scripts','tests','docs','package.json','package-lock.json','vercel.json','README.md']);
for(const e of fs.readdirSync(root,{withFileTypes:true})){if(e.name.startsWith('.')||skip.has(e.name))continue;fs.cpSync(path.join(root,e.name),path.join(out,e.name),{recursive:true});}
const PREVIOUS_ORIGIN='https://sss-web-hanoi892.vercel.app',OFFICIAL_ORIGIN='https://dongbamjeong.com';
const setOfficialOrigin=text=>text.split(PREVIOUS_ORIGIN).join(OFFICIAL_ORIGIN);
const addFavicon=text=>{
  let html=text.includes('href="/favicon.svg"')?text:text.replace('</head>','<link rel="icon" type="image/svg+xml" sizes="any" href="/favicon.svg"></head>');
  html=html.replace(/<link rel="shortcut icon" href="\/favicon.svg">/g,'<link rel="shortcut icon" type="image/x-icon" href="/favicon.ico">');
  return html.includes('href="/favicon.ico"')?html:html.replace('</head>','<link rel="shortcut icon" type="image/x-icon" href="/favicon.ico"></head>');
};
function cleanPages(directory){for(const e of fs.readdirSync(directory,{withFileTypes:true})){if(e.name==='admin')continue;const file=path.join(directory,e.name);if(e.isDirectory())cleanPages(file);else if(e.name.endsWith('.html'))fs.writeFileSync(file,addFavicon(setOfficialOrigin(require('./public-copy.cjs').cleanPublicHtml(fs.readFileSync(file,'utf8')))));}}
cleanPages(out);
for(const name of ['robots.txt','sitemap.xml']){const file=path.join(out,name);if(fs.existsSync(file))fs.writeFileSync(file,setOfficialOrigin(fs.readFileSync(file,'utf8')));}
// Build a real multi-resolution ICO from the existing SVG logo for legacy browsers and crawlers.
async function buildIco(){
  const source=path.join(out,'favicon.svg');
  if(!fs.existsSync(source))throw new Error('favicon.svg is missing from the build output');
  const sharp=require('sharp'),sizes=[16,32,48,64];
  const images=await Promise.all(sizes.map(async size=>({size,data:await sharp(source).resize(size,size).png().toBuffer()})));
  const directory=Buffer.alloc(6+16*images.length);
  directory.writeUInt16LE(1,2);
  directory.writeUInt16LE(images.length,4);
  let offset=directory.length;
  for(let i=0;i<images.length;i++){
    const {size,data}=images[i],entry=6+16*i;
    directory.writeUInt8(size,entry);
    directory.writeUInt8(size,entry+1);
    directory.writeUInt16LE(1,entry+4);
    directory.writeUInt16LE(32,entry+6);
    directory.writeUInt32LE(data.length,entry+8);
    directory.writeUInt32LE(offset,entry+12);
    offset+=data.length;
  }
  fs.writeFileSync(path.join(out,'favicon.ico'),Buffer.concat([directory,...images.map(({data})=>data)]));
}
buildIco().then(()=>console.log('정적 페이지와 SVG/ICO 파비콘 준비 완료')).catch(error=>{console.error('파비콘 생성 실패:',error);process.exitCode=1;});
