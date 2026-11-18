const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('나중에 교체된 관련 업소 카드에도 해당 주소의 대표 이미지 연결',async()=>{
 let nodes=[],callback;
 function card(href){const classes=new Set(['related-venue-card__media']);return {children:[],style:{},innerHTML:'',dataset:{},classList:{contains:x=>classes.has(x),add:x=>classes.add(x),remove:x=>classes.delete(x)},getAttribute:()=>null,setAttribute(){},removeAttribute(){},closest:selector=>selector==='a[href]'?{getAttribute:()=>href}:null,getBoundingClientRect:()=>({top:0}),replaceChildren(...children){this.children=children;},append(child){this.children.push(child);}};}
 const first=card('/danang/karaoke/benz/');nodes=[first];
 const payload={images:[],representatives:[{id:'benz',slot:'/danang/karaoke/benz/#cover',url:'/api/image-file?id=benz',title:'벤츠 대표',alt:'벤츠 룸',width:1280,height:960}]};
 const document={hidden:false,body:{},querySelectorAll:()=>nodes,createElement:()=>({style:{}}),head:{append(){}},addEventListener(){}};
 const context={document,location:{pathname:'/danang/karaoke/one-opera/',href:'https://site.test/danang/karaoke/one-opera/'},window:{addEventListener(){}},innerHeight:900,URL,Image:class{constructor(){this.style={};}},MutationObserver:class{constructor(fn){callback=fn;}observe(){}},fetch:async()=>({ok:true,json:async()=>payload}),setInterval(){}};
 vm.runInNewContext(fs.readFileSync('image-manager.js','utf8'),context);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(first.children[0].src,'/api/image-file?id=benz');
 const replacement=card('https://site.test/danang/karaoke/benz?from=related');const other=card('/danang/karaoke/newmin/');nodes=[replacement,other];
 callback([{addedNodes:[{nodeType:1,matches:()=>false,querySelector:()=>replacement}]}]);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(replacement.children[0].src,'/api/image-file?id=benz');assert.equal(replacement.children[0].alt,'벤츠 룸');
 assert.equal(other.children.length,0,'다른 업소에 벤츠 사진을 넣지 않음');
 const again=card('/danang/karaoke/benz/');nodes=[again,other];
 callback([{addedNodes:[{nodeType:1,matches:()=>true}]}]);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(again.children[0].src,'/api/image-file?id=benz','카드 개수가 같아도 교체된 DOM을 감지');
});
