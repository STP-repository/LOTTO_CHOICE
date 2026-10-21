import {recent15,validateDraws,type Draw} from '../core/data';
import type {Mode,RecommendedGame} from '../core/recommend';
import {dataSignature} from '../core/advanced-model';
let pending:Promise<{version:number;scopes:Record<'recent15'|'all',{signature:string;results:Partial<Record<Mode,RecommendedGame[]>>}>}>|undefined;
export async function precomputedRecommendations(draws:Draw[],mode:Mode,count:number,scope:'recent15'|'all'='recent15'){
  pending??=fetch(`${import.meta.env.BASE_URL}data/ranked-results.json`).then(r=>{if(!r.ok)throw new Error('사전 분석 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');return r.json();}).catch(e=>{pending=undefined;throw e;});
  const saved=await pending;
  if(saved.version!==2||saved.scopes.recent15.signature!==dataSignature(draws))throw new Error('현재 데이터에 맞는 사전 분석 결과가 준비되지 않았습니다. 데이터 갱신 후 다시 이용해 주세요.');
  if(scope==='all'){
    const r=await fetch(`${import.meta.env.BASE_URL}data/full-history.json`);if(!r.ok)throw new Error('전체 회차 자료를 확인하지 못했습니다.');
    const full=validateDraws((await r.json()).draws);
    if(full[0].round!==1||dataSignature(full)!==saved.scopes.all.signature||dataSignature(recent15(full))!==dataSignature(draws))throw new Error('전체 회차와 최근 15년 사전 분석 기준이 일치하지 않습니다.');
  }
  const result=saved.scopes[scope].results[mode];if(!result||result.length<count)throw new Error('이 조건의 사전 분석 결과가 아직 준비되지 않았습니다.');
  return structuredClone(result.slice(0,count));
}
