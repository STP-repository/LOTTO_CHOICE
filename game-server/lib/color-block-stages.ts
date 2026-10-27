import catalog from './color-challenge-catalog.json';
import {COLOR_BLOCK_VERSION,SHAPES,startBoard,validateBoard,step,finishExit,type Board,type Cell,type Piece,type Side,type State} from './color-block-escape';
export interface Move {id:number;direction:Side}
export interface ColorStage extends Board {kind:'escape';stage:string;seed:number;version:string;solution:Move[];verified:true;rating:{estimate:number;target:number;withinCap:boolean};signature:string;map?:string}
const sides:Side[]=['up','right','down','left'],opposite:Record<Side,Side>={up:'down',right:'left',down:'up',left:'right'};
const random=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
export function colorDifficulty(stage:string){if(!/^[1-9]\d{0,39}$/.test(stage))throw Error('단계가 잘못되었습니다.');const n=BigInt(stage),tier=n<=100n?0:n<=500n?1:n<=1000n?2:3;return {tier,target:3+Number(tier>0),label:['전략 퍼즐','통로 설계','전략 안정화','난이도 상한 고정'][tier],pieces:9,size:6};}
export function replaySolution(b:Board,moves:Move[],state=startBoard(b)){for(const m of moves){const next=step(b,state,m.id,m.direction);if(!next)return null;state=next;if(state.flights.some(f=>f.id===m.id))state=finishExit(state,m.id);}return state;}
export function verifyColorStage(b:Board,moves:Move[]){try{return validateBoard(b)&&replaySolution(b,moves)?.phase==='won';}catch{return false;}}
function rotate(b:Board,solution:Move[]){const width=b.height,height=b.width,point=([x,y]:Cell):Cell=>[b.height-1-y,x],turn:Record<Side,Side>={up:'right',right:'down',down:'left',left:'up'};
 const pieces=b.pieces.map(p=>{const cells=p.cells.map(([x,y])=>point([p.x+x,p.y+y])),x=Math.min(...cells.map(c=>c[0])),y=Math.min(...cells.map(c=>c[1]));return {...p,x,y,cells:cells.map(([a,c])=>[a-x,c-y] as Cell),...(p.axis?{axis:p.axis==='horizontal'?'vertical' as const:'horizontal' as const}:{})};});
 const gates=b.gates.map(g=>({...g,side:turn[g.side],at:g.side==='up'||g.side==='down'?g.at:b.height-g.at-g.width}));
 return {board:{width,height,walls:b.walls.map(point),pieces,gates},solution:solution.map(m=>({...m,direction:turn[m.direction]}))};
}
/** Every supplied seed starts from a verified interlocking puzzle; never falls back to two easy blocks. */
export function generateColorStage(stage:string,seed:number):ColorStage {
 const level=colorDifficulty(stage),r=random(seed),source=catalog[(seed>>>0)%catalog.length];let b=structuredClone(source) as unknown as Board,solution=structuredClone(source.solution) as Move[];
 for(let i=0,n=Math.floor(r()*4);i<n;i++){const t=rotate(b,solution);b=t.board;solution=t.solution;}
 const colors=[0,1,2,3,4,5];for(let i=5;i>0;i--){const j=Math.floor(r()*(i+1));[colors[i],colors[j]]=[colors[j],colors[i]];}
 b={width:b.width,height:b.height,walls:b.walls,pieces:b.pieces.map(p=>({...p,color:colors[p.color]})),gates:b.gates.map(g=>({...g,color:colors[g.color]}))};
 // Small reversible scrambles diversify layouts without changing rules or adding unbounded complexity.
 const base=structuredClone(b),baseSolution=solution;
 for(let attempt=0;attempt<4;attempt++){let state=startBoard(base);const history:Move[]=[];
  for(let j=0;j<12+level.target*2;j++){const p=state.pieces[Math.floor(r()*state.pieces.length)],direction=sides[Math.floor(r()*4)],next=step(base,state,p.id,direction);if(!next||next.flights.length)continue;state=next;history.push({id:p.id,direction});}
  const candidate={...base,pieces:state.pieces};if(colorInterlocks(candidate).stuck<4)continue;
  b=candidate;solution=[...history.reverse().map(m=>({...m,direction:opposite[m.direction]})),...baseSolution];break;
 }
 if(!verifyColorStage(b,solution))throw Error('전략 퍼즐 해결 검증 실패');
 return {...b,map:source.map,kind:'escape',stage,seed,version:COLOR_BLOCK_VERSION,solution,verified:true,rating:{estimate:solution.length,target:level.target,withinCap:solution.length<=250},signature:JSON.stringify(b)};
}
/** Can a piece escape without first moving another piece? This rejects independent-lane boards. */
export function soloExit(b:Board,s:State,id:number):Move[]|null {const queue=[{s,path:[] as Move[]}],seen=new Set<string>();for(let i=0;i<queue.length;i++){const item=queue[i];for(const direction of sides){const m={id,direction},next=step(b,item.s,id,direction);if(!next)continue;if(next.flights.length)return [...item.path,m];const p=next.pieces.find(p=>p.id===id)!,key=`${p.x}:${p.y}`;if(!seen.has(key)){seen.add(key);queue.push({s:next,path:[...item.path,m]});}}}return null;}
export function colorInterlocks(b:Board){let s=startBoard(b);const direct=s.pieces.filter(p=>soloExit(b,s,p.id)).length;while(true){let found=false;for(const p of s.pieces){const path=soloExit(b,s,p.id);if(!path)continue;s=replaySolution(b,path,s)!;found=true;break;}if(!found)break;}return {direct,stuck:s.pieces.length};}
export function colorHint(p:ColorStage,s:State):Move|null {
 const same=(a:State,b:State)=>JSON.stringify(a.pieces)===JSON.stringify(b.pieces);let expected=startBoard(p);
 for(const m of p.solution){if(same(expected,s))return m;const next=replaySolution(p,[m],expected);if(!next)break;expected=next;}
 // Find a currently clear route for one whole piece; never suggest crossing an occupied cell.
 for(const piece of s.pieces){const queue=[{s,path:[] as Move[]}],seen=new Set<string>();for(let i=0;i<queue.length&&i<1500;i++){const item=queue[i],p0=item.s.pieces.find(x=>x.id===piece.id)!;for(const direction of sides){const m={id:piece.id,direction},n=step(p,item.s,piece.id,direction);if(!n)continue;if(n.flights.length)return [...item.path,m][0];const moved=n.pieces.find(x=>x.id===piece.id)!,key=`${moved.x}:${moved.y}`;if(!seen.has(key)){seen.add(key);queue.push({s:n,path:[...item.path,m]});}}void p0;}}
 return null;
}
