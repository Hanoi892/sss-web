const {query}=require('../lib/db.cjs');
const {imageAlt}=require('../lib/image-alt.cjs');
async function prepareArticleImages(){
 const {rows}=await query('SELECT id,filename,title,alt,slot FROM image_manager.images ORDER BY slot,position,created_at');
 const positions=new Map();let changed=0;
 for(const row of rows){const n=(positions.get(row.slot)||0)+1;positions.set(row.slot,n);const alt=imageAlt(row,n);if(alt===row.alt)continue;
  const result=await query('UPDATE image_manager.images SET alt=$2,version=version+1,updated_at=now() WHERE id=$1 AND alt=$3',[row.id,alt,row.alt]);changed+=result.rowCount;
 }
 console.log('image-manager: article photo ALT preparation checked '+rows.length+' images; updated '+changed+' generic ALT fields');
}
module.exports={prepareArticleImages};
