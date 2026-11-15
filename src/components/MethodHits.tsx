import {useEffect,useState} from 'react';
import {METHOD_IDS,METHOD_NAMES} from '../core/method-five';
import {MIXED_DISPLAY_ORDER,MIXED_EXTRA_NAMES} from '../core/top-two-portfolio';
import type {MethodHits} from '../services/method-five';

const mixedNames = MIXED_DISPLAY_ORDER.map(index => [...METHOD_IDS.map(id=>METHOD_NAMES[id]), ...MIXED_EXTRA_NAMES][index]);

export function MethodHitsTable({hits,mode,indices}:{hits:MethodHits;mode:string;indices?:number[]}) {
 const hitRows=hits.totals[mode];
 const shown=hitRows.map((ranks,i)=>({ranks,i})).filter(({i})=>!indices||indices.includes(i));
 const base=METHOD_IDS.map(id=>METHOD_NAMES[id]);
 const names=[...base,...MIXED_EXTRA_NAMES];
 const labels=mode==='five'?base:mode==='mixed'?MIXED_DISPLAY_ORDER.map(i=>names[i]):Array(10).fill('45개 번호 분산');
 const hitTotals=[0,1,2,3,4].map(i=>shown.reduce((sum,{ranks})=>sum+ranks[i],0));
 return <section className="panel method-hits"><h2>추천 방식별 과거 당첨 횟수</h2>
 <p>제{hits.first}~{hits.last}회 · {hits.rounds.toLocaleString()}회 · 매회 {hitRows.length}조합을 추첨 직전 데이터로 다시 생성해 대조했습니다.{indices&&' 선택한 방식의 실적만 표시합니다.'}</p>
 <table className="method-hits-table"><thead><tr><th>추천 방식</th>{[1,2,3,4,5].map(rank=><th key={rank}>{rank}등</th>)}<th scope="col">합계</th></tr></thead><tbody>
 {shown.map(({ranks,i})=><tr key={i}><th scope="row">{String.fromCharCode(65+i)} · {labels[i]}</th>{ranks.map((n,j)=><td key={j}>{n}</td>)}<td>{ranks.reduce((a,b)=>a+b,0)}장</td></tr>)}
 <tr><th>합계</th>{hitTotals.map((n,i)=><td key={i}>{n}</td>)}<td>{hitTotals.reduce((a,b)=>a+b,0)}장</td></tr>
 </tbody></table></section>;
}

export default function DashboardMethodHits({signature}:{signature:string}) {
 const [hits,setHits]=useState<MethodHits|null>(null);
 const [error,setError]=useState('');
 const [weekly,setWeekly]=useState(true);
 useEffect(()=>{
  const controller=new AbortController();
  setHits(null);setError('');
  fetch(import.meta.env.BASE_URL+'data/method-hits.json',{cache:'no-store',signal:controller.signal})
   .then(response=>{if(!response.ok)throw Error();return response.json() as Promise<MethodHits>;})
   .then(setHits).catch(()=>{if(!controller.signal.aborted)setError('당첨 횟수 자료를 불러오지 못했습니다.');});
  return ()=>controller.abort();
 },[signature]);
 const current=hits?.signature===signature?hits:null;
 const latest=current?.latest;
 return <div>
  <div className="segmented" role="group" aria-label="추천 당첨 내역">
   <button type="button" className={weekly?'selected':''} aria-pressed={weekly} onClick={()=>setWeekly(true)}>이번 주 추천번호</button>
   <button type="button" className={!weekly?'selected':''} aria-pressed={!weekly} onClick={()=>setWeekly(false)}>과거 당첨 횟수</button>
  </div>
  {!current?<section className="panel method-hits"><p role="status">{error||(hits?'최신 회차의 당첨 자료를 갱신 중입니다.':'당첨 내역 불러오는 중…')}</p></section>
   :!weekly?<MethodHitsTable hits={current} mode="mixed"/>
   :<section className="panel method-hits"><h2>이번 주 추천번호 당첨 결과</h2>
    {latest?<><p>제{latest.draw.round}회 · {latest.draw.date} · 추첨 직전 데이터로 추천 10조합을 재현했습니다.</p>
     <p>실제 당첨번호 {latest.draw.numbers.join(' · ')} / 보너스 {latest.draw.bonus}</p>
     <p>{latest.tickets.some(ticket=>ticket.rank)?[1,2,3,4,5].map(rank=>({rank,count:latest.tickets.filter(ticket=>ticket.rank===rank).length})).filter(({count})=>count).map(({rank,count})=>rank+'등 '+count+'장').join(' · '):'10장 모두 낙첨'}</p>
     <p><span className="weekly-number is-match">본번호 일치</span> <span className="weekly-number is-bonus">보너스 일치</span></p>
     <table className="method-hits-table weekly-hit-table"><thead><tr><th scope="col">추천 방식</th><th scope="col">추천번호</th><th scope="col">결과</th></tr></thead><tbody>
      {latest.tickets.map((ticket,i)=><tr key={i}><th scope="row">{String.fromCharCode(65+i)} · {mixedNames[i]}</th><td><div className="weekly-number-list">{ticket.numbers.map(number=>{
       const match=ticket.matched.includes(number);
       const bonus=number===latest.draw.bonus;
       return <span key={number} className={'weekly-number'+(match?' is-match':bonus?' is-bonus':'')} aria-label={match?number+'번 본번호 일치':bonus?number+'번 보너스 일치':undefined}>{number}</span>;
      })}</div></td><td>{ticket.rank?ticket.rank+'등':'낙첨'}</td></tr>)}
     </tbody></table></>:<p>이번 주 당첨 결과를 준비 중입니다.</p>}
   </section>}
 </div>;
}
