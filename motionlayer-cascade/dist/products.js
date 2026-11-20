export const products = [
  {id:'fluid-dress',number:'01',name:'Fluid wrap dress',ko:'플루이드 랩 드레스',category:'dresses',color:'blue',colorName:'Powder blue',price:159000,mood:['light','free'],description:'몸의 움직임을 따라 가볍게 흐르는 실루엣. 차분한 블루와 부드러운 선으로 완성하는 하루.'},
  {id:'stripe-top',number:'02',name:'Soft stripe top',ko:'소프트 스트라이프 톱',category:'tops',color:'green',colorName:'Sage stripe',price:69000,mood:['light','free'],description:'가볍게 입는 한 겹의 여유. 은은한 스트라이프와 편안한 실루엣으로 일상에 리듬을 더합니다.'},
  {id:'drape-dress',number:'03',name:'Drape midi dress',ko:'드레이프 미디 드레스',category:'dresses',color:'navy',colorName:'Midnight navy',price:149000,mood:['calm'],description:'단순한 선, 자연스러운 드레이프. 익숙한 날에도 조금 특별한 날에도 편안하게 어울리는 미디 드레스.'},
  {id:'cotton-robe',number:'04',name:'Relaxed cotton robe',ko:'릴랙스드 코튼 로브',category:'layers',color:'brown',colorName:'Soft cocoa',price:129000,mood:['calm','light'],description:'가만히 쉬어가는 순간부터 가벼운 외출까지. 나의 속도에 맞추어 자연스럽게 더하는 레이어.'},
  {id:'flow-dress',number:'05',name:'Flow sleeveless dress',ko:'플로 슬리브리스 드레스',category:'dresses',color:'green',colorName:'Forest green',price:149000,mood:['free','calm'],soldout:true,description:'걷는 모습마다 달라지는 부드러운 볼륨. 자연을 닮은 그린과 여유로운 실루엣을 담았습니다.'},
  {id:'check-vest',number:'06',name:'Layered check vest',ko:'레이어드 체크 베스트',category:'layers',color:'brown',colorName:'Brown / mint',price:119000,mood:['free'],description:'서로 다른 컬러가 만드는 섬세한 균형. 셔츠나 티셔츠 위에 나만의 감각으로 더하는 레이어.'}
];

const arrivalExtras = [
  {id:'check-coat',number:'07',name:'Windowpane wool coat / check',ko:'윈도페인 울 코트',category:'layers',color:'brown',colorName:'Blue / orange check',price:249000,mood:['calm','free'],description:'다채로운 체크 위로 여유롭게 흐르는 실루엣. 가벼운 이너 위에 더하는 포근한 한 겹.'},
  {id:'navy-coat',number:'08',name:'Everyday navy coat',ko:'에브리데이 네이비 코트',category:'layers',color:'navy',colorName:'Dark navy',price:249000,mood:['calm'],description:'차분한 네이비와 단정한 선이 만드는 균형. 익숙한 일상에 오래 함께할 레이어.'},
  {id:'red-wrap-top',number:'09',name:'Ribbon wrap top',ko:'리본 랩 톱',category:'tops',color:'red',colorName:'Poppy red',price:79000,mood:['free','light'],description:'자연스럽게 묶어 완성하는 나만의 리듬. 선명한 레드로 더하는 가벼운 포인트.'},
  {id:'blue-check-top',number:'10',name:'Soft check wrap top',ko:'소프트 체크 랩 톱',category:'tops',color:'blue',colorName:'Blue / navy check',price:79000,mood:['free','calm'],description:'블루와 네이비가 겹쳐지는 부드러운 체크. 일상의 움직임을 따라 흐르는 랩 실루엣.'}
];
export const arrivalProducts = [arrivalExtras[0],arrivalExtras[1],products[2],arrivalExtras[2],arrivalExtras[3],products[4],products[1],products[5]];
export const catalog = [...products,...arrivalExtras];
