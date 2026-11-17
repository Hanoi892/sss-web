const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://127.0.0.1');
 if(/^\/api\/(image-auth|images|image-upload|image-file)$/.test(u.pathname))return require(path.join(root,u.pathname+'.js'))(req,res);
 let target=path.join(root,decodeURIComponent(u.pathname));if(!target.startsWith(root+'/')||u.pathname.includes('..')){res.statusCode=404;return res.end();}
 try{if(fs.statSync(target).isDirectory())target=path.join(target,'index.html');if(!/\.(html|css|js|png|webp|jpg|avif|xml|txt)$/.test(target)||target.includes('/node_modules/'))throw new Error();res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.xml':'application/xml'})[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));}catch{res.statusCode=404;res.end();}
}).listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('http://127.0.0.1:3000'));
