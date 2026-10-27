import type {Board,State,Cell} from './color-block-escape';
export type ColorItem='freeze'|'hammer'|'rocket'|'vacuum';
export const COLOR_ITEMS={freeze:{name:'시간 결정',price:40,limit:2},hammer:{name:'통로 망치',price:80,limit:1},rocket:{name:'별빛 로켓',price:100,limit:1},vacuum:{name:'색상 회수',price:160,limit:1}} as const;
export const stageTime=(stage:string)=>BigInt(stage)<=100n?240000:BigInt(stage)<=1000n?270000:300000;
export interface ColorClock {remaining:number;last:number;frozenUntil:number}
export const startClock=(stage:string,now:number):ColorClock=>({remaining:stageTime(stage),last:now,frozenUntil:0});
export function tickClock(clock:ColorClock,now:number):ColorClock{if(now<clock.last)return clock;return {...clock,remaining:Math.max(0,clock.remaining-Math.max(0,now-Math.max(clock.last,clock.frozenUntil))),last:now};}
export function freezeClock(clock:ColorClock,now:number){return {...tickClock(clock,now),frozenUntil:Math.max(now,clock.frozenUntil)+10000};}
export function colorBoost(b:Board,s:State,item:ColorItem,id?:number):State|null{
 if(s.phase!=='playing'||s.flights.length)return null;
 if(item==='freeze')return {...s};
 if(item==='hammer'){if(!Number.isInteger(id)||!b.walls[id!]||s.brokenWalls?.some(([x,y])=>x===b.walls[id!][0]&&y===b.walls[id!][1]))return null;return {...s,brokenWalls:[...(s.brokenWalls??[]),b.walls[id!] as Cell]};}
 const piece=s.pieces.find(p=>p.id===id);if(!piece)return null;const targets=item==='vacuum'?s.pieces.filter(p=>p.color===piece.color):[piece];
 return {...s,flights:targets.map(p=>({id:p.id,gateId:-1,direction:'up',kind:'burst'}))};
}
