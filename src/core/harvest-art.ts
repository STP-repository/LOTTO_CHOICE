export const HARVEST_VERSION='harvest-lanes-v3';
export const HARVEST_PALETTE=['#fb9651','#59cbea','#282638','#ffe06a','#70cf91','#fff5e2','#344d83','#ec6266','#9870cb','#eeb993','#f0a8c2','#abbacb','#ae806d'];
export const HARVEST_COLOR_NAMES=['주황','하늘','검정','노랑','초록','크림','남색','빨강','보라','살구','분홍','은색','갈색'];
const species=['오리','고양이','토끼','판다','개구리','곰','펭귄','여우','로봇','가면 영웅'];
const roles=['선장','마법사','우주 탐험가','기사','닌자','요리사','탐정','궁수','록스타','해적'];
export const HARVEST_THEMES=['파도 오리 선장','밤날개 가면 영웅','볼트 로봇','플레어 액션 히어로','달빛 마법 고양이','우주 토끼 탐험가','숲의 붉은 여우','별빛 꼬마 기사',...species.flatMap((s,i)=>roles.map((r,j)=>`${s} ${r} · ${i*10+j+1}`))];
// Original layered character silhouettes, rasterized into actual collectible cells.
export function characterPixels(width:number,height:number,theme:number,seed:number){
 const cells=Array<number>(width*height).fill(-1),variant=(seed>>>5)%3;
 for(let iy=0;iy<height;iy++)for(let ix=0;ix<width;ix++){
  const x=((seed&1)?width-ix-.5:ix+.5)/width*24,y=(iy+.5)/height*24;let c=-1;
  const ellipse=(cx:number,cy:number,rx:number,ry:number,color:number)=>{if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)c=color;};
  const rect=(x1:number,y1:number,x2:number,y2:number,color:number)=>{if(x>=x1&&x<=x2&&y>=y1&&y<=y2)c=color;};
  const polygon=(ps:number[][],color:number)=>{let inside=false;for(let i=0,j=ps.length-1;i<ps.length;j=i++){const [a,b]=ps[i],[d,e]=ps[j];if((b>y)!==(e>y)&&x<(d-a)*(y-b)/(e-b)+a)inside=!inside;}if(inside)c=color;};
  if(theme>=8){
   const animal=Math.floor((theme-8)/10)%10,job=(theme-8)%10,outfit=[1,8,11,6,6,5,12,4,7,7][job];
   ellipse(12,20,6,5,outfit);ellipse(4,18+variant,2.3,3.4,outfit);ellipse(20,19-variant,2.3,3.4,outfit);rect(7-variant*.4,22,10.5,24,6);rect(13.5,22,17+variant*.4,24,6);
   if(animal===0){ellipse(12,10.5,6.5,5.5,5);ellipse(9,9.5,.9,1.3,2);ellipse(15,9.5,.9,1.3,2);ellipse(12,13,5,1.9,0);rect(9,13,15,13.4,2);}
   if(animal===1||animal===7){ellipse(12,10.5,6.2,5.4,0);polygon([[6,9],[5,2],[11,6]],0);polygon([[13,6],[19,2],[18,9]],0);ellipse(9,12,3,2.5,5);ellipse(15,12,3,2.5,5);ellipse(9,9.5,.8,1.1,animal===1?4:2);ellipse(15,9.5,.8,1.1,animal===1?4:2);ellipse(12,12.5,1,.7,2);if(animal===1){rect(4,11,8,11.5,2);rect(16,11.5,20,12,2);}else{ellipse(21,21,2,4,0);ellipse(21,18,1.5,1.5,5);}}
   if(animal===2){ellipse(9,3,1.8,4.2,5);ellipse(15,3,1.8,4.2,5);ellipse(9,2.5,.65,2.6,10);ellipse(15,2.5,.65,2.6,10);ellipse(12,11,6,5,5);ellipse(9.5,10,.7,1,2);ellipse(14.5,10,.7,1,2);ellipse(12,12.5,1,.65,10);}
   if(animal===3||animal===5){const fur=animal===3?5:12;ellipse(7,5,2.5,2.5,animal===3?2:12);ellipse(17,5,2.5,2.5,animal===3?2:12);ellipse(12,10,6.8,6,fur);if(animal===3){ellipse(9,9,2,2.5,2);ellipse(15,9,2,2.5,2);}ellipse(12,12.5,3.2,2.3,5);ellipse(9,9,.6,.9,animal===3?5:2);ellipse(15,9,.6,.9,animal===3?5:2);ellipse(12,12,1.2,.8,2);}
   if(animal===4){ellipse(12,11,7,5,4);ellipse(8,6.5,2.8,2.8,4);ellipse(16,6.5,2.8,2.8,4);ellipse(8,6.5,1.6,1.8,5);ellipse(16,6.5,1.6,1.8,5);ellipse(8,6.5,.7,1.1,2);ellipse(16,6.5,.7,1.1,2);ellipse(12,13,4,1.5,5);rect(9,12.5,15,13,2);}
   if(animal===6){ellipse(12,10,6.5,7,6);ellipse(12,11,4.8,5,5);ellipse(10,9,.7,1,2);ellipse(14,9,.7,1,2);polygon([[10,11],[14,11],[12,13.5]],0);}
   if(animal===8){rect(5,4,19,14,11);rect(4,7,5,11,7);rect(19,7,20,11,7);rect(7,6,17,11,6);rect(8,7,10,9,1);rect(14,7,16,9,1);rect(10,12,14,13,2);rect(11,1,13,4,11);ellipse(12,1,1,1,3);}
   if(animal===9){ellipse(12,10,6,6,9);ellipse(12,7,6,4.5,6);rect(6,7,18,10,2);polygon([[7,8],[11,8],[10,9.5],[8,9.5]],5);polygon([[13,8],[17,8],[16,9.5],[14,9.5]],5);rect(10,12.5,14,13,2);}
   if(job===0){ellipse(12,3.3,7,2.7,5);rect(5,5,19,6.3,6);ellipse(12,3.5,1,1,3);polygon([[9,16],[12,17],[15,16],[14,19],[12,17],[10,19]],7);}
   if(job===1){polygon([[5,5],[14,.2],[18,5]],8);rect(3,5,21,6.5,8);rect(7,4,17,5,3);rect(21,10,22,23,12);polygon([[21.5,7],[22.5,9],[24,10],[22.5,11],[21.5,13],[20.5,11],[19,10],[20.5,9]],3);}
   if(job===2){const rr=((x-12)/8)**2+((y-9)/8)**2;if(rr>.74&&rr<1)c=11;rect(2.2,8,4.4,12,6);rect(19.6,8,21.8,12,6);rect(8,17,16,21,5);ellipse(12,19,1.3,1.3,7);}
   if(job===3){rect(5,3,19,6.4,11);rect(10.8,2.5,13.2,11.5,3);ellipse(20,18,3,4,1);polygon([[20,15],[21.5,18],[20,21],[18.5,18]],3);rect(2,12,3,24,11);rect(.5,13,5,14,3);}
   if(job===4){rect(5,6,19,7.5,7);polygon([[18,7],[23,9],[19,11]],7);rect(7,13.5,17,15.5,6);rect(7,20,17,21,7);polygon([[3,16],[4,18],[6,19],[4,20],[3,22],[2,20],[0,19],[2,18]],11);}
   if(job===5){ellipse(8,3,3,2.5,5);ellipse(12,2,3,2.5,5);ellipse(16,3,3,2.5,5);rect(6,3,18,6,5);rect(7,16,17,23,5);ellipse(21,17,2.4,3,2);ellipse(21,17,1.4,2,11);rect(20.5,19,21.5,24,12);}
   if(job===6){polygon([[6,5],[7,1],[17,1],[18,5]],12);rect(3,5,21,6,12);rect(8,16,16,17,3);ellipse(21,17,2.6,2.6,11);ellipse(21,17,1.6,1.6,1);rect(20.5,19,21.5,24,12);}
   if(job===7){polygon([[5,8],[7,1],[17,1],[19,8],[16,6],[8,6]],4);rect(8,20,16,21,12);const bow=((x-20)/3)**2+((y-17)/7)**2;if(bow>.75&&bow<1)c=0;rect(19.7,10,20.3,24,2);rect(17,16.4,24,17.1,11);}
   if(job===8){polygon([[5,5],[6,1],[9,4],[11,0],[13,3],[17,1],[19,6]],3);ellipse(18.5,20,3.8,3.5,7);rect(15,13,17,21,12);rect(15.7,13,16.3,23,5);ellipse(18.5,20,1,1.4,2);}
   if(job===9){polygon([[3,6],[6,1],[12,3],[18,1],[21,6]],6);rect(4,5.6,20,6.5,3);ellipse(12,4.5,1,1,5);ellipse(9,10,1.9,1.9,2);rect(6,18,18,19,5);rect(6,21,18,22,5);}
  }else if(theme===0){
   ellipse(12,21,8,6,1);ellipse(3.5,20,2,3,5);ellipse(20.5,20,2,3,5);ellipse(12,10.5,7,6,5);
   ellipse(8.8,10,1.2,1.7,2);ellipse(15.2,10,1.2,1.7,2);ellipse(8.5,9.5,.35,.4,5);ellipse(15,9.5,.35,.4,5);
   ellipse(12,13.3,6.1,2.2,0);rect(8,13,16,13.5,2);ellipse(12,3.1,7.2,2.5,5);rect(5.5,4.7,18.5,6,6);
   polygon([[8,17],[12,18],[16,17],[15,20],[12,18],[9,20]],variant===1?8:7);ellipse(12,21,.7,.7,3);
  }else if(theme===1){
   polygon([[6,11],[0,23],[8,21],[12,24],[16,21],[24,23],[18,11]],6);ellipse(12,19,6.5,7,11);
   ellipse(12,8,5.7,6.5,6);polygon([[6.5,8],[6.4,.8],[11,5]],6);polygon([[13,5],[17.6,.8],[17.5,8]],6);
   ellipse(12,12,3.8,2.4,9);polygon([[7.5,7.3],[10.5,8],[10,9],[8,8.7]],5);polygon([[13.5,8],[16.5,7.3],[16,8.7],[14,9]],5);
   rect(6,20,18,21.5,3);polygon([[12,15],[14,17],[12,19],[10,17]],3);rect(10.5,12.8,13.5,13.3,2);
  }else if(theme===2){
   rect(7,14,17,22,6);rect(2.5,14,6.5,21,11);rect(17.5,14,21.5,21,11);rect(6,21,10.5,24,11);rect(13.5,21,18,24,11);
   rect(5,3,19,14,11);rect(3,6,5,11,0);rect(19,6,21,11,0);rect(7,5,17,12,5);rect(7,7,17,9,6);rect(8,7,10,8.5,1);rect(14,7,16,8.5,1);rect(10,10,14,11,2);
   rect(11,0,13,3,11);ellipse(12,1,1.2,1.2,7);ellipse(12,18,3,3,0);ellipse(12,18,1.5,1.5,3);
  }else if(theme===3){
   polygon([[6,12],[2,23],[12,20],[22,23],[18,12]],variant===1?8:7);ellipse(12,18,6,6,7);ellipse(12,8,5.5,6,7);
   polygon([[7,7],[11,8],[10.5,9.5],[7.5,9]],5);polygon([[13,8],[17,7],[16.5,9],[13.5,9.5]],5);rect(10.5,11,13.5,12,5);
   rect(9,20,15,22,6);ellipse(3.8,17,2.8,3.5,3);ellipse(20.2,17,2.8,3.5,3);polygon([[12,13],[13,15.5],[16,16],[13.5,17.5],[14,20],[12,18.5],[10,20],[10.5,17.5],[8,16],[11,15.5]],3);
  }else if(theme===4){
   polygon([[9,13],[3,23],[21,23],[15,13]],8);ellipse(12,11,6,5,0);polygon([[6,11],[6,5],[10,8]],0);polygon([[14,8],[18,5],[18,11]],0);
   ellipse(9.5,11,1,1.2,4);ellipse(14.5,11,1,1.2,4);ellipse(9.5,11,.35,.8,2);ellipse(14.5,11,.35,.8,2);ellipse(12,13,1,.6,2);
   polygon([[4,6],[13,.5],[17,6]],8);rect(3,5.5,21,7,8);rect(7,4.5,17,5.5,3);rect(20,11,21,22,3);polygon([[20.5,8],[21.4,10],[23,11],[21.4,12],[20.5,14],[19.5,12],[18,11],[19.5,10]],3);
   ellipse(12,18,1,1,3);
  }else if(theme===5){
   ellipse(12,19,7,6,1);ellipse(6,20,3,4,5);ellipse(18,20,3,4,5);ellipse(12,10,8,7,11);ellipse(12,10,6.5,5.5,6);
   ellipse(12,11,4.5,4,5);ellipse(9,3,2,4,5);ellipse(15,3,2,4,5);ellipse(9,2.5,.8,2.4,10);ellipse(15,2.5,.8,2.4,10);
   ellipse(10,10, .7,1,2);ellipse(14,10,.7,1,2);ellipse(12,12,1,.6,10);ellipse(12,19,2,2,3);ellipse(12,19,.8,.8,7);
  }else if(theme===6){
   ellipse(12,20,6,6,0);ellipse(20,19,3.5,5,0);ellipse(21,16,2,2.5,5);ellipse(12,10,7,6,0);
   polygon([[5,9],[5,1],[10,6]],0);polygon([[14,6],[19,1],[19,9]],0);polygon([[6,7],[6,3],[9,6]],10);polygon([[15,6],[18,3],[18,7]],10);
   ellipse(9,12,3.5,3,5);ellipse(15,12,3.5,3,5);ellipse(9,9.5, .8,1,2);ellipse(15,9.5,.8,1,2);ellipse(12,12,1.2,.8,2);rect(8,16,16,18,variant===1?8:4);ellipse(12,20,2,3,5);
  }else{
   polygon([[6,12],[2,23],[12,21],[22,23],[18,12]],variant===1?7:8);ellipse(12,19,6,6,11);ellipse(12,8,6,6,11);
   ellipse(12,9,4.5,3.8,9);rect(6,4,18,7,11);rect(10.8,3.5,13.2,11.5,3);ellipse(9,9,.6,.8,2);ellipse(15,9,.6,.8,2);
   rect(3,12,4,24,11);rect(1,13,6,14.5,3);polygon([[3.5,8],[5,12],[2,12]],11);ellipse(19,18,3,4,1);polygon([[19,15],[20.5,18],[19,21],[17.5,18]],3);
  }
  cells[iy*width+ix]=c;
 }
 // A single-cell dark outline gives every character a readable silhouette and real barriers.
 const original=[...cells];for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(original[y*width+x]<0&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>x+dx>=0&&x+dx<width&&y+dy>=0&&y+dy<height&&original[(y+dy)*width+x+dx]>=0))cells[y*width+x]=2;
 return cells;
}
