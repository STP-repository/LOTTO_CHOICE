import { backtest } from '../core/backtest';
self.onmessage=(e)=>{try{self.postMessage({result:backtest(e.data.draws,e.data.mode,e.data.seed,e.data.games)});}catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}};
