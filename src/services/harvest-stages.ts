import type {HarvestPuzzle} from '../core/puzzles';
let worker:Worker|undefined,serial=0;const waiting=new Map<number,{resolve:(p:HarvestPuzzle)=>void;reject:(e:Error)=>void}>(),cache=new Map<string,Promise<HarvestPuzzle>>();
export function harvestStage(stage:string):Promise<HarvestPuzzle>{
 const saved=cache.get(stage);if(saved)return saved.then(p=>structuredClone(p));
 if(!worker){worker=new Worker(new URL('../workers/harvest-stage.ts',import.meta.url),{type:'module'});worker.onmessage=(e:MessageEvent<{id:number;puzzle?:HarvestPuzzle;error?:string}>)=>{const task=waiting.get(e.data.id);if(!task)return;waiting.delete(e.data.id);if(e.data.puzzle)task.resolve(e.data.puzzle);else task.reject(new Error(e.data.error??'퍼즐 생성 실패'));};worker.onerror=()=>{for(const task of waiting.values())task.reject(new Error('퍼즐 생성 작업을 다시 시도해 주세요.'));waiting.clear();cache.clear();worker?.terminate();worker=undefined;};}
 const id=++serial,promise=new Promise<HarvestPuzzle>((resolve,reject)=>waiting.set(id,{resolve,reject}));cache.set(stage,promise);if(cache.size>3)cache.delete(cache.keys().next().value!);worker.postMessage({id,stage});promise.catch(()=>cache.delete(stage));return promise.then(p=>structuredClone(p));
}
