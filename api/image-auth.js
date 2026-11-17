const crypto=require('node:crypto');
const {query}=require('../lib/db.cjs');
const s=require('../lib/security.cjs');
module.exports=s.wrapper(async(req,res)=>{
 if(req.method==='GET'){const initialized=!!(await query('SELECT 1 FROM image_manager.admin WHERE id=1')).rowCount;return s.json(res,{authenticated:await s.isAdmin(req),initialized});}
 if(req.method!=='POST')s.fail(405,'지원하지 않는 요청입니다.');
 s.origin(req);const b=await s.body(req);
 if(b.action==='logout'){await query('DELETE FROM image_manager.sessions WHERE token_hash=$1',[s.hash((req.headers.cookie||'').match(/dbj_session=([a-f0-9]{64})/)?.[1]||'')]);res.setHeader('Set-Cookie',s.sessionCookie(req,'',0));return s.json(res,{ok:true});}
 if(b.action==='password'){
   await s.requireAdmin(req);await s.rate(req,'password',10);const row=(await query('SELECT * FROM image_manager.admin WHERE id=1')).rows[0];
   if(typeof b.currentPassword!=='string'||!await s.passwordCheck(b.currentPassword,row.password_hash))s.fail(403,'현재 비밀번호가 올바르지 않습니다.');
   if(typeof b.password!=='string'||b.password.length<12||b.password.length>128)s.fail(400,'비밀번호는 12~128자로 입력해 주세요.');
   await query('UPDATE image_manager.admin SET password_hash=$1 WHERE id=1',[await s.passwordHash(b.password)]);await query('DELETE FROM image_manager.sessions');res.setHeader('Set-Cookie',s.sessionCookie(req,'',0));return s.json(res,{ok:true});
 }
 await s.rate(req,'login',10);
 if(typeof b.username!=='string'||typeof b.password!=='string'||b.password.length>128)s.fail(400,'아이디와 비밀번호를 확인해 주세요.');
 let row=(await query('SELECT * FROM image_manager.admin WHERE id=1')).rows[0];
 if(!row){
   const secret=process.env.IMAGE_ADMIN_SETUP_TOKEN;
   if(!secret||typeof b.setupToken!=='string'||s.hash(b.setupToken)!==s.hash(secret))s.fail(403,'최초 관리자 설정 링크가 필요합니다.');
   if(!/^[a-zA-Z0-9_-]{3,40}$/.test(b.username)||b.password.length<12)s.fail(400,'아이디는 영문·숫자 3~40자, 비밀번호는 12자 이상 입력해 주세요.');
   await query('INSERT INTO image_manager.admin(id,username,password_hash) VALUES(1,$1,$2) ON CONFLICT DO NOTHING',[b.username,await s.passwordHash(b.password)]);
   row=(await query('SELECT * FROM image_manager.admin WHERE id=1')).rows[0];
 }
 if(b.username!==row.username||!await s.passwordCheck(b.password,row.password_hash))s.fail(401,'아이디 또는 비밀번호가 올바르지 않습니다.');
 const token=crypto.randomBytes(32).toString('hex');
 await query('DELETE FROM image_manager.sessions WHERE expires_at<now()');
 await query('INSERT INTO image_manager.sessions(token_hash,expires_at) VALUES($1,now()+interval \'7 days\')',[s.hash(token)]);
 res.setHeader('Set-Cookie',s.sessionCookie(req,token));return s.json(res,{ok:true});
});
