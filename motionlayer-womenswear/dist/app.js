const products = [
  {id:'fluid-dress',number:'01',name:'Fluid wrap dress',ko:'플루이드 랩 드레스',category:'dresses',color:'blue',colorName:'Powder blue',price:159000,mood:['light','free'],description:'몸의 움직임을 따라 가볍게 흐르는 실루엣. 차분한 블루와 부드러운 선으로 완성하는 하루.'},
  {id:'stripe-top',number:'02',name:'Soft stripe top',ko:'소프트 스트라이프 톱',category:'tops',color:'green',colorName:'Sage stripe',price:69000,mood:['light','free'],description:'가볍게 입는 한 겹의 여유. 은은한 스트라이프와 편안한 실루엣으로 일상에 리듬을 더합니다.'},
  {id:'drape-dress',number:'03',name:'Drape midi dress',ko:'드레이프 미디 드레스',category:'dresses',color:'navy',colorName:'Midnight navy',price:149000,mood:['calm'],description:'단순한 선, 자연스러운 드레이프. 익숙한 날에도 조금 특별한 날에도 편안하게 어울리는 미디 드레스.'},
  {id:'cotton-robe',number:'04',name:'Relaxed cotton robe',ko:'릴랙스드 코튼 로브',category:'layers',color:'brown',colorName:'Soft cocoa',price:129000,mood:['calm','light'],description:'가만히 쉬어가는 순간부터 가벼운 외출까지. 나의 속도에 맞추어 자연스럽게 더하는 레이어.'},
  {id:'flow-dress',number:'05',name:'Flow sleeveless dress',ko:'플로 슬리브리스 드레스',category:'dresses',color:'green',colorName:'Forest green',price:149000,mood:['free','calm'],soldout:true,description:'걷는 모습마다 달라지는 부드러운 볼륨. 자연을 닮은 그린과 여유로운 실루엣을 담았습니다.'},
  {id:'check-vest',number:'06',name:'Layered check vest',ko:'레이어드 체크 베스트',category:'layers',color:'brown',colorName:'Brown / mint',price:119000,mood:['free'],description:'서로 다른 컬러가 만드는 섬세한 균형. 셔츠나 티셔츠 위에 나만의 감각으로 더하는 레이어.'}
];
const state={category:'all',color:'',mood:'',view:'gallery'};
const $=id=>document.getElementById(id);
const price=value=>'₩'+value.toLocaleString('ko-KR');
const moodLabels={light:'가볍게',calm:'차분하게',free:'자유롭게'};
let toastTimer;
function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3500);}
function render(){
  const list=products.filter(p=>(state.category==='all'||p.category===state.category)&&(!state.color||p.color===state.color)&&(!state.mood||p.mood.includes(state.mood)));
  $('product-grid').classList.toggle('index-view',state.view==='index');
  $('product-grid').innerHTML=list.map((p,index)=>state.view==='gallery'?`<article class="product-card"><button class="product-photo" type="button" data-product="${p.id}" aria-label="${p.ko} 상세 보기"><img src="assets/${p.id}.webp" alt="${p.ko} 착용 이미지" width="750" height="1000" ${index>2?'loading="lazy"':''}>${p.soldout?'<span class="product-flag">SOLD OUT</span>':''}</button><div class="product-details"><span class="product-no">${p.number}</span><div><button type="button" class="product-name" data-product="${p.id}">${p.name}</button><span class="product-color">${p.colorName}</span><p class="product-price">${price(p.price)}</p></div><button type="button" class="product-more" data-product="${p.id}" aria-label="${p.name} 보기">+</button></div></article>`:`<article class="index-row"><span class="product-no">${p.number}</span><button type="button" data-product="${p.id}" aria-label="${p.ko} 보기"><img src="assets/${p.id}.webp" alt="${p.ko}" width="60" height="80"></button><button class="product-name" type="button" data-product="${p.id}">${p.name}</button><span class="product-color">${p.colorName}</span><span class="product-price">${price(p.price)}</span><button class="product-more" type="button" data-product="${p.id}" aria-label="${p.name} 보기">+</button></article>`).join('')||'<p class="empty-state">선택한 조건에 맞는 상품이 없어요.</p>';
  $('product-count').textContent=String(list.length).padStart(2,'0');
  $('filter-status').textContent=`${list.length}개의 상품이 표시됩니다.`;
  $('showing-count').textContent=state.category==='all'&&!state.color&&!state.mood?'SIX PIECES, ENDLESS POSSIBILITIES.':`SHOWING ${String(list.length).padStart(2,'0')} OF 06`;
  document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===state.category)));
  document.querySelectorAll('[data-mood]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mood===state.mood)));
  $('grid-view').setAttribute('aria-pressed',String(state.view==='gallery'));
  $('index-view').setAttribute('aria-pressed',String(state.view==='index'));
  $('active-mood').hidden=!state.mood;
  $('active-mood').innerHTML=state.mood?`오늘은 ${moodLabels[state.mood]}<button type="button" id="clear-mood">선택 해제</button>`:'';
}
function info(title,body){$('info-content').innerHTML=`<p class="eyebrow">MOTION LAYER / DESIGN PREVIEW</p><h2 id="info-title">${title}</h2><p>${body}</p>`;document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('info-dialog').showModal();}
function productDetail(id){const p=products.find(p=>p.id===id);if(!p)return;$('product-detail').innerHTML=`<div class="detail-layout"><div class="detail-image"><img src="assets/${p.id}.webp" alt="${p.ko}" width="750" height="1000"></div><div class="detail-copy"><p class="eyebrow">${p.number} / THE SOFT EDIT</p><h2 id="product-title">${p.name}</h2><p class="price">${price(p.price)}</p><p class="description">${p.description}</p><div class="detail-color"><span>Color</span><span>${p.colorName}</span></div><p class="size-label">Size</p><div class="size-options">${['S','M','L'].map(s=>`<button type="button" data-size="${s}" aria-pressed="false">${s}</button>`).join('')}</div><button class="preview-button" type="button" id="preview-button">${p.soldout?'Sold out':'Add to bag'}</button><p class="preview-note">디자인 미리보기입니다. 상품 사진과 정보는 시안용이며,<br>실제 주문이나 결제는 진행되지 않습니다.</p></div></div>`;$('product-dialog').showModal();$('preview-button').disabled=!!p.soldout;}
document.addEventListener('click',e=>{
  const product=e.target.closest('[data-product]');if(product)productDetail(product.dataset.product);
  const close=e.target.closest('[data-close]');if(close)$(close.dataset.close).close();
  const size=e.target.closest('[data-size]');if(size)document.querySelectorAll('[data-size]').forEach(b=>b.setAttribute('aria-pressed',String(b===size)));
  if(e.target.closest('#preview-button'))toast('구매 버튼의 디자인 미리보기입니다. 실제 주문은 생성되지 않아요.');
  const category=e.target.closest('[data-category]');if(category){state.category=category.dataset.category;render();}
  const mood=e.target.closest('[data-mood]');if(mood){state.mood=state.mood===mood.dataset.mood?'':mood.dataset.mood;state.category='all';state.color='';$('color-select').value='';render();$('collection').scrollIntoView({behavior:'smooth'});}
  if(e.target.closest('#clear-mood')){state.mood='';render();}
  const information=e.target.closest('[data-info]');if(information){const pages={guide:['Shipping & Returns','배송·교환·반품 안내가 표시되는 화면입니다.<br>운영 정책은 정식 오픈 전 확정하여 반영됩니다.'],faq:['A little help.','사이즈, 배송, 교환·반품에 관한 안내가 정식 오픈 시 제공됩니다.<br>현재는 여성복 디자인을 검토하기 위한 시안입니다.'],privacy:['Terms & Privacy','이 사이트는 모션레이어의 디자인 시안입니다.<br>상품명·가격·사진은 임시 콘텐츠이며 개인정보와 결제 정보를 수집하지 않습니다.'],instagram:['Everyday, beautifully.','컬렉션과 일상의 이야기를 담는 공간입니다.<br>공식 인스타그램 계정과 피드는 정식 오픈 시 연결됩니다.']};info(...pages[information.dataset.info]);}
});
$('color-select').addEventListener('change',e=>{state.color=e.target.value;render();});
$('grid-view').addEventListener('click',()=>{state.view='gallery';render();});
$('index-view').addEventListener('click',()=>{state.view='index';render();});
$('reset-filters').addEventListener('click',()=>{state.category='all';state.color='';state.mood='';$('color-select').value='';render();});
$('mood-link').addEventListener('click',()=>$('mood-section').scrollIntoView({behavior:'smooth'}));
$('bag-link').addEventListener('click',()=>info('Your everyday layers.','아직 담긴 상품이 없습니다.<br>현재는 화면 형태를 검토하는 시안으로, 장바구니와 결제는 연결되지 않았습니다.'));
$('menu-toggle').addEventListener('click',()=>{$('mobile-menu').hidden=!$('mobile-menu').hidden;$('menu-toggle').setAttribute('aria-expanded',String(!$('mobile-menu').hidden));});
$('mobile-menu').querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{$('mobile-menu').hidden=true;$('menu-toggle').setAttribute('aria-expanded','false');}));
$('newsletter-form').addEventListener('submit',e=>{e.preventDefault();toast('구독 폼 미리보기입니다. 이메일은 전송되거나 저장되지 않았어요.');e.currentTarget.reset();});
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}));
render();
