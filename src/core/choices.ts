import type { Mode } from './recommend';

export const METHOD_DETAILS: { mode: Mode; icon: string; title: string; description: string }[] = [
  { mode: 'integrated', icon: '◎', title: '15년 통합 추천', description: '전체 8,145,060개 조합을 합계를 제외한 8가지 통계 지표로 평가해 점수가 높은 순으로 5게임·10게임을 골라요. 같은 데이터이면 같은 결과가 나와요.' },
  { mode: 'pattern', icon: '◈', title: '15년 패턴 기준', description: '홀짝·연속번호·직전 중복을 참고하되 특정 구성을 강제하지 않아요.' },
  { mode: 'composite', icon: '✧', title: '골고루 섞기', description: '전체 기록, 최근 흐름, 조합 균형을 함께 참고해요.' },
  { mode: 'balanced', icon: '◐', title: '균형 있게 고르기', description: '홀짝과 번호 구간이 골고루 섞이도록 골라요.' },
  { mode: 'recent', icon: '↗', title: '최근 기록 참고하기', description: '최근 100회에서 자주 나온 번호를 더 참고해요.' },
  { mode: 'hot', icon: '↑', title: '자주 나온 번호', description: '15년간 출현 횟수가 많은 번호를 선호해요.' },
  { mode: 'cold', icon: '↓', title: '덜 나온 번호', description: '15년간 출현 횟수가 적은 번호를 선호해요.' },
  { mode: 'random', icon: '⤨', title: '그냥 무작위로', description: '과거 기록에 가중치를 주지 않고 골라요.' },
  { mode: 'all', icon: '▥', title: '15년 전체 기록', description: '전체 출현 빈도를 참고해요. ‘자주 나온 번호’와 같은 기준이에요.' },
  ...(['overdue','odd','ranges','pairs','consecutive','overlap'] as Mode[]).map(mode=>({mode,icon:'◈',title:mode,description:'개별 지표 분석'})),
];

export const CHOICES:{mode:Mode;icon:string;title:string;description:string}[]=[
 METHOD_DETAILS.find(c=>c.mode==='integrated')!,METHOD_DETAILS.find(c=>c.mode==='random')!,
 {mode:'all',icon:'▥',title:'15년 출현 빈도',description:'15년 번호별 출현 횟수만 평가해 점수가 높은 순으로 추천해요.'},
 {mode:'recent',icon:'↗',title:'최근 100회 흐름',description:'최근 100회 출현 횟수만 평가해 점수순으로 추천해요.'},
 {mode:'overdue',icon:'◷',title:'미출현 기간',description:'마지막 출현 이후 경과 회차만 평가해 오래 쉬었던 번호 중심으로 추천해요.'},
 {mode:'pairs',icon:'◇',title:'함께 나온 번호 쌍',description:'한 조합의 15개 번호 쌍이 함께 나왔던 횟수만 평가해 추천해요.'},
];

export function combinationFacts(numbers: number[]) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const odd = sorted.filter(n => n % 2).length;
  const groups = new Set(sorted.map(n => Math.floor((n - 1) / 10))).size;
  const consecutive = sorted.slice(1).filter((n, i) => n === sorted[i] + 1).length;
  return [
    `홀수 ${odd} · 짝수 ${sorted.length - odd}`,
    `합계 ${sorted.reduce((a, b) => a + b, 0)}`,
    `${groups}개 구간에 분산`,
    consecutive ? `연속번호 ${consecutive}쌍` : '연속번호 없음',
  ];
}
