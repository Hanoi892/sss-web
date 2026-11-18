const {query}=require('../lib/db.cjs');
const {optimize}=require('../lib/optimize.cjs');
const storage=require('../lib/storage.cjs');
const {randomUUID,createHash}=require('node:crypto');
const hash=b=>createHash('sha256').update(b).digest('hex');
async function normalizeExisting(){
 const {rows}=await query('SELECT id,path FROM image_manager.images WHERE width<>1280 OR height<>960 OR bytes>=307200 OR fit_version<2');
 let count=0;
 for(const row of rows){
  const original=await storage.download(storage.OUTPUT,row.path,307200);
  const result=await optimize(original);
  const path=`optimized/${row.id}/${randomUUID()}.${result.format}`;
  const {error}=await storage.storage().from(storage.OUTPUT).upload(path,result.buffer,{contentType:`image/${result.format}`,upsert:false});if(error)throw error;
  const saved=await storage.download(storage.OUTPUT,path,307199);
  if(hash(saved)!==hash(result.buffer)||result.width!==1280||result.height!==960)throw new Error('Normalized image validation failed');
  const updated=await query('UPDATE image_manager.images SET fit_version=2,path=$2,output_hash=$3,bytes=$4,width=1280,height=960,format=$5,version=version+1,updated_at=now() WHERE id=$1 AND path=$6',[row.id,path,hash(saved),saved.length,result.format,row.path]);
  // Retain previous objects for recovery; only the verified replacement is linked.
  if(updated.rowCount)count++;
 }
 console.log('image-manager: existing image normalization completed: '+count+' images; all 1280x960 and <307200 bytes');
}
module.exports={normalizeExisting};
