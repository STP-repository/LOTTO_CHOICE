# 로또 AI 15년 패턴 분석기

새로 작성한 React + TypeScript + Vite + Tailwind CSS + Recharts 웹 프로그램입니다. Node.js 수집기가 동행복권 실제 당첨 기록을 저장하고, 브라우저가 통계·추천·백테스트를 계산합니다. 학습형 AI 모델을 사용하지 않으며 당첨 확률 향상을 주장하지 않습니다.

공개 사이트: https://eogus3535-sudo.github.io/lotto-pattern-lab/

배포 계정: `eogus3535-sudo`. 주간 자동 갱신이 활성화되었고 첫 GitHub Actions 실행에서 공식 데이터 수집, 9개 테스트, 빌드, 배포가 모두 성공했습니다. 실행 기록: https://github.com/eogus3535-sudo/lotto-pattern-lab/actions/runs/39034075560

자동 갱신은 `.github/workflows/deploy.yml`에서 토요일 22:17, 일요일 07:17 KST에 실행됩니다. 공식 데이터 수집 → 검증·테스트 → 빌드 → 공개 사이트 배포 순서이며 사용자 PC가 꺼져 있어도 동작합니다. 수집 실패 시 정상 파일을 보존하고, 최신 데이터 검증이 실패하면 기존 공개 배포를 유지합니다. GitHub 예약 작업은 지연되거나 비활성 저장소에서 중단될 수 있으므로 Actions 실행 기록으로 상태를 확인하세요.

## 실행

Node.js 22.12 이상(권장 24), npm이 필요합니다.

```sh
npm ci
npm run dev
```

터미널의 로컬 주소(기본 http://127.0.0.1:5173)를 엽니다. 최초 수집한 정상 데이터가 포함되어 인터넷 연결이 없어도 분석할 수 있습니다.

```sh
npm run data:update  # 공식 데이터 수집 (인터넷 필요)
npm run typecheck
npm test
npm run report      # reports/backtest.json 생성
npm run build       # dist/ 생성
npm run preview     # 프로덕션 빌드 확인
```

## 구성

```text
src/
  core/           data.ts, statistics.ts, recommend.ts, backtest.ts
  services/       브라우저 캐시·갱신 처리
  components/     Recharts 차트·번호 공
  workers/        백테스트 Web Worker
  App.tsx         한국어 5개 메뉴 및 업로드·내보내기
  styles.css      PC·모바일 UI
scripts/          수집기, 백테스트 보고서
public/data/      마지막 정상 데이터, 수집 상태
tests/            실제 데이터·통계·추천·누출 방지 검증
reports/          재현 가능한 검증 결과
.github/workflows/deploy.yml  예약 수집·검증·Pages 배포
```

## 실제 데이터와 검증

공식 API: https://www.dhlottery.co.kr/lt645/selectPstLt645Info.do?srchLtEpsd=all

2026-10-17 직접 JSON 응답을 확인했습니다. `data.list`의 `ltEpsd`, `ltRflYmd`, `tm1WnNo`–`tm6WnNo`, `bnsWnNo`만 사용합니다. 공식 API의 영구 제공을 보장할 수 없으므로 스키마가 변경되면 오류를 기록하고 정상 파일을 보존합니다.

공식 장애 시 대체 후보:

- https://smok95.github.io/lotto/results/all.json ([제공자 문서](https://github.com/smok95/lotto))
- https://papaya5rhw1984.github.io/lotto-data/all.json ([제공자 문서](https://github.com/papaya5rhw1984/lotto-data))

두 미러는 공개 커뮤니티 데이터로 공식 보증이 없으며 서로 독립적이라고 가정하지 않습니다. 미러 사용 시 화면에 공식 미검증 출처를 표시합니다. 기존 공식 데이터와 겹치는 번호가 다르면 저장하지 않습니다. 원본 데이터만 참고했으며 기존 프로젝트 코드는 복사하지 않았습니다.

실행일의 한국 날짜에서 달력 기준 15년을 뺀 범위를 사용합니다. 회차별 번호 6개·보너스 범위(1–45), 중복 번호, 회차 중복·누락, 회차와 토요일 추첨일의 일치, 미래 날짜, 전체 15년 범위의 앞부분과 최신 예상 회차를 검사합니다. 토요일 22:00 KST부터 새 회차 제공을 기대하며 그 전에도 API에 게시된 당일 결과는 수집합니다. 날짜 계산은 한국 시간을 명시합니다.

수집 파일은 검증 후 임시 파일을 rename하여 교체합니다. 실패 시 `status.json`과 `data/last-error.json`에 기록하고 마지막 정상 `lotto.json`을 보존합니다. 브라우저도 검증된 마지막 데이터를 localStorage에 저장합니다. CSV는 사용자 제공 데이터로 명시하고 공식 대조 완료로 표시하지 않습니다.

## 통계와 추천

빈도 계산에는 보너스를 제외합니다. 전체·최근 10/30/50/100회 빈도, 고빈도·저빈도·미출현, 홀짝, 합계(20 단위), 연속 쌍, 구간, 끝자리, 함께 출현한 상위 15쌍, 직전 중복, 연도별 빈도와 최근 1년/100회 출현율을 차트·표로 제공합니다. 최근 1년은 마지막 관측 추첨일 기준입니다. 구간 41–45는 5개 번호이므로 다른 10개 번호 구간과 단순 비교에 유의합니다.

7가지 모드, 1/5/10게임, 번호 복사, 게임 내/간 중복 방지, 정렬, 내부 점수를 구현했습니다. 전체 통계와 고빈도 모드는 같은 빈도 기준입니다. 고빈도/저빈도는 각각 빈도/역빈도를 가중치로 삼습니다. 가중 비복원 추출 후보 중 점수가 높은 조합을 고릅니다(일반 8후보, 균형·종합 60후보).

`src/core/recommend.ts`의 `WEIGHTS`: 전체 빈도 35%, 최근 빈도 25%, 미출현 10%, 균형 30%. 빈도·미출현은 각 최댓값으로 나누어 정규화합니다. 균형 점수는 홀수 3개, 합계 138, 5개 구간 다양성을 선호하는 세 지표의 평균입니다. 내부 점수는 당첨 확률이 아닙니다. 모든 조합의 1등 확률은 1/8,145,060입니다.

## 백테스트

최근 최대 100회에 대해 검증 회차 **이전** 기록만으로 매번 모델을 다시 계산합니다. 최소 30회 훈련 기록이 필요합니다. 각 훈련 집합도 해당 대상일 기준 최근 15년으로 제한합니다. 설치 파일에 포함된 15년 데이터보다 더 오래된 기록은 사용하지 않으므로 초기 검증 시점에는 훈련 기간이 15년보다 짧습니다.

Mulberry32 난수와 회차별 독립 시드를 적용합니다. 게임별 번호 일치 개수(보너스 제외)를 전체 게임에 걸쳐 평균하며, 최고 성적만 선택하지 않습니다. 동일 게임 수의 균등 무작위 비교군을 별도로 생성합니다. 0–6개 일치 분포와 회차별 그래프, 훈련 경계 및 상세 JSON을 제공합니다. 시드 변경/모드 탐색을 통한 성능 선택 편향이나 작은 표본의 차이를 우위로 해석하면 안 됩니다.

## CSV

UTF-8, 최대 5MB, 헤더:

```csv
round,date,n1,n2,n3,n4,n5,n6,bonus
```

데이터 관리에서 다운로드한 CSV를 편집해 업로드할 수 있습니다. 회차는 연속되어야 하고 날짜는 YYYY-MM-DD입니다. 부분 기간 CSV도 허용하지만 최근 15년 밖 기록은 분석에서 제외합니다. 업로드는 현재 브라우저에만 적용되며 공개 서버 원본을 바꾸지 않습니다.

## 무료 공개 배포 (선택: GitHub Pages)

Vite 정적 사이트와 GitHub Actions의 무료 공개 저장소 예약 실행을 함께 쓰는 구조입니다. 서버/API 키가 필요하지 않습니다. Cloudflare Pages와 Vercel도 `npm run build`, 출력 `dist`로 정적 배포할 수 있지만 이 프로젝트의 예약 데이터 수집과 배포는 GitHub Pages 워크플로우에 통합했습니다.

1. GitHub에 빈 **공개 저장소**를 만듭니다. 이 폴더를 git 초기화하고 `main` 브랜치에 전체 소스를 push합니다(`node_modules`, `dist` 제외).
2. 저장소 Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 선택합니다.
3. Settings → Actions → General에서 워크플로우 실행과 repository contents 쓰기 권한을 허용합니다. 조직 정책/브랜치 보호가 있으면 워크플로우의 데이터 커밋 권한을 설정합니다.
4. Actions의 **Collect, verify and deploy Lotto Lab**을 수동 실행하거나 `main`에 push합니다.
5. 성공한 실행의 `deploy` 작업 Environment URL 또는 Settings → Pages의 실제 발급 URL을 확인합니다. 이 URL을 가족·친구에게 공유합니다.

`base: './'`로 저장소 하위 경로를 지원하며 메뉴는 클라이언트 상태로 바뀌어 경로 rewrite가 필요하지 않습니다. GitHub Actions는 토요일 22:17, 일요일 07:17 KST에 수집을 시도합니다. 예약 실행은 지연될 수 있고 기본 브랜치에만 적용됩니다. 장기간 비활성 공개 저장소에서는 GitHub가 예약 작업을 비활성화할 수 있으므로 Actions 화면에서 재활성화하세요. [Pages 설정 문서](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [예약 실행 제한](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

수집 실패도 상태를 커밋하고 이전 배포는 유지합니다. 테스트가 최신 데이터 누락을 검출하면 새 배포를 중단합니다. 이후 수집이 성공하면 자동 배포를 재개합니다. 수동 브라우저 새로고침은 공식/미러를 직접 조회하되 CORS로 차단되면 배포된 정상 파일을 다시 확인하고 사용자에게 알려줍니다. 영구 서버 갱신은 `npm run data:update` 후 push 또는 Actions 수동 실행을 사용하세요.

## 품질 확인

`npm test`는 실제 파일 검증, 오류 데이터 거부, 고정 사례 통계, CSV 왕복, 모든 모드·게임 수 추천의 범위/정렬/고유성, 난수 재현성, 100회 백테스트 훈련 경계, 대상 회차 번호 변경 시 추천 불변, 수집 실패를 확인합니다. `npm run build`는 TypeScript 검사 후 프로덕션 자산을 만듭니다. `reports/backtest.json`은 실제 데이터로 생성한 재현 가능한 상세 결과입니다.
