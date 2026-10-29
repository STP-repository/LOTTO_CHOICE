import {useEffect,useState} from 'react';
import {popRanking,syncPopRanking,type PopRank} from '../services/block-pop-ranking';
import {POP_BEST_KEY} from '../services/block-pop-storage';import {personalStorage} from '../services/profiles';
export default function PopRanking(){const [rows,setRows]=useState<PopRank[]>([]),[message,setMessage]=useState('');
 useEffect(()=>{let alive=true,busy=false;const refresh=async()=>{if(busy)return;busy=true;try{await syncPopRanking();const next=await popRanking();if(alive){setRows(next);setMessage('');}}catch(e){if(alive)setMessage((e as Error).message);}finally{busy=false;}};void refresh();const t=setInterval(refresh,5000);window.addEventListener('puzzle-records-updated',refresh);return()=>{alive=false;clearInterval(t);window.removeEventListener('puzzle-records-updated',refresh);};},[]);
 return <div><p>내 최고 점수 {Number(personalStorage.getItem(POP_BEST_KEY)||0).toLocaleString()}점 · 공개 랭킹은 새 규칙의 게임 종료 후 등록됩니다.</p><p>최고 점수 → 적은 행동 수 → 먼저 등록한 순 · 5초마다 갱신</p><table><thead><tr><th>순위</th><th>사용자</th><th>점수</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td>{i+1}</td><td>{r.name}</td><td>{r.score.toLocaleString()}</td></tr>)}</tbody></table><p role="status">{message||(!rows.length?'아직 등록된 기록이 없습니다.':'')}</p></div>;
}
