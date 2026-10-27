import {COLOR_BLOCK_VERSION,SHAPES,startBoard,validateBoard,step,finishExit,type Board,type Cell,type Piece,type Side,type State} from './color-block-escape';
export interface Move {id:number;direction:Side}
export interface ColorStage extends Board {kind:'escape';stage:string;seed:number;version:string;solution:Move[];verified:true;rating:{estimate:number;target:number;withinCap:boolean};signature:string}
const sides:Side[]=['up','right','down','left'],opposite:Record<Side,Side>={up:'down',right:'left',down:'up',left:'right'};
const random=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
export function colorDifficulty(stage:string){if(!/^[1-9]\d{0,39}$/.test(stage))throw Error('단계가 잘못되었습니다.');const s=BigInt(stage),tier=s<=30n?0:s<=100n?1:s<=300n?2:s<=500n?3:s<=1000n?4:5;return {tier,target:Math.min(tier,4),label:['입문','쉬움','보통','적당한 도전','안정화','난이도 상한 고정'][tier],pieces:[4,5,6,7,8,8][tier],size:tier<2?6:tier<4?7:8};}
export function replaySolution(b:Board,moves:Move[],state=startBoard(b)){for(const m of moves){const next=step(b,state,m.id,m.direction);if(!next)return null;state=next;if(state.flights.some(f=>f.id===m.id))state=finishExit(state,m.id);}return state;}
export function verifyColorStage(b:Board,moves:Move[]){try{return validateBoard(b)&&replaySolution(b,moves)?.phase==='won';}catch{return false;}}
function rotateShape(cells:Cell[],turns:number):Cell[]{let c=cells.map(v=>[...v] as [number,number]);for(let i=0;i<turns;i++)c=c.map(([x,y])=>[-y,x]);const minX=Math.min(...c.map(v=>v[0])),minY=Math.min(...c.map(v=>v[1]));return c.map(([x,y])=>[x-minX,y-minY]);}
/** Legacy v1 proof verification only. Independently construct connected polyominoes, then verify the complete witness in the actual engine. */
export function generateColorStage(stage:string,seed:number):ColorStage {
 const level=colorDifficulty(stage),catalog=Object.values(SHAPES);
 for(let retry=0;retry<16;retry++){
  const r=random((seed+retry*104729)>>>0),b:Board={width:level.size,height:level.size,walls:[],pieces:[],gates:[]},history:({type:'place';id:number;direction:Side}|{type:'move';id:number;direction:Side})[]=[];
  if(level.target>=1){const n=1+Number(level.target>=3);for(let i=0;i<n;i++){const pos:[number,number]=[2+Math.floor(r()*(b.width-4)),2+Math.floor(r()*(b.height-4))];if(!b.walls.some(([x,y])=>x===pos[0]&&y===pos[1]))b.walls.push(pos);}}
  for(let id=1;id<=level.pieces;id++){
   let placed=false;
   for(let trial=0;trial<45&&!placed;trial++){
    const side=sides[Math.floor(r()*4)],cells=rotateShape(catalog[(id+Math.floor(r()*catalog.length))%catalog.length],Math.floor(r()*4)),w=1+Math.max(...cells.map(v=>v[0])),h=1+Math.max(...cells.map(v=>v[1])),horizontal=side==='left'||side==='right',span=horizontal?h:w,at=Math.floor(r()*((horizontal?b.height:b.width)-span+1));
    const piece:Piece={id,color:(id-1)%6,x:horizontal?(side==='left'?0:b.width-w):at,y:horizontal?at:(side==='up'?0:b.height-h),cells,...(level.target>=2&&r()<.2?{axis:horizontal?'horizontal' as const:'vertical' as const}:{})};
    const candidate={...b,pieces:[...b.pieces,piece],gates:[...b.gates,{id,side,at,width:span,color:piece.color,open:true}]};
    if(candidate.gates.some((g,i)=>candidate.gates.slice(i+1).some(v=>v.side===g.side&&v.at<g.at+g.width&&g.at<v.at+v.width&&v.color!==g.color)))continue;
    try{validateBoard(candidate);}catch{continue;}
    // Insertion is accepted only when this rigid shape has a clear full exit sweep.
    if(!step(candidate,startBoard(candidate),id,side))continue;
    b.pieces=candidate.pieces;b.gates=candidate.gates;history.push({type:'place',id,direction:side});placed=true;
   }
   if(!placed)break;
   let state=startBoard(b);
   for(let j=0;j<8+level.target*6;j++){
    const piece=state.pieces[Math.floor(r()*state.pieces.length)],direction=sides[Math.floor(r()*4)],next=step(b,state,piece.id,direction);if(!next||next.flights.length)continue;state=next;history.push({type:'move',id:piece.id,direction});
   }b.pieces=state.pieces;
  }
  if(b.pieces.length<level.pieces)continue;
  const solution=history.reverse().map(op=>({id:op.id,direction:op.type==='place'?op.direction:opposite[op.direction]}));
  if(solution.length>250||!verifyColorStage(b,solution))continue;
  return {...b,kind:'escape',stage,seed,version:COLOR_BLOCK_VERSION,solution,verified:true,rating:{estimate:solution.length,target:level.target,withinCap:true},signature:JSON.stringify({walls:b.walls,pieces:b.pieces,gates:b.gates})};
 }
 // Known, independently authored fallback, not the retired game's stages.
 const b:Board={width:6,height:6,walls:[[3,3]],pieces:[{id:1,color:0,x:1,y:0,cells:SHAPES.L},{id:2,color:1,x:4,y:3,cells:SHAPES.domino}],gates:[{id:1,side:'up',at:1,width:2,color:0,open:true},{id:2,side:'down',at:4,width:1,color:1,open:true}]},solution:Move[]=[{id:1,direction:'up'},{id:2,direction:'down'},{id:2,direction:'down'}];
 if(!verifyColorStage(b,solution))throw Error('대체 퍼즐 검증 실패');return {...b,kind:'escape',stage,seed,version:COLOR_BLOCK_VERSION,solution,verified:true,rating:{estimate:solution.length,target:level.target,withinCap:true},signature:JSON.stringify(b)};
}
export function colorHint(p:ColorStage,s:State):Move|null {
 const same=(a:State,b:State)=>JSON.stringify(a.pieces)===JSON.stringify(b.pieces);let expected=startBoard(p);
 for(const m of p.solution){if(same(expected,s))return m;const next=replaySolution(p,[m],expected);if(!next)break;expected=next;}
 // Find a currently clear route for one whole piece; never suggest crossing an occupied cell.
 for(const piece of s.pieces){const queue=[{s,path:[] as Move[]}],seen=new Set<string>();for(let i=0;i<queue.length&&i<1500;i++){const item=queue[i],p0=item.s.pieces.find(x=>x.id===piece.id)!;for(const direction of sides){const m={id:piece.id,direction},n=step(p,item.s,piece.id,direction);if(!n)continue;if(n.flights.length)return [...item.path,m][0];const moved=n.pieces.find(x=>x.id===piece.id)!,key=`${moved.x}:${moved.y}`;if(!seen.has(key)){seen.add(key);queue.push({s:n,path:[...item.path,m]});}}void p0;}}
 return null;
}
