const {test}=require('node:test');
const assert=require('node:assert/strict');
const {X509Certificate}=require('node:crypto');
const tls=require('node:tls');
const {Client}=require('pg');
const {databaseConfig}=require('../lib/db-config.cjs');

test('Supabase URL의 sslmode가 명시적인 CA 설정을 덮어쓰지 않음',()=>{
 for(const host of ['aws-0-ap-southeast-1.pooler.supabase.com','db.test-project.supabase.co']){
  const config=databaseConfig(`postgres://postgres:example@${host}:6543/postgres?sslmode=require&pgbouncer=true`);
  const effective=new Client(config).connectionParameters;
  assert.equal(effective.ssl.rejectUnauthorized,true);
  assert.ok(Array.isArray(effective.ssl.ca));
  assert.equal(effective.ssl.ca.length,tls.rootCertificates.length+1);
  assert.ok(!new URL(config.connectionString).searchParams.has('sslmode'));
  assert.equal(new URL(config.connectionString).searchParams.get('pgbouncer'),'true');
  assert.equal(effective.ssl.checkServerIdentity,undefined,'Node 기본 호스트 이름 검증을 유지');
 }
});
test('기존 URL에 검증 비활성화 옵션이 있어도 Supabase는 엄격하게 검증',()=>{
 const config=databaseConfig('postgres://postgres:example@db.test.supabase.co/postgres?sslmode=no-verify&ssl=false&uselibpqcompat=true');
 assert.equal(new Client(config).connectionParameters.ssl.rejectUnauthorized,true);
});
test('번들 CA는 현재 유효한 Supabase 루트 인증서',()=>{
 const config=databaseConfig('postgres://postgres:example@db.test.supabase.co/postgres');
 const certificate=new X509Certificate(config.ssl.ca.at(-1));
 assert.equal(certificate.ca,true);
 assert.ok(certificate.subject.includes('Supabase Root 2021 CA'));
 assert.ok(certificate.verify(certificate.publicKey));
 assert.ok(Date.parse(certificate.validTo)>Date.now());
 assert.equal(certificate.fingerprint256,'80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA');
});
test('다른 데이터베이스 연결 설정은 변경하지 않음',()=>{
 const connectionString='postgres://user:example@localhost/test?application_name=test';
 assert.equal(databaseConfig(connectionString).connectionString,connectionString);
 assert.equal(databaseConfig(connectionString).ssl,undefined);
});
