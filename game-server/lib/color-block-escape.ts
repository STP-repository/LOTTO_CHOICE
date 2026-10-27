/** Color Block Escape: occupied-cell geometry, independent of the retired rectangle engine. */
export const COLOR_BLOCK_VERSION='color-block-escape-v2';
export type Cell=readonly[number,number];
export type Side='up'|'right'|'down'|'left';
export interface Piece {id:number;color:number;x:number;y:number;cells:Cell[];axis?:'horizontal'|'vertical';locked?:boolean}
export interface Gate {id:number;side:Side;at:number;width:number;color:number;open:boolean}
export interface Board {width:number;height:number;walls:Cell[];pieces:Piece[];gates:Gate[]}
export interface EscapeFlight {id:number;gateId:number;direction:Side;kind?:'burst'}
export interface State {pieces:Piece[];flights:EscapeFlight[];moves:number;phase:'playing'|'won';brokenWalls?:Cell[]}
export const SHAPES:Record<string,Cell[]>={single:[[0,0]],domino:[[0,0],[0,1]],long:[[0,0],[0,1],[0,2]],square:[[0,0],[1,0],[0,1],[1,1]],rectangle:[[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]],L:[[0,0],[0,1],[0,2],[1,2]],T:[[0,0],[1,0],[2,0],[1,1]]};
const vectors:Record<Side,Cell>={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]};
const key=(x:number,y:number)=>`${x},${y}`;
export const occupied=(p:Piece)=>p.cells.map(([x,y])=>[p.x+x,p.y+y] as Cell);
export const startBoard=(b:Board):State=>({pieces:structuredClone(b.pieces),flights:[],moves:0,phase:b.pieces.length?'playing':'won'});
export function validateBoard(b:Board){
 if(!Number.isSafeInteger(b.width)||!Number.isSafeInteger(b.height)||b.width<2||b.height<2||b.width>20||b.height>20)throw Error('보드 크기가 잘못되었습니다.');
 const seen=new Set<string>(),ids=new Set<number>(),gateIds=new Set<number>();
 for(const [x,y]of b.walls){if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=b.width||y>=b.height||seen.has(key(x,y)))throw Error('벽 좌표가 잘못되었습니다.');seen.add(key(x,y));}
 for(const p of b.pieces){if(!Number.isSafeInteger(p.id)||ids.has(p.id)||!Number.isInteger(p.color)||p.color<0||!Number.isInteger(p.x)||!Number.isInteger(p.y)||!p.cells.length)throw Error('블록 정보가 잘못되었습니다.');ids.add(p.id);const own=new Set<string>();for(const [x,y]of p.cells){if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||own.has(key(x,y)))throw Error('점유 격자가 잘못되었습니다.');own.add(key(x,y));}const connected=new Set<string>([key(...p.cells[0])]);for(let i=0;i<p.cells.length;i++)for(const [x,y]of p.cells)if(Object.values(vectors).some(([dx,dy])=>connected.has(key(x+dx,y+dy))))connected.add(key(x,y));if(connected.size!==p.cells.length)throw Error('블록 격자는 연결되어야 합니다.');for(const [x,y]of occupied(p)){if(x<0||y<0||x>=b.width||y>=b.height||seen.has(key(x,y)))throw Error('블록이 겹치거나 보드 밖에 있습니다.');seen.add(key(x,y));}}
 for(const g of b.gates){const span=g.side==='up'||g.side==='down'?b.width:b.height;if(!vectors[g.side]||gateIds.has(g.id)||!Number.isInteger(g.at)||!Number.isInteger(g.width)||g.at<0||g.width<1||g.at+g.width>span||!Number.isInteger(g.color)||g.color<0)throw Error('출구 정보가 잘못되었습니다.');gateIds.add(g.id);}
 return true;
}
function blocked(b:Board,s:State,p:Piece){const walls=b.walls.filter(([x,y])=>!s.brokenWalls?.some(([a,c])=>x===a&&y===c));const cells=new Set([...walls,...s.pieces.filter(x=>x.id!==p.id).flatMap(occupied)].map(([x,y])=>key(x,y)));return occupied(p).some(([x,y])=>cells.has(key(x,y)));}
function matchingGate(b:Board,s:State,p:Piece,direction:Side){
 const [dx,dy]=vectors[direction],cells=occupied(p),horizontal=direction==='left'||direction==='right';
 if(!cells.some(([x,y])=>direction==='up'?y===0:direction==='down'?y===b.height-1:direction==='left'?x===0:x===b.width-1))return;
 const gate=b.gates.find(g=>g.open&&g.side===direction&&g.color===p.color&&cells.every(([x,y])=>{const v=horizontal?y:x;return v>=g.at&&v<g.at+g.width;}));if(!gate)return;
 // Sweep the entire rigid shape until its last cell leaves. No bounding-box shortcuts.
 for(let n=1;n<=Math.max(b.width,b.height)+1;n++){const moved={...p,x:p.x+dx*n,y:p.y+dy*n};if(blocked(b,s,moved))return;const inBoard=occupied(moved).filter(([x,y])=>x>=0&&y>=0&&x<b.width&&y<b.height);if(!inBoard.length)return gate;}
}
export function step(b:Board,s:State,id:number,direction:Side):State|null{
 if(s.phase!=='playing'||!vectors[direction]||s.flights.some(f=>f.id===id))return null;const p=s.pieces.find(p=>p.id===id);if(!p||p.locked||p.axis==='horizontal'&&(direction==='up'||direction==='down')||p.axis==='vertical'&&(direction==='left'||direction==='right'))return null;
 const [dx,dy]=vectors[direction],next={...p,x:p.x+dx,y:p.y+dy};
 if(occupied(next).some(([x,y])=>x<0||y<0||x>=b.width||y>=b.height)){const gate=matchingGate(b,s,p,direction);return gate?{...s,moves:s.moves+1,flights:[...s.flights,{id,gateId:gate.id,direction}]}:null;}
 if(blocked(b,s,next))return null;return {...s,moves:s.moves+1,pieces:s.pieces.map(v=>v.id===id?next:v)};
}
/** Pointer jumps are swept one cell at a time, so a flick cannot tunnel through blockers. */
export function drag(b:Board,s:State,id:number,direction:Side,cells:number){if(!Number.isFinite(cells)||cells<0)return s;let state=s;for(let i=0;i<Math.min(Math.ceil(cells),Math.max(b.width,b.height));i++){const n=step(b,state,id,direction);if(!n)break;state=n;if(state.flights.some(f=>f.id===id))break;}return state;}
/** Only animation arrival commits removal. Pending pieces still occupy their original cells. */
export function finishExit(s:State,id:number):State {if(!s.flights.some(f=>f.id===id))return s;const pieces=s.pieces.filter(p=>p.id!==id),flights=s.flights.filter(f=>f.id!==id);return {...s,pieces,flights,phase:pieces.length?'playing':'won'};}
