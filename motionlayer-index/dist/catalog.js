export const types = {outer:'아우터', top:'상의', bottom:'하의', accessory:'액세서리'};
export const moods = {
  light:{label:'가볍게', note:'몸에 가볍게 닿는 옷', color:'#e9b763'},
  move:{label:'활동적으로', note:'걸음이 길어지는 날', color:'#d45231'},
  focus:{label:'집중해서', note:'일하는 동안 편안하게', color:'#5b7387'},
  rest:{label:'느긋하게', note:'쉬는 날의 부드러운 촉감', color:'#859074'}
};
export const series = [
  {id:'field',title:'Field Studies',name:'Field',image:'field-campaign',alt:'바람 부는 능선에서 짙은 색 아노락을 입고 걷는 모델',ko:'필드',copy:'바람 부는 날, 겹쳐 입고 가볍게 걸을 수 있는 옷.',caption:'바람이 지나는 능선',position:'56% 46%'},
  {id:'daily',title:'Daily Form',name:'Daily',image:'daily-series',alt:'나무와 바위 사이에서 반소매 티셔츠를 입은 모델',ko:'데일리',copy:'티셔츠 한 장에서 시작하는 일상의 레이어.',caption:'물가에서 보낸 오후',position:'50% 35%'},
  {id:'pause',title:'Slow Hours',name:'Pause',image:'pause-series',alt:'해가 진 뒤 바위 옆에서 차콜 후디를 입은 모델',ko:'포즈',copy:'여유 있는 실루엣과 부드러운 촉감으로 채운 휴일.',caption:'해가 진 뒤의 산책',position:'50% 34%'}
];

export const products = [
  {id:'layer-shell',name:'Light Layer Shell',ko:'라이트 레이어 셸',type:'outer',color:'Charcoal',hex:'#53534e',price:159000,series:'field',moods:['move','focus'],sizes:['S','M','L'],look:'shell-look',description:'낙낙한 후드와 조절 가능한 밑단으로 바람을 따라 입는 가벼운 셸.',care:'가벼운 직조 원단. 지퍼와 조임끈을 정리한 뒤 찬물에 단독 손세탁하세요.'},
  {id:'field-pants',name:'Field Cargo Pants',ko:'필드 카고 팬츠',type:'bottom',color:'Stone',hex:'#858581',price:129000,series:'field',moods:['move','focus'],sizes:['S','M','L','XL'],description:'넉넉한 통과 옆 포켓이 움직임을 따라가는 카고 팬츠.',care:'밀도 있는 직조 원단. 뒤집어 약한 코스로 세탁하고 그늘에서 말려주세요.'},
  {id:'everyday-tee',name:'Everyday T-shirt',ko:'에브리데이 티셔츠',type:'top',color:'Taupe',hex:'#9c8e7c',price:49000,series:'daily',moods:['light','rest'],sizes:['S','M','L','XL'],look:'daily-series',description:'어깨선을 부드럽게 내려 여유 있게 입는 데일리 티셔츠.',care:'부드러운 저지 원단. 비슷한 색끼리 세탁하고 모양을 잡아 자연 건조하세요.'},
  {id:'light-shorts',name:'Easy Motion Shorts',ko:'이지 모션 쇼츠',type:'bottom',color:'Sand',hex:'#b9ac98',price:69000,series:'field',moods:['move','light'],sizes:['S','M','L'],description:'허리 밴드와 짧은 기장이 가벼운 걸음에 어울리는 쇼츠.',care:'신축성 있는 원단. 찬물에 세탁하고 건조기 사용을 피해주세요.'},
  {id:'soft-hoodie',name:'Soft Pause Hoodie',ko:'소프트 포즈 후디',type:'top',color:'Grey',hex:'#77777c',price:139000,series:'pause',moods:['rest','focus'],sizes:['S','M','L'],sold:true,look:'pause-series',description:'넉넉한 후드와 부드러운 표면이 몸을 편안하게 감싸는 레이어.',care:'기모 표면은 마찰을 줄여 관리하세요. 찬물에 손세탁 후 평평하게 말려주세요.'},
  {id:'everyday-cap',name:'Everywhere Cap',ko:'에브리웨어 캡',type:'accessory',color:'Navy',hex:'#383f4e',price:39000,series:'daily',moods:['light','move'],sizes:['ONE SIZE'],description:'챙의 곡선과 뒷면 조절끈으로 핏을 맞추는 데일리 캡.',care:'형태를 유지하도록 오염 부위만 부드럽게 닦고 그늘에서 건조하세요.'},
  {id:'zip-layer',name:'Texture Zip Layer',ko:'텍스처 집 레이어',type:'outer',color:'Indigo',hex:'#4f4b68',price:149000,series:'pause',moods:['rest','move'],sizes:['S','M','L','XL'],description:'여닫는 지퍼와 가벼운 텍스처로 체온에 맞춰 입는 후디.',care:'지퍼를 잠그고 세탁망에 넣어 약한 코스로 세탁하세요.'},
  {id:'base-tee',name:'Essential Base Tee',ko:'에센셜 베이스 티',type:'top',color:'Cream',hex:'#d9d2c2',price:59000,series:'daily',moods:['light','focus'],sizes:['S','M','L','XL'],description:'단정한 넥라인과 편안한 품으로 겹쳐 입기 좋은 베이스 티셔츠.',care:'밝은 색상끼리 분리해 세탁하세요. 고온 건조와 표백제를 피해주세요.'},
  {id:'daily-sling',name:'Daily Sling Bag',ko:'데일리 슬링 백',type:'accessory',color:'Navy',hex:'#383f4e',price:45000,series:'daily',moods:['light','move'],sizes:['ONE SIZE'],description:'필요한 것만 넣고 몸 가까이에 가볍게 메는 슬링 백.',care:'부드러운 천으로 닦은 뒤 통풍이 잘되는 그늘에서 말려주세요.'}
].map((item,index)=>({...item,no:String(index+1).padStart(2,'0')}));

export const productById = new Map(products.map(item=>[item.id,item]));
export const money = value => '₩' + value.toLocaleString('ko-KR');
export const pad = value => String(value).padStart(2,'0');
