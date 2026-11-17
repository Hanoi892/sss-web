const {randomUUID}=require('node:crypto');
const {query}=require('../lib/db.cjs');
const s=require('../lib/security.cjs');
const st=require('../lib/storage.cjs');
const {optimize}=require('../lib/optimize.cjs');
const slots=require('../lib/image-slots.json');
const slotSet=new Set(slots.map(x=>x.id));
module.exports=s.wrapper(async(req,res)=>{
 if(req.method!=='POST')s.fail(405,'지원하지 않는 요청입니다.');s.origin(req);await s.requireAdmin(req);
 const b=await s.body(req);
 if(b.action==='prepare'){
   await s.rate(req,'prepare',100,3600);
   if(!Number.isSafeInteger(b.bytes)||b.bytes<12||b.bytes>st.MAX_INPUT)s.fail(413,'사진은 장당 최대 50MB까지 업로드할 수 있습니다.');
   if(typeof b.filename!=='string'||! /\.(jpe?g|png|webp|avif|hei[cf])$/i.test(b.filename))s.fail(400,'지원하지 않는 파일 형식입니다.');
   await st.initStorage();
   const expired=(await query("DELETE FROM image_manager.uploads WHERE created_at<now()-interval '2 hours' RETURNING path")).rows;
   if(expired.length){const {error}=await st.storage().from(st.INPUT).remove(expired.map(x=>x.path));if(error)console.error('incoming cleanup failed');}
   const id=randomUUID(),path=`incoming/${id}`;
   await query('INSERT INTO image_manager.uploads(id,path,filename,declared_bytes) VALUES($1,$2,$3,$4)',[id,path,b.filename.slice(0,255),b.bytes]);
   const {data,error}=await st.storage().from(st.INPUT).createSignedUploadUrl(path);if(error)throw error;
   return s.json(res,{id,url:data.signedUrl});
 }
 if(b.action!=='complete')s.fail(400,'요청을 확인해 주세요.');
 if(!slotSet.has(b.slot))s.fail(400,'사이트 반영 위치를 선택해 주세요.');
 if(!/^[a-f0-9-]{36}$/.test(b.id||''))s.fail(400,'업로드 ID가 올바르지 않습니다.');
 if(b.replaceId&&!/^[a-f0-9-]{36}$/.test(b.replaceId))s.fail(400,'교체 ID가 올바르지 않습니다.');
 if(typeof b.title!=='string'||b.title.length>200||typeof b.alt!=='string'||b.alt.length>500)s.fail(400,'제목 또는 ALT가 너무 깁니다.');
 if(b.published&&(!b.alt.trim()))s.fail(400,'공개 사진의 대체 텍스트를 입력해 주세요.');
 const upload=(await query("UPDATE image_manager.uploads SET status='processing' WHERE id=$1 AND status='pending' AND created_at>now()-interval '2 hours' RETURNING *",[b.id])).rows[0];
 if(!upload)s.fail(409,'만료되었거나 이미 처리 중인 업로드입니다.');
 let outputPath,previousPath,committed=false;
 try{
   const input=await st.download(st.INPUT,upload.path,st.MAX_INPUT);
   if(input.length!==Number(upload.declared_bytes))s.fail(422,'업로드한 파일의 실제 용량이 일치하지 않습니다.');
   const sourceHash=s.hash(input);
   const duplicate=(await query('SELECT id FROM image_manager.images WHERE source_hash=$1',[sourceHash])).rows[0];
   if(duplicate&&duplicate.id!==b.replaceId)s.fail(409,'이미 등록한 사진입니다. 이미지 목록에서 위치를 변경해 주세요.');
   const optimized=await optimize(input);
   if(optimized.bytes>307200)s.fail(422,'300KB 검증에 실패했습니다.');
   const id=b.replaceId||randomUUID(),outputHash=s.hash(optimized.buffer);
   outputPath=`optimized/${id}/${randomUUID()}.${optimized.format}`;
   const {error}=await st.storage().from(st.OUTPUT).upload(outputPath,optimized.buffer,{contentType:`image/${optimized.format}`,upsert:false});if(error)throw error;
   // Verify bytes actually persisted, before making any metadata visible.
   const saved=await st.download(st.OUTPUT,outputPath,307200);
   if(saved.length!==optimized.bytes||s.hash(saved)!==outputHash)s.fail(422,'저장된 파일 검증에 실패했습니다.');
   const args=[id,outputPath,sourceHash,outputHash,upload.filename,b.title,b.alt,input.length,optimized.bytes,optimized.originalWidth,optimized.originalHeight,optimized.width,optimized.height,optimized.format,b.slot,!!b.published];
   if(b.replaceId){
     const result=await query(`WITH previous AS (SELECT id,path FROM image_manager.images WHERE id=$1 FOR UPDATE) UPDATE image_manager.images SET path=$2,source_hash=$3,output_hash=$4,filename=$5,title=$6,alt=$7,original_bytes=$8,bytes=$9,original_width=$10,original_height=$11,width=$12,height=$13,format=$14,slot=$15,published=$16,version=version+1,updated_at=now() FROM previous WHERE image_manager.images.id=previous.id RETURNING image_manager.images.id,previous.path AS previous_path`,args);
     if(!result.rowCount)s.fail(404,'교체할 사진이 없습니다.');
     previousPath=result.rows[0].previous_path;
   }else{
     await query(`INSERT INTO image_manager.images(id,path,source_hash,output_hash,filename,title,alt,original_bytes,bytes,original_width,original_height,width,height,format,slot,published,position) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,(SELECT COALESCE(max(position),0)+1 FROM image_manager.images))`,args);
   }
   committed=true;
   if(previousPath)await st.remove(st.OUTPUT,previousPath).catch(()=>console.error('previous image cleanup failed'));
   return s.json(res,{ok:true,id,bytes:optimized.bytes,width:optimized.width,height:optimized.height,originalWidth:optimized.originalWidth,originalHeight:optimized.originalHeight,format:optimized.format});
 }catch(e){if(e.code==='23505')s.fail(409,'이미 등록한 사진입니다.');throw e;}
 finally{
   if(outputPath&&!committed)await st.remove(st.OUTPUT,outputPath).catch(()=>{});
   await st.remove(st.INPUT,upload.path).catch(()=>{});
   await query('DELETE FROM image_manager.uploads WHERE id=$1',[b.id]);
 }
});
