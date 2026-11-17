const {query}=require('../lib/db.cjs');
const s=require('../lib/security.cjs');
const {download,OUTPUT}=require('../lib/storage.cjs');
module.exports=s.wrapper(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method))s.fail(405,'지원하지 않는 요청입니다.');
 const id=new URL(req.url,'https://local').searchParams.get('id');if(!/^[a-f0-9-]{36}$/.test(id||''))s.fail(404,'사진을 찾지 못했습니다.');
 const row=(await query('SELECT path,published,format,output_hash FROM image_manager.images WHERE id=$1',[id])).rows[0];
 if(!row||(!row.published&&!await s.isAdmin(req)))s.fail(404,'사진을 찾지 못했습니다.');
 res.setHeader('Vary','Cookie');
 res.setHeader('Cache-Control',row.published?'private, no-cache, must-revalidate':'private, no-store');
 res.setHeader('ETag',`"${row.output_hash}"`);
 if(row.published&&req.headers['if-none-match']===`"${row.output_hash}"`){res.statusCode=304;return res.end();}
 const buffer=await download(OUTPUT,row.path,307200);
 res.setHeader('Content-Type',`image/${row.format}`);res.setHeader('Content-Length',buffer.length);res.end(req.method==='HEAD'?undefined:buffer);
});
