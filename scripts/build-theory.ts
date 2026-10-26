import {writeFile} from 'node:fs/promises';
import {shape} from '../src/core/advanced-model';
import {groupKeys} from '../src/core/combination-groups';
const hist:Record<string,Record<string,number>>={};let total=0;
for(let a=1;a<=40;a++)for(let b=a+1;b<=41;b++)for(let c=b+1;c<=42;c++)for(let d=c+1;d<=43;d++)for(let e=d+1;e<=44;e++)for(let f=e+1;f<=45;f++){
 for(const [factor,group]of Object.entries(groupKeys(shape([a,b,c,d,e,f])))){hist[factor]??={};hist[factor][group]=(hist[factor][group]??0)+1;}total++;
}
if(total!==8145060||Object.values(hist).some(h=>Object.values(h).reduce((s,v)=>s+v,0)!==total))throw Error('이론 분포 집계 오류');
await writeFile('src/core/theory-distributions.json',JSON.stringify({total,hist}));console.log(`전체 ${total}조합 이론 분포 집계 완료`);
