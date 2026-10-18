import {FEATURE_WEIGHTS} from '../core/evidence';
import {modeWeights,type Mode} from '../core/recommend';
const rows:[keyof typeof FEATURE_WEIGHTS,string,string][]=[
 ['frequency','15년 전체 빈도','선택 번호 6개의 전체 출현 횟수를 가장 많이 나온 번호의 횟수로 나누어 평균'],
 ['recent','최근 흐름','최근 100회 출현 횟수를 같은 기간 최다 횟수로 나누어 평균'],
 ['overdue','미출현 기간','번호별 마지막 출현 이후 경과 회차를 최대 경과 회차로 나누어 평균'],
 ['odd','홀짝 구성','같은 홀수 개수가 나온 과거 회차 수를 가장 흔한 홀짝 구성의 회차 수로 나눔'],
 ['ranges','구간별 구성','1–10 / 11–20 / 21–30 / 31–40 / 41–45의 개수 구성이 과거에 나온 빈도를 비교'],
 ['endings','끝자리 빈도','번호 6개의 끝자리가 과거에 출현한 횟수를 최다 끝자리 횟수로 나누어 평균'],
 ['pairs','함께 나온 번호 쌍','6개 번호가 만드는 15쌍의 동반 출현 횟수를 최다 쌍 횟수로 나누어 평균'],
 ['consecutive','연속번호','인접한 연속 쌍 개수가 같은 과거 조합의 빈도를 비교. 0쌍도 평가 대상'],
 ['overlap','직전 회차 중복','직전 번호와 겹치는 개수의 과거 빈도를 비교. 0개도 평가 대상'],
];
export default function AnalysisMethod({mode}:{mode:Mode}){const weights=modeWeights(mode);return <details className="method-help"><summary>숫자를 분석하는 방법과 가중치</summary><p className="muted">아래 지표를 각각 0~1로 환산하고 가중 합계를 계산합니다. 구성 빈도는 해당 지표에서 가장 많이 관측된 구성의 횟수로 나눕니다. 통합은 기존 비율을 유지해 9개 지표의 합을 100%로 환산하고, 개별 조건은 선택한 지표만 100%로 평가합니다. 표시값은 반올림됩니다. 합계는 점수에 반영하지 않습니다. 가중치는 프로그램의 분석 설정이며 학습된 확률이 아닙니다. 미출현 기간이 길다고 다음에 나올 가능성이 높다고 가정하는 것은 아닙니다.</p><div className="table-scroll"><table><thead><tr><th>지표</th><th>비중</th><th>계산 방법</th></tr></thead><tbody>{rows.map(([key,label,description])=><tr key={key}><th>{label}</th><td>{(weights[key]*100).toFixed(1)}%</td><td>{description}</td></tr>)}</tbody></table></div><p className="muted">전체 8,145,060개 조합을 평가하고 점수 내림차순으로 정렬합니다. 동점은 번호 오름차순으로 비교합니다. 같은 조합은 한 번만 나오며 서로 다른 게임 사이에는 같은 번호가 반복될 수 있습니다. 연속번호·직전 중복·합계·홀짝으로 후보를 제외하지 않습니다.</p></details>;}
