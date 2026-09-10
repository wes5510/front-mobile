# 채팅 경험 개선 기록 — 모바일 Safari 키보드/스크롤 대응

이 문서는 채팅 SDK(iframe 임베드 모드 / 독립 페이지 모드)의 모바일 크로스 브라우징
대응, 특히 아이폰 Safari의 가상 키보드 열림·닫힘 관련 버그 대응 과정을
시도한 순서대로 기록한다. 나중에 테크 블로그 글을 쓰기 위한 원본 기록이므로,
성공한 시도뿐 아니라 실패하거나 더 나은 방법으로 대체된 시도도 그대로 남긴다.

새로운 시도를 할 때마다 해당 날짜 섹션 아래에 이어서 기록한다.

## 배경

- 제품은 고객사 사이트에 **iframe SDK로 임베드되는 모드**와 **독립 페이지로 실행되는
  모드** 두 가지가 있고, 내용물(ChildPage)은 동일하며 실행 환경(껍데기)만 다르다.
- 이 레포는 그 구조를 로컬에서 재현한 실험용 하네스다.
  - `ParentPage`: 고객사 호스트 페이지 역할
  - `ChildPage`: 실제 채팅 위젯 콘텐츠
  - iframe 모드에서는 `ChildPage`가 `ParentPage` 위에 뜨는 격리된 iframe 안에서 실행된다.
- 아이폰 Safari에서 iframe 안 input에 키보드를 열었다 닫으면 **호스트 페이지
  (ParentPage)의 스크롤 위치가 표준과 다르게 조금씩 밀리는** 문제가 이 기록의
  핵심 주제다.

## 2026-09-10

### 1. 테스트 하네스 구축 (ParentPage / ChildPage / iframe)

- `src/pages/ParentPage.tsx`, `src/pages/ChildPage.tsx`, `src/App.tsx` 생성.
- ParentPage 우하단에 원형 버튼 → 클릭 시 전체 화면을 덮는 `<iframe>`이 뜨고 그
  안에 ChildPage가 격리되어 실행됨. 이때 iframe의 `src`는 채우지 않고,
  `contentDocument.open()/write()/close()`로 HTML을 직접 주입한 뒤, 그 HTML의
  `<script src>`가 별도 번들(`src/child-entry.tsx`)을 로드해서 그 문서 전체를
  ChildPage로 채우는 방식을 택함. 실제 SDK의 "위젯 스크립트가 iframe 문서를
  채운다"는 구조와 가장 비슷하기 때문.
- ParentPage 상단 토글 버튼으로는 iframe 없이 ChildPage로 전체 전환(=독립 페이지
  모드 재현)도 가능하게 함.
- `ChildPage`는 `window.self !== window.top`으로 **자기가 iframe 안에서 열렸는지
  스스로 판별**해서, 독립 페이지 모드일 때만 "ParentPage로 전환" 버튼을 보여줌.
- `vite.config.ts`에 `child-entry`를 별도 빌드 엔트리로 추가 (`build.rollupOptions`).

### 2. 스크롤/뷰포트 리서치용 디버그 패널

- ParentPage에 스크롤이 생기도록 약 2000px 길이의 콘텐츠(200px 간격 마커) 추가.
- `useViewportMetrics` 훅 + `ViewportDebugPanel` 컴포넌트 제작: `innerWidth/Height`,
  `scrollX/Y`, `document.documentElement`의 scroll 관련 값, `visualViewport`의
  `width/height/offsetTop/pageTop/scale` 등을 화면에 실시간으로 띄움.
- **실패 → 수정**: 처음엔 `scroll`/`resize` 이벤트가 발생할 때만 값을 다시 읽었는데,
  ParentPage ↔ ChildPage 전체 전환처럼 이벤트 없이 콘텐츠 높이만 바뀌는 경우
  패널 값이 갱신되지 않고 이전 값에 머무르는(stale) 문제를 발견. 이벤트 기반 대신
  **100ms 주기 polling**으로 바꿔서 해결.
- ChildPage를 실제 채팅 UI(상단 fixed 헤더, 하단 fixed 푸터 + input, 상담원/유저
  메시지 스트림, 중간의 폼 input, "메시지 짧게/길게" 토글로 스크롤 有/無 케이스
  전환)로 재구성. 실제 채팅 시나리오에 가까운 상태에서 버그를 재현하기 위함.

### 3. 다크모드/격리 환경에서 색이 깨지는 문제

- 모바일 Safari가 다크모드일 때 화면 요소들의 배경색 구분이 안 되는 문제 확인.
- 원인을 조사하다가, **iframe 안에서는 상위 문서의 `index.css`가 로드되지 않아서
  `var(--bg)` 같은 CSS 커스텀 프로퍼티가 애초에 정의되어 있지 않다**는 사실을
  발견 (상담원 메시지 배경이 iframe 안에서만 안 보이던 버그의 원인).
- 해결: 시스템 다크모드에 반응하는 CSS 변수 대신 **고정 색상 팔레트**(`src/colors.ts`)
  로 전환하고, `index.css`의 다크모드 미디어쿼리를 제거. 이제 iframe 안이든 밖이든,
  기기 다크모드 설정과 무관하게 항상 동일한 색으로 보임.
- 부가로, **iframe 자체의 배경색**을 눈에 띄는 색(`#ffe066`)으로 지정해서, 스크롤
  리서치 중 iframe 영역의 실제 경계(콘텐츠가 아직 안 채워졌거나 뷰포트 크기가
  어긋나는 순간)를 시각적으로 구분할 수 있게 함.

### 4. 문서별 GlobalStyle 분리

- `ParentPage`, `iframe 없이 열린 ChildPage`, `iframe 안에서 열린 ChildPage` 세
  문맥마다 서로 다른 `html, body` 스타일을 실험할 수 있도록 `createGlobalStyle`
  3종(`src/globalStyles.ts`)을 만들고 조건부로 적용.

### 5. iframe을 상시 마운트 + display로만 토글

- **실패 → 수정**: 처음엔 iframe을 열 때마다 `{isFrameOpen && <iframe />}`로
  마운트/언마운트했는데, 이러면 닫았다 열 때마다 ChildPage가 완전히 리셋되어
  (state, 이벤트 리스너 모두 소실) 이어지는 "키보드 열고 닫기" 실험에 방해가 됨.
- iframe을 ParentPage 마운트 시점에 한 번만 생성해서 항상 DOM에 떠 있게 하고,
  `isFrameOpen` 값에 따라 `display: block/none`으로만 보이는지 여부를 바꾸도록 변경.
  이제 iframe을 닫았다 열어도 ChildPage 내부 상태가 유지됨.

### 6. 키보드 열림/닫힘 감지 훅 이식

- 사내 다른 레포(`plugin-web`)의 `useTouchableDeviceResize` 훅 핵심 로직을 참고해서
  `useIsKeyboardOpen` 훅 제작. `visualViewport.height`가 임계값(180px) 이상
  줄어들면 키보드 열림, 늘어나면 닫힘으로 판단하는 방식 (하단 브라우저 메뉴바
  활성화/비활성화로 인한 resize와 구분하기 위한 임계값).

### 7. 1차 시도: 키보드 닫힐 때 ParentPage 스크롤을 저장해둔 위치로 복원

- 문제 재현: iframe 안 ChildPage의 input에 포커스를 줘서 키보드를 열었다 닫으면,
  ParentPage의 스크롤이 열기 전 위치로 돌아오지 않고 조금씩 밀림.
- 1차 접근: 키보드가 열리는 시점에 그때의 `window.parent.scrollY`를 기억해두고,
  키보드가 닫히는 시점에 그 값으로 `scrollTo`.
- `visualViewport.height`를 임시로 줄였다 늘리며 `resize` 이벤트를 강제로 쏘는
  방식으로 시뮬레이션 검증 → 정상 동작 확인 (스크롤 700 → 드리프트 흉내로 740 →
  키보드 닫힘 흉내 후 700으로 복원).

### 8. Focus 시점에도 스크롤 고정이 필요함을 확인 → zustand 도입

- 키보드가 "열려 있는 동안"에도 드리프트가 발생할 수 있어서, `onBlur`뿐 아니라
  `onFocus` 시점에도 스크롤을 붙잡아둘 필요가 생김.
- 여러 input(푸터 input, 메시지 스트림 중간의 폼 input)이 상태를 공유해야 해서
  zustand를 전역 스토어로 도입.
- `useKeepParentScrollPosition` 훅 제작: `onFocus`/`onBlur` 두 핸들러를 반환.
  - `onFocus`: 그 시점의 `window.parent.scrollY`를 store에 저장.
  - `onBlur`: store에 저장된 scrollY를 목표값으로 `requestAnimationFrame`을
    이용해 일정 시간(0.3초) 동안 매 프레임 `scrollTo`를 강제 호출 — 한 프레임
    복원으로는 부족해서 시간을 두고 계속 맞춰줌.

### 9. keyboardHeight를 store로 이전 + 값 유지 정책 결정

- `isKeyboardOpen`과 함께 `keyboardHeight`도 zustand(`keyboardStore`)로 이전.
- **정책 결정**: 키보드가 닫혀도 `keyboardHeight`를 0으로 초기화하지 않고 마지막으로
  열렸을 때의 높이를 계속 유지하도록 함 (앱 실행 후 한 번도 연 적 없을 때만 0).
  이후 스크롤 보정 계산에 재사용하기 위함.
- `useIsKeyboardOpen`은 값을 반환하지 않는 훅으로 정리(부수효과로 store만 갱신),
  소비자는 store에서 직접 `isKeyboardOpen`을 구독하도록 통일.

### 10. onFocus 보정값: 고정 오프셋 → 매 프레임 동적 계산

- **실패 → 수정**: 처음엔 `onFocus`에서 스크롤 목표값에 `keyboardHeight`(store에 저장된
  고정값)를 더하는 방식이었는데, Safari에서 주소창이 접히고 펴지는 애니메이션이
  진행되는 동안에는 필요한 보정값도 시간에 따라 계속 바뀐다는 걸 확인.
- `holdScrollY`가 매 프레임 `window.parent.innerHeight - window.parent.visualViewport.height`를
  다시 계산해서 그 프레임의 목표 스크롤 위치를 갱신하도록 변경. (`onBlur`는 계속
  고정된 scrollY 하나만 사용 — 키보드가 이미 닫힌 뒤라 변하는 값이 없으므로.)

### 11. innerHeight 자체가 순간적으로 튀는 Safari 버그 대응

- 문제 발견: 위 계산에 쓰이는 `window.parent.innerHeight` 자체가 아이폰 Safari에서
  아주 짧은 타이밍에 비정상적으로 작은 값을 찍는 버그가 있음. 또한 주소창이
  켜짐↔꺼짐으로 전환되는 애니메이션 도중에는 그 중간값들도 찍힘.
- **1차 방어**: 앱(스크립트) 로드 시점의 `innerHeight`를 기준값으로
  `initialInnerHeightStore`에 저장해두고, 현재 값이 기준값과 threshold(50~100px)
  이상 차이나면 그 프레임의 `scrollTo`를 건너뛰는 방식으로 러프하게 방어.
- **2차 정교화**: 임계값 기반 추정 대신, **주소창이 켜져 있을 때/꺼져 있을 때의
  진짜 innerHeight 값 2개를 직접 수집**하는 방식으로 전환.
  - `useCollectAddressBarInnerHeights` 훅: `window.parent`에 `scroll` 리스너를
    걸고, 키보드가 닫혀 있는 동안(`isKeyboardOpen === false`)에만 동작.
    `requestAnimationFrame`으로 매 프레임 `innerHeight`를 관찰하다가, 같은 값이
    200ms 이상 유지되면 "안정된 값"으로 보고 `addressBarInnerHeightStore`에 후보로
    추가 (시간 기반 판단 — 프레임 수 대신 경과 시간으로 안정 여부를 판단해서
    기기별 프레임레이트 차이의 영향을 줄임).
  - 앱 시작 시점의 innerHeight를 이미 후보 1개로 깔고 시작하므로, 실제로는 나머지
    한 상태(주소창 반대 상태)의 값만 더 찾으면 됨.
  - 후보가 2개(=주소창 켜짐/꺼짐 각각의 진짜 값) 모이면 더 볼 필요가 없으므로
    `scroll` 리스너를 스스로 제거.
  - `useKeepParentScrollPosition`의 신뢰성 검사도 "기준값과의 거리" 대신 "수집된
    후보 2개 중 하나와 정확히 일치하는지"로 교체. 일치하지 않으면 그 프레임엔
    `scrollTo`를 호출하지 않음.

### 관련 파일

| 파일 | 역할 |
| --- | --- |
| `src/pages/ParentPage.tsx` | 호스트 페이지 재현, iframe 오픈/클로즈, 디버그 패널 |
| `src/pages/ChildPage.tsx` | 채팅 위젯 콘텐츠, 각종 훅 연결 지점 |
| `src/lib/childFrameDocument.ts` | iframe에 주입할 HTML 생성 |
| `src/child-entry.tsx` | iframe 문서 안에서 ChildPage를 마운트하는 별도 엔트리 |
| `src/hooks/useIsKeyboardOpen.ts` | visualViewport resize 기반 키보드 열림/닫힘 감지 |
| `src/hooks/useKeepParentScrollPosition.ts` | 포커스/블러 시 ParentPage 스크롤 고정·복원 |
| `src/hooks/useCollectAddressBarInnerHeights.ts` | 주소창 활성화/비활성화 상태의 실제 innerHeight 값 수집 |
| `src/hooks/useViewportMetrics.ts` | 실시간 뷰포트/스크롤 지표 수집 (리서치용) |
| `src/store/keyboardStore.ts` | `isKeyboardOpen`, `keyboardHeight` |
| `src/store/parentScrollStore.ts` | 포커스 시점의 ParentPage scrollY |
| `src/store/initialInnerHeightStore.ts` | 앱 시작 시점의 innerHeight 기준값 |
| `src/store/addressBarInnerHeightStore.ts` | 주소창 켜짐/꺼짐 상태별 innerHeight 후보(최대 2개) |
| `src/colors.ts` | 다크모드/iframe 격리와 무관한 고정 색상 팔레트 |
| `src/globalStyles.ts` | 문맥별(ParentPage/ChildPage/iframe ChildPage) html,body 스타일 |
