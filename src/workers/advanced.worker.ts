import { validateDraws } from '../core/data';
import { advancedGenerate } from '../core/advanced-model';
import { validateAdvanced, type ValidationReport } from '../core/advanced-validation';

let report:ValidationReport|undefined;
self.onmessage=e=>{try{
  const {action,data,budget,seed,asOf}=e.data,now=new Date(asOf),draws=validateDraws(data.draws,now);
  if(action==='validate'){
    if(!data.verified)throw new Error('공식 확인이 되지 않은 자료로 가중치를 검증·적용할 수 없습니다.');
    report=validateAdvanced(draws,budget,seed,now,progress=>self.postMessage({progress}));self.postMessage({action,report});
  }else{
    const saved=e.data.precomputed as ValidationReport|undefined;
    if(!report&&data.verified&&saved?.version==='advanced-v1'&&saved.asOf===asOf&&saved.budget===budget&&saved.seed===seed&&saved.split.fullLast===draws.at(-1)!.round)report=saved;
    const valid=!!report&&report.asOf===asOf&&report.budget===budget&&report.seed===seed;
    const result=advancedGenerate(draws,budget,seed,valid?report!.finalWeights:undefined,n=>self.postMessage({progress:{phase:'몬테카를로 후보 생성',done:Math.round(n*budget),total:budget}}));
    self.postMessage({action,result,validated:valid,applied:valid&&report!.applied});
  }
}catch(e){self.postMessage({error:e instanceof Error?e.message:String(e)});}};
