import {useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {RefObject,CSSProperties} from 'react';
import type {Collection} from '../core/harvest-transport';
import {collectionRoute} from '../core/harvest-path';
import {HARVEST_PALETTE} from '../core/puzzles';
type Point={x:number;y:number};
type Journey={id:number;index:number;color:string;size:number;origin:Point;points:Point[];slot:number};
function PixelJourney({journey,onArrive,onCancel}:{journey:Journey;onArrive:(id:number)=>void;onCancel:(id:number)=>void}){
 const node=useRef<HTMLDivElement>(null),[landed,setLanded]=useState(false);
 useLayoutEffect(()=>{
  const el=node.current!;let live=true,arrived=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ps=journey.points,distances=ps.map((p,i)=>i?Math.hypot(p.x-ps[i-1].x,p.y-ps[i-1].y):0),length=distances.reduce((a,b)=>a+b,0)||1;
  let travelled=0;
  const frames:Keyframe[]=[{transform:'translate(0px,0px) scale(1)',offset:0},{transform:'translate(0px,-3px) scale(1.13)',offset:.12}];
  ps.forEach((p,i)=>{travelled+=distances[i];frames.push({transform:`translate(${p.x}px,${p.y}px) scale(${i===ps.length-1?.06:1.03})`,opacity:i===ps.length-1?0:1,offset:.14+.86*travelled/length});});
  const animation=el.animate(frames,{duration:reduced?160:680,fill:'forwards',easing:'linear'});
  const stop=()=>{if(!arrived){animation.cancel();onCancel(journey.id);}};
  const visibility=()=>{if(document.hidden)animation.pause();else if(animation.playState==='paused')animation.play();};
  window.addEventListener('resize',stop);window.addEventListener('scroll',stop,true);document.addEventListener('visibilitychange',visibility);
  void animation.finished.then(()=>{if(live){arrived=true;setLanded(true);onArrive(journey.id);}}).catch(()=>{});
  return()=>{live=false;animation.cancel();window.removeEventListener('resize',stop);window.removeEventListener('scroll',stop,true);document.removeEventListener('visibilitychange',visibility);};
 },[journey,onArrive,onCancel]);
 const end=journey.points.at(-1)!;
 return <div className="ph-pixel-origin" style={{left:journey.origin.x,top:journey.origin.y,'--pixel-color':journey.color,'--pixel-size':`${journey.size}px`} as CSSProperties} data-source-index={journey.index}>
  <div ref={node} className="ph-moving-pixel"><i/><span/></div>
  {landed&&<div className="ph-impact" style={{left:end.x,top:end.y}}><i/><b>✦</b>{Array.from({length:6},(_,i)=><em key={i} style={{'--angle':`${i*60}deg`} as CSSProperties}/>)}</div>}
 </div>;
}
export default function HarvestCollection({pending,width,height,cells,grid,hole,onArrive,onCancel}:{pending:Collection[];width:number;height:number;cells:number[];grid:RefObject<HTMLDivElement|null>;hole:RefObject<HTMLDivElement|null>;onArrive:(id:number)=>void;onCancel:(id:number)=>void}){
 const [journeys,setJourneys]=useState<Journey[]>([]),seen=useRef(new Set<number>()),timers=useRef(new Set<ReturnType<typeof setTimeout>>());
 const callbacks=useRef({onArrive,onCancel});callbacks.current={onArrive,onCancel};
 useLayoutEffect(()=>{
  for(const c of pending){if(seen.current.has(c.id))continue;
   const children=grid.current?.children,pixel=children?.[c.index]?.getBoundingClientRect(),first=children?.[0]?.getBoundingClientRect(),second=children?.[1]?.getBoundingClientRect(),row=children?.[width]?.getBoundingClientRect(),target=hole.current?.getBoundingClientRect();
   if(!pixel||!first||!target||!pixel.width){onCancel(c.id);continue;}
   const route=collectionRoute(width,height,cells,c.index);if(!route.length){onCancel(c.id);continue;}
   seen.current.add(c.id);
   const x=pixel.x+pixel.width/2,y=pixel.y+pixel.height/2,stepX=second?second.x-first.x:pixel.width,stepY=row?row.y-first.y:pixel.height;
   const raw=route.map(p=>({x:first.x+(p.x+.5)*stepX-x,y:first.y+(p.y+.5)*stepY-y}));raw[0]={x:0,y:0};
   // Round each turn inside the traversable cell, then curve into the collection mouth.
   const points:Point[]=[raw[0]];
   for(let i=1;i<raw.length-1;i++){const a=raw[i-1],b=raw[i],d=raw[i+1],r=.16;const before={x:b.x+(a.x-b.x)*r,y:b.y+(a.y-b.y)*r},after={x:b.x+(d.x-b.x)*r,y:b.y+(d.y-b.y)*r};points.push(before);for(let n=1;n<=4;n++){const t=n/4;points.push({x:(1-t)**2*before.x+2*(1-t)*t*b.x+t*t*after.x,y:(1-t)**2*before.y+2*(1-t)*t*b.y+t*t*after.y});}}
   const from=raw.at(-1)!,to={x:target.x+target.width/2-x,y:target.y+target.height*.55-y};points.push(from);
   for(let n=1;n<=10;n++){const t=n/10,control={x:to.x+Math.sin(c.id)*12,y:from.y+(to.y-from.y)*.55};points.push({x:(1-t)**2*from.x+2*(1-t)*t*control.x+t*t*to.x,y:(1-t)**2*from.y+2*(1-t)*t*control.y+t*t*to.y});}
   setJourneys(old=>[...old,{id:c.id,index:c.index,slot:c.slot,color:HARVEST_PALETTE[c.color],size:pixel.width,origin:{x,y},points}]);
  }
  setJourneys(old=>old.filter(j=>pending.some(c=>c.id===j.id)||seen.current.has(j.id)));
 },[pending,width,height,cells,grid,hole,onCancel]);
 useLayoutEffect(()=>()=>{for(const t of timers.current)clearTimeout(t);},[]);
 const done=useRef((id:number)=>{callbacks.current.onArrive(id);const timer=setTimeout(()=>{setJourneys(old=>old.filter(j=>j.id!==id));seen.current.delete(id);timers.current.delete(timer);},380);timers.current.add(timer);});
 const cancel=useRef((id:number)=>{callbacks.current.onCancel(id);setJourneys(old=>old.filter(j=>j.id!==id));seen.current.delete(id);});
 return createPortal(<div className="ph-fx" aria-hidden="true">{journeys.map(j=><PixelJourney key={j.id} journey={j} onArrive={done.current} onCancel={cancel.current}/>)}</div>,document.body);
}
