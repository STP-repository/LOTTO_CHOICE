import {strategyPolicy,solveStrategy,settleHarvest} from './harvest-strategy';
import strategyCatalog from './harvest-strategy-catalog.json';
import {HARVEST_VERSION} from './harvest-art';
export {HARVEST_VERSION,HARVEST_PALETTE} from './harvest-art';
// Independent rules shared by generation, solution verification, and the UI.
export type PuzzleKind='escape'|'harvest';
export {COLOR_BLOCK_VERSION as GENERATOR_VERSION} from './color-block-escape';
export type {State as EscapeState,Side as Direction} from './color-block-escape';
export type {ColorStage as EscapePuzzle} from './color-block-stages';
export {generateColorStage as generateEscape,verifyColorStage as verifyEscape} from './color-block-stages';
export const PALETTE=['#ff806b','#54c8ef','#b89aff','#ffd064','#69dbb4','#ee97cd'];
export function hashSeed(value:string){let h=2166136261;for(const c of value)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;}
export function puzzleRandom(seed:number){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function difficulty(stage:string,adjust=0){const n=BigInt(stage);if(n<1n)throw Error('단계는 1 이상이어야 합니다.');const tier=n<=5n?0:n<=20n?1:n<=80n?2:n<=250n?3:n<=700n?4:5;const rest=n%7n===0n;return {tier,label:['입문','쉬움','보통','적당한 도전','안정화','난이도 상한 고정'][tier],target:Math.max(0,Math.min(5,tier+(rest?-1:0)+Math.max(-1,Math.min(0,adjust)))),maxBlocks:12,maxWalls:5,maxSolution:220};}
export const DIRECTIONS=['up','right','down','left'] as const;
export interface Rating {estimate:number;branching:number;blocking:number;score:number;target:number;withinCap:boolean}
// Canonicalize rotations, reflections, color permutations and piece labels.
export function canonicalGrid(input:string[][]){const variants:string[]=[];let rows=input;for(let turn=0;turn<4;turn++){
 for(const grid of [rows,rows.map(r=>[...r].reverse())]){const colors=new Map<string,number>(),pieces=new Map<string,number>();variants.push(grid.map(r=>r.map(cell=>cell.replace(/c(\d+)/g,(_,c)=>{if(!colors.has(c))colors.set(c,colors.size);return 'c'+colors.get(c);}).replace(/p(\d+)/g,(_,c)=>{if(!pieces.has(c))pieces.set(c,pieces.size);return 'p'+pieces.get(c);})).join(',')).join(';'));}
 rows=rows[0].map((_,x)=>rows.map(r=>r[x]).reverse());
 }return variants.sort()[0];}
export interface Token {id:number;color:number;remaining:number;lane?:number}
export interface HarvestBoard {width:number;height:number;cells:number[];tokens:Token[]}
export interface HarvestState {cells:number[];queue:Token[];slots:(Token|null)[];collected:number;phase:'playing'|'won'|'lost';last?:{index:number;color:number;slot:number}}
export interface HarvestPuzzle extends HarvestBoard {kind:'harvest';stage:string;seed:number;version:string;solution:number[];rating:Rating;signature:string;verified:true;theme:string;greedyTrap?:boolean}
export const harvestLane=(token:Token)=>token.lane??(token.id-1)%4;
export function harvestQueueHeads(s:Pick<HarvestState,'queue'>){return Array.from({length:4},(_,lane)=>s.queue.find(t=>harvestLane(t)===lane)).filter((t):t is Token=>!!t);}
export function exposedPixels(p:Pick<HarvestBoard,'width'|'height'>,cells:number[]){
 const {width:w,height:h}=p,visited=new Set<number>(),queue:number[]=[],visible=new Set<number>();
 const visit=(x:number,y:number)=>{if(x<0||y<0||x>=w||y>=h)return;const i=y*w+x;if(cells[i]>=0){visible.add(i);return;}if(!visited.has(i)){visited.add(i);queue.push(i);}};
 for(let x=0;x<w;x++){visit(x,0);visit(x,h-1);}for(let y=0;y<h;y++){visit(0,y);visit(w-1,y);}
 for(let j=0;j<queue.length;j++){const i=queue[j],x=i%w,y=Math.floor(i/w);visit(x-1,y);visit(x+1,y);visit(x,y-1);visit(x,y+1);}return [...visible].sort((a,b)=>a-b);
}
export const initialHarvest=(p:HarvestBoard):HarvestState=>({cells:[...p.cells],queue:structuredClone(p.tokens),slots:Array(5).fill(null),collected:0,phase:'playing'});
export function harvestAvailable(p:HarvestBoard,s:HarvestState){const exposed=exposedPixels(p,s.cells);for(let slot=0;slot<5;slot++){const token=s.slots[slot];if(token){const index=exposed.find(i=>s.cells[i]===token.color);if(index!==undefined)return {index,slot};}}return null;}
export function placeToken(p:HarvestBoard,s:HarvestState,id:number,closingSlots:number[]=[]):HarvestState|null{
 if(s.phase!=='playing')return null;const slot=s.slots.findIndex((t,i)=>!t&&!closingSlots.includes(i)),token=harvestQueueHeads(s).find(t=>t.id===id);if(slot<0||!token)return null;
 return {...s,queue:s.queue.filter(t=>t.id!==id),slots:s.slots.map((t,i)=>i===slot?{...token}:t),last:undefined};
}
export function harvestTick(p:HarvestBoard,s:HarvestState):HarvestState{
 if(s.phase!=='playing')return s;const next=harvestAvailable(p,s);
 if(!next)return s.slots.every(Boolean)?{...s,phase:'lost'}:s;
 const {index,slot}=next,token=s.slots[slot]!,cells=[...s.cells],slots=[...s.slots];cells[index]=-1;slots[slot]=token.remaining>1?{...token,remaining:token.remaining-1}:null;
 return {...s,cells,slots,collected:s.collected+1,last:{index,color:token.color,slot},phase:cells.every(v=>v<0)?'won':'playing'};
}
export function verifyHarvest(p:HarvestBoard,solution:number[]){let state=initialHarvest(p);for(const id of solution){const placed=placeToken(p,state,id);if(!placed)return false;state=settleHarvest(p,placed,true);if(state.phase==='won')return true;if(state.phase==='lost')return false;}return state.phase==='won';}
// A deliberately naive policy: always take the leftmost available lane head.
// This is a difficulty check, never the solution shown to the player.
export function harvestLeftmostWins(p:HarvestBoard){let s=initialHarvest(p);for(let guard=0;guard<=p.tokens.length;guard++){
 while(true){const next=harvestTick(p,s);if(next===s)break;s=next;if(s.phase!=='playing')return s.phase==='won';}
 const token=harvestQueueHeads(s)[0];if(!token)return s.phase==='won';const next=placeToken(p,s,token.id);if(!next)return false;s=next;
 }return false;}
const strategyCache=new Map<string,HarvestPuzzle>();
function strategyResult(stage:string,seed:number,width:number,height:number,cells:number[],tokens:Token[],solution:number[],theme:string,fallback=false):HarvestPuzzle {
 const board={width,height,cells,tokens};if(!verifyHarvest(board,solution))throw Error('전략 수거 경로 검증 실패');
 const target=Math.min(5,Math.max(3,difficulty(stage).target)),blocking=cells.filter(c=>c>=0).length-exposedPixels(board,cells).length;
 return {...board,kind:'harvest',stage,seed,version:HARVEST_VERSION,solution,verified:true,theme,greedyTrap:!strategyPolicy(board,'left'),rating:{estimate:tokens.length,branching:4,blocking,score:tokens.length+blocking*.15,target,withinCap:tokens.length<=220&&cells.filter(c=>c>=0).length<=1200},signature:canonicalGrid(Array.from({length:height},(_,y)=>cells.slice(y*width,(y+1)*width).map(c=>c<0?'.':`c${c}`)))+'|'+tokens.map(t=>`${t.color}:${t.remaining}:${t.lane}`).join(',')+(fallback?'|verified-fallback':'')};
}
export function generateHarvest(stage:string,seed:number,_adjust=0):HarvestPuzzle {
 if(!/^[1-9]\d{0,39}$/.test(stage))throw Error('단계가 잘못되었습니다.');
 const cacheKey=`${stage}:${seed}`,cached=strategyCache.get(cacheKey);if(cached)return structuredClone(cached);
 const source=strategyCatalog[(seed>>>0)%strategyCatalog.length],rand=puzzleRandom(seed^99173),colors=Array.from({length:13},(_,i)=>i),lanes=[0,1,2,3];
 for(let i=12;i>2;i--){const j=3+Math.floor(rand()*(i-2));[colors[i],colors[j]]=[colors[j],colors[i]];}for(let i=3;i>0;i--){const j=Math.floor(rand()*(i+1));[lanes[i],lanes[j]]=[lanes[j],lanes[i]];}
 const cells=source.cells.map(c=>c<0?c:colors[c]),original=source.tokens.map(t=>({...t,color:colors[t.color]}));let tokens=original,solution=source.solution;
 // Bounded queue mutations create new ordering problems, not just cosmetic re-colouring.
 for(let attempt=0;attempt<3;attempt++){
  const changed=original.map(t=>({...t,lane:lanes[t.lane]}));for(let i=0;i<2;i++){const a=Math.floor(rand()*changed.length),b=Math.floor(rand()*changed.length);[changed[a],changed[b]]=[changed[b],changed[a]];}
  const board={width:source.width,height:source.height,cells,tokens:changed},answer=solveStrategy(board,350);if(!answer)continue;
  const failures=['left','right','smallest','largest','visible'].filter(policy=>!strategyPolicy(board,policy)).length,randomWins=Array.from({length:12},(_,i)=>strategyPolicy(board,'random',seed^Math.imul(i+1,7919))).filter(Boolean).length;
  if(failures>=3&&randomWins<=4){tokens=changed;solution=answer;break;}
 }
 const result=strategyResult(stage,seed,source.width,source.height,cells,tokens,solution,source.theme);
 strategyCache.set(cacheKey,result);if(strategyCache.size>12)strategyCache.delete(strategyCache.keys().next().value!);return structuredClone(result);
}

