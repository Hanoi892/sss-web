(()=>{'use strict';
 const page=location.pathname.replace(/index\.html$/,'').replace(/\/?$/,'/');
 if(!['/golf/','/casino/','/pool-villa/'].includes(page))return;
 const figure=document.querySelector('[data-premium-cover]'),gallery=document.querySelector('[data-premium-gallery]'),empty=document.querySelector('[data-gallery-empty]');
 if(!figure||!gallery)return;
 const originalImage=figure.querySelector('img');let last='';
 const dialog=document.createElement('dialog');dialog.className='premium-photo-dialog';dialog.setAttribute('aria-label','여행 사진 크게 보기');
 const close=document.createElement('button');close.type='button';close.textContent='닫기 ×';close.addEventListener('click',()=>dialog.close());
 const enlarged=new Image();enlarged.alt='';const caption=document.createElement('p');
 dialog.append(close,enlarged,caption);dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});document.body.append(dialog);
 function zoom(photo){enlarged.src=photo.url;enlarged.alt=photo.alt||'여행 사진';caption.textContent=enlarged.alt;if(!dialog.open)dialog.showModal();}
 function photoNode(photo){const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',(photo.alt||'사진')+' 확대');
 const img=new Image();img.src=photo.url;img.alt=photo.alt||'여행 사진';img.loading='lazy';img.decoding='async';if(photo.width)img.width=photo.width;if(photo.height)img.height=photo.height;
 const span=document.createElement('span');span.textContent=photo.alt||photo.title||'사진 크게 보기';button.append(img,span);button.addEventListener('click',()=>zoom(photo));return button;}
 async function sync(){if(document.hidden)return;
 try{const response=await fetch('/api/images?page='+encodeURIComponent(page),{cache:'no-store'});if(!response.ok)return;
 const data=await response.json();const photos=Array.isArray(data.images)?data.images:[],fingerprint=JSON.stringify(photos);if(last===fingerprint)return;last=fingerprint;
 const cover=photos.find(p=>p.slot===page+'#cover');
 if(cover){const img=new Image();img.src=cover.url;img.alt=cover.alt||'여행 대표 사진';img.title=cover.title||'';img.decoding='async';img.fetchPriority='high';figure.querySelector('img')?.replaceWith(img);figure.classList.add('premium-managed');let view=figure.querySelector('.premium-visual__view');if(!view){view=document.createElement('button');view.type='button';view.className='premium-visual__view';view.textContent='사진 크게 보기 ↗';figure.append(view);}view.onclick=()=>zoom(cover);}
 else if(originalImage){figure.querySelector('img')?.replaceWith(originalImage.cloneNode(true));figure.classList.remove('premium-managed');figure.querySelector('.premium-visual__view')?.remove();}
 const extra=photos.filter(p=>p.slot===page+'#gallery').slice(0,24);gallery.replaceChildren(...extra.map(photoNode));gallery.hidden=!extra.length;if(empty)empty.hidden=extra.length>0;
 }catch(err){console.warn('랜딩 사진을 불러오지 못했습니다.',err);}
 }
 sync();window.addEventListener('focus',sync);document.addEventListener('visibilitychange',sync);setInterval(sync,60000);
})();
