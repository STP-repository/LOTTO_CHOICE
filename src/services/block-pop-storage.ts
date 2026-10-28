import {personalStorage} from './profiles';import {newPop,validatePop,type PopState} from '../core/block-pop';
export const POP_SAVE_KEY='puzzles:block-pop-star:v1',POP_BEST_KEY='puzzles:block-pop-star:best:v1';
type Store=Pick<Storage,'getItem'|'setItem'>;
export function loadPop(seed:number,store:Store=personalStorage){let best=0;try{const n=Number(store.getItem(POP_BEST_KEY));if(Number.isSafeInteger(n)&&n>=0)best=n;}catch{}try{const s=validatePop(JSON.parse(store.getItem(POP_SAVE_KEY)||'null'));if(s)return {...s,best:Math.max(best,s.best)};}catch{}return newPop(seed,best);}
export function savePop(s:PopState,store:Store=personalStorage){try{store.setItem(POP_BEST_KEY,String(s.best));store.setItem(POP_SAVE_KEY,JSON.stringify(s));return true;}catch{return false;}}
