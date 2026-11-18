const sharp=require('sharp');
const MAX_BYTES=307199,MAX_PIXELS=64000000;
sharp.cache({memory:32,files:0,items:16});sharp.concurrency(1);
function invalid(message){throw Object.assign(new Error(message),{status:422});}
function sniff(b){
 if(b.length<12)return null;
 if(b[0]===255&&b[1]===216&&b[2]===255)return 'jpeg';
 if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
 if(b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP')return 'webp';
 if(b.toString('ascii',4,8)==='ftyp'&&/avif|avis|heic|heix|hevc|hevx|mif1|msf1/.test(b.toString('ascii',8,40)))return 'heif';
 return null;
}
async function optimize(input){
 if(!sniff(input))invalid('지원되지 않는 파일입니다. JPG, PNG, WebP, AVIF, HEIC 사진을 선택해 주세요.');
 let meta;
 try{meta=await sharp(input,{limitInputPixels:MAX_PIXELS,failOn:'warning'}).metadata();}catch{invalid('이미지를 읽을 수 없거나 해상도 제한(6,400만 화소)을 초과했습니다. HEIC는 이 서버에서 변환 가능한 파일만 지원합니다.');}
 if(!['jpeg','png','webp','heif','avif'].includes(meta.format)||(meta.pages||1)>1)invalid('움직이는 이미지와 여러 장이 묶인 파일은 지원하지 않습니다.');
 const swapped=[5,6,7,8].includes(meta.orientation);
 const width=swapped?meta.height:meta.width,height=swapped?meta.width:meta.height;
 if(!width||!height)invalid('이미지 해상도를 확인하지 못했습니다.');
 const encode=async(w,format,quality)=>{
   let pipeline=sharp(input,{limitInputPixels:MAX_PIXELS,failOn:'warning'}).rotate().trim({background:'#11151b',threshold:5}).resize({width:1280,height:960,fit:'cover',position:'centre'}).withIccProfile('srgb');
   pipeline=format==='webp'?pipeline.webp({quality,effort:5,alphaQuality:100,smartSubsample:true}):pipeline.avif({quality,effort:2,chromaSubsampling:'4:4:4'});
   return pipeline.toBuffer({resolveWithObject:true});
 };
 try{
   // Fixed 1280x960 canvas; fill consistently without letterboxing; crop centrally.
   for(const w of [1280]){
     for(const format of ['webp','avif']){
       let low=1,high=95,best=null;
       const floor=await encode(w,format,low);
       if(floor.data.length>MAX_BYTES)continue;
       best={...floor,quality:low};
       while(low<=high){const q=Math.ceil((low+high)/2);const candidate=await encode(w,format,q);if(candidate.data.length<=MAX_BYTES){best={...candidate,quality:q};low=q+1;}else high=q-1;}
       const result=await sharp(best.data).metadata();
       if(best.data.length>MAX_BYTES||result.width!==1280||result.height!==960)invalid('300KB 이하 검증에 실패했습니다. 원본은 게시되지 않았습니다.');
       return {buffer:best.data,bytes:best.data.length,width:result.width,height:result.height,format,quality:best.quality,originalWidth:width,originalHeight:height,originalFormat:meta.format,hasAlpha:!!meta.hasAlpha};
     }
   }
 }catch(e){if(e.status)throw e;invalid('이미지 변환에 실패했습니다. HEIC 파일은 JPG로 내보낸 후 다시 시도해 주세요.');}
 invalid('화질을 유지하면서 300KB 이하로 변환하지 못했습니다. 다른 사진을 선택해 주세요.');
}
module.exports={optimize,sniff,MAX_BYTES,MAX_PIXELS};
