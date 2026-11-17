const {createClient}=require('@supabase/supabase-js');
let client,ready;
const INPUT='dbj-image-incoming', OUTPUT='dbj-image-optimized';
const MAX_INPUT=50*1024*1024;
function storage(){if(!client){const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;if(!url||!key)throw new Error('이미지 저장소 설정이 필요합니다.');client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});}return client.storage;}
async function initStorage(){
 if(!ready)ready=(async()=>{for(const [name,size] of [[INPUT,MAX_INPUT],[OUTPUT,307200]]){const {data,error}=await storage().getBucket(name);if(error){const result=await storage().createBucket(name,{public:false,fileSizeLimit:size});if(result.error&&!/exist/i.test(result.error.message))throw result.error;}else if(data.public)throw new Error('관리자 이미지 저장소는 비공개여야 합니다.');}})().catch(e=>{ready=null;throw e;});return ready;
}
async function download(bucket,path,max){
 const {data,error}=await storage().from(bucket).createSignedUrl(path,60);if(error)throw error;
 const response=await fetch(data.signedUrl);if(!response.ok)throw new Error('저장소 다운로드 실패');
 const length=Number(response.headers.get('content-length'));if(length>max)throw Object.assign(new Error('파일 용량 제한을 초과했습니다.'),{status:413});
 const reader=response.body.getReader();let size=0,chunks=[];
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Object.assign(new Error('파일 용량 제한을 초과했습니다.'),{status:413});}chunks.push(Buffer.from(value));}
 return Buffer.concat(chunks);
}
async function remove(bucket,path){const {error}=await storage().from(bucket).remove([path]);if(error)throw error;}
module.exports={storage,initStorage,download,remove,INPUT,OUTPUT,MAX_INPUT};
