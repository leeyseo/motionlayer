import {products,productById,types,moods,series,money,pad} from './catalog.js';
import {syncShop} from './shop.js';

const $=id=>document.getElementById(id);
const compact=matchMedia('(max-width:760px)');
const canHover=matchMedia('(hover:hover)');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const defaults={type:'',color:'',mood:'',series:'',sort:'featured'};
const colors=[...new Set(products.map(p=>p.color))];
const sortLabels={featured:'신상품순',low:'낮은 가격순',high:'높은 가격순',name:'이름순'};
let filters=readFilters(), displayed=[], previewId='', previewSide=0, tracking='', picker='', openingButton=null;
let coverIndex=0, coverSequence=0, scrollFrame=0;

function readFilters(){
  const q=new URLSearchParams(location.search);
  const allowed={type:Object.keys(types),color:colors,mood:Object.keys(moods),series:series.map(s=>s.id),sort:Object.keys(sortLabels)};
  const f={...defaults};
  for(const [key,options] of Object.entries(allowed)){
    const value=q.get(key);if(options.includes(value))f[key]=value;
  }
  return f;
}
function writeFilters(patch){
  const next={...filters,...patch};
  if(Object.keys(next).every(k=>next[k]===filters[k]))return;
  const u=new URL(location.href);
  for(const [k,v] of Object.entries(next)){
    if(v===defaults[k])u.searchParams.delete(k);else u.searchParams.set(k,v);
  }
  u.hash='catalog';history.pushState(null,'',u);
  filters=next;renderCatalog();
}
function goCatalog(){
  $('catalog').scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});
}
function matching(){
  const f=filters;
  const list=products.filter(p=>(!f.type||p.type===f.type)&&(!f.color||p.color===f.color)&&(!f.mood||p.moods.includes(f.mood))&&(!f.series||p.series===f.series));
  if(f.sort==='low')list.sort((a,b)=>a.price-b.price);
  if(f.sort==='high')list.sort((a,b)=>b.price-a.price);
  if(f.sort==='name')list.sort((a,b)=>a.name.localeCompare(b.name));
  return list;
}
function packshots(p,loading){
  return `<span class="packshots">
    <img width="300" height="300" src="assets/${p.id}.webp" alt="${p.ko}" loading="${loading}">
    <span class="backs" aria-hidden="true"><img src="assets/${p.id}-back.webp" width="300" height="300" alt="" loading="lazy" decoding="async"></span>
  </span>`;
}
function atlasTile(p,i){
  return `<a class="tile" data-id="${p.id}" href="#item/${p.id}" aria-label="${p.no} ${p.ko} 상세 보기"><span class="tile-no">${p.no}</span>
    ${packshots(p,i<3?'eager':'lazy')}</a>`;
}
function productRow(p){
  return `<a class="product-row" href="#item/${p.id}" data-id="${p.id}"><span class="row-no">${p.no}</span>
    <span class="row-label"><span class="row-name">${p.name}</span>${p.sold?'<span class="sold">SOLD OUT</span>':''}</span>
    <span class="row-color"><i class="swatch" style="--swatch:${p.hex}" aria-hidden="true"></i>${p.color}</span>
    <span class="row-price">${money(p.price)}</span><img class="row-thumb" src="assets/${p.id}.webp" alt="" width="60" height="60" loading="lazy"></a>`;
}
function renderCatalog(){
  displayed=matching();tracking='';previewId='';previewSide=0;
  const pair=$('catalog-pair');
  pair.classList.remove('is-tracking');pair.hidden=!displayed.length;$('empty').hidden=!!displayed.length;
  $('count').textContent=pad(displayed.length);
  $('result-status').textContent='상품 '+displayed.length+'개가 표시됩니다.';
  $('atlas').innerHTML=displayed.map(atlasTile).join('');
  $('rows').innerHTML=displayed.map(productRow).join('');
  for(const node of $('type-tabs').children)node.setAttribute('aria-pressed',String(node.dataset.type===filters.type));
  const mood=moods[filters.mood];
  document.documentElement.style.setProperty('--mood-dot',mood?.color??'#ba4b30');
  const chipLabels={type:types[filters.type],color:filters.color,mood:mood?.label,series:series.find(s=>s.id===filters.series)?.title,sort:filters.sort==='featured'?'':sortLabels[filters.sort]};
  const entries=Object.entries(chipLabels).filter(([,v])=>v);
  $('chips').hidden=!entries.length;
  $('chips').innerHTML=entries.map(([k,v])=>`<button type="button" data-remove-filter="${k}" aria-label="${v} 필터 해제">${v} ×</button>`).join('')+'<button type="button" class="reset" data-reset>전체 초기화</button>';
  const n=Number(!!filters.color)+Number(filters.sort!=='featured');
  $('filter-count').textContent=n?'('+n+')':'';
  if(displayed.length&&compact.matches){showPreview(displayed[0].id);scheduleScroll()}
}
function markTracking(id){
  if(tracking===id)return;
  tracking=id;
  const pair=$('catalog-pair');
  pair.classList.toggle('is-tracking',!!id);
  for(const el of pair.querySelectorAll('[data-id]'))el.classList.toggle('is-active',!!id&&el.dataset.id===id);
}
function markPhotoReady({target}){
  if(target.matches('.backs > img'))target.parentElement.classList.add('ready');
  if(target.matches('.packshots > img'))target.closest('a').classList.add('front-ready');
}
$('atlas').addEventListener('load',markPhotoReady,true);
$('arrival-list').addEventListener('load',markPhotoReady,true);
$('arrival-list').innerHTML=products.slice(0,3).map(p=>`<li>
  <a class="arrival-card" href="#item/${p.id}" aria-label="${p.ko}, ${money(p.price)} 상세 보기">
    ${packshots(p,'eager')}
    <span class="arrival-label"><strong>${p.ko}</strong><span class="arrival-price">${money(p.price)}</span></span>
  </a></li>`).join('');
const pair=$('catalog-pair');
pair.addEventListener('pointerover',e=>{
  if(compact.matches||!canHover.matches||e.pointerType==='touch')return;
  const el=e.target.closest('[data-id]');markTracking(el?.dataset.id??'');
});
pair.addEventListener('pointerleave',()=>{
  const focused=pair.querySelector('[data-id]:focus-visible');
  markTracking(compact.matches?'':focused?.dataset.id??'');
});
pair.addEventListener('focusin',e=>{
  const el=e.target.closest('[data-id]');if(!compact.matches&&el?.matches(':focus-visible'))markTracking(el.dataset.id);
});
pair.addEventListener('focusout',e=>{
  if(!pair.contains(e.relatedTarget))markTracking('');
});
function showPreview(id,side=0){
  if(id===previewId&&side===previewSide)return;
  const p=productById.get(id);if(!p)return;
  previewId=id;previewSide=side;
  $('preview-link').href='#item/'+id;$('preview-link').setAttribute('aria-label',p.ko+' 상세 보기');
  $('preview-no').textContent='NO. '+p.no;
  const img=new Image();img.alt=p.ko+(side?' 뒷면':' 앞면');img.width=500;img.height=500;
  img.src='assets/'+id+(side?'-back':'')+'.webp';
  const mount=()=>{if(previewId===id&&previewSide===side)$('preview-images').replaceChildren(img)};
  img.decode().then(mount).catch(()=>{if(previewId===id&&side===1)showPreview(id,0)});
  document.querySelectorAll('[data-side]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.side)===side)));
  for(const row of $('rows').children)row.classList.toggle('is-current',row.dataset.id===id);
}
function syncPreview(){
  scrollFrame=0;
  if(!compact.matches||!displayed.length||document.querySelector('dialog[open]'))return;
  const pv=$('mobile-preview').getBoundingClientRect(),pane=$('rows').getBoundingClientRect();
  if(pv.top>innerHeight||pane.bottom<0)return;
  const trackY=Math.max(pv.bottom+2,$('menu-trigger').closest('header').getBoundingClientRect().bottom);
  const rows=[...$('rows').children];
  const row=rows.find(el=>el.getBoundingClientRect().bottom>trackY)??rows.at(-1);
  if(row&&row.dataset.id!==previewId)showPreview(row.dataset.id);
}
function scheduleScroll(){if(!scrollFrame)scrollFrame=requestAnimationFrame(syncPreview)}
window.addEventListener('scroll',scheduleScroll,{passive:true});window.addEventListener('resize',scheduleScroll);
function updatePickerButtons(){
  document.querySelectorAll('button[data-picker]').forEach(b=>{
    b.setAttribute('aria-expanded',String(b.dataset.picker===picker));
    b.setAttribute('aria-controls',compact.matches?'picker-dialog':'desktop-picker');
  });
}
function closePicker(restore=false){
  const previous=openingButton;
  picker='';openingButton=null;
  $('desktop-picker').hidden=true;$('desktop-picker').replaceChildren();
  if($('picker-dialog').open)$('picker-dialog').close();
  $('mobile-picker-content').replaceChildren();
  updatePickerButtons();
  if(restore&&previous?.isConnected&&!previous.closest('dialog:not([open])'))previous.focus({preventScroll:true});
}
function pickerMarkup(kind){
  if(kind==='mood'){
    return `<div class="picker-inner"><h3>오늘의 상태</h3><div class="choice-group">${Object.entries(moods).map(([id,m])=>`<button type="button" data-mood="${id}" class="mood-choice" aria-pressed="${filters.mood===id}"><i style="--swatch:${m.color}" aria-hidden="true"></i>${m.label}<small>${m.note}</small></button>`).join('')}</div><button type="button" class="picker-end" data-picker-end>닫기</button></div>`;
  }
  return `<div class="picker-inner"><label>컬러<select data-field="color"><option value="">전체 컬러</option>${colors.map(c=>`<option ${c===filters.color?'selected':''}>${c}</option>`).join('')}</select></label>
    <label>정렬<select data-field="sort">${Object.entries(sortLabels).map(([k,v])=>`<option value="${k}" ${filters.sort===k?'selected':''}>${v}</option>`).join('')}</select></label><button type="button" data-finish-filter class="text-link">선택 완료</button></div>`;
}
function openPicker(kind,button){
  if(picker===kind&&!compact.matches){closePicker(true);return}
  closePicker();
  if($('menu-dialog').open)$('menu-dialog').close();
  picker=kind;openingButton=button;
  if(compact.matches){
    $('picker-dialog').dataset.mode=kind;
    $('picker-heading').textContent=kind==='mood'?'오늘의 상태':'상품 필터';
    $('mobile-picker-content').innerHTML=pickerMarkup(kind);
    $('picker-dialog').showModal();
  }else{
    $('desktop-picker').innerHTML=pickerMarkup(kind);$('desktop-picker').hidden=false;
    if(button.closest('header'))goCatalog();
  }
  updatePickerButtons();
}
const opener=$('menu-trigger');
opener.addEventListener('click',()=>{
  closePicker();$('menu-dialog').showModal();opener.setAttribute('aria-expanded','true');
});
$('menu-dialog').addEventListener('close',()=>opener.setAttribute('aria-expanded','false'));
$('picker-dialog').addEventListener('cancel',e=>{e.preventDefault();closePicker(true)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&picker&&!compact.matches){e.preventDefault();closePicker(true)}});
for(const el of [$('menu-dialog'),$('picker-dialog')]){
  el.addEventListener('click',e=>{
    if(e.target===el){
      const r=el.getBoundingClientRect();
      if(e.clientY>=r.top&&e.clientY<=r.bottom&&e.clientX>=r.left&&e.clientX<=r.right)return;
    }else if(!e.target.closest('[data-dismiss]'))return;
    if(el===$('picker-dialog'))closePicker(true);else el.close();
  });
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button,a');
  if(!b)return;
  if(b.matches('[data-picker]')){openPicker(b.dataset.picker,b);return}
  if(b.matches('[data-mood]')){
    writeFilters({mood:filters.mood===b.dataset.mood?'':b.dataset.mood});closePicker(true);goCatalog();return;
  }
  if(b.matches('[data-picker-end],[data-finish-filter]')){const mobile=compact.matches;closePicker(true);if(mobile)goCatalog();return}
  if(b.matches('[data-type]')){closePicker();writeFilters({type:b.dataset.type});return}
  if(b.matches('[data-reset]')){closePicker();writeFilters(defaults);return}
  if(b.matches('[data-remove-filter]')){closePicker();writeFilters({[b.dataset.removeFilter]:defaults[b.dataset.removeFilter]});return}
  if(b.matches('[data-side]')){showPreview(previewId,Number(b.dataset.side));return}
  if(b.matches('[data-cover-step]')){setCover(coverIndex+Number(b.dataset.coverStep));return}
  if(b.matches('a[data-series]')&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();closePicker();writeFilters({...defaults,series:b.dataset.series});goCatalog();return}
  if(b.closest('#menu-dialog')&&b.matches('a'))$('menu-dialog').close();
  if(picker&&!b.closest('.inline-picker,#picker-dialog'))closePicker();
});
document.addEventListener('change',e=>{
  if(!e.target.matches('select[data-field]'))return;
  writeFilters({[e.target.dataset.field]:e.target.value});
});
compact.addEventListener('change',()=>{
  closePicker();if($('menu-dialog').open)$('menu-dialog').close();markTracking('');
  if(compact.matches&&displayed.length){showPreview(displayed[0].id);scheduleScroll()}
});
window.addEventListener('popstate',()=>{
  const next=readFilters();
  if(Object.keys(next).some(k=>filters[k]!==next[k])){closePicker();filters=next;renderCatalog()}
});
function setCover(index){
  coverIndex=(index+series.length)%series.length;
  const s=series[coverIndex],token=++coverSequence;
  const [word,rest]=s.title.split(' ');
  $('series-code').innerHTML='<i class="ink-dot" aria-hidden="true"></i> SERIES '+pad(coverIndex+1)+' / '+s.name.toUpperCase();
  $('cover-title').innerHTML=word+'<br><span class="word-gap">'+rest+'</span><span class="period">.</span>';
  $('cover-title').setAttribute('aria-label',s.title+'.');
  $('cover-copy').textContent=s.copy;$('cover-shop').textContent=s.ko+' 시리즈 보기';$('cover-shop').dataset.series=s.id;
  $('cover-count').textContent=pad(coverIndex+1)+' / '+pad(series.length);
  const picture=new Image();picture.src='assets/'+s.image+'.webp';
  const done=()=>{
    if(token!==coverSequence)return;
    const img=$('cover-img');img.src=picture.src;img.alt=s.alt;img.style.objectPosition=s.id==='field'?'56% 11%':s.position;
    img.classList.remove('cover-in');void img.offsetWidth;img.classList.add('cover-in');
  };
  picture.decode().then(done).catch(()=>{});
}
let coverTouch=null;
const coverPhoto=document.querySelector('.cover-photo');
coverPhoto.addEventListener('touchstart',e=>{coverTouch=e.target.closest('button')?null:[e.touches[0].clientX,e.touches[0].clientY]},{passive:true});
coverPhoto.addEventListener('touchend',e=>{
  if(!coverTouch)return;
  const t=e.changedTouches[0],dx=t.clientX-coverTouch[0],dy=t.clientY-coverTouch[1];
  if(Math.abs(dx)>46&&Math.abs(dx)>Math.abs(dy)*1.3)setCover(coverIndex+(dx<0?1:-1));
  coverTouch=null;
},{passive:true});
coverPhoto.addEventListener('touchcancel',()=>{coverTouch=null});
$('type-tabs').innerHTML=Object.entries({'':'전체',...types}).map(([id,label])=>`<button type="button" data-type="${id}" aria-pressed="false">${label}</button>`).join('');
$('series-cards').innerHTML=series.map((s,i)=>`<a class="series-card" href="#catalog" data-series="${s.id}"><figure><img src="assets/${s.id==='field'?'shell-look':s.image}.webp" alt="${s.id==='field'?'후드를 올린 셸 착용 모습':s.alt}" width="600" height="480" loading="lazy" style="object-position:${s.position}"></figure><div class="series-line"><span class="series-id">${pad(i+1)}</span><strong>${s.title}</strong></div></a>`).join('');
const sectionObserver=new IntersectionObserver(entries=>{
  const active=entries.filter(e=>e.isIntersecting).at(-1);if(!active)return;
  document.querySelectorAll('.desk-nav a').forEach(link=>{
    if(link.hash==='#'+active.target.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
  });
},{rootMargin:'-10% 0px -50% 0px'});
for(const id of ['catalog','series','about'])sectionObserver.observe($(id));
document.addEventListener('pointerdown',()=>document.documentElement.classList.remove('first-visit'),{once:true});
setTimeout(()=>document.documentElement.classList.remove('first-visit'),1200);
renderCatalog();updatePickerButtons();syncShop();
