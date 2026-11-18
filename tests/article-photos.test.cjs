const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
test('대표 사진 유지·추가 사진 4장을 서로 다른 본문 구간에 모두 배치',async()=>{
 const {document}=parseHTML('<html><head></head><body><article class="prose"><div class="detail-hero">사진 준비 중</div><h2>핵심 정보</h2><p>소개 본문</p><h2>찾아가는 길</h2><p>주소 본문</p><h2>시설 안내</h2><p>시설 본문</p><h2>방문 전 확인</h2><p>방문 본문</p><h2>자주 묻는 질문</h2><div class="faq">질문</div></article></body></html>');
 const cover={id:'cover',slot:'/danang/karaoke/benz/#cover',url:'/cover.webp',alt:'벤츠 가라오케 외관',width:1280,height:960};
 const photos=Array.from({length:4},(_,i)=>({id:'photo'+i,slot:'/danang/karaoke/benz/#gallery',url:'/photo'+i+'.webp',alt:'벤츠 가라오케 상세 사진 '+(i+1),width:1280,height:960}));
 const create=document.createElement.bind(document);document.createElement=name=>{const element=create(name);if(name==='dialog'){element.showModal=()=>element.setAttribute('open','');element.close=()=>element.removeAttribute('open');}return element;};
 document.querySelector('.detail-hero').getBoundingClientRect=()=>({top:0});
 vm.runInNewContext(fs.readFileSync('image-manager.js','utf8'),{document,location:{pathname:'/danang/karaoke/benz/',href:'https://site.test/danang/karaoke/benz/'},URL,window:{addEventListener(){}},innerHeight:900,Image:function(){return document.createElement('img');},fetch:async()=>({ok:true,json:async()=>({images:[cover,...photos],representatives:[cover]})}),MutationObserver:class{observe(){}},setInterval(){}});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(document.querySelector('.detail-hero img').getAttribute('src'),'/cover.webp');
 const figures=[...document.querySelectorAll('.dbj-article-photo')];assert.equal(figures.length,4);
 for(let i=0;i<4;i++){assert.equal(figures[i].previousElementSibling.tagName,'P');assert.equal(figures[i].querySelector('img').getAttribute('alt'),photos[i].alt);assert.equal(figures[i].querySelector('img').loading,'lazy');}
 assert.equal(document.querySelector('.faq').textContent,'질문');
 assert.equal(document.querySelector('#dbj-venue-gallery'),null);
 figures[0].querySelector('button').onclick();assert.ok(document.querySelector('#dbj-photo-dialog').hasAttribute('open'));assert.equal(document.querySelector('.dbj-photo-full').getAttribute('src'),photos[0].url);
 document.querySelector('.dbj-photo-close').onclick();assert.ok(!document.querySelector('#dbj-photo-dialog').hasAttribute('open'));
 document.querySelector('.detail-hero button').onclick();assert.equal(document.querySelector('.dbj-photo-full').getAttribute('src'),cover.url);
});
