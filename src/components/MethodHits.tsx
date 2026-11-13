import {useEffect,useState} from 'react';
import {METHOD_IDS,METHOD_NAMES} from '../core/method-five';
import {MIXED_DISPLAY_ORDER,MIXED_EXTRA_NAMES} from '../core/top-two-portfolio';
import type {MethodHits} from '../services/method-five';

export function MethodHitsTable({hits,mode}:{hits:MethodHits;mode:string}) {
 const hitRows=hits.totals[mode];
 const base=METHOD_IDS.map(id=>METHOD_NAMES[id]);
 const names=[...base,...MIXED_EXTRA_NAMES];
 const labels=mode==='five'?base:mode==='mixed'?MIXED_DISPLAY_ORDER.map(i=>names[i]):Array(10).fill('45개 번호 분산');
 const hitTotals=[0,1,2,3,4].map(i=>hitRows.reduce((sum,ranks)=>sum+ranks[i],0));
 return <section className="panel"><h2>추천 방식별 과거 당첨 횟수</h2>
 <p>제{hits.first}~{hits.last}회 · {hits.rounds.toLocaleString()}회 · 매회 {hitRows.length}조합을 추첨 직전 데이터로 다시 생성해 대조했습니다.</p>
 <div className="table-scroll"><table><thead><tr><th>추천 방식</th>{[1,2,3,4,5].map(rank=><th key={rank}>{rank}등</th>)}<th>당첨 합계</th></tr></thead><tbody>
 {hitRows.map((ranks,i)=><tr key={i}><th>{String.fromCharCode(65+i)} · {labels[i]}</th>{ranks.map((n,j)=><td key={j}>{n}</td>)}<td>{ranks.reduce((a,b)=>a+b,0)}장</td></tr>)}
 <tr><th>합계</th>{hitTotals.map((n,i)=><td key={i}>{n}</td>)}<td>{hitTotals.reduce((a,b)=>a+b,0)}장</td></tr>
 </tbody></table></div></section>;
}

export default function DashboardMethodHits({signature}:{signature:string}) {
 const [hits,setHits]=useState<MethodHits|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();
  setHits(null);setError('');
  fetch(import.meta.env.BASE_URL+'data/method-hits.json',{cache:'no-store',signal:controller.signal})
   .then(response=>{if(!response.ok)throw Error();return response.json() as Promise<MethodHits>;})
   .then(setHits).catch(()=>{if(!controller.signal.aborted)setError('당첨 횟수 자료를 불러오지 못했습니다.');});
  return ()=>controller.abort();
 },[signature]);
 if(hits?.signature===signature)return <MethodHitsTable hits={hits} mode="mixed"/>;
 return <section className="panel"><h2>추천 방식별 과거 당첨 횟수</h2><p role="status">{error||(hits?'최신 회차의 당첨 횟수 자료를 갱신 중입니다.':'당첨 횟수 불러오는 중…')}</p></section>;
}
