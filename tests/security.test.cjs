const {test}=require('node:test');const assert=require('node:assert/strict');
const s=require('../lib/security.cjs');
test('비밀번호 scrypt 검증과 임의 salt',async()=>{const a=await s.passwordHash('secure-password-123');const b=await s.passwordHash('secure-password-123');assert.notEqual(a,b);assert.equal(await s.passwordCheck('secure-password-123',a),true);assert.equal(await s.passwordCheck('wrong',a),false);});
test('세션 없는 관리 API 접근 차단',async()=>{await assert.rejects(()=>s.requireAdmin({headers:{}}),{status:401});});
test('교차 출처 요청·Origin 없는 변경 요청 차단',()=>{for(const origin of [undefined,'https://attacker.invalid'])assert.throws(()=>s.origin({headers:{host:'example.com',origin}}),{status:403});assert.doesNotThrow(()=>s.origin({headers:{host:'example.com',origin:'https://example.com'}}));});
test('운영 쿠키 보안',()=>{const cookie=s.sessionCookie({headers:{host:'example.com'}},'abc');for(const part of ['HttpOnly','Secure','SameSite=Strict'])assert.ok(cookie.includes(part));});
test('로그아웃 시 잘못된 세션 토큰으로 DB 조회 불필요',async()=>{assert.equal(await s.isAdmin({headers:{cookie:'dbj_session=invalid'}}),false);});
