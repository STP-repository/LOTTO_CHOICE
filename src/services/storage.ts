import { collect,validateDraws,type Dataset } from '../core/data';
const KEY='lotto-lab:last-good:full-v2';
export function cached():Dataset|null {try{const d=JSON.parse(localStorage.getItem(KEY)??'null') as Dataset|null;if(d){d.draws=validateDraws(d.draws);if(!d.draws.length)return null;}return d;}catch{return null;}}
export function persist(d:Dataset) {try{localStorage.setItem(KEY,JSON.stringify(d));return true;}catch{return false;}}
export async function bundled():Promise<Dataset> {const r=await fetch(`${import.meta.env.BASE_URL}data/full-history.json?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error('기본 데이터 파일을 불러오지 못했습니다.');const d=await r.json() as Dataset;d.draws=validateDraws(d.draws);if(!d.draws.length)throw new Error('전체 회차 데이터가 없습니다.');return d;}
export async function refresh():Promise<{data:Dataset;message:string}> {
  try{return {data:await collect(),message:'실시간 출처에서 갱신했습니다.'};}catch(e){
    const data=await bundled(); return {data,message:`공식·미러 직접 조회 실패(CORS/네트워크 가능). 서버에 저장된 정상 데이터를 확인했습니다. ${e instanceof Error?e.message:''}`};
  }
}
