import {characterPixels,HARVEST_THEMES,HARVEST_VERSION} from './harvest-art';
export {HARVEST_VERSION,HARVEST_PALETTE} from './harvest-art';
// Independent rules shared by generation, solution verification, and the UI.
export type PuzzleKind='escape'|'harvest';
export const GENERATOR_VERSION='calm-puzzles-v1';
export const PALETTE=['#ff806b','#54c8ef','#b89aff','#ffd064','#69dbb4','#ee97cd'];
export function hashSeed(value:string){let h=2166136261;for(const c of value)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;}
export function puzzleRandom(seed:number){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function difficulty(stage:string,adjust=0){const n=BigInt(stage);if(n<1n)throw Error('단계는 1 이상이어야 합니다.');const tier=n<=5n?0:n<=20n?1:n<=80n?2:n<=250n?3:n<=700n?4:5;const rest=n%7n===0n;return {tier,label:['입문','쉬움','보통','적당한 도전','안정화','난이도 상한 고정'][tier],target:Math.max(0,Math.min(5,tier+(rest?-1:0)+Math.max(-1,Math.min(0,adjust)))),maxBlocks:12,maxWalls:5,maxSolution:220};}
export type Direction='up'|'right'|'down'|'left';
export const DIRECTIONS:Direction[]=['up','right','down','left'];
const delta={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]} as const;
const opposite={up:'down',down:'up',left:'right',right:'left'} as const;
export interface Block {id:number;color:number;x:number;y:number;w:number;h:number}
export interface Exit {side:Direction;at:number;width:number;color:number}
export interface EscapeMove {id:number;direction:Direction}
export interface EscapeBoard {width:number;height:number;blocks:Block[];walls:number[];exits:Exit[]}
export interface EscapeState {blocks:Block[];moves:number;phase:'playing'|'won'}
export interface EscapePuzzle extends EscapeBoard {kind:'escape';stage:string;seed:number;version:string;solution:EscapeMove[];rating:Rating;signature:string;verified:true}
export interface Rating {estimate:number;branching:number;blocking:number;score:number;target:number;withinCap:boolean}
function fits(board:EscapeBoard,blocks:Block[],block:Block){
 if(block.x<0||block.y<0||block.x+block.w>board.width||block.y+block.h>board.height)return false;
 for(let y=block.y;y<block.y+block.h;y++)for(let x=block.x;x<block.x+block.w;x++)if(board.walls.includes(y*board.width+x)||blocks.some(b=>b.id!==block.id&&x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h))return false;
 return true;
}
function canExit(board:EscapeBoard,b:Block,d:Direction){return board.exits.some(e=>e.side===d&&e.color===b.color&&(d==='up'||d==='down'?b.x>=e.at&&b.x+b.w<=e.at+e.width&&(d==='up'?b.y===0:b.y+b.h===board.height):b.y>=e.at&&b.y+b.h<=e.at+e.width&&(d==='left'?b.x===0:b.x+b.w===board.width)));}
export const initialEscape=(p:EscapeBoard):EscapeState=>({blocks:structuredClone(p.blocks),moves:0,phase:'playing'});
export function moveEscape(board:EscapeBoard,state:EscapeState,id:number,direction:Direction):EscapeState|null{
 if(state.phase!=='playing')return null;const b=state.blocks.find(b=>b.id===id);if(!b)return null;
 const [dx,dy]=delta[direction],next={...b,x:b.x+dx,y:b.y+dy},outside=next.x<0||next.y<0||next.x+next.w>board.width||next.y+next.h>board.height;
 if(outside&&!canExit(board,b,direction)||!outside&&!fits(board,state.blocks,next))return null;
 const blocks=outside?state.blocks.filter(b=>b.id!==id):state.blocks.map(v=>v.id===id?next:v);return {blocks,moves:state.moves+1,phase:blocks.length?'playing':'won'};
}
export function verifyEscape(p:EscapeBoard,solution:EscapeMove[]){let state=initialEscape(p);for(const m of solution){const next=moveEscape(p,state,m.id,m.direction);if(!next)return false;state=next;}return state.phase==='won';}
export function escapeActions(p:EscapeBoard,s:EscapeState){return s.blocks.flatMap(b=>DIRECTIONS.filter(d=>moveEscape(p,s,b.id,d)).map(direction=>({id:b.id,direction})));}
// Canonicalize rotations, reflections, color permutations and piece labels.
export function canonicalGrid(input:string[][]){const variants:string[]=[];let rows=input;for(let turn=0;turn<4;turn++){
 for(const grid of [rows,rows.map(r=>[...r].reverse())]){const colors=new Map<string,number>(),pieces=new Map<string,number>();variants.push(grid.map(r=>r.map(cell=>cell.replace(/c(\d+)/g,(_,c)=>{if(!colors.has(c))colors.set(c,colors.size);return 'c'+colors.get(c);}).replace(/p(\d+)/g,(_,c)=>{if(!pieces.has(c))pieces.set(c,pieces.size);return 'p'+pieces.get(c);})).join(',')).join(';'));}
 rows=rows[0].map((_,x)=>rows.map(r=>r[x]).reverse());
 }return variants.sort()[0];}
function escapeSignature(p:EscapeBoard){const grid=Array.from({length:p.height+2},()=>Array<string>(p.width+2).fill('.'));p.walls.forEach(i=>grid[Math.floor(i/p.width)+1][i%p.width+1]='W');for(const b of p.blocks)for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)grid[y+1][x+1]=`p${b.id}c${b.color}`;for(const e of p.exits)for(let i=0;i<e.width;i++){const x=e.side==='left'?0:e.side==='right'?p.width+1:e.at+i+1,y=e.side==='up'?0:e.side==='down'?p.height+1:e.at+i+1;grid[y][x]=`Ec${e.color}`;}return canonicalGrid(grid);}
export function generateEscape(stage:string,seed:number,adjust=0):EscapePuzzle{
 const level=difficulty(stage,adjust);for(let attempt=0;attempt<12;attempt++){
  const rand=puzzleRandom((seed+attempt*7919)>>>0),w=5+Math.floor(rand()*2)+Number(level.target>=3),h=6+Math.floor(rand()*2),board:EscapeBoard={width:w,height:h,blocks:[],walls:[],exits:[]},operations:({type:'insert';id:number;direction:Direction}|{type:'move';id:number;direction:Direction})[]=[];
  for(let i=0;i<Math.min(5,level.target);i++){const x=1+Math.floor(rand()*(w-2)),y=1+Math.floor(rand()*(h-2)),pos=y*w+x;if(!board.walls.includes(pos))board.walls.push(pos);}
  const desired=4+level.target+Math.floor(rand()*3);
  for(let id=1;id<=desired;id++){
   let placed=false;for(let tries=0;tries<30&&!placed;tries++){
    const side=DIRECTIONS[Math.floor(rand()*4)],horizontal=side==='up'||side==='down',color=(id-1)%Math.min(6,3+level.target),length=1+Math.floor(rand()*(level.target>=2?3:2)),b:Block={id,color,w:horizontal?1:length,h:horizontal?length:1,x:horizontal?Math.floor(rand()*w):side==='left'?0:w-length,y:horizontal?(side==='up'?0:h-length):Math.floor(rand()*h)};
    if(!fits(board,board.blocks,b))continue;
    const at=horizontal?b.x:b.y;if(board.exits.some(e=>e.side===side&&e.at===at&&e.color!==color))continue;
    if(!board.exits.some(e=>e.side===side&&e.at===at))board.exits.push({side,at,width:1,color});board.blocks.push(b);operations.push({type:'insert',id,direction:side});placed=true;
   }
   if(!placed)break;
   const steps=3+level.target+Math.floor(rand()*5);for(let i=0;i<steps;i++){
    const b=board.blocks[Math.floor(rand()*board.blocks.length)],directions=DIRECTIONS.filter(d=>{const [dx,dy]=delta[d];return fits(board,board.blocks,{...b,x:b.x+dx,y:b.y+dy});});if(!directions.length)continue;
    const direction=directions[Math.floor(rand()*directions.length)],[dx,dy]=delta[direction];b.x+=dx;b.y+=dy;operations.push({type:'move',id:b.id,direction});
   }
  }
  const solution:EscapeMove[]=operations.reverse().map(op=>({id:op.id,direction:op.type==='insert'?op.direction:opposite[op.direction]}));
  if(board.blocks.length<4||solution.length<12||solution.length>220||!verifyEscape(board,solution))continue;
  const branching=escapeActions(board,initialEscape(board)).length,blocking=board.blocks.reduce((s,b)=>s+DIRECTIONS.filter(d=>{const [dx,dy]=delta[d];return !fits(board,board.blocks,{...b,x:b.x+dx,y:b.y+dy});}).length,0);
  const rating={estimate:solution.length,branching,blocking,score:solution.length+blocking*2-Math.min(branching,20),target:level.target,withinCap:true};
  return {...board,kind:'escape',stage,seed,version:GENERATOR_VERSION,solution,rating,signature:escapeSignature(board),verified:true};
 }
 // Construct a fresh validated corridor instance, not an unverified random fallback.
 const rand=puzzleRandom(seed),width=6,height=7,blocks=Array.from({length:4},(_,i)=>({id:i+1,color:i,x:i+1,y:2+Math.floor(rand()*3),w:1,h:2})),board={width,height,blocks,walls:[],exits:blocks.map(b=>({side:'up' as const,at:b.x,width:1,color:b.color}))},solution=blocks.flatMap(b=>Array.from({length:b.y+1},()=>({id:b.id,direction:'up' as const})));
 if(!verifyEscape(board,solution))throw Error('탈출 퍼즐 검증 실패');return {...board,kind:'escape',stage,seed,version:GENERATOR_VERSION,solution,rating:{estimate:solution.length,branching:12,blocking:0,score:solution.length,target:level.target,withinCap:true},signature:escapeSignature(board),verified:true};
}

export interface Token {id:number;color:number;remaining:number}
export interface HarvestBoard {width:number;height:number;cells:number[];tokens:Token[]}
export interface HarvestState {cells:number[];queue:Token[];slots:(Token|null)[];collected:number;phase:'playing'|'won'|'lost';last?:{index:number;color:number;slot:number}}
export interface HarvestPuzzle extends HarvestBoard {kind:'harvest';stage:string;seed:number;version:string;solution:number[];rating:Rating;signature:string;verified:true;theme:string}
export function exposedPixels(p:Pick<HarvestBoard,'width'|'height'>,cells:number[]){
 const {width:w,height:h}=p,visited=new Set<number>(),queue:number[]=[],visible=new Set<number>();
 const visit=(x:number,y:number)=>{if(x<0||y<0||x>=w||y>=h)return;const i=y*w+x;if(cells[i]>=0){visible.add(i);return;}if(!visited.has(i)){visited.add(i);queue.push(i);}};
 for(let x=0;x<w;x++){visit(x,0);visit(x,h-1);}for(let y=0;y<h;y++){visit(0,y);visit(w-1,y);}
 for(let j=0;j<queue.length;j++){const i=queue[j],x=i%w,y=Math.floor(i/w);visit(x-1,y);visit(x+1,y);visit(x,y-1);visit(x,y+1);}return [...visible].sort((a,b)=>a-b);
}
export const initialHarvest=(p:HarvestBoard):HarvestState=>({cells:[...p.cells],queue:structuredClone(p.tokens),slots:Array(5).fill(null),collected:0,phase:'playing'});
export function harvestAvailable(p:HarvestBoard,s:HarvestState){const exposed=exposedPixels(p,s.cells);for(let slot=0;slot<5;slot++){const token=s.slots[slot];if(token){const index=exposed.find(i=>s.cells[i]===token.color);if(index!==undefined)return {index,slot};}}return null;}
export function placeToken(p:HarvestBoard,s:HarvestState,id:number,closingSlots:number[]=[]):HarvestState|null{
 if(s.phase!=='playing')return null;const slot=s.slots.findIndex((t,i)=>!t&&!closingSlots.includes(i)),token=s.queue.find(t=>t.id===id);if(slot<0||!token)return null;
 return {...s,queue:s.queue.filter(t=>t.id!==id),slots:s.slots.map((t,i)=>i===slot?{...token}:t),last:undefined};
}
export function harvestTick(p:HarvestBoard,s:HarvestState):HarvestState{
 if(s.phase!=='playing')return s;const next=harvestAvailable(p,s);
 if(!next)return s.slots.every(Boolean)?{...s,phase:'lost'}:s;
 const {index,slot}=next,token=s.slots[slot]!,cells=[...s.cells],slots=[...s.slots];cells[index]=-1;slots[slot]=token.remaining>1?{...token,remaining:token.remaining-1}:null;
 return {...s,cells,slots,collected:s.collected+1,last:{index,color:token.color,slot},phase:cells.every(v=>v<0)?'won':'playing'};
}
export function verifyHarvest(p:HarvestBoard,solution:number[]){let state=initialHarvest(p);for(const id of solution){const placed=placeToken(p,state,id);if(!placed)return false;state=placed;for(let tick=0;tick<=p.cells.length;tick++){const next=harvestTick(p,state);if(next===state)break;state=next;if(state.phase==='won')return true;if(state.phase==='lost')return false;}}return state.phase==='won';}
const themeNames=HARVEST_THEMES;
function generateHarvestCandidate(stage:string,seed:number,adjust=0):HarvestPuzzle{
 const level=difficulty(stage,adjust),rand=puzzleRandom(seed),width=28+Math.min(4,level.target)+Math.floor(rand()*2),height=width,theme=Math.floor(rand()*HARVEST_THEMES.length),cells=characterPixels(width,height,theme,seed);
 if(cells.filter(c=>c>=0).length<20)throw Error('그림 생성에 실패했습니다.');
 const working=[...cells],tokens:Token[]=[],solution:number[]=[];let iterations=0;
 while(working.some(v=>v>=0)&&iterations++<width*height){const exposed=exposedPixels({width,height},working),color=working[exposed[0]],limit=12+Math.floor(rand()*(18+level.target*2)),id=tokens.length+1;let taken=0;
  while(taken<limit){const index=exposedPixels({width,height},working).find(i=>working[i]===color);if(index===undefined)break;working[index]=-1;taken++;}
  if(!taken)throw Error('수거 순서 생성 실패');tokens.push({id,color,remaining:taken});solution.push(id);
 }
 const board={width,height,cells,tokens};if(!verifyHarvest(board,solution))throw Error('수거 퍼즐 해결 검증 실패');
 const branching=new Set(exposedPixels(board,cells).map(i=>cells[i])).size,blocking=cells.filter(c=>c>=0).length-exposedPixels(board,cells).length,rating={estimate:tokens.length,branching,blocking,score:tokens.length+blocking*.15+branching*2,target:level.target,withinCap:tokens.length<=220&&cells.filter(c=>c>=0).length<=1200};
 if(!rating.withinCap)throw Error('그림 난이도 상한 초과');
 return {...board,kind:'harvest',stage,seed,version:HARVEST_VERSION,solution,rating,signature:canonicalGrid(Array.from({length:height},(_,y)=>cells.slice(y*width,(y+1)*width).map(c=>c<0?'.':`c${c}`)))+'|'+tokens.map(t=>t.remaining).join(','),verified:true,theme:themeNames[theme]};
}
export function generateHarvest(stage:string,seed:number,adjust=0):HarvestPuzzle{
 for(let attempt=0;attempt<12;attempt++){
  try{return generateHarvestCandidate(stage,(seed+attempt*7919)>>>0,adjust);}catch{/* Reject an unverified or oversized board and try a bounded alternative. */}
 }
 const target=difficulty(stage,adjust).target,width=12,height=12,offset=seed%6;
 const cells=Array.from({length:width*height},(_,i)=>{const x=i%width,y=Math.floor(i/width);return x>1&&x<10&&y>1&&y<10?(y+offset)%6:-1;});
 const tokens=Array.from({length:8},(_,i)=>({id:i+1,color:(i+2+offset)%6,remaining:8})),solution=tokens.map(t=>t.id),board={width,height,cells,tokens};
 if(!verifyHarvest(board,solution))throw Error('대체 수거 퍼즐 해결 검증 실패');
 return {...board,kind:'harvest',stage,seed,version:HARVEST_VERSION,solution,rating:{estimate:8,branching:6,blocking:36,score:26,target,withinCap:true},signature:canonicalGrid(Array.from({length:height},(_,y)=>cells.slice(y*width,(y+1)*width).map(c=>c<0?'.':`c${c}`))),verified:true,theme:'무지개 정원'};
}
