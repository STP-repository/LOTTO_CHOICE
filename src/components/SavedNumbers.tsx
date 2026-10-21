import {useEffect,useState} from 'react';
import {readSavedNumbers,removeSavedNumbers,SAVED_EVENT} from '../services/saved-numbers';
import {Balls} from './Charts';
export default function SavedNumbers(){
  const [rows,setRows]=useState(readSavedNumbers),[notice,setNotice]=useState('');
  useEffect(()=>{const refresh=()=>setRows(readSavedNumbers());window.addEventListener(SAVED_EVENT,refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener(SAVED_EVENT,refresh);window.removeEventListener('storage',refresh);};},[]);
  return <details className="panel saved-numbers"><summary>저장한 번호 · {rows.length}조합</summary><p className="muted">선택해 저장한 번호만 표시합니다. 현재 브라우저에 최대 200조합을 보관하며 다른 기기와 동기화되지 않습니다.</p>{rows.map(r=><article className="saved-number-ticket" key={r.id}><div><strong>{r.round}회 · {r.method}</strong><small>{new Date(r.createdAt).toLocaleString('ko-KR')}</small></div><Balls numbers={r.numbers}/><div className="advanced-actions"><button className="btn btn-white" onClick={async()=>{try{await navigator.clipboard.writeText(r.numbers.join(', '));setNotice('번호를 복사했습니다.');}catch{setNotice('화면의 번호를 선택해 복사해 주세요.');}}}>번호 복사</button><button className="btn btn-white" onClick={()=>{try{removeSavedNumbers(r.id);setNotice('저장 목록에서 삭제했습니다.');}catch(e){setNotice(e instanceof Error?e.message:String(e));}}}>저장 삭제</button></div></article>)}{!rows.length&&<p className="muted">추천 조합에서 원하는 번호를 체크한 뒤 저장해 주세요.</p>}<p role="status">{notice}</p></details>;
}
