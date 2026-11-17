const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);
const {query} = require('./db.cjs');
const hash = v => crypto.createHash('sha256').update(v).digest('hex');
function fail(status,message) {throw Object.assign(new Error(message),{status});}
async function passwordHash(password) {
  const salt=crypto.randomBytes(16).toString('hex');
  return `${salt}:${(await scrypt(password,salt,64)).toString('hex')}`;
}
async function passwordCheck(password,stored) {
  const [salt,key]=stored.split(':');
  const actual=await scrypt(password,salt,64);
  return crypto.timingSafeEqual(actual,Buffer.from(key,'hex'));
}
function cookie(req) {const match=(req.headers.cookie||'').match(/(?:^|;\s*)dbj_session=([a-f0-9]{64})(?:;|$)/);return match?.[1];}
async function isAdmin(req) {
  const token=cookie(req);if(!token)return false;
  return !!(await query('SELECT 1 FROM image_manager.sessions WHERE token_hash=$1 AND expires_at>now()',[hash(token)])).rowCount;
}
async function requireAdmin(req){if(!await isAdmin(req))fail(401,'관리자 로그인이 필요합니다.');}
function origin(req) {
  const expected=process.env.APP_ORIGIN;
  const host=req.headers.host;
  const actual=req.headers.origin;
  const allowed=expected ? new URL(expected).host === host : !!host;
  if(!allowed || !actual || new URL(actual).host !== host || !/^https?:$/.test(new URL(actual).protocol))fail(403,'허용되지 않은 요청입니다.');
  if(req.headers['sec-fetch-site']==='cross-site')fail(403,'허용되지 않은 요청입니다.');
}
async function rate(req,action,max=10,seconds=900) {
  const ip=(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
  const key=hash(`${action}:${ip}`);
  const result=await query(`INSERT INTO image_manager.limits(key,reset_at) VALUES($1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN image_manager.limits.reset_at<now() THEN 1 ELSE image_manager.limits.hits+1 END,reset_at=CASE WHEN image_manager.limits.reset_at<now() THEN now()+$2*interval '1 second' ELSE image_manager.limits.reset_at END RETURNING hits`,[key,seconds]);
  if(result.rows[0].hits>max)fail(429,'요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
}
async function body(req) {
  if(req.body && typeof req.body==='object' && !Buffer.isBuffer(req.body))return req.body;
  let chunks=[],size=0;
  if(req.body){if(Buffer.byteLength(req.body)>16384)fail(413,'요청이 너무 큽니다.');return JSON.parse(req.body);}
  for await(const chunk of req){size+=chunk.length;if(size>16384)fail(413,'요청이 너무 큽니다.');chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{fail(400,'요청 형식이 올바르지 않습니다.');}
}
function wrapper(fn) {return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  try{await fn(req,res);}catch(e){if(!e.status)console.error('image-manager',e.code||e.name);res.statusCode=e.status||500;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:e.status?e.message:'처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'}));}
};}
function json(res,data,status=200){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));}
function sessionCookie(req,token,maxAge=604800){return `dbj_session=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${maxAge}${req.headers.host?.startsWith('127.0.0.1:')?'':'; Secure'}`;}
module.exports={hash,fail,passwordHash,passwordCheck,isAdmin,requireAdmin,origin,rate,body,wrapper,json,sessionCookie};
