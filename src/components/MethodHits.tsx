import './MethodHits.css';
import {useEffect,useState} from 'react';
import {METHOD_IDS,METHOD_NAMES} from '../core/method-five';
import {MIXED_DISPLAY_ORDER,MIXED_EXTRA_NAMES} from '../core/top-two-portfolio';
import type {MethodHits} from '../services/method-five';
import integratedBacktest from './integrated-backtest.json';
import seedBacktest from './seed-backtest-100.json';

const tunedName='조정 빈도 가중 필터';
const integratedName='A~H 통합 공식';

export function MethodHitsTable({hits,mode,indices}:{hits:MethodHits;mode:string;indices?:number[]}) {
 const hitRows=hits.totals[mode];
 const shown=hitRows.map((ranks,i)=>({ranks,i})).filter(({i})=>!indices||indices.includes(i));
 const base=METHOD_IDS.map(id=>METHOD_NAMES[id]);
 const names=[...base,...MIXED_EXTRA_NAMES];
 const labels=mode==='frequency-filter'?Array(hitRows.length).fill(tunedName):mode==='five'?base:mode==='mixed'?MIXED_DISPLAY_ORDER.map(i=>names[i]):Array(10).fill('45개 번호 분산');
 const hitTotals=[0,1,2,3,4].map(i=>shown.reduce((sum,{ranks})=>sum+ranks[i],0));
 return <section className="panel method-hits"><h2>추천 방식별 과거 당첨 횟수</h2>
 <p>{mode==='frequency-filter'&&'회차별 기준 조합 · '}제{hits.first}~{hits.last}회 · {hits.rounds.toLocaleString()}회 · 매회 {hitRows.length}조합을 추첨 직전 데이터로 다시 생성해 대조했습니다.{indices&&' 선택한 방식의 실적만 표시합니다.'}</p>
 <table className="method-hits-table"><thead><tr><th>추천 방식</th>{[1,2,3,4,5].map(rank=><th key={rank}>{rank}등</th>)}<th scope="col">합계</th></tr></thead><tbody>
 {shown.map(({ranks,i})=><tr key={i}><th scope="row">{String.fromCharCode((mode==='frequency-filter'?70:65)+i)} · {labels[i]}</th>{ranks.map((n,j)=><td key={j}>{n}</td>)}<td>{ranks.reduce((a,b)=>a+b,0)}장</td></tr>)}
 <tr><th>합계</th>{hitTotals.map((n,i)=><td key={i}>{n}</td>)}<td>{hitTotals.reduce((a,b)=>a+b,0)}장</td></tr>
 </tbody></table></section>;
}

const markovName='마르코프·몬테카를로·이론분포';
const recommendationGroups=[
 {firstSlot:65},
 {firstSlot:70},
];

export function IntegratedBacktest() {
 const recent=seedBacktest;
 const {best}=recent;
 const {first,last,rows}=integratedBacktest;
 const percent=(value:number)=>(100*value).toFixed(2)+'%';
 return <section className="panel method-hits weekly-check"><h2>최근 100회 · 번호대 분산 조건 비교</h2>
  <p>제{recent.first}~{recent.last}회 · 매회 시드별 A~J 10조합 · 공식별 시뮬레이션 {recent.simulations.toLocaleString()}회 · 최대 {recent.generations}세대</p>
  <table className="method-hits-table seed-hits-table"><thead><tr><th scope="col">시드</th>{[1,2,3,4,5].map(rank=><th scope="col" key={rank}>{rank}등</th>)}<th scope="col">합계</th><th scope="col">당첨 회차</th></tr></thead>
   <tbody>{recent.rows.map(row=><tr key={row.label}><th scope="row">{row.label}</th>{row.ranks.map((count,i)=><td key={i}>{count}</td>)}
    <td>{row.ranks.reduce((sum,count)=>sum+count,0)}장</td><td>{row.winRounds}회</td></tr>)}</tbody></table>
  <div className="weekly-check-draw"><div><p>최고 3등 · 제{best.round}회 메인 {best.slot}조합 · 본번호 {best.matched.length}개 일치</p>
   <WeeklyNumbers numbers={best.numbers} matched={best.matched}/></div></div>
  <p>당시 확정된 이력으로 다시 생성한 결과입니다. 새 시드는 회차당 한 번을 비교했습니다.</p>
  <p>변경 후에는 직전 본번호에서 3개 이상 나온 번호대가 다시 3개 이상 들어가는 조합을 A~E 중 최대 한 장으로 제한했습니다.</p>
  <details><summary>이전 F~J 통합 공식 검증</summary>
  <p>제{first}~{last}회 · 매회 직전까지 확정된 기록 사용 · 검증용 추첨 10만 회·최대 100세대</p>
  <table className="method-hits-table"><thead><tr><th scope="col">비교 방식</th><th scope="col">평균 일치</th><th scope="col">조합 당첨률</th><th scope="col">세트 당첨률</th></tr></thead>
   <tbody>{rows.map(row=><tr key={row.label}><th scope="row">{row.label}</th><td>{row.mean.toFixed(3)}개</td>
    <td>{percent(row.ticketRate)}</td><td>{percent(row.setRate)}</td></tr>)}</tbody></table>
  <p>당첨 기준은 5등 이상입니다. 세트 당첨률은 5조합 중 한 장 이상 당첨된 비율입니다. 무작위는 회차당 1,000세트를 비교했습니다.</p>
  </details>
 </section>;
}

function WeeklyNumbers({numbers,matched=[],bonus}:{numbers:readonly number[];matched?:readonly number[];bonus?:number}) {
 return <div className="weekly-check-numbers">{numbers.map(number=>{
  const label=matched.includes(number)?'본번호 일치':number===bonus?'보너스':'';
  const style=matched.includes(number)?' is-match':number===bonus?' is-bonus':'';
  return <span key={number} className={'weekly-check-ball'+style} aria-label={label?number+'번 '+label:undefined}>{String(number).padStart(2,'0')}</span>;
 })}</div>;
}

export default function DashboardMethodHits({signature}:{signature:string}) {
 const [hits,setHits]=useState<MethodHits|null>(null);
 const [error,setError]=useState('');
 const [tab,setTab]=useState<'latest'|'upcoming'|'history'>('latest');
 useEffect(()=>{
  const controller=new AbortController();
  setHits(null);setError('');
  fetch(import.meta.env.BASE_URL+'data/method-hits.json',{cache:'no-store',signal:controller.signal})
   .then(response=>{if(!response.ok)throw Error();return response.json() as Promise<MethodHits>;})
   .then(setHits).catch(()=>{if(!controller.signal.aborted)setError('당첨 횟수 자료를 불러오지 못했습니다.');});
  return ()=>controller.abort();
 },[signature]);
 const current=hits?.signature===signature&&hits.totals['frequency-filter']?hits:null;
 const latest=current?.combinedLatest;
 const upcoming=current?.upcoming;
 return <div className="weekly-check">
  <div className="segmented" role="group" aria-label="추천 당첨 내역">
   <button type="button" className={tab==='latest'?'selected':''} aria-pressed={tab==='latest'} onClick={()=>setTab('latest')}>최근 당첨 결과</button>
   <button type="button" className={tab==='upcoming'?'selected':''} aria-pressed={tab==='upcoming'} onClick={()=>setTab('upcoming')}>이번 주 추천번호</button>
   <button type="button" className={tab==='history'?'selected':''} aria-pressed={tab==='history'} onClick={()=>setTab('history')}>과거 당첨 횟수</button>
  </div>
  {!current?<section className="panel method-hits"><p role="status">{error||(hits?'최신 회차의 당첨 자료를 갱신 중입니다.':'당첨 내역 불러오는 중…')}</p></section>
   :tab==='history'?<><IntegratedBacktest/><MethodHitsTable hits={current} mode="frequency-filter"/></>
   :tab==='upcoming'?<section className="panel method-hits"><h2>이번 주 메인 추천번호</h2>
    {upcoming?<><p>제{upcoming.targetRound}회 · 시드 {upcoming.seed} · 고정수·제외수 미지정</p>
     <div className="weekly-check-groups">{[upcoming.markov.games,'integrated' in upcoming?upcoming.integrated.games:upcoming.frequency].map((games,group)=>{
      const {firstSlot}=recommendationGroups[group];
      const name=group===0?markovName:'integrated' in upcoming?integratedName:tunedName;
      return <section key={name}><h3>{name}</h3><ul>{games.map((game,i)=><li key={i}>
       <strong>{String.fromCharCode(firstSlot+i)}</strong><WeeklyNumbers numbers={game.numbers}/>
      </li>)}</ul></section>;
     })}</div></>:<p>이번 주 메인 추천번호를 준비 중입니다.</p>}
   </section>:<section className="panel method-hits">
    {latest?<><h2>제{latest.draw.round}회 당첨 결과</h2>
     <p>{latest.draw.date} · {latest.replayed?'추첨 직전 데이터로 사후 재현한 조합':'추첨 전에 저장한 메인 조합'}</p>
     <div className="weekly-check-draw"><div><p>실제 당첨번호</p><WeeklyNumbers numbers={latest.draw.numbers} matched={latest.draw.numbers}/></div>
      <div><p>보너스</p><WeeklyNumbers numbers={[latest.draw.bonus]} bonus={latest.draw.bonus}/></div></div>
     <p><span className="weekly-check-key is-match">본번호 일치</span> <span className="weekly-check-key is-bonus">보너스 일치</span> · {latest.tickets.length}조합 중 {latest.tickets.filter(ticket=>ticket.rank).length}장 당첨</p>
     <div className="weekly-check-groups">{[latest.tickets.slice(latest.frequencyCount),latest.tickets.slice(0,latest.frequencyCount)].map((tickets,group)=>{
      const {firstSlot}=recommendationGroups[group];
      const name=group===0?markovName:latest.integrated?integratedName:tunedName;
      return <section key={name}><h3>{name}</h3><ul>{tickets.map((ticket,i)=><li key={i}>
       <strong>{String.fromCharCode(firstSlot+i)}</strong><WeeklyNumbers numbers={ticket.numbers} matched={ticket.matched} bonus={latest.draw.bonus}/>
       <span className="weekly-check-result">{ticket.matched.length}개 일치 · {ticket.rank?ticket.rank+'등':'낙첨'}</span>
      </li>)}</ul></section>;
     })}</div></>:<><h2>최근 추첨 결과</h2><p>최근 추첨 결과를 준비 중입니다.</p></>}
   </section>}
 </div>;
}
