'use strict';
const $=id=>document.getElementById(id);
let images=[],slots=[],queue=[],replaceTarget=null,uploading=false,dragged=null;
let setupToken=new URLSearchParams(location.hash.slice(1)).get('setup')||'';
if(location.hash)history.replaceState(null,'',location.pathname);
const fmt=n=>{n=Number(n);return n>=1048576?(n/1048576).toFixed(2)+' MB':(n/1024).toFixed(1)+' KB';};
const notice=message=>{$('notice').textContent=message;};
window.addEventListener('hashchange',()=>{const token=new URLSearchParams(location.hash.slice(1)).get('setup');if(token){setupToken=token;history.replaceState(null,'',location.pathname);notice('최초 관리자 아이디와 비밀번호를 설정해 주세요.');}});
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
async function api(path,body){const response=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store'});const data=await response.json();if(!response.ok){if(response.status===401&&!path.includes('image-auth'))showLogin();throw new Error(data.error||'처리에 실패했습니다.');}return data;}
function showLogin(initialized=true){$('manager').hidden=true;$('logout').hidden=true;$('login').hidden=false;$('setupHelp').hidden=initialized;$('loginHelp').textContent=initialized?'관리자 계정으로 로그인해 주세요.':'최초 관리자 계정을 설정해 주세요.';$('loginForm').querySelector('button').textContent=initialized?'로그인':'관리자 계정 만들기';if(!initialized&&!setupToken)notice('최초 관리자 설정 링크로 접속해 주세요.');}
function options(select,filter=''){
 const selected=select.value;select.replaceChildren();
 for(const slot of slots.filter(x=>(x.label+' '+x.page).toLowerCase().includes(filter.toLowerCase()))){const option=el('option',slot.label);option.value=slot.id;select.append(option);}
 if([...select.options].some(o=>o.value===selected))select.value=selected;
}
async function load(){const data=await api('/api/images?admin=1');images=data.images;slots=data.slots;options($('uploadSlot'),$('slotSearch').value);options($('editSlot'));render();}
async function signedUpload(url,file,onProgress){return new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('PUT',url);xhr.setRequestHeader('Content-Type',file.type||'application/octet-stream');xhr.timeout=600000;xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round(e.loaded/e.total*100));};xhr.onerror=()=>reject(new Error('네트워크 오류입니다. 연결을 확인해 주세요.'));xhr.ontimeout=()=>reject(new Error('업로드 시간이 초과되었습니다. 다시 시도해 주세요.'));xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(new Error('원본 전송에 실패했습니다. 다시 시도해 주세요.'));xhr.send(file);});}
async function uploadItem(item){
 item.running=true;item.status.className='status';item.status.textContent='원본 업로드 준비 중…';item.remove.disabled=true;
 try{
  const prepared=await api('/api/image-upload',{action:'prepare',filename:item.file.name,bytes:item.file.size});
  await signedUpload(prepared.url,item.file,n=>{item.progress.value=n;item.status.textContent=`원본 전송 ${n}%`;});
  item.status.textContent='해상도·품질 최적화 및 300KB 검증 중… 잠시 기다려 주세요.';item.progress.removeAttribute('value');
  const data=await api('/api/image-upload',{action:'complete',id:prepared.id,title:item.title.value,alt:item.alt.value,slot:item.slot,published:item.published,replaceId:item.replaceId});
  item.status.className='status success';item.status.textContent=`완료 · ${fmt(item.file.size)} → ${fmt(data.bytes)} · ${data.originalWidth}×${data.originalHeight} → ${data.width}×${data.height} · ${data.format.toUpperCase()}`;item.done=true;item.progress.value=100;await load();
 }catch(error){item.status.className='status error';item.status.textContent=error.message+' (사이트에 게시되지 않았습니다.)';item.progress.value=0;}
 finally{item.running=false;item.remove.disabled=false;}
}
function queueStatus(){const count=queue.filter(x=>!x.done).length;$('queueCount').textContent=count?`${count}장 업로드 대기`:'사진을 선택해 주세요.';$('startUpload').disabled=uploading||!count;}
function addFiles(files,target=null){
 if(uploading){notice('진행 중인 업로드가 끝난 뒤 사진을 추가해 주세요.');return;}
 if(queue.length+files.length>30){notice('한 번에 최대 30장을 선택해 주세요.');return;}
 for(const file of files){
  if(!/\.(jpe?g|png|webp|avif|hei[cf])$/i.test(file.name)||file.size>50*1048576||file.size<12){notice(`${file.name}: 지원 형식과 50MB 제한을 확인해 주세요.`);continue;}
  const item={file,slot:target?.slot||$('uploadSlot').value,published:target?.published??$('uploadPublished').checked,replaceId:target?.id};
  if(!item.slot){notice('사이트 반영 위치를 선택해 주세요.');continue;}
  const row=el('div',undefined,'queue-item'),preview=el('img');preview.alt='선택한 사진 미리보기';const url=URL.createObjectURL(file);preview.src=url;preview.onerror=()=>{preview.replaceWith(el('span','HEIC 미리보기는 변환 후 표시됩니다.','queue-placeholder'));};item.objectUrl=url;
  const info=el('div');info.append(el('strong',file.name),el('div',`${fmt(file.size)} · ${slots.find(s=>s.id===item.slot)?.label||item.slot}`,'status'));
  const dimensions=el('div','원본 해상도 확인 중…','status');info.append(dimensions);const check=new Image();check.onload=()=>{dimensions.textContent=`원본 ${check.naturalWidth}×${check.naturalHeight}`;};check.onerror=()=>{dimensions.textContent='원본 해상도는 서버 변환 시 확인합니다.';};check.src=url;
  const fields=el('div',undefined,'queue-fields');
  item.title=el('input');item.title.value=target?.title||file.name.replace(/\.[^.]+$/,'');item.title.maxLength=200;
  item.alt=el('input');item.alt.value=target?.alt||item.title.value;item.alt.maxLength=500;
  for(const [name,input] of [['사진 제목',item.title],['대체 텍스트 (ALT)',item.alt]]){const label=el('label',name);label.append(input);fields.append(label);}info.append(fields);
  item.progress=el('progress');item.progress.max=100;item.progress.value=0;item.progress.setAttribute('aria-label','사진 업로드 진행률');info.append(item.progress);item.status=el('div',target?'교체 준비 · 원본은 검증 완료 후 바뀝니다.':'업로드 대기','status');info.append(item.status);
  item.remove=el('button','×');item.remove.setAttribute('aria-label',`${file.name} 대기열에서 제거`);item.remove.onclick=()=>{if(item.running)return;queue=queue.filter(x=>x!==item);row.remove();URL.revokeObjectURL(url);queueStatus();};row.append(preview,info,item.remove);$('queue').append(row);queue.push(item);
 }$('files').value='';queueStatus();
}
function action(label,handler){const btn=el('button',label);btn.type='button';btn.onclick=async()=>{btn.disabled=true;try{await handler();}catch(error){notice(error.message);}finally{btn.disabled=false;}};return btn;}
function render(){
 $('count').textContent=images.length+'장';$('total').textContent=fmt(images.reduce((n,x)=>n+Number(x.bytes),0));$('saved').textContent=fmt(images.reduce((n,x)=>n+Math.max(0,Number(x.original_bytes)-x.bytes),0));
 const q=$('filter').value.toLowerCase(),state=$('visibility').value;
 const filtered=images.filter(x=>(state==='all'||x.published===(state==='public'))&&[x.title,x.filename,slots.find(s=>s.id===x.slot)?.label,x.slot].join(' ').toLowerCase().includes(q));
 $('empty').hidden=filtered.length>0;$('empty').textContent=images.length?'검색 결과가 없습니다.':'아직 등록된 사진이 없습니다. 첫 사진을 올려 보세요.';$('images').replaceChildren();
 for(const image of filtered){
  const card=el('article',undefined,'image-card');card.draggable=true;card.dataset.id=image.id;
  card.ondragstart=e=>{dragged=image.id;e.dataTransfer.effectAllowed='move';};card.ondragover=e=>e.preventDefault();card.ondrop=async e=>{e.preventDefault();if(dragged&&dragged!==image.id)try{await move(dragged,images.findIndex(x=>x.id===image.id));}catch(error){notice(error.message);}};
  const thumbnail=el('img');thumbnail.src=image.url;thumbnail.alt=image.alt;thumbnail.loading='lazy';thumbnail.width=image.width;thumbnail.height=image.height;
  const body=el('div',undefined,'card-body'),heading=el('div',undefined,'card-heading');heading.append(el('h3',image.title||'제목 없음'),el('span',image.published?'공개':'비공개','badge'+(image.published?'':' private')));body.append(heading,el('div',image.filename,'filename'));
  const metadata=el('div',undefined,'metadata');
  for(const [label,value] of [['원본 용량',fmt(image.original_bytes)],['압축 후 용량',`${fmt(image.bytes)} (${image.bytes.toLocaleString()} B)`],['원본 해상도',`${image.original_width}×${image.original_height}`],['최종 해상도',`${image.width}×${image.height}`],['등록 날짜',new Date(image.created_at).toLocaleDateString('ko-KR')],['파일 형식',image.format.toUpperCase()]]){const pair=el('div');pair.append(el('span',label),document.createTextNode(value));metadata.append(pair);}body.append(metadata,el('div',slots.find(s=>s.id===image.slot)?.label||image.slot,'location'));
  const actions=el('div',undefined,'card-actions');actions.append(action('미리보기',()=>{$('previewTitle').textContent=image.title||image.filename;$('previewImage').src=image.url;$('previewImage').alt=image.alt;$('previewMeta').textContent=`${image.width}×${image.height} · ${fmt(image.bytes)} · ALT: ${image.alt}`;$('previewDialog').showModal();}),action('수정',()=>{$('editId').value=image.id;$('editTitle').value=image.title;$('editAlt').value=image.alt;$('editSlot').value=image.slot;$('editPublished').checked=image.published;$('editDialog').showModal();}),action('교체',()=>{replaceTarget=image;$('replaceFile').click();}),action('삭제',async()=>{if(!confirm(`“${image.title||image.filename}” 사진을 삭제할까요? 사이트에서도 내려갑니다.`))return;await api('/api/images',{action:'delete',id:image.id});await load();notice('사진을 삭제했습니다.');}));
  const order=el('span',undefined,'order');for(const [label,delta] of [['↑',-1],['↓',1]]){const btn=action(label,()=>move(image.id,images.findIndex(x=>x.id===image.id)+delta));btn.setAttribute('aria-label',delta<0?'사진 순서 앞으로':'사진 순서 뒤로');order.append(btn);}actions.append(order);body.append(actions);card.append(thumbnail,body);$('images').append(card);
 }
}
async function move(id,index){if(uploading)return;const from=images.findIndex(x=>x.id===id);if(index<0||index>=images.length||from===index)return;const ordered=[...images];ordered.splice(index,0,...ordered.splice(from,1));await api('/api/images',{action:'reorder',ids:ordered.map(x=>x.id)});await load();}
$('loginForm').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{await api('/api/image-auth',{username:$('username').value,password:$('password').value,setupToken});setupToken='';$('password').value='';await init();notice('로그인했습니다.');}catch(error){notice(error.message);}finally{button.disabled=false;}};
$('logout').onclick=async()=>{try{await api('/api/image-auth',{action:'logout'});showLogin();notice('로그아웃했습니다.');}catch(error){notice(error.message);}};
$('files').onchange=e=>addFiles([...e.target.files]);$('replaceFile').onchange=e=>{if(e.target.files[0]){addFiles([e.target.files[0]],replaceTarget);$('queue').scrollIntoView({behavior:'smooth',block:'center'});}e.target.value='';replaceTarget=null;};
for(const type of ['dragenter','dragover'])$('drop').addEventListener(type,e=>{e.preventDefault();$('drop').classList.add('dragover');});for(const type of ['dragleave','drop'])$('drop').addEventListener(type,e=>{e.preventDefault();$('drop').classList.remove('dragover');});$('drop').addEventListener('drop',e=>addFiles([...e.dataTransfer.files]));
$('startUpload').onclick=async()=>{if(uploading)return;uploading=true;queueStatus();$('files').disabled=true;notice('업로드 중에는 이 화면을 열어 두세요. 사진은 두 장씩 처리됩니다.');const pending=queue.filter(x=>!x.done);let next=0;async function worker(){while(next<pending.length){const item=pending[next++];await uploadItem(item);}}try{await Promise.all([worker(),worker()]);}finally{uploading=false;$('files').disabled=false;queueStatus();notice(pending.every(x=>x.done)?'선택한 사진을 모두 저장했습니다. 지정한 위치에서 확인해 주세요.':'일부 사진을 처리하지 못했습니다. 각 사진의 오류를 확인한 뒤 다시 업로드해 주세요.');}};
$('slotSearch').oninput=()=>options($('uploadSlot'),$('slotSearch').value);$('filter').oninput=render;$('visibility').onchange=render;
$('editForm').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{await api('/api/images',{action:'edit',id:$('editId').value,title:$('editTitle').value,alt:$('editAlt').value,slot:$('editSlot').value,published:$('editPublished').checked});$('editDialog').close();await load();notice('사진 정보를 저장했습니다.');}catch(error){notice(error.message);}finally{e.submitter.disabled=false;}};
for(const btn of document.querySelectorAll('[data-close]'))btn.onclick=()=>btn.closest('dialog').close();
$('changePassword').onclick=()=>$('passwordDialog').showModal();$('passwordForm').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{await api('/api/image-auth',{action:'password',currentPassword:$('currentPassword').value,password:$('newPassword').value});$('passwordDialog').close();$('passwordForm').reset();showLogin();notice('비밀번호를 변경했습니다. 다시 로그인해 주세요.');}catch(error){notice(error.message);}finally{e.submitter.disabled=false;}};
window.addEventListener('beforeunload',e=>{if(uploading){e.preventDefault();e.returnValue='';}});
async function init(){try{const status=await api('/api/image-auth');if(!status.authenticated){showLogin(status.initialized);return;}$('login').hidden=true;$('manager').hidden=false;$('logout').hidden=false;await load();}catch(error){notice('관리자 시스템을 불러오지 못했습니다. '+error.message);}}
init();
