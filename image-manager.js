(()=>{
 let containers=[];
 const originals=new WeakMap();
 const page=location.pathname.replace(/index\.html$/,'').replace(/\/?$/,'/');


 function placeArticlePhotos(hero,photos){
  const article=hero.closest('article')||hero.closest('.prose');if(!article)return;
  document.getElementById('dbj-venue-gallery')?.remove();
  article.querySelectorAll('.dbj-article-photo').forEach(figure=>figure.remove());
  if(!photos.length)return;
  const headings=[];
  for(const heading of article.querySelectorAll(':scope > h2')){
   if(/FAQ|자주 묻|같은 지역|다른.*비교|함께|자료 출처/.test(heading.textContent))break;
   headings.push(heading);
  }
  const anchors=headings.map(heading=>{
   let tail=heading;
   while(tail.nextElementSibling&&tail.nextElementSibling.tagName!=='H2'&&!tail.nextElementSibling.matches('.faq,.source,.gridlinks,.related-bottom'))tail=tail.nextElementSibling;
   return tail;
  });
  if(!anchors.length)anchors.push(hero);
  const tails=new Map();
  photos.forEach((photo,index)=>{
   const anchor=anchors[Math.min(anchors.length-1,Math.floor(index*anchors.length/photos.length))];
   const figure=document.createElement('figure');figure.className='dbj-article-photo';figure.dataset.imageId=photo.id;
   const img=new Image();img.src=photo.url;img.alt=photo.alt||'업소 상세 사진 '+(index+1);img.width=photo.width;img.height=photo.height;img.loading='lazy';img.decoding='async';
   const caption=document.createElement('figcaption');caption.textContent=img.alt;figure.append(img,caption);
   (tails.get(anchor)||anchor).after(figure);tails.set(anchor,figure);
  });
 }

 let last='',busy=false;
 async function update(){
  if(busy||document.hidden)return;busy=true;
  try{
   const response=await fetch(`/api/images?page=${encodeURIComponent(page)}`,{cache:'no-store'});if(!response.ok)return;
   const {images,representatives=[]}=await response.json();const next=[...document.querySelectorAll('.detail-hero,.picture,.thumb,.related-venue-card__media')];
   const changed=next.length!==containers.length||next.some((el,i)=>el!==containers[i]);
   const fingerprint=JSON.stringify([images,representatives]);if(fingerprint===last&&!changed)return;last=fingerprint;containers=next;
   containers.forEach((el,i)=>{
    if(!originals.has(el))originals.set(el,{html:el.innerHTML,hidden:el.getAttribute('aria-hidden'),style:el.getAttribute('style')});
    const original=originals.get(el);
    const link=el.closest('a[href]')||el.closest('.card')?.querySelector('a[href]');
    const href=link?new URL(link.getAttribute('href'),location.href).pathname.replace(/index\.html$/,'').replace(/\/?$/,'/'):null;
    const direct=el.classList.contains('detail-hero');
    const cover=images.filter(x=>x.slot===page+'#cover');
    const gallery=images.filter(x=>x.slot===page+'#gallery');
    const photos=direct&&cover.length?cover.slice(0,1):href&&representatives.some(x=>x.slot===href+'#cover')?representatives.filter(x=>x.slot===href+'#cover').slice(0,1):images.filter(x=>x.slot===`${page}#image-${i}`);
    if(direct)placeArticlePhotos(el,gallery);
    if(!photos.length){if(el.dataset.managed){el.innerHTML=original.html;el.classList.remove('dbj-has-image');delete el.dataset.managed;for(const [key,value] of [['aria-hidden',original.hidden],['style',original.style]]){if(value===null)el.removeAttribute(key);else el.setAttribute(key,value);}}return;}
    el.dataset.managed='true';el.classList.add('dbj-has-image');el.removeAttribute('aria-hidden');
    el.style.position='relative';el.style.overflow='hidden';
    let current=0;
    function render(){
     const p=photos[current],img=new Image();img.alt=p.alt;img.title=p.title;img.width=p.width;img.height=p.height;img.loading=el.getBoundingClientRect().top<innerHeight?'eager':'lazy';img.decoding='async';img.src=p.url;
     img.style.cssText='display:block;width:100%;height:100%;object-fit:cover;position:absolute;inset:0';
     el.replaceChildren(img);
     if(photos.length>1){const controls=document.createElement('span');controls.style.cssText='position:absolute;bottom:8px;right:8px;display:flex;gap:6px;align-items:center;background:#0b0d12dd;border-radius:8px;padding:3px 6px;color:white;letter-spacing:normal';
      for(const [label,delta] of [['이전 사진',-1],['다음 사진',1]]){const btn=document.createElement('button');btn.type='button';btn.textContent=delta<0?'‹':'›';btn.setAttribute('aria-label',label);btn.style.cssText='cursor:pointer;color:white;background:transparent;border:0;font-size:24px;min-width:32px;min-height:32px';btn.onclick=e=>{e.preventDefault();e.stopPropagation();current=(current+delta+photos.length)%photos.length;render();};controls.append(btn);}el.append(controls);}
    }render();
   });
  }catch{}finally{busy=false;}
 }
 const style=document.createElement('style');style.textContent='.dbj-has-image::after{display:none!important}.detail-hero.dbj-has-image,.picture.dbj-has-image,.related-venue-card__media.dbj-has-image{aspect-ratio:4/3;height:auto}.thumb.dbj-has-image{aspect-ratio:4/3;min-height:0;height:111px}.dbj-article-photo{margin:28px 0}.dbj-article-photo img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background:#11151b;border-radius:10px}.dbj-article-photo figcaption{font-size:12px;color:var(--sub,#a8b1c1);text-align:center;margin-top:8px;letter-spacing:normal}';document.head.append(style);
 const observer=new MutationObserver(records=>{if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&(node.matches('.detail-hero,.picture,.thumb,.related-venue-card__media')||node.querySelector('.detail-hero,.picture,.thumb,.related-venue-card__media')))))update();});
 observer.observe(document.body,{childList:true,subtree:true});
 update();window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);setInterval(update,60000);
})();
