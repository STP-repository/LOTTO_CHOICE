import type {Draw} from '../core/data';
import {generateRecommendationPack,recommendationIdentity} from '../core/combined-formulas';

interface Request {
  history: Draw[];
  seed: number;
  fixed: number[];
  excluded: number[];
  avoid: string[];
}

self.onmessage = ({data}: MessageEvent<Request>) => {
  try {
    const {history, seed, fixed, excluded, avoid} = data;
    let nextSeed=seed;
    for(let attempt=0;attempt<3;attempt++){
      const pack=generateRecommendationPack(history,nextSeed,fixed,excluded);
      if(!avoid.includes(recommendationIdentity(pack))){self.postMessage(pack);return;}
      nextSeed=crypto.getRandomValues(new Uint32Array(1))[0];
    }
    throw Error('다른 조합을 찾지 못했습니다. 고정수나 제외수를 조정하거나 다시 시도해 주세요.');
  } catch (error) {
    self.postMessage({error: error instanceof Error ? error.message : String(error)});
  }
};
