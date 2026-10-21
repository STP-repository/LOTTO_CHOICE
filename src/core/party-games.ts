import {rng} from './recommend';
export const GAME_TYPES=[{id:'pinball',name:'핀볼',icon:'◉',rule:'통통 튀는 공! 마지막에 도착한 사람이 당첨'},{id:'ladder',name:'사다리 타기',icon:'⋈',rule:'엇갈리는 길을 따라 당첨 칸에 도착하세요'},{id:'roulette',name:'이름 룰렛',icon:'◔',rule:'빙글빙글 돌아가는 룰렛이 멈추는 이름은?'},{id:'race',name:'구슬 경주',icon:'➜',rule:'결승선을 가장 먼저 통과한 구슬이 당첨'},{id:'cards',name:'카드 뽑기',icon:'▱',rule:'섞인 이름 카드에서 한 장을 골라 당첨자 공개'},{id:'dice',name:'주사위 대결',icon:'⚄',rule:'가장 큰 수가 승리! 동점이면 다시 굴려요'},{id:'slots',name:'이름 슬롯',icon:'▥',rule:'세 칸에 같은 이름이 뜨면 당첨!'},{id:'treasure',name:'보물찾기',icon:'◇',rule:'차례대로 상자를 열어 보물을 찾은 사람이 당첨'},{id:'bomb',name:'폭탄 돌리기',icon:'✹',rule:'이름 사이를 돌다가 펑! 그 순간의 사람이 당첨'},{id:'tournament',name:'랜덤 토너먼트',icon:'⚑',rule:'대진표에서 한 명씩 살아남는 랜덤 승부'}] as const;
export type PartyMode=typeof GAME_TYPES[number]['id'];
export function parseParticipants(text:string){const names=text.split(/[\n,]/).map(s=>s.trim()).filter(Boolean);if(names.length>20)throw new Error('참가자는 최대 20명까지 등록할 수 있습니다.');if(names.some(n=>n.length>20))throw new Error('이름은 20자 이하로 입력해 주세요.');return names;}
export function shuffled<T>(input:T[],random:()=>number){const a=[...input];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function makeLadder(count:number,seed:number){
  const random=rng(seed),bars=Array.from({length:16},(_,row)=>({row,col:Math.floor(random()*(count-1))}));
  const paths=Array.from({length:count},(_,start)=>{let lane=start;const steps=[lane];bars.forEach(b=>{if(lane===b.col)lane++;else if(lane===b.col+1)lane--;steps.push(lane);});return {start,end:lane,steps};});
  const target=Math.floor(random()*count);return {bars,paths,target,winner:paths.find(p=>p.end===target)!.start};
}
export interface BallPoint {x:number;y:number;finished:boolean}
export const PEGS=Array.from({length:6},(_,row)=>Array.from({length:row%2?4:5},(_,col)=>({x:(row%2?90:50)+col*80,y:100+row*60}))).flat();
export function simulatePinball(count:number,seed:number){
  const random=rng(seed),dt=1/120,balls=Array.from({length:count},()=>({x:30+random()*360,y:20+random()*35,vx:(random()-.5)*130,vy:0,finished:false})),frames:BallPoint[][]=[],arrivals:{id:number;time:number}[]=[];
  for(let step=0;step<2400;step++){
    for(let id=0;id<count;id++){const b=balls[id];if(b.finished)continue;const oldY=b.y;
      b.vy+=760*dt;b.vx+=Math.sin(step*.05+id)*20*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
      if(b.x<13){b.x=13;b.vx=Math.abs(b.vx)*.8;}if(b.x>407){b.x=407;b.vx=-Math.abs(b.vx)*.8;}
      for(const peg of PEGS){const dx=b.x-peg.x,dy=b.y-peg.y,dist=Math.hypot(dx,dy);if(dist<19){const nx=dist?dx/dist:.1,ny=dist?dy/dist:-1;b.x=peg.x+nx*19;b.y=peg.y+ny*19;const dot=b.vx*nx+b.vy*ny;if(dot<0){b.vx-=1.76*dot*nx;b.vy-=1.76*dot*ny;}if(Math.abs(b.vx)<12)b.vx+=(id%2?1:-1)*18;}}
      if(b.y>=530){const fraction=Math.max(0,Math.min(1,(530-oldY)/Math.max(.001,b.y-oldY)));b.finished=true;b.y=530;arrivals.push({id,time:step*dt+fraction*dt});}
    }
    if(step%4===0)frames.push(balls.map(b=>({x:b.x,y:b.y,finished:b.finished})));
    if(arrivals.length===count){frames.push(balls.map(b=>({x:b.x,y:b.y,finished:b.finished})));break;}
  }
  if(arrivals.length!==count)throw new Error('모든 공이 도착하지 못했습니다. 다시 시작해 주세요.');
  arrivals.sort((a,b)=>a.time-b.time||a.id-b.id);return {frames,arrivals,winner:arrivals.at(-1)!.id};
}
export function simulateRace(count:number,seed:number){const random=rng(seed),positions=Array<number>(count).fill(0),frames:number[][]=[],arrivals:number[]=[];for(let tick=0;tick<600;tick++){
  const crossed:{id:number;fraction:number}[]=[];for(let i=0;i<count;i++){if(positions[i]>=100)continue;const add=.1+random()*.9,old=positions[i];positions[i]=Math.min(100,old+add);if(positions[i]===100)crossed.push({id:i,fraction:(100-old)/add});}
  crossed.sort((a,b)=>a.fraction-b.fraction).forEach(a=>arrivals.push(a.id));frames.push([...positions]);if(arrivals.length===count)break;
}return {frames,arrivals,winner:arrivals[0]};}
export function diceTournament(count:number,seed:number){const random=rng(seed),rounds:{players:number[];rolls:number[];survivors:number[]}[]=[];let players=Array.from({length:count},(_,i)=>i);for(let turn=0;players.length>1&&turn<100;turn++){const rolls=players.map(()=>1+Math.floor(random()*6)),max=Math.max(...rolls),survivors=players.filter((_,i)=>rolls[i]===max);rounds.push({players:[...players],rolls,survivors});players=survivors;}if(players.length!==1)throw new Error('동점이 반복됐습니다. 다시 시작해 주세요.');return {rounds,winner:players[0]};}
export function knockout(count:number,seed:number){const random=rng(seed),rounds:{pairs:{a:number;b:number|null;winner:number}[]}[]=[];let players=shuffled(Array.from({length:count},(_,i)=>i),random);while(players.length>1){const pairs:{a:number;b:number|null;winner:number}[]=[],next:number[]=[];for(let i=0;i<players.length;i+=2){const a=players[i],b=players[i+1]??null,winner=b===null||random()<.5?a:b;pairs.push({a,b,winner});next.push(winner);}rounds.push({pairs});players=next;}return {rounds,winner:players[0]};}
