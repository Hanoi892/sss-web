const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const sharp=require('sharp');
const {randomBytes}=require('node:crypto');
const dbModule=require('../lib/db.cjs');
const pglite=new PGlite();
const objects=new Map();
const INPUT='dbj-image-incoming',OUTPUT='dbj-image-optimized';
function key(bucket,path){return `${bucket}/${path}`;}
require.cache[require.resolve('../lib/db.cjs')].exports={query:async(sql,args=[])=>{const r=await pglite.query(sql,args);return {rows:r.rows,rowCount:r.rows.length||r.affectedRows||0};}};
require.cache[require.resolve('../lib/storage.cjs')]={id:require.resolve('../lib/storage.cjs'),filename:require.resolve('../lib/storage.cjs'),loaded:true,exports:{INPUT,OUTPUT,MAX_INPUT:50*1048576,initStorage:async()=>{},storage:()=>({from:bucket=>({createSignedUploadUrl:async path=>({data:{signedUrl:`https://storage.invalid/${path}`}}),upload:async(path,buffer)=>{objects.set(key(bucket,path),buffer);return {};},remove:async paths=>{paths.forEach(p=>objects.delete(key(bucket,p)));return {};}})}),download:async(bucket,path,max)=>{const b=objects.get(key(bucket,path));if(!b)throw new Error('not found');if(b.length>max)throw Object.assign(new Error('size exceeded'),{status:413});return b;},remove:async(bucket,path)=>{objects.delete(key(bucket,path));}}};
const routes={auth:require('../api/image-auth.js'),upload:require('../api/image-upload.js'),images:require('../api/images.js'),file:require('../api/image-file.js')};
let cookie='';
async function request(route,{method='GET',body,url='/',authenticated=true,origin='https://site.test'}={}){
 const req={method,url,body,headers:{host:'site.test',origin,'x-forwarded-for':'127.0.0.1',...(authenticated?{cookie}:{})}};
 let headers={},data;
 const res={statusCode:200,setHeader(k,v){headers[k.toLowerCase()]=v;},end(v){data=v;}};
 await routes[route](req,res);
 return {status:res.statusCode,headers,buffer:Buffer.isBuffer(data)?data:undefined,data:typeof data==='string'?JSON.parse(data):undefined};
}
async function fixture(color){return sharp({create:{width:800,height:600,channels:4,background:color}}).png().toBuffer();}
async function prepare(buffer,filename='test.png'){const result=await request('upload',{method:'POST',body:{action:'prepare',bytes:buffer.length,filename}});assert.equal(result.status,200);objects.set(key(INPUT,`incoming/${result.data.id}`),buffer);return result.data.id;}
async function upload(buffer,extra={}){const id=await prepare(buffer);return request('upload',{method:'POST',body:{action:'complete',id,title:'테스트 사진',alt:'테스트 색상 사진',slot:'/hanoi/massage/amazing/#image-0',published:false,...extra}});}
test('실제 PostgreSQL 엔진을 사용하는 관리자 API 통합',async t=>{
 await pglite.exec(dbModule.schema);
 process.env.IMAGE_ADMIN_SETUP_TOKEN=randomBytes(32).toString('hex');
 let first,second;
 await t.test('미인증 업로드·목록·수정 차단',async()=>{for(const [route,args] of [['upload',{method:'POST',body:{action:'prepare'}}],['images',{url:'/?admin=1'}],['images',{method:'POST',body:{action:'edit'}}]])assert.equal((await request(route,{...args,authenticated:false})).status,401);});
 await t.test('설정 토큰 검증 및 한 글자 한글 아이디·한 글자 비밀번호 생성',async()=>{
  assert.equal((await request('auth')).data.initialized,false);
  assert.equal((await request('auth',{method:'POST',body:{username:'가',password:'1',setupToken:'wrong'}})).status,403);
  const result=await request('auth',{method:'POST',body:{username:'가',password:'1',setupToken:process.env.IMAGE_ADMIN_SETUP_TOKEN}});assert.equal(result.status,200);cookie=result.headers['set-cookie'].split(';')[0];assert.equal((await request('auth')).data.authenticated,true);
  assert.equal((await request('auth',{method:'POST',body:{username:'가',password:'incorrect'}})).status,401);
 });
 await t.test('첫 설정 후 토큰으로 관리자 덮어쓰기 차단',async()=>{const r=await request('auth',{method:'POST',body:{username:'attacker',password:'1',setupToken:process.env.IMAGE_ADMIN_SETUP_TOKEN}});assert.equal(r.status,401);});
 await t.test('50MB 초과 및 미지원 파일명 차단',async()=>{for(const [bytes,filename,status] of [[51*1048576,'test.jpg',413],[100,'script.svg',400]])assert.equal((await request('upload',{method:'POST',body:{action:'prepare',bytes,filename}})).status,status);});
 await t.test('미지원 실제 바이트 차단 및 원본 정리',async()=>{const r=await upload(Buffer.from('<script>alert("malicious image file")</script>'));assert.equal(r.status,422);assert.equal([...objects.keys()].some(x=>x.startsWith(INPUT)),false);});
 await t.test('대기 원본 실제 용량 불일치 차단',async()=>{const b=await fixture('red'),id=await prepare(b);objects.set(key(INPUT,`incoming/${id}`),Buffer.concat([b,Buffer.from('extra')]));const r=await request('upload',{method:'POST',body:{action:'complete',id,title:'test',alt:'test',slot:'/hanoi/massage/amazing/#image-0'}});assert.equal(r.status,422);});
 await t.test('압축·저장 재검증 및 비공개 사진 접근 제어',async()=>{
  const r=await upload(await fixture('red'));assert.equal(r.status,200);assert.ok(r.data.bytes<=307200);first=r.data.id;
  assert.equal((await request('file',{url:`/?id=${first}`,authenticated:false})).status,404);
  const image=await request('file',{url:`/?id=${first}`});assert.equal(image.status,200);assert.ok(image.buffer.length<=307200);
  assert.equal((await request('images',{url:'/?page=/hanoi/massage/amazing/',authenticated:false})).data.images.length,0);
 });
 await t.test('사진 중복 업로드 감지',async()=>{assert.equal((await upload(await fixture('red'))).status,409);});
 await t.test('공개 설정·ALT·위치 및 사이트 API 반영',async()=>{
  const bad=await request('images',{method:'POST',body:{action:'edit',id:first,title:'사진',alt:'',slot:'/hanoi/massage/amazing/#image-0',published:true}});assert.equal(bad.status,400);
  assert.equal((await request('images',{method:'POST',body:{action:'edit',id:first,title:'대표 사진',alt:'빨간 이미지',slot:'/hanoi/massage/amazing/#image-0',published:true}})).status,200);
  const images=(await request('images',{url:'/?page=/hanoi/massage/amazing/',authenticated:false})).data.images;assert.equal(images.length,1);assert.equal(images[0].alt,'빨간 이미지');assert.equal(images[0].path,undefined);assert.equal((await request('file',{url:`/?id=${first}`,authenticated:false})).status,200);
 });
 await t.test('사진 교체·캐시 버전 변경·이전 파일 정리',async()=>{
  const old=(await request('images',{url:'/?admin=1'})).data.images.find(x=>x.id===first);const before=(await request('file',{url:`/?id=${first}`})).buffer;
  assert.equal((await upload(await fixture('blue'),{replaceId:first,published:true})).status,200);
  const updated=(await request('images',{url:'/?admin=1'})).data.images.find(x=>x.id===first);assert.equal(updated.version,old.version+1);assert.notDeepEqual((await request('file',{url:`/?id=${first}`,authenticated:false})).buffer,before);assert.equal([...objects.keys()].filter(x=>x.startsWith(OUTPUT)).length,1);
 });
 await t.test('여러 장·목록 순서 변경',async()=>{const r=await upload(await fixture('green'));assert.equal(r.status,200);second=r.data.id;assert.equal((await request('images',{method:'POST',body:{action:'reorder',ids:[second,first]}})).status,200);assert.deepEqual((await request('images',{url:'/?admin=1'})).data.images.map(x=>x.id),[second,first]);});
 await t.test('공개 취소 후 URL 직접 접근 차단',async()=>{assert.equal((await request('images',{method:'POST',body:{action:'edit',id:first,title:'대표',alt:'설명',slot:'/hanoi/massage/amazing/#image-0',published:false}})).status,200);assert.equal((await request('file',{url:`/?id=${first}`,authenticated:false})).status,404);});
 await t.test('업소 대표 사진은 카드 API에 자동 연결하고 추가 사진은 업소에 배정',async()=>{
  for(const [id,slot] of [[first,'/hanoi/massage/amazing/#cover'],[second,'/hanoi/massage/amazing/#gallery']])assert.equal((await request('images',{method:'POST',body:{action:'edit',id,title:'업소 사진',alt:'업소 시설',slot,published:true}})).status,200);
  const response=(await request('images',{url:'/?page=/hanoi/massage/amazing/',authenticated:false})).data;
  assert.ok(response.images.some(x=>x.slot.endsWith('#gallery')));
  assert.equal(response.representatives.find(x=>x.slot==='/hanoi/massage/amazing/#cover').id,first);
  const cards=(await request('images',{url:'/?page=/hanoi/massage/',authenticated:false})).data;
  assert.equal(cards.representatives.find(x=>x.id===first).alt,'업소 시설');
  for(const id of [first,second])await request('images',{method:'POST',body:{action:'edit',id,title:'사진',alt:'사진',slot:'/hanoi/massage/amazing/#image-0',published:false}});
 });
 await t.test('요청 위조 방지',async()=>{assert.equal((await request('images',{method:'POST',origin:'https://evil.test',body:{action:'delete',id:first}})).status,403);});
 await t.test('삭제 후 이미지 접근 차단 및 저장 파일 정리',async()=>{assert.equal((await request('images',{method:'POST',body:{action:'delete',id:second}})).status,200);assert.equal((await request('file',{url:`/?id=${second}`})).status,404);assert.equal([...objects.keys()].filter(x=>x.startsWith(OUTPUT)).length,1);});
 await t.test('비밀번호 변경 시 모든 세션 폐기',async()=>{assert.equal((await request('auth',{method:'POST',body:{action:'password',currentPassword:'1',password:'2'}})).status,200);assert.equal((await request('auth')).data.authenticated,false);});
 await t.test('잘못된 로그인 반복 시 제한',async()=>{let r;for(let i=0;i<12;i++)r=await request('auth',{method:'POST',body:{username:'가',password:'wrong'}});assert.equal(r.status,429);});
 await pglite.close();
});
