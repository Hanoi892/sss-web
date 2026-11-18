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

test('경쟁 업소정보 사이트 출처 링크 제거, 업소 정보와 자체 링크·공식 사이트 보존',()=>{
 const html='<main><p class="source">정보 출처: <a href="https://vnbam365.com/ho-chi-minh/venues/ho-chi-minh-102-karaoke/" target="_blank">업소 공개 소개 자료</a> · 2026년 기준</p><p class="source">공개 정보 참고: <a href="https://vietbamso.com/hanoi-sora-massage/">소라 마사지</a></p><p>가라오케 주소 <a href="https://www.hanoiboom.com/demo/">참고하기</a> / <a href="/hochiminh/karaoke/102/">동밤정 102 상세</a></p><p>공식 사이트 <a href="https://example-venue.vn/">매장 홈페이지</a></p></main>';
 const output=cleanPublicHtml(html);
 assert.ok(!/vnbam365|vietbamso|hanoiboom|정보 출처:|공개 정보 참고:/.test(output));
 assert.ok(output.includes('가라오케 주소'));
 assert.ok(output.includes('href="/hochiminh/karaoke/102/"'));
 assert.ok(output.includes('href="https://example-venue.vn/"'));
 assert.ok(!output.includes('<p class="source">'));
});
test('경쟁 사이트가 실린 스크립트 내용은 변형하지 않음',()=>{
 const html='<script>const test="<a href=\\"https://vnbam365.com/test\\">a</a>";</script><p class="source"><a href="https://vnbam365.com/page">가져온 안내</a></p>';
 const result=cleanPublicHtml(html);
 assert.ok(result.includes('https://vnbam365.com/test'));
 assert.ok(!result.includes('https://vnbam365.com/page'));
});
