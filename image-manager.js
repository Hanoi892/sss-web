(()=>{
 let containers=[];
 const originals=new WeakMap();
 const page=location.pathname.replace(/index\.html$/,'').replace(/\/?$/,'/');


 function openPhoto(photo){
  let dialog=document.getElementById('dbj-photo-dialog');
  if(!dialog){
   dialog=document.createElement('dialog');dialog.id='dbj-photo-dialog';dialog.className='dbj-photo-dialog';dialog.setAttribute('aria-label','사진 크게 보기');
   const close=document.createElement('button');close.type='button';close.className='dbj-photo-close';close.textContent='닫기 ×';close.setAttribute('aria-label','확대 사진 닫기');close.onclick=()=>dialog.close();
   const image=new Image();image.className='dbj-photo-full';const caption=document.createElement('p');caption.className='dbj-photo-caption';
   dialog.append(close,image,caption);dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});document.body.append(dialog);
  }
  const image=dialog.querySelector('.dbj-photo-full');image.src=photo.url;image.alt=photo.alt||'업소 사진';dialog.querySelector('.dbj-photo-caption').textContent=image.alt;
  if(!dialog.open)dialog.showModal();
 }
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
   const button=document.createElement('button');button.type='button';button.className='dbj-photo-open';button.setAttribute('aria-label',img.alt+' 크게 보기');button.onclick=()=>openPhoto(photo);
   const hint=document.createElement('span');hint.className='dbj-photo-hint';hint.textContent='크게 보기 ↗';button.append(img,hint);
   const caption=document.createElement('figcaption');caption.textContent=/상세 사진 \d+$/.test(img.alt)?'':img.alt;figure.append(button,caption);
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
     if(direct){const button=document.createElement('button');button.type='button';button.className='dbj-photo-open dbj-photo-cover';button.setAttribute('aria-label',img.alt+' 크게 보기');button.onclick=()=>openPhoto(p);button.append(img);el.replaceChildren(button);}else el.replaceChildren(img);
     if(photos.length>1){const controls=document.createElement('span');controls.style.cssText='position:absolute;bottom:8px;right:8px;display:flex;gap:6px;align-items:center;background:#0b0d12dd;border-radius:8px;padding:3px 6px;color:white;letter-spacing:normal';
      for(const [label,delta] of [['이전 사진',-1],['다음 사진',1]]){const btn=document.createElement('button');btn.type='button';btn.textContent=delta<0?'‹':'›';btn.setAttribute('aria-label',label);btn.style.cssText='cursor:pointer;color:white;background:transparent;border:0;font-size:24px;min-width:32px;min-height:32px';btn.onclick=e=>{e.preventDefault();e.stopPropagation();current=(current+delta+photos.length)%photos.length;render();};controls.append(btn);}el.append(controls);}
    }render();
   });
  }catch{}finally{busy=false;}
 }
 const style=document.createElement('style');style.textContent='.dbj-has-image::after{display:none!important}.detail-hero.dbj-has-image,.picture.dbj-has-image,.related-venue-card__media.dbj-has-image{aspect-ratio:4/3;height:auto}.thumb.dbj-has-image{aspect-ratio:4/3;min-height:0;height:111px}.category-hub__media>.picture.dbj-has-image{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important;aspect-ratio:auto!important}.detail-hero.dbj-has-image{max-width:560px;margin:22px auto;border:0;box-shadow:none}.dbj-article-photo{width:min(100%,400px);margin:26px auto}.dbj-photo-open{display:block;position:relative;width:100%;aspect-ratio:4/3;padding:0;border:0;border-radius:10px;overflow:hidden;background:#11151b;cursor:zoom-in}.dbj-photo-open:focus-visible{outline:2px solid #d9ac65;outline-offset:4px}.dbj-photo-cover{position:absolute;inset:0}.dbj-article-photo img{display:block;width:100%;height:100%;object-fit:cover}.dbj-photo-hint{position:absolute;right:10px;bottom:10px;padding:3px 9px;border-radius:20px;background:#10141ccc;color:#eee;font-size:11px;letter-spacing:0;font-weight:500}.dbj-article-photo figcaption{font-size:11px;color:var(--sub,#a8b1c1);text-align:left;margin-top:7px;letter-spacing:normal;font-weight:400}.dbj-article-photo figcaption:empty{display:none}.dbj-photo-dialog{position:fixed;max-width:min(980px,94vw);max-height:94vh;padding:14px;border:1px solid #38404d;border-radius:14px;background:#11151b;color:#f5f6fa;overflow:auto}.dbj-photo-dialog::backdrop{background:#000c}.dbj-photo-close{display:block;margin:0 0 10px auto;padding:6px 12px;min-height:40px;border:1px solid #39414d;border-radius:7px;background:#1d232d;color:#eee;font:inherit;cursor:pointer}.dbj-photo-full{display:block;width:auto;max-width:100%;max-height:75vh;object-fit:contain;margin:auto}.dbj-photo-caption{font-size:12px;color:#a8b1c1;margin:10px 0 0;text-align:center}@media(max-width:600px){.dbj-article-photo{width:min(100%,340px);margin:22px auto}.dbj-photo-dialog{padding:10px}}';document.head.append(style);
 const observer=new MutationObserver(records=>{if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&(node.matches('.detail-hero,.picture,.thumb,.related-venue-card__media')||node.querySelector('.detail-hero,.picture,.thumb,.related-venue-card__media')))))update();});
 observer.observe(document.body,{childList:true,subtree:true});
 update();window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);setInterval(update,60000);
})();
