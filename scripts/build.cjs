const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),out=path.join(root,'public');fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const skip=new Set(['public','node_modules','api','lib','scripts','tests','docs','package.json','package-lock.json','vercel.json','README.md']);
for(const e of fs.readdirSync(root,{withFileTypes:true})){if(e.name.startsWith('.')||skip.has(e.name))continue;fs.cpSync(path.join(root,e.name),path.join(out,e.name),{recursive:true});}
function cleanPages(directory){for(const e of fs.readdirSync(directory,{withFileTypes:true})){if(e.name==='admin')continue;const file=path.join(directory,e.name);if(e.isDirectory())cleanPages(file);else if(e.name.endsWith('.html'))fs.writeFileSync(file,require('./public-copy.cjs').cleanPublicHtml(fs.readFileSync(file,'utf8')));}}
cleanPages(out);
console.log('기존 정적 페이지와 관리자 정적 파일 준비 완료');
