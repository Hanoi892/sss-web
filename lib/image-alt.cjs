const venues=require('./venues.json');
function imageAlt(row,index=1){
 const alt=(row.alt||'').trim();
 const base=(row.filename||row.title||'').replace(/\.[^.]+$/,'').trim();
 const isDefault=!alt||alt===row.filename||alt===base;
 const descriptive=/(외관|건물|입구|간판|내부|시설|룸|로비|소파|베드|침대|관리실|샤워|사우나|복도|객실|메뉴|가격|수영장)/.test(alt);
 if(alt&&(!isDefault||descriptive))return alt;
 const page=row.slot.split('#')[0],venue=venues.find(v=>v.page===page);
 const name=venue?.label||'업소';
 return `${name} ${row.slot.endsWith('#cover')?'대표 사진':'상세 사진 '+index}`;
}
module.exports={imageAlt};
