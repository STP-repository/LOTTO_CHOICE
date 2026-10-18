import {isRankedMode,rankedRecommendations,recommend} from '../core/recommend';
self.onmessage=e=>{try{
 const {draws,mode,games,seed}=e.data;
 const result=isRankedMode(mode)?rankedRecommendations(draws,mode,games,(checked,total)=>self.postMessage({progress:Math.round(checked/total*100)})):recommend(draws,mode,games,seed);
 self.postMessage({result});
}catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}};
