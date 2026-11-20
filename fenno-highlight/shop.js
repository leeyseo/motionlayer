'use strict';

const sizeSpecs = {
  '아우터':[['총장','가슴 단면','소매'],[[66,58,60],[69,61,62],[72,64,64]]],
  '상의':[['총장','가슴 단면','어깨'],[[64,51,45],[67,54,47],[70,57,49]]],
  '하의':[['총장','허리 단면','밑단 단면'],[[97,32,22],[100,35,23],[103,38,24]]]
};
function measurement(p) {
  if(p.type==='액세서리') return p.id===4?'가로 31 · 세로 21 · 끈 길이 63 cm':p.id===15 ? '가로 23 · 높이 20 cm' : '머리둘레 54–60 cm';
  const [labels,rows]=[6,11,20,21,23].includes(p.id)?[['총장','허리 단면','밑단 단면'],[[38,32,29],[40,35,30],[42,38,31]]]:sizeSpecs[p.type];
  return `<table><caption>단면 실측 (cm)</caption><thead><tr><th>사이즈</th>${labels.map(v=>`<th>${v}</th>`).join('')}</tr></thead><tbody>${rows.map((row,i)=>`<tr><th>${sizesFor(p)[i]}</th>${row.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function productPage(p) {
  const sizes=sizesFor(p);
  return heading(`PRODUCT Nº ${pad(p.id)} / ${p.type}`,p.name)+`<div class="detail-photo"><img src="${photo(p)}" alt="${p.color} ${p.name}"></div><div class="summary-line"><span><i class="swatch" style="--color:${p.hex}"></i> ${p.color}</span><strong class="detail-price">${won(p.price)}</strong></div><p class="sheet-intro">${p.desc}</p><span class="info-label">사이즈</span><div class="sizes">${sizes.map(s=>pill(s,s,s===ui.size,'size')).join('')}</div><div class="actions"><button class="secondary" data-add="bag" ${p.sold?'disabled':''}>${p.sold?'품절':'장바구니 담기'}</button><button class="primary" data-add="buy" ${p.sold?'disabled':''}>바로 구매</button></div>${detail('사이즈표',measurement(p))}${detail('소재 · 세탁 정보',`<p>${p.fabric}<br>${p.care}</p>`)}`;
}
function add(p) {
  if(!p || p.sold || !sizesFor(p).includes(ui.size)) return false;
  const row=memory.bag.find(line=>line.id===p.id&&line.size===ui.size);
  if(row) row.qty+=1; else memory.bag.push({id:p.id,size:ui.size,qty:1});
  save();return true;
}
function bagRows() {
  return memory.bag.map((line,i)=>{
    const p=product(line.id);
    return `<div class="bag-row"><img src="${photo(p)}" alt=""><div><strong>${p.name}</strong><small>${p.color} / ${line.size} · ${won(p.price)}</small></div><div class="stepper"><button data-qty="-1" data-row="${i}" aria-label="${p.name} 수량 줄이기">−</button>${line.qty}<button data-qty="1" data-row="${i}" aria-label="${p.name} 수량 늘리기">+</button></div></div>`;
  }).join('');
}
function totals() {
  const subtotal=memory.bag.reduce((n,l)=>n+product(l.id).price*l.qty,0);
  const discount=ui.coupon&&memory.coupon?Math.floor(subtotal*.05):0;
  const points=ui.points?Math.min(memory.points,subtotal-discount):0;
  return {subtotal,discount,points,total:subtotal-discount-points};
}
function bag() {
  return heading('SHOPPING BAG','장바구니')+(memory.bag.length?bagRows()+`<div class="summary-line"><span>상품 합계</span><strong>${won(totals().subtotal)}</strong></div><a href="#checkout" class="primary wfull">주문하기</a>`:'<p>아직 담은 상품이 없습니다.</p><a href="#catalog" class="secondary">상품 둘러보기</a>');
}
function checkout() {
  if(!memory.bag.length)return bag();
  const t=totals();
  return heading('CHECKOUT / DEMO','주문 · 결제')+`<p class="fine">시안용 모의 주문입니다. 실제 결제와 배송은 발생하지 않습니다.</p>${memory.bag.map(l=>`<div class="summary-line"><span>${product(l.id).name} / ${l.size} × ${l.qty}</span><span>${won(product(l.id).price*l.qty)}</span></div>`).join('')}<label class="choice"><input type="checkbox" id="coupon" ${ui.coupon&&memory.coupon?'checked':''} ${!memory.coupon?'disabled':''}> 첫 구매 쿠폰 5% ${memory.coupon?'':'(사용 완료)'}</label><label class="choice"><input id="points" type="checkbox" ${ui.points?'checked':''} ${memory.points?'':'disabled'}> 보유 적립금 ${won(memory.points)} 사용</label><span class="info-label">간편결제 수단</span><div class="sizes">${['네이버페이','카카오페이'].map(m=>pill(m,m,ui.method===m,'method')).join('')}</div><div class="summary-line"><span>총 결제 금액</span><strong>${won(t.total)}</strong></div><button class="primary wfull" data-order>모의 주문 완료</button>`;
}
function placeOrder() {
  if(!memory.bag.length)return;
  const t=totals(), earn=Math.floor(t.total*.01);
  const id='FN-'+String(Date.now()).slice(-10);
  memory.orders.unshift({id,items:memory.bag.map(l=>({...l})),total:t.total,method:ui.method,earn});
  memory.bag=[];memory.points+=earn-t.points;
  if(t.discount)memory.coupon=false;
  ui.coupon=false;ui.points=false;save();location.hash='order/'+id;
}
function account() {
  return heading('MY PAGE / DEMO','마이페이지')+`<p class="fine">이 브라우저에 저장된 시안용 회원 내역입니다.</p><div class="account-stat">적립금 <strong>${won(memory.points)}</strong></div><div class="account-stat">첫 구매 쿠폰 <strong>${memory.coupon?'5% · 1장':'사용 완료'}</strong></div><h3>주문 조회</h3>${memory.orders.length?memory.orders.map(o=>`<a class="summary-line" href="#order/${o.id}"><span>${o.id} · 주문 접수</span><strong>${won(o.total)} ›</strong></a>`).join(''):'<p>아직 주문 내역이 없습니다.</p>'}`;
}
function receipt(id) {
  const o=memory.orders.find(o=>o.id===id);
  if(!o)return account();
  return heading('ORDER / DEMO','주문이 접수됐습니다.')+`<p class="mono">${o.id}</p>${o.items.map(l=>`<div class="summary-line">${product(l.id).name}<span>${l.size} × ${l.qty}</span></div>`).join('')}<div class="summary-line">${o.method} · 모의 결제<strong>${won(o.total)}</strong></div><p class="fine">이번 주문의 적립금 ${won(o.earn)}</p><a class="secondary" href="#account">주문 내역 보기</a>`;
}
function seriesPage(id) {
  const s=series.find(s=>s.id===id);
  if(!s)return heading('COLLECTIONS','Series')+series.map((s,i)=>`<a class="series-card" href="#series/${s.id}"><img class="cover-small" src="assets/${s.photo}.webp" alt="${s.alt}"><strong>${pad(i+1)} / ${s.name}</strong>${s.intro}</a>`).join('');
  return heading('SERIES '+pad(series.indexOf(s)+1),s.name)+`<img class="cover-small" src="assets/${s.photo}.webp" alt="${s.alt}"><p>${s.intro}</p><button class="primary wfull" data-collection="${s.id}">시리즈 상품 ${goods.filter(p=>p.series===s.id).length}개 보기</button>`;
}
function guide() {
  return heading('CUSTOMER CARE','고객 안내')+detail('배송 안내','<p>주문 후 마이페이지에서 접수 상태를 확인할 수 있습니다. 배송비와 출고 일정은 정식 오픈 시 안내합니다.</p>')+detail('교환 · 반품','<p>주문 내역에서 상품과 사이즈를 확인해 주세요. 정식 오픈 시 접수 창구, 회수 방법과 처리 일정을 안내합니다.</p>')+detail('FAQ · 사이즈를 어떻게 고르나요?','<p>상품 상세의 사이즈표를 펼쳐 평소 입는 옷의 단면 실측과 비교해 보세요.</p>')+detail('FAQ · 쿠폰과 적립금을 함께 쓸 수 있나요?','<p>시안에서는 주문 단계에서 첫 구매 쿠폰과 보유 적립금을 함께 적용할 수 있습니다.</p>')+'<a class="secondary" href="#terms">이용약관 보기</a>';
}
function content(route,id) {
  switch(route) {
    case 'product': return product(id)?productPage(product(id)):null;
    case 'series': return seriesPage(id);
    case 'bag': return bag();
    case 'checkout': return checkout();
    case 'order': return receipt(id);
    case 'account': return account();
    case 'about': return heading('ABOUT FENNO','오늘을 찍는 점.')+'<div class="story-dot" aria-hidden="true"></div><p class="sheet-intro">fenno.는 그날의 몸과 기분에서 옷을 고르는 브랜드입니다. 걷고 싶은 날에는 가벼운 셸을, 오래 머무는 날에는 부드러운 면 한 겹을 제안합니다.</p><h3>이름 끝의 점</h3><p class="sheet-intro">작은 파란 점은 지금 내가 있는 자리입니다. 상태를 고르면 상품 인덱스의 점이 지금의 선택을 표시합니다. 계절과 하루 사이에서 바뀌는 감각을 점 하나에 기록합니다.</p>';
    case 'guide': return guide();
    case 'terms': return heading('SHOP POLICY / PREVIEW','이용약관')+'<p class="sheet-intro">현재는 스토어 시안입니다. 상품과 가격은 예시이며, 주문 내역은 사용 중인 브라우저에 저장됩니다. 실제 판매에 적용할 구매·결제, 취소·환불 및 회원 이용 조건은 정식 오픈 전에 게시합니다.</p><a href="#guide" class="secondary">고객 안내</a>';
    case 'post': {
      const post=posts[Number(id)];
      return post?heading('STUDIO NOTES / FEED PREVIEW',post.title)+`<img class="cover-small" src="assets/${post.photo}.webp" alt="${post.title}"><p>${post.text}</p>`:null;
    }
    default:return null;
  }
}
