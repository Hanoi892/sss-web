const {db,init}=require('../lib/db.cjs');
const {randomUUID,createHash}=require('node:crypto');
const sharp=require('sharp');
const storage=require('../lib/storage.cjs');
const {optimize}=require('../lib/optimize.cjs');
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
async function checkStorage(){
 await storage.initStorage();
 const id=randomUUID(),incoming=`readiness/${id}.jpg`,output=`readiness/${id}.webp`;
 try{
  const original=await sharp({create:{width:400,height:300,channels:3,background:'#cc8866'}}).jpeg().toBuffer();
  const signed=await storage.storage().from(storage.INPUT).createSignedUploadUrl(incoming);
  if(signed.error)throw signed.error;
  const sent=await fetch(signed.data.signedUrl,{method:'PUT',headers:{'Content-Type':'image/jpeg'},body:original});
  if(!sent.ok)throw new Error('Signed source upload failed: '+sent.status);
  const uploaded=await storage.download(storage.INPUT,incoming,storage.MAX_INPUT);
  if(hash(uploaded)!==hash(original))throw new Error('Source byte verification failed');
  const optimized=await optimize(uploaded);
  const saved=await storage.storage().from(storage.OUTPUT).upload(output,optimized.buffer,{contentType:`image/${optimized.format}`,upsert:false});
  if(saved.error)throw saved.error;
  const persisted=await storage.download(storage.OUTPUT,output,307200);
  if(hash(persisted)!==hash(optimized.buffer)||persisted.length>307200)throw new Error('Stored image verification failed');
  console.log('image-manager: private storage signed upload, optimization, persisted byte verification passed ('+persisted.length+' bytes)');
 }finally{
  await storage.remove(storage.INPUT,incoming);
  await storage.remove(storage.OUTPUT,output);
 }
}
async function main(){
 const client=await db().connect();
 try{
  if(!client.connection.stream.encrypted||!client.connection.stream.authorized)throw new Error('TLS verification was not established');
  await client.query('SELECT 1');
  console.log('image-manager: database TLS chain and hostname verified; SELECT 1 passed');
 }finally{client.release();}
 await init();
 const handler=require('../api/image-auth.js');
 let code=200,body;
 await handler({method:'GET',headers:{}},{setHeader(){},get statusCode(){return code;},set statusCode(value){code=value;},end(value){body=JSON.parse(value);}});
 if(code!==200||typeof body.initialized!=='boolean'||body.authenticated!==false)throw new Error('Image auth readiness check failed');
 console.log('image-manager: GET /api/image-auth handler passed (200); dedicated schema ready; admin '+(body.initialized?'configured':'first setup required'));
 await checkStorage();
 await require('./normalize-images.cjs').normalizeExisting();
 await require('./prepare-article-images.cjs').prepareArticleImages();
}
main().catch(e=>{console.error('image-manager readiness failed:',e.code||e.name);process.exitCode=1;}).finally(()=>db().end());
