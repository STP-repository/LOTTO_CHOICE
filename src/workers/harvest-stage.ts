import {generateHarvest,hashSeed,HARVEST_VERSION} from '../core/puzzles';
self.onmessage=(event:MessageEvent<{id:number;stage:string}>)=>{const {id,stage}=event.data;try{const puzzle=generateHarvest(stage,hashSeed(`${HARVEST_VERSION}:harvest:${stage}`));self.postMessage({id,puzzle});}catch(error){self.postMessage({id,error:error instanceof Error?error.message:'퍼즐을 만들지 못했습니다.'});}};
