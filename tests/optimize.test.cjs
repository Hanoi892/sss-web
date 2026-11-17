const {test}=require('node:test');
const assert=require('node:assert/strict');
const sharp=require('sharp');
const {randomBytes}=require('node:crypto');
const {optimize,MAX_BYTES}=require('../lib/optimize.cjs');
async function verify(input){const result=await optimize(input);assert.ok(result.bytes<=MAX_BYTES);assert.equal(result.bytes,result.buffer.length);const meta=await sharp(result.buffer).metadata();assert.equal(meta.width,result.width);assert.equal(meta.height,result.height);assert.ok(Math.abs(result.width/result.height-result.originalWidth/result.originalHeight)<.01);assert.ok(meta.icc);return result;}
for(const [name,w,h,q,min] of [['1MB',1000,650,90,1e6],['5MB',2100,1600,90,5e6],['10MB 이상',4200,3000,98,10e6]])test(name+' 고해상도 JPEG → 307200바이트 이하',{timeout:300000},async()=>{
 const input=await sharp(randomBytes(w*h*3),{raw:{width:w,height:h,channels:3}}).jpeg({quality:q,chromaSubsampling:'4:4:4'}).toBuffer();assert.ok(input.length>=min,`${input.length} >= ${min}`);const result=await verify(input);console.log(JSON.stringify({case:name,inputBytes:input.length,outputBytes:result.bytes,input:[w,h],output:[result.width,result.height],format:result.format}));
});
test('압축 가능한 사진은 원본 해상도 유지',async()=>{const input=await sharp({create:{width:4000,height:3000,channels:3,background:'#c65e42'}}).jpeg({quality:100}).toBuffer();const result=await verify(input);assert.equal(result.width,4000);assert.equal(result.height,3000);});
test('PNG 투명도 및 색상 유지',async()=>{const input=await sharp({create:{width:500,height:300,channels:4,background:{r:210,g:80,b:40,alpha:.4}}}).png().toBuffer();const result=await verify(input);const meta=await sharp(result.buffer).metadata();assert.equal(meta.hasAlpha,true);const px=await sharp(result.buffer).raw().toBuffer();for(const [i,target] of [[0,210],[1,80],[2,40],[3,102]])assert.ok(Math.abs(px[i]-target)<6,`${px[i]} ~ ${target}`);});
test('모바일 EXIF 방향 보정 및 위치정보 제거',async()=>{const input=await sharp({create:{width:1200,height:800,channels:3,background:'#ccddee'}}).jpeg().withMetadata({orientation:6}).toBuffer();const result=await verify(input);assert.equal(result.width,800);assert.equal(result.height,1200);assert.equal((await sharp(result.buffer).metadata()).orientation,undefined);});
test('WebP, AVIF 입력 처리',async()=>{for(const format of ['webp','avif']){const input=await sharp({create:{width:800,height:600,channels:3,background:'green'}})[format]().toBuffer();await verify(input);}});
test('악성·미지원·손상 파일은 게시하지 않음',async()=>{for(const input of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),Buffer.from('not an image file'),Buffer.concat([Buffer.from([255,216,255]),Buffer.alloc(100)])])await assert.rejects(()=>optimize(input),{status:422});});
test('여러 장 동시 처리',async()=>{const input=await sharp({create:{width:640,height:480,channels:3,background:'blue'}}).png().toBuffer();const results=await Promise.all([verify(input),verify(input),verify(input)]);assert.equal(results.length,3);});
