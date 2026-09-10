# 채팅 경험 개선 기록 — 모바일 Safari 키보드/스크롤 대응

이 문서는 채팅 SDK(iframe 임베드 모드 / 독립 페이지 모드)의 모바일 크로스 브라우징
대응, 특히 아이폰 Safari의 가상 키보드 열림·닫힘 관련 버그 대응 과정을
시도한 순서대로 기록한다. 나중에 테크 블로그 글을 쓰기 위한 원본 기록이므로,
성공한 시도뿐 아니라 실패하거나 더 나은 방법으로 대체된 시도도 그대로 남긴다.

새로운 시도를 할 때마다 해당 날짜 섹션 아래에 이어서 기록한다.

## 배경

- 제품은 고객사 사이트에 **iframe SDK로 임베드되는 모드**와 **독립 페이지로 실행되는
  모드** 두 가지가 있고, 내용물(ChildPage)은 동일하며 실행 환경(껍데기)만 다르다.
  - `ParentPage`: 고객사 호스트 페이지 역할
  - `ChildPage`: 실제 채팅 위젯 콘텐츠
  - iframe 모드에서는 `ChildPage`가 `ParentPage` 위에 뜨는 격리된 iframe 안에서 실행된다.
- 아이폰 Safari에서 iframe 안 input에 키보드를 열었다 닫으면 **호스트 페이지
  (ParentPage)의 스크롤 위치가 표준과 다르게 조금씩 밀리는** 문제가 이 기록의
  핵심 주제다.

## 2026-09-10

### 1. 키보드 열림/닫힘 감지 훅 이식

- 사내 다른 레포(`plugin-web`)의 `useTouchableDeviceResize` 훅 핵심 로직을 참고해서
  `useIsKeyboardOpen` 훅 제작. `visualViewport.height`가 임계값(180px) 이상
  줄어들면 키보드 열림, 늘어나면 닫힘으로 판단하는 방식 (하단 브라우저 메뉴바
  활성화/비활성화로 인한 resize와 구분하기 위한 임계값).

### 2. 1차 시도: 키보드 닫힐 때 ParentPage 스크롤을 저장해둔 위치로 복원

- 문제 재현: iframe 안 ChildPage의 input에 포커스를 줘서 키보드를 열었다 닫으면,
  ParentPage의 스크롤이 열기 전 위치로 돌아오지 않고 조금씩 밀림.
- 1차 접근: 키보드가 열리는 시점에 그때의 `window.parent.scrollY`를 기억해두고,
  키보드가 닫히는 시점에 그 값으로 `scrollTo`.
- `visualViewport.height`를 임시로 줄였다 늘리며 `resize` 이벤트를 강제로 쏘는
  방식으로 시뮬레이션 검증 → 정상 동작 확인 (스크롤 700 → 드리프트 흉내로 740 →
  키보드 닫힘 흉내 후 700으로 복원).

### 3. Focus 시점에도 스크롤 고정이 필요함을 확인 → zustand 도입

- 키보드가 "열려 있는 동안"에도 드리프트가 발생할 수 있어서, `onBlur`뿐 아니라
  `onFocus` 시점에도 스크롤을 붙잡아둘 필요가 생김.
- 여러 input(푸터 input, 메시지 스트림 중간의 폼 input)이 상태를 공유해야 해서
  zustand를 전역 스토어로 도입.
- `useKeepParentScrollPosition` 훅 제작: `onFocus`/`onBlur` 두 핸들러를 반환.
  - `onFocus`: 그 시점의 `window.parent.scrollY`를 store에 저장.
  - `onBlur`: store에 저장된 scrollY를 목표값으로 `requestAnimationFrame`을
    이용해 일정 시간(0.3초) 동안 매 프레임 `scrollTo`를 강제 호출 — 한 프레임
    복원으로는 부족해서 시간을 두고 계속 맞춰줌.

### 4. keyboardHeight를 store로 이전 + 값 유지 정책 결정

- `isKeyboardOpen`과 함께 `keyboardHeight`도 zustand(`keyboardStore`)로 이전.
- **정책 결정**: 키보드가 닫혀도 `keyboardHeight`를 0으로 초기화하지 않고 마지막으로
  열렸을 때의 높이를 계속 유지하도록 함 (앱 실행 후 한 번도 연 적 없을 때만 0).
  이후 스크롤 보정 계산에 재사용하기 위함.
- `useIsKeyboardOpen`은 값을 반환하지 않는 훅으로 정리(부수효과로 store만 갱신),
  소비자는 store에서 직접 `isKeyboardOpen`을 구독하도록 통일.

### 5. onFocus 보정값: 고정 오프셋 → 매 프레임 동적 계산

- **실패 → 수정**: 처음엔 `onFocus`에서 스크롤 목표값에 `keyboardHeight`(store에 저장된
  고정값)를 더하는 방식이었는데, Safari에서 주소창이 접히고 펴지는 애니메이션이
  진행되는 동안에는 필요한 보정값도 시간에 따라 계속 바뀐다는 걸 확인.
- `holdScrollY`가 매 프레임 `window.parent.innerHeight - window.parent.visualViewport.height`를
  다시 계산해서 그 프레임의 목표 스크롤 위치를 갱신하도록 변경. (`onBlur`는 계속
  고정된 scrollY 하나만 사용 — 키보드가 이미 닫힌 뒤라 변하는 값이 없으므로.)

### 6. innerHeight 자체가 순간적으로 튀는 Safari 버그 대응

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

### 7. onFocus 보정값: 매 프레임 계산 → 포커스 시점 고정 (5번의 재수정)

- 5번에서 매 프레임 다시 계산하도록 바꿨던 걸 다시 뒤집음. 아이폰은 키보드를 열
  때 뷰 전체를 밀어올리는데, `onFocus`는 키보드가 막 올라오기 시작하는 시점이라
  **그 시점의 값**을 잡아 고정해야 메시지가 정확히 키보드 높이만큼만 올라간다.
  매 프레임 다시 읽으면 올라오는 도중의 중간값을 계속 따라가게 된다.
- 이때 읽은 `innerHeight`는 6번에서 수집한 후보값들 중 **가장 가까운 값**으로
  보정한다 (기존의 "정확히 일치하지 않으면 스킵" 방식은 너무 빡빡했음).

## 2026-09-11

### 8. 문제 재정의 — 키보드는 viewport를 줄이는 게 아니라 뷰를 밀어올린다

- 지금까지의 대응이 전부 "밀려난 스크롤을 사후에 되돌리는" 방식이었는데, 근본
  원인을 다시 봄: **아이폰은 키보드를 열 때 layout viewport를 줄이지 않고 뷰
  전체를 위로 밀어올린다.** 그래서 body scroll 구조에서는 스크롤을 내리면
  Footer가 키보드 뒤쪽 영역으로 스크롤되어 들어간다.
- 리팩토링: `keyboardHeight`를 store에서 계산·보관하던 걸 제거.
  `innerHeight - visualViewport.height`로 그때그때 구하는 게 더 정확하다.

### 9. html height를 줄이는 접근 + 그 과정에서 만난 함정 2개

- 접근: 키보드가 열리면 `html`의 height를 `visualViewport.height`로 줄여
  **문서 영역 자체를 키보드를 제외한 화면 크기로** 만들고, `body`/`Root`/`Content`는
  `height: 100%`로 그 안을 채우게 한다. Root가 `overflow-y: auto`로 스크롤을 넘겨받는다.
- **함정 1 — 퍼센트 높이 체인이 `#root`에서 끊김**: `body`와 우리 `Root` 컴포넌트
  사이에는 React가 실제로 마운트되는 `<div id="root">`가 있는데, 여기에 `height`
  없이 `min-height: 100svh`만 걸려 있었다. `height: 100%`는 부모가 **확정된 높이**를
  가져야 상속되므로 체인이 여기서 끊겼고, 게다가 CSS 스펙상 `min-height`가
  `height`보다 우선해서 고정 높이를 줘도 다시 100svh로 늘어났다.
- **함정 2 — `createGlobalStyle`로 준 html/body 스타일이 반영되지 않음**: 원인을
  끝까지 규명하지 못하고, `html`의 height는 JS로 `document.documentElement.style`에
  직접 지정하는 방식으로 우회했다.

### 10. 실패한 탐색들 — 떨림과 흰 영역을 잡으려다 길을 잃음

이 시점의 증상 두 가지:
- **떨림**: html을 줄이면 뷰가 화면 위로 벗어나서 `requestAnimationFrame`으로
  200ms 동안 매 프레임 `scrollTo(0, 0)`을 호출했는데, iOS가 뷰를 밀어올리는
  속도와 어긋나면서 화면이 떨림.
- **흰 영역**: 키보드를 닫을 때 `isKeyboardOpen`이 false가 되는 시점이
  `visualViewport` resize 기반이라 **키보드가 다 닫힌 뒤**다. 그때까지 html이
  줄어든 채라 닫히는 동안 키보드 자리가 하얗게 보이다가 한 번에 커진다.

시도한 것들 (전부 실패):

- **A. html에 `overflow: hidden`** — 문서를 스크롤 불가로 만들면 브라우저가 알아서
  scrollY를 0에 고정해줄 거라 기대. **iOS에서는 문서 스크롤이 막히지 않았다.**
- **B. body에 `position: fixed`** (동료가 알려준 고전적인 iOS body scroll lock) —
  body를 흐름에서 빼면 문서에 스크롤할 내용 자체가 없어진다는 논리. 뷰가 화면 밖으로
  벗어났고, 손으로 스크롤해서 제자리에 맞췄을 때의 `scrollY`가 **312 = 키보드 높이**였다.
- **C. focus 시점에 미리 잠그기 + `visualViewport.offsetTop` 보정** — B가 실패한 이유를
  "`position: fixed`는 layout viewport 기준인데 iOS가 visual viewport를 오프셋시켜서"로
  보고, 키보드가 올라오기 전에 미리 잠그고 offsetTop만큼 보정. **더 나빠졌다** —
  뷰가 화면 밖으로 나간 뒤 아예 돌아오지 않음.
  - 여기서 얻은 가설: **iOS는 포커스된 input을 보이게 하려고 어딘가는 반드시 밀어낸다.**
    문서가 스크롤 가능하면 문서를 스크롤하고, 문서를 미리 잠그면 대신 visual viewport
    자체를 오프셋시킨다. 후자는 `scrollTo`로 되돌릴 수 없다.
- **D. rAF 대신 `scroll` 이벤트 기반 보정** — 매 프레임 밀어붙이는 대신 실제로
  스크롤이 일어났을 때만 되돌리면 싸우는 횟수가 줄 거라 기대. 실패.

### 11. 실측 — 가정 하나가 틀렸다는 걸 발견

추측을 멈추고 디버그 패널 값을 직접 측정 (테스트 기기 기준):

| | 키보드 닫힘 | 키보드 열림(정착 후) |
| --- | --- | --- |
| `innerHeight` | 664 | **664 (변화 없음)** |
| `visualViewport.height` | 664 | **352** |
| `scrollY` | 404 | 0 |
| `docScrollHeight` | 1594 | 664 |
| `docClientHeight` | 664 | 664 |
| `visualViewport.offsetTop` | 0 | 0 |

- **핵심 사실: iOS Safari에서 키보드가 열려도 `innerHeight`는 변하지 않는다.**
  줄어드는 건 `visualViewport.height`뿐이다 (664 → 352). 그동안 "innerHeight가
  보이는 영역만큼 줄어든다"고 가정하고 짠 코드들이 있었는데, 그 전제가 틀렸다.
  (아마 주소창 접힘/펼침으로 innerHeight가 변하는 것과 섞여 보였던 듯.)
- 키보드 높이 = 664 - 352 = **312**. B에서 손으로 맞췄을 때 나온 312와 정확히 일치.
- `offsetTop`이 0이라는 것도 확인 — 즉 iOS는 (문서가 스크롤 가능한 한) visual
  viewport를 오프셋시키는 게 아니라 **문서를 스크롤**한다.

**판단 오류 기록**: 이 표에서 `docScrollHeight == docClientHeight`, `scrollY: 0`을
보고 "정착 후엔 문서가 스크롤 불가하니 `scrollTo`가 불필요하다"고 판단해 해당
코드를 제거했다가 증상이 재발했다. 그 `scrollY: 0`은 **`scrollTo`가 이미 실행된
결과**였다. 측정값이 이미 내 코드가 개입한 뒤의 상태일 수 있다는 걸 놓친 실수.

### 12. 돌파구 — `focus({ preventScroll: true })`

여기까지의 모든 시도가 "밀려난 뷰를 사후에 되돌리는" 방향이었는데, 애초에
**밀리지 않게** 하는 방법이 있었다.

```js
onPointerDown={(event) => {
  event.preventDefault()
  event.currentTarget.focus({ preventScroll: true })
}}
```

- `onPointerDown`의 기본 동작을 막고 직접 포커스를 주면, 브라우저가 focus 시
  자동으로 수행하는 **scroll-into-view가 아예 일어나지 않는다.** 뷰는 제자리에
  그대로 있고 키보드만 올라온다.
- 이 한 줄로 8~11번에서 싸우던 문제(떨림, 뷰 이탈, scrollTo 경쟁)가 전부 사라졌다.
  `scrollTo` 보정 코드도 rAF 루프도 전부 필요 없어졌다.
- embed 모드에서는 적용하지 않는다 (그쪽은 ParentPage 스크롤을 보정하는 별도 경로).

### 13. `useKeyboardSafeViewport` 훅으로 정리

`preventScroll` + html height 축소 + 스크롤 위치 보존을 하나의 훅으로 묶었다.
standalone(비 embed) 모드 전용.

- **`onPointerDown`**: `preventDefault()` + `focus({ preventScroll: true })`.
  동시에 그 시점의 `window.scrollY`와 `window.innerHeight`를 ref에 저장.
- **키보드가 열리면**(`isKeyboardOpen`): `html.style.height`를
  `visualViewport.height`로 줄이고, `Root`에 `overflow-y: auto`를 켜서 스크롤러를
  넘긴다.
- **스크롤 위치 보존**: 문서 스크롤이 사라지고 Root가 스크롤러가 되므로 보고 있던
  메시지가 어긋난다. 키보드 올리기 전 **화면 아래쪽 끝**(`scrollY + innerHeight`)이
  줄어든 화면의 아래쪽 끝에 오도록 맞춘다:
  `Root.scrollTop = savedScrollY + savedInnerHeight - visualViewport.height`
  (채팅에서는 아래쪽이 기준이라 위쪽 정렬보다 자연스럽다.)
- **`onBlur`**: html height를 원복하고 `window.scrollTo(0, savedScrollY)`로
  문서 스크롤을 되돌린다. 해제를 `isKeyboardOpen`이 아니라 blur에 건 이유는
  10번의 "흰 영역" 때문 — blur는 닫기 시작과 동시에 오지만 `isKeyboardOpen`은
  다 닫힌 뒤에야 꺼진다.
- 두 개의 `useLayoutEffect`로 분리했고 **선언 순서에 의존한다**: html height가
  먼저 줄어야 Root가 스크롤 가능해지고, 그래야 `scrollTop`이 0으로 잘리지 않는다.
  cleanup도 선언 순서대로 돌기 때문에 반대로 html height가 먼저 복구된 뒤에
  `scrollTo`가 실행된다.
- `useEffect`가 아니라 `useLayoutEffect`인 이유: height 변경과 scrollTop 할당이
  페인트 전 같은 프레임에 끝나야 잘못된 중간 상태가 한 번 그려지지 않는다.

### 14. 역할 분리와 죽은 코드 정리

- **모드별로 경로를 완전히 분리**했다.
  - embed 모드: `useKeepParentScrollPosition` (ParentPage 스크롤 보정)
  - standalone 모드: `useKeyboardSafeViewport` (뷰 고정 + html height + 스크롤 보존)
  - 서로 배타적이라 `useKeepParentScrollPosition`에서 `shouldHoldScroll` 분기와
    그에 딸린 innerHeight 보정 로직을 전부 제거할 수 있었다.
- 그 결과 **6번에서 공들여 만든 innerHeight 수집 로직이 통째로 불필요해졌다.**
  `useCollectAddressBarInnerHeights`, `addressBarInnerHeightStore`,
  `initialInnerHeightStore`, 그리고 쓰이지 않던 `useAdjustScrollTop`을 삭제.
  `keyboardStore`의 `keyboardHeight`도 저장만 되고 읽는 곳이 없어 제거.
- 판단 기준: **store에 값을 저장해도 읽는 곳이 없으면 그 훅은 불필요하다.**

### 관련 파일 (2026-09-11 기준)

| 파일 | 역할 |
| --- | --- |
| `src/pages/ChildPage.tsx` | 훅 연결 지점, Footer input의 onPointerDown/onFocus/onBlur |
| `src/hooks/useKeyboardSafeViewport.ts` | **(standalone 전용)** preventScroll 포커스 + html height 축소 + 스크롤 위치 보존 |
| `src/hooks/useKeepParentScrollPosition.ts` | **(embed 전용)** 포커스/블러 시 ParentPage 스크롤 고정·복원 |
| `src/hooks/useIsKeyboardOpen.ts` | visualViewport resize 기반 키보드 열림/닫힘 감지 |
| `src/hooks/useViewportMetrics.ts` | 실시간 뷰포트/스크롤 지표 수집 (리서치용) |
| `src/store/keyboardStore.ts` | `isKeyboardOpen` |
| `src/store/parentScrollStore.ts` | 포커스 시점의 ParentPage scrollY |

삭제된 파일: `useCollectAddressBarInnerHeights.ts`, `useAdjustScrollTop.ts`,
`addressBarInnerHeightStore.ts`, `initialInnerHeightStore.ts` (14번 참고)
