const {query}=require('../lib/db.cjs');
const s=require('../lib/security.cjs');
const st=require('../lib/storage.cjs');
const slots=require('../lib/image-slots.json');
const slotSet=new Set(slots.map(x=>x.id));
module.exports=s.wrapper(async(req,res)=>{
 const u=new URL(req.url,'https://local');
 if(req.method==='GET'){
   if(u.searchParams.get('admin')==='1'){
     await s.requireAdmin(req);
     const {rows}=await query('SELECT * FROM image_manager.images ORDER BY position,created_at');
     return s.json(res,{images:rows.map(({path,source_hash,output_hash,...row})=>({...row,url:`/api/image-file?id=${row.id}&v=${row.version}`})),slots});
   }
   const page=u.searchParams.get('page');
   if(!slots.some(x=>x.page===page))return s.json(res,{images:[]});
   const {rows}=await query("SELECT id,title,alt,width,height,slot,version FROM image_manager.images WHERE published=true AND split_part(slot,'#',1)=$1 ORDER BY position,created_at",[page]);
   return s.json(res,{images:rows.map(row=>({...row,url:`/api/image-file?id=${row.id}&v=${row.version}`}))});
 }
 if(req.method!=='POST')s.fail(405,'지원하지 않는 요청입니다.');s.origin(req);await s.requireAdmin(req);const b=await s.body(req);
 if(b.action==='reorder'){
   if(!Array.isArray(b.ids)||b.ids.length>5000||new Set(b.ids).size!==b.ids.length||b.ids.some(id=>!/^[a-f0-9-]{36}$/.test(id)))s.fail(400,'순서 정보를 확인해 주세요.');
   await query('UPDATE image_manager.images i SET position=a.n::int FROM unnest($1::uuid[]) WITH ORDINALITY AS a(id,n) WHERE i.id=a.id',[b.ids]);return s.json(res,{ok:true});
 }
 if(!/^[a-f0-9-]{36}$/.test(b.id||''))s.fail(400,'사진 ID를 확인해 주세요.');
 if(b.action==='delete'){
   const row=(await query('DELETE FROM image_manager.images WHERE id=$1 RETURNING path',[b.id])).rows[0];if(!row)s.fail(404,'사진을 찾지 못했습니다.');
   await st.remove(st.OUTPUT,row.path).catch(()=>console.error('optimized cleanup failed'));return s.json(res,{ok:true});
 }
 if(b.action==='edit'){
   if(!slotSet.has(b.slot)||typeof b.title!=='string'||b.title.length>200||typeof b.alt!=='string'||b.alt.length>500)s.fail(400,'제목, ALT, 반영 위치를 확인해 주세요.');
   if(b.published&&!b.alt.trim())s.fail(400,'공개 사진의 ALT를 입력해 주세요.');
   const result=await query('UPDATE image_manager.images SET title=$2,alt=$3,slot=$4,published=$5,version=version+1,updated_at=now() WHERE id=$1',[b.id,b.title,b.alt,b.slot,!!b.published]);if(!result.rowCount)s.fail(404,'사진을 찾지 못했습니다.');return s.json(res,{ok:true});
 }
 s.fail(400,'요청을 확인해 주세요.');
});
