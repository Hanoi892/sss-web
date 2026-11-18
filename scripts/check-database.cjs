const {db,init}=require('../lib/db.cjs');
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
}
main().catch(e=>{console.error('image-manager readiness failed:',e.code||e.name);process.exitCode=1;}).finally(()=>db().end());
