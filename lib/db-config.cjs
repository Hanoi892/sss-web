const fs=require('node:fs');
const path=require('node:path');
const tls=require('node:tls');

function databaseConfig(connectionString){
  if(!connectionString)throw new Error('데이터베이스 연결 설정이 필요합니다.');
  const url=new URL(connectionString);
  const config={connectionString,max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:15000};
  if(url.hostname.endsWith('.pooler.supabase.com')||url.hostname.endsWith('.supabase.co')){
    // pg replaces an explicit SSL object when the URL contains SSL options.
    // Keep the provider CA and hostname verification in one authoritative config.
    for(const key of ['ssl','sslmode','sslrootcert','sslcert','sslkey','uselibpqcompat'])url.searchParams.delete(key);
    config.connectionString=url.toString();
    config.ssl={
      ca:[...tls.rootCertificates,fs.readFileSync(path.join(__dirname,'certs','supabase-prod-ca-2021.crt'),'utf8')],
      rejectUnauthorized:true,
    };
  }
  return config;
}
module.exports={databaseConfig};
