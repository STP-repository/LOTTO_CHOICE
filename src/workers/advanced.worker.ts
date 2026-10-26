import {validateDraws} from '../core/data';
import {advancedGenerate} from '../core/advanced-model';
import {validateAdvanced} from '../core/advanced-validation';
self.onmessage=e=>{try{const {action,data,budget,seed,count=5,path='standard'}=e.data,draws=validateDraws(data.draws);if(action==='validate')self.postMessage({action,report:validateAdvanced(draws,budget,seed,new Date(),progress=>self.postMessage({progress}),{count,path})});else self.postMessage({action,result:advancedGenerate(draws,budget,seed,undefined,undefined,{count,path})});}catch(e){self.postMessage({error:e instanceof Error?e.message:String(e)});}};
