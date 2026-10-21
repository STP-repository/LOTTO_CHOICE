export default function ChoiceGuide() {
  return <section className="panel" aria-labelledby="choice-guide-title">
    <div className="panel-head"><div><h2 id="choice-guide-title">이렇게 골라보세요</h2><p>분석 순위와 근거를 확인하고 원하는 조합을 선택하세요.</p></div></div>
    <ol className="choice-steps">
      <li><strong>필터에서 방식을 선택하세요</strong><p>새 분석을 사용하려면 ‘통합 분석 · 15년 가중치 검증’, 특별한 기준 없이 고르고 싶다면 ‘그냥 무작위로’를 선택하세요. 어느 방식도 당첨에 더 유리하다는 뜻은 아닙니다.</p></li>
      <li><strong>번호 구성을 살펴보세요</strong><p>각 조합에 홀짝 개수, 6개 번호의 합계, 구간 분포와 연속번호를 보여드립니다. 마음에 드는 구성을 직접 골라보세요.</p></li>
      <li><strong>마음에 드는 조합을 선택하고 복사하세요</strong><p>게임별 ‘이 조합 선택’을 체크하면 선택한 번호만 복사할 수 있습니다. 전체 조합 복사도 가능합니다.</p></li>
    </ol>
    <details><summary>번호 구성 읽는 방법</summary><ul className="choice-notes">
      <li>‘홀수 3 · 짝수 3’은 6개 번호의 홀짝 개수입니다. ‘합계’는 6개 번호를 더한 값입니다.</li>
      <li>구간은 1–10, 11–20, 21–30, 31–40, 41–45로 나눕니다. ‘4개 구간에 분산’은 이 중 4개 구간에 번호가 들어 있다는 뜻입니다.</li>
      <li>‘연속번호 2쌍’은 1·2·3처럼 붙어 있는 번호의 인접 쌍이 두 개라는 뜻입니다.</li>
      <li>자주 나오거나 오래 나오지 않은 번호가 다음에 더 잘 나온다고 보장할 수 없습니다. 균형이나 연속번호 여부도 당첨 확률의 높고 낮음을 뜻하지 않습니다.</li>
    </ul></details>
  </section>;
}
