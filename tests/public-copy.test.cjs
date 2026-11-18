const {test}=require('node:test'),assert=require('node:assert/strict');
const {cleanPublicHtml}=require('../scripts/public-copy.cjs');
const {imageAlt}=require('../lib/image-alt.cjs');
test('작업용 표현을 방문자 안내로 바꾸고 주소·스크립트는 보존',()=>{
 const html='<h2>하노이 새 업소 상세 허브</h2><h2>VVS·런던 업소 카드</h2><p>카테고리 메인글과 상세글에서 확인하세요.</p><p>사용자가 이미지와 ALT 문구를 제공하면 추가할 수 있습니다.</p><a href="/hanoi/karaoke/vvs/">VVS</a><script>const label="메인글";</script>';
 const result=cleanPublicHtml(html);
 assert.ok(result.includes('하노이 업소 더 살펴보기'));assert.ok(result.includes('VVS·런던 가라오케 안내'));
 assert.ok(!result.includes('카테고리 메인글'));assert.ok(!result.includes('ALT 문구'));
 assert.ok(result.includes('href="/hanoi/karaoke/vvs/"'));assert.ok(result.includes('<script>const label="메인글";</script>'));
});
test('파일명 ALT만 업소 안내로 바꾸고 구체적인 설명은 유지',()=>{
 const row={slot:'/danang/karaoke/benz/#gallery',filename:'벤츠가라오케2.png',title:'벤츠가라오케2',alt:'벤츠가라오케2'};
 assert.equal(imageAlt(row,2),'다낭 벤츠 가라오케 상세 사진 2');
 assert.equal(imageAlt({...row,alt:'벤츠 가라오케 건물 입구'},2),'벤츠 가라오케 건물 입구');
});
