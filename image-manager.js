(()=>{
 const containers=[...document.querySelectorAll('.detail-hero,.picture,.thumb,.related-venue-card__media')];if(!containers.length)return;
 const page=location.pathname.replace(/index\.html$/,'').replace(/\/?$/,'/');
 const original=containers.map(el=>({html:el.innerHTML,hidden:el.getAttribute('aria-hidden'),style:el.getAttribute('style')}));
 let last='',busy=false;
 async function update(){
  if(busy||document.hidden)return;busy=true;
  try{
   const response=await fetch(`/api/images?page=${encodeURIComponent(page)}`,{cache:'no-store'});if(!response.ok)return;
   const {images,representatives=[]}=await response.json();const fingerprint=JSON.stringify([images,representatives]);if(fingerprint===last)return;last=fingerprint;
   containers.forEach((el,i)=>{
    const href=el.closest('a[href]')?.getAttribute('href')||el.closest('.card')?.querySelector('a[href]')?.getAttribute('href');
    const direct=el.classList.contains('detail-hero');
    const cover=images.filter(x=>x.slot===page+'#cover');
    const gallery=images.filter(x=>x.slot===page+'#gallery');
    const photos=direct&&cover.length?cover.slice(0,1):href&&representatives.some(x=>x.slot===href+'#cover')?representatives.filter(x=>x.slot===href+'#cover').slice(0,1):images.filter(x=>x.slot===`${page}#image-${i}`);
    if(direct){let section=document.getElementById('dbj-venue-gallery');if(gallery.length){if(!section){section=document.createElement('section');section.id='dbj-venue-gallery';section.setAttribute('aria-label','업소 추가 사진');el.after(section);}section.replaceChildren();for(const photo of gallery){const img=new Image();img.src=photo.url;img.alt=photo.alt;img.loading='lazy';img.decoding='async';img.width=photo.width;img.height=photo.height;section.append(img);}}else section?.remove();}
    if(!photos.length){if(el.dataset.managed){el.innerHTML=original[i].html;el.classList.remove('dbj-has-image');delete el.dataset.managed;for(const [key,value] of [['aria-hidden',original[i].hidden],['style',original[i].style]]){if(value===null)el.removeAttribute(key);else el.setAttribute(key,value);}}return;}
    el.dataset.managed='true';el.classList.add('dbj-has-image');el.removeAttribute('aria-hidden');
    el.style.position='relative';el.style.overflow='hidden';
    let current=0;
    function render(){
     const p=photos[current],img=new Image();img.alt=p.alt;img.title=p.title;img.width=p.width;img.height=p.height;img.loading=el.getBoundingClientRect().top<innerHeight?'eager':'lazy';img.decoding='async';img.src=p.url;
     img.style.cssText='display:block;width:100%;height:100%;object-fit:contain;position:absolute;inset:0';
     el.replaceChildren(img);
     if(photos.length>1){const controls=document.createElement('span');controls.style.cssText='position:absolute;bottom:8px;right:8px;display:flex;gap:6px;align-items:center;background:#0b0d12dd;border-radius:8px;padding:3px 6px;color:white;letter-spacing:normal';
      for(const [label,delta] of [['이전 사진',-1],['다음 사진',1]]){const btn=document.createElement('button');btn.type='button';btn.textContent=delta<0?'‹':'›';btn.setAttribute('aria-label',label);btn.style.cssText='cursor:pointer;color:white;background:transparent;border:0;font-size:24px;min-width:32px;min-height:32px';btn.onclick=e=>{e.preventDefault();e.stopPropagation();current=(current+delta+photos.length)%photos.length;render();};controls.append(btn);}el.append(controls);}
    }render();
   });
  }catch{}finally{busy=false;}
 }
 const style=document.createElement('style');style.textContent='.dbj-has-image::after{display:none!important}.detail-hero.dbj-has-image,.picture.dbj-has-image,.related-venue-card__media.dbj-has-image{aspect-ratio:4/3;height:auto}.thumb.dbj-has-image{aspect-ratio:4/3;min-height:0;height:111px}#dbj-venue-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:16px 0}#dbj-venue-gallery img{display:block;width:100%;aspect-ratio:4/3;object-fit:contain;background:#11151b;border-radius:10px}@media(max-width:600px){#dbj-venue-gallery{grid-template-columns:1fr}}';document.head.append(style);
 update();window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);setInterval(update,60000);
})();
