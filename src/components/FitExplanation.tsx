export default function FitExplanation() {
  return <section className="panel" aria-labelledby="fit-guide-title">
    <div className="panel-head"><div><h2 id="fit-guide-title">‘상위 약 1%’는 무슨 뜻인가요?</h2><p>당첨 가능성이 아니라, 선택한 통계 기준에 얼마나 잘 맞는지를 비교합니다.</p></div></div>
    <p className="fit-example"><strong>예: 통계 적합도 · 상위 약 1%</strong><br/>무작위 조합 10,000개와 비교했을 때, 이 조합과 같거나 높은 적합도를 가진 조합이 약 100개라는 뜻입니다. ‘당첨 확률이 1%’라는 뜻은 아닙니다.</p>
    <div className="fit-guide-grid">
      <div><h3>숫자가 작을수록?</h3><p>상위 1%는 상위 10%보다 선택한 통계 기준에 더 잘 맞는 쪽입니다. 다만 서로 다른 모드의 비율을 직접 비교하면 안 됩니다.</p></div>
      <div><h3>무엇을 비교하나요?</h3><p>선택한 모드의 출현 빈도나 조합 균형 등을 비교합니다. 종합 모드는 전체 빈도·최근 빈도·미출현 기간·홀짝 및 합계·구간 균형을 함께 봅니다.</p></div>
      <div><h3>그래서 더 잘 당첨되나요?</h3><p>그렇다는 근거는 없습니다. 공정한 무작위 추첨에서는 어느 특정 조합을 선택해도 한 게임의 1등 확률은 1 / 8,145,060으로 같습니다.</p></div>
    </div>
    <details><summary>표시를 해석할 때 알아둘 점</summary><ul className="fit-guide-notes">
      <li>전체 8,145,060개 조합을 모두 검사한 정확한 순위가 아니라, 무작위 표본 10,000개를 이용한 추정치입니다. 동점도 포함합니다.</li>
      <li>100점 만점의 성적표가 아닙니다. 상위 비율이 작다는 이유로 구매 금액을 늘릴 필요는 없습니다.</li>
      <li>같은 데이터와 모드에서는 비교 표본을 고정합니다. 새 회차가 반영되거나 모드를 바꾸면 같은 번호라도 적합도가 달라질 수 있습니다.</li>
      <li>‘완전 무작위’ 모드는 통계 기준으로 고르지 않으므로 적합도를 표시하지 않습니다.</li>
    </ul></details>
  </section>;
}
