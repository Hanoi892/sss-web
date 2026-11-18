const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const venues=require('../lib/venues.json');
test('업소 사진함은 최신 지역별 실제 목록과 일치',()=>{
 const actual=new Set();
 for(const city of ['danang','hanoi','hochiminh','nhatrang'])for(const type of ['karaoke','massage']){
  const html=fs.readFileSync(`${city}/${type}/index.html`,'utf8');
  for(const match of html.matchAll(/<a class="(?:list-card|more)" href="([^"]+)"/g))actual.add(match[1]);
 }
 assert.deepEqual(venues.map(x=>x.page).sort(),[...actual].sort());
 assert.ok(venues.filter(x=>x.page.startsWith('/hanoi/karaoke/')).length>=8);
 assert.ok(venues.filter(x=>x.page.startsWith('/nhatrang/massage/')).length>=12);
 for(const name of ['/audi/','/bmw/','/323-massage/'])assert.ok(!venues.some(x=>x.page.includes(name)));
});
