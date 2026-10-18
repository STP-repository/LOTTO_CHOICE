import type { Mode } from './recommend';

export const CHOICES: { mode: Mode; icon: string; title: string; description: string }[] = [
  { mode: 'integrated', icon: '◎', title: '15년 통합 추천', description: '기존 7가지 방식에 패턴 기준을 더하고, 네 가지 패턴 조건을 모두 만족하는 5게임·10게임을 골라요.' },
  { mode: 'pattern', icon: '◈', title: '15년 패턴 기준', description: '홀짝 균형·연속번호·직전 회차 중복·과거 평균에 가까운 합계를 모두 만족하는 조합을 골라요.' },
  { mode: 'composite', icon: '✧', title: '골고루 섞기', description: '전체 기록, 최근 흐름, 조합 균형을 함께 참고해요.' },
  { mode: 'balanced', icon: '◐', title: '균형 있게 고르기', description: '홀짝과 합계, 번호 구간이 골고루 섞이도록 골라요.' },
  { mode: 'recent', icon: '↗', title: '최근 기록 참고하기', description: '최근 100회에서 자주 나온 번호를 더 참고해요.' },
  { mode: 'hot', icon: '↑', title: '자주 나온 번호', description: '15년간 출현 횟수가 많은 번호를 선호해요.' },
  { mode: 'cold', icon: '↓', title: '덜 나온 번호', description: '15년간 출현 횟수가 적은 번호를 선호해요.' },
  { mode: 'random', icon: '⤨', title: '그냥 무작위로', description: '과거 기록에 가중치를 주지 않고 골라요.' },
  { mode: 'all', icon: '▥', title: '15년 전체 기록', description: '전체 출현 빈도를 참고해요. ‘자주 나온 번호’와 같은 기준이에요.' },
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
