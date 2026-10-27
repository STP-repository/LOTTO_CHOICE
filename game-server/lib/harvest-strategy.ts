import type {HarvestBoard,HarvestState,Token} from './puzzles';
/** Internal contour lines form real collectible boundaries, rather than a purely decorative outline. */
export function strategyPixels(cells:number[],width:number,height:number){const result=[...cells];for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x,c=cells[i];if(c<0||c===2)continue;const around=[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([a,b])=>a>=0&&a<width&&b>=0&&b<height).map(([a,b])=>cells[b*width+a]);if(around.some(v=>v>=0&&v!==c&&v!==2))result[i]=(c+3)%13;}return result;}
/** Same outer-air reachability and first-slot/lowest-index order as the live collector, incrementally updated. */
export function settleHarvest(p:Pick<HarvestBoard,'width'|'height'>,input:HarvestState,parallel=false):HarvestState {
 if(input.phase!=='playing')return input;const s={...input,cells:[...input.cells],slots:input.slots.map(t=>t?{...t}:null)},air=new Set<number>(),edge=new Set<number>(),queue:number[]=[];const w=p.width,h=p.height;
 const visit=(i:number)=>{if(i<0||i>=w*h)return;if(s.cells[i]>=0){edge.add(i);return;}if(!air.has(i)){air.add(i);queue.push(i);}};
 const neighbors=(i:number)=>{const x=i%w,y=Math.floor(i/w);if(x)visit(i-1);if(x<w-1)visit(i+1);if(y)visit(i-w);if(y<h-1)visit(i+w);};
 for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x);}for(let y=0;y<h;y++){visit(y*w);visit(y*w+w-1);}let head=0;const flood=()=>{while(head<queue.length)neighbors(queue[head++]);};flood();
 let left=s.cells.filter(c=>c>=0).length;
 while(left){
  const batch:{index:number;slot:number}[]=[],locked=new Set<number>(),finishing=s.queue.length===0;
  for(let slot=0;slot<5;slot++){const t=s.slots[slot];if(!t)continue;for(let count=0;count<Math.min(t.remaining,parallel?(finishing?6:3):1);count++){let first=Infinity;for(const i of edge)if(!locked.has(i)&&s.cells[i]===t.color&&i<first)first=i;if(first===Infinity)break;batch.push({index:first,slot});locked.add(first);if(!parallel||batch.length>=(finishing?20:12))break;}if(batch.length&&(!parallel||batch.length>=(finishing?20:12)))break;}
  if(!batch.length)break;for(const {index,slot}of batch){const token=s.slots[slot]!;s.cells[index]=-1;edge.delete(index);air.add(index);neighbors(index);flood();s.slots[slot]=token.remaining>1?{...token,remaining:token.remaining-1}:null;s.collected++;left--;}
 }
 s.phase=left?(s.slots.every(Boolean)?'lost':'playing'):'won';return s;
}
export function strategyPolicy(p:HarvestBoard,policy:string,seed=1){let r=seed>>>0;const rand=()=>{r=(Math.imul(r,1664525)+1013904223)>>>0;return r/4294967296;};let s:HarvestState={cells:[...p.cells],queue:p.tokens.map(t=>({...t})),slots:Array(5).fill(null),collected:0,phase:'playing'};
 for(let guard=0;guard<=p.tokens.length;guard++){s=settleHarvest(p,s,true);if(s.phase!=='playing')return s.phase==='won';const free=s.slots.findIndex(t=>!t);if(free<0)return false;let heads=[0,1,2,3].map(lane=>s.queue.find(t=>(t.lane??(t.id-1)%4)===lane)).filter((t):t is Token=>!!t);if(!heads.length)return false;
  if(policy==='right')heads.reverse();else if(policy==='smallest')heads.sort((a,b)=>a.remaining-b.remaining);else if(policy==='largest')heads.sort((a,b)=>b.remaining-a.remaining);else if(policy==='random')heads=[heads[Math.floor(rand()*heads.length)]];else if(policy==='visible'){
   const counts=new Map<number,number>();for(const t of heads){const probe={...s,slots:s.slots.map((v,i)=>i===free?{...t}:v)},after=settleHarvest(p,probe,true);counts.set(t.id,after.collected-s.collected);}heads.sort((a,b)=>counts.get(b.id)!-counts.get(a.id)!);
  }const t=heads[0];s={...s,queue:s.queue.filter(v=>v.id!==t.id),slots:s.slots.map((v,i)=>i===free?{...t}:v)};
 }return false;
}
export function solveStrategy(p:HarvestBoard,limit=1000):number[]|null{
 const seen=new Set<string>();let nodes=0;const visit=(input:HarvestState,path:number[]):number[]|null=>{if(++nodes>limit)return null;const s=settleHarvest(p,input,true);if(s.phase==='won')return path;if(s.phase==='lost')return null;
  const key=s.queue.map(t=>t.id).join(',')+'|'+s.slots.map(t=>t?`${t.id}:${t.remaining}`:'-').join(',')+'|'+s.cells.map(c=>c<0?'_':c.toString(16)).join('');if(seen.has(key))return null;seen.add(key);const slot=s.slots.findIndex(t=>!t);if(slot<0)return null;
  const heads=[0,1,2,3].map(lane=>s.queue.find(t=>t.lane===lane)).filter((t):t is Token=>!!t),choices=heads.map(t=>{const n={...s,queue:s.queue.filter(v=>v.id!==t.id),slots:s.slots.map((v,i)=>i===slot?{...t}:v)},after=settleHarvest(p,n,true);return {t,n,after,score:after.collected-s.collected+after.slots.filter(v=>!v).length*8};}).filter(v=>v.after.phase!=='lost').sort((a,b)=>b.score-a.score);
  for(const v of choices){const answer=visit(v.n,[...path,v.t.id]);if(answer)return answer;}return null;
 };return visit({cells:[...p.cells],queue:p.tokens,slots:Array(5).fill(null),collected:0,phase:'playing'},[]);
}
export function makeStrategyTokens(p:Pick<HarvestBoard,'width'|'height'|'cells'>,seed:number,attempts=64){
 let randSeed=seed>>>0;const rand=()=>{randSeed=(Math.imul(randSeed,1664525)+1013904223)>>>0;return randSeed/4294967296;};let best:{tokens:Token[];solution:number[];failures:number;policies:Record<string,boolean>;randomWins:number}|null=null;
 for(let trial=0;trial<attempts;trial++){
  const counts=new Map<number,number>();for(const color of p.cells)if(color>=0)counts.set(color,(counts.get(color)??0)+1);
  const boxes=new Map<number,number[]>();for(const [color,n]of counts){const amounts:number[]=[];let left=n;while(left){const take=Math.min(left,24+Math.floor(rand()*55));amounts.push(take);left-=take;}boxes.set(color,amounts);}
  let state:HarvestState={cells:[...p.cells],queue:[],slots:Array(5).fill(null),collected:0,phase:'playing'};const tokens:Token[]=[];
  for(let guard=0;guard<180;guard++){
   state=settleHarvest(p,state);if(state.phase!=='playing')break;const free=state.slots.findIndex(t=>!t);if(free<0)break;
   const choices=[...boxes.entries()].filter(([,a])=>a.length).map(([color,a])=>{const t={id:tokens.length+1,color,remaining:a[0]},after=settleHarvest(p,{...state,slots:state.slots.map((v,i)=>i===free?t:v)});return {t,gain:after.collected-state.collected,after};}).filter(c=>c.gain>0&&c.after.phase!=='lost');if(!choices.length)break;
   // Mix fruitful actions instead of always sorting the immediate largest available color.
   const choice=choices[Math.floor(rand()*choices.length)];boxes.get(choice.t.color)!.shift();tokens.push(choice.t);state={...state,slots:state.slots.map((v,i)=>i===free?choice.t:v)};
  }
  state=settleHarvest(p,state);if(state.phase!=='won'||[...boxes.values()].some(a=>a.length))continue;
  const lanes=[0,1,2,3].sort(()=>0);for(let i=3;i;i--){const j=Math.floor(rand()*(i+1));[lanes[i],lanes[j]]=[lanes[j],lanes[i]];}
  const shuffled=[...tokens];for(let i=shuffled.length-1;i;i--){const j=Math.floor(rand()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  const arranged=shuffled.map((t,i)=>({...t,lane:i<4?lanes[i]:Math.floor(rand()*4)})),board={...p,tokens:arranged},solution=solveStrategy(board,800);if(!solution)continue;
  const policies=Object.fromEntries(['left','right','smallest','largest','visible'].map(k=>[k,strategyPolicy(board,k)])),failures=Object.values(policies).filter(v=>!v).length;
  const randomWins=Array.from({length:12},(_,i)=>strategyPolicy(board,'random',seed^Math.imul(i+1,7919))).filter(Boolean).length;
  const candidate={tokens:arranged,solution,failures,policies,randomWins};if(!best||failures>best.failures||failures===best.failures&&randomWins<best.randomWins)best=candidate;
  if(failures>=3&&randomWins<=3)break;
 }return best;
}


