# DESIGN.md — JSX exhaustive match (가칭: `matchx`)

> JSX 표현식 위치에서 IIFE 없이, 컴파일 타임 exhaustive가 보장되는 조건부 렌더링.

## 이 문서를 읽는 법

**이것은 설계 로그(decision record)이지 API 레퍼런스가 아니다.** 각 절은 그 결정을
내리던 시점의 기록이고, 이후 뒤집힌 것도 지우지 않고 남긴다 — 왜 지금 모양이 되었는지,
그리고 어떤 대안을 왜 버렸는지가 이 문서의 값어치이기 때문이다.

- **현재 API가 궁금하면 README를 보라.** 여기 실린 코드는 대부분 과거 시점의 것이다.
- 헤딩의 "확정"은 **그 시점 기준**이다. 뒤에서 뒤집힌 것은 해당 절에 대체 표시를 달았다.
- 뒤집힌 결정은 `[정정]`·`[확정]` 표기와 함께 **번복 이유**를 남긴다. 같은 논의를
  두 번 하지 않기 위해서다.

시간 순으로 §1→§14이며, 뒤로 갈수록 현재에 가깝다.

---

## 1. 문제

JSX `{}` 안에는 **expression만** 들어간다. 그래서 분기가 복잡해지면:

```tsx
{
  ;(() => {
    // IIFE — 절차적, exhaustive 보장 없음
    if (s.status === 'loading') return <Spinner />
    if (s.status === 'error') return <Error msg={s.message} />
    return <Content data={s.data} />
  })()
}
```

- 새 상태를 union에 추가해도 위 분기는 **조용히 통과**한다 (non-exhaustive).
- 중첩 삼항은 narrowing은 되지만 가독성이 무너진다.

목표: union의 한 갈래를 빠뜨리면 **컴파일 에러**가 나고, 각 갈래에서 타입이 **narrowing**되며, JSX 표현식 자리에 그대로 들어가는 도구.

---

## 2. 설계 탐색 — 세 접근의 스펙트럼

> **[당시 기록]** 아래 표의 `match(v,on).match(arms)`는 현재 이름이 아니다.
> → §13(`render*` 개명), §14(`.arms` 통일).

| 접근                          | 형태                   | 구조       | exhaustive | 유연성                     | 상태                                  |
| ----------------------------- | ---------------------- | ---------- | :--------: | -------------------------- | ------------------------------------- |
| `<When>` 형제                 | JSX element            | open       |     ✗      | 높음 (guard, deep pattern) | 보조 후보                             |
| `<Match cases>`               | JSX element            | closed     |     ✓      | discriminant 한정          | 폐기 (element라 IIFE 자리 대체 못 함) |
| **`match(v,on).match(arms)`** | **값 래퍼 + terminal** | **closed** |   **✓**    | **discriminant 한정**      | **✅ 코어로 채택**                    |

**채택 근거**: neverthrow `.match`의 인터페이스를 빌린 형태. 값을 감싸 terminal에서 소비하므로 JSX **표현식**이고, IIFE 자리에 1:1로 들어간다. 닫힌 arm 객체라 exhaustive가 공짜.

> `result-view.tsx`(neverthrow를 실제 `import`해 `.match` 호출) 방향은 **폐기**. 우리가 원한 건 구현체 의존이 아니라 **인터페이스 차용**이었다.

---

## 3. 확정된 코어 API

> **[당시 기록 — 대체됨]** "확정"은 이 절을 쓰던 시점 기준이다. 시그니처와 이름은
> 이후 바뀌었다: `match` → `renderMatch`(§13), 터미널 `.match` → `.arms`(§14).
> 형태(값 래퍼 + terminal, 닫힌 arm 객체 = exhaustive)는 그대로 유지된다.

출발 코드: `match-arm.tsx` (이미 `tsc strict` 통과, 아래 검증 항목 전부 확인됨)

```ts
match<T, D extends keyof T>(value: T, on: D): {
  match<R = ReactNode>(arms: { [V in T[D]]: (value: Extract<T, Record<D,V>>) => R }): R;
  partial<R = ReactNode>(arms: Partial<...>, fallback: (value: T) => R): R;
}
```

```tsx
// IIFE 자리에 그대로
{
  match(state, 'status').match({
    loading: () => <Spinner />,
    error: (s) => <Error msg={s.message} />, // s narrowed
    success: (s) => <Content data={s.data} />, // s narrowed
  })
}
```

검증 완료 (전부 `@ts-expect-error`로 negative까지):

- arm 누락 → `Property '...' is missing` 컴파일 에러
- 각 arm 인자 narrowing
- 모든 arm 동일 반환 타입 강제 (neverthrow 제약 차용)
- `R` 제네릭 → ReactNode 아닌 값(string 등)도 반환 가능
- `.partial(arms, fallback)` → exhaustive 포기 시 fallback 강제

---

## 4. 차용 원칙 (neverthrow `.match`에서)

**빌린 것**

1. 값을 감싸 terminal에서 소비하는 fluent 형태
2. 닫힌 arm 객체 = exhaustiveness
3. 모든 arm 동일 반환 타입 → JSX의 "모든 갈래는 ReactNode로 수렴"과 구조적으로 일치

**버린 것**

1. `ok`/`err` 명명과 "에러 처리" 의미론 → 렌더링 도메인 언어(discriminant 키)로 대체
2. 2-arm 고정 → N-arm 일반화
3. 런타임 의존 전부

---

## 5. 열린 결정사항 (구현 전 확정 필요)

> **[당시 기록 — 일부 해소]** #3은 §8.4에서 `renderCond`로, #5는 §13에서 확정됐다.
> #1(discriminant 자동 추론)·#2(non-terminal 확장)·#4(`partial` 유지)는 **아직 열려 있다**
> — 셋 다 현재 동작으로 굳어졌을 뿐 명시적으로 닫은 적은 없다.

1. **discriminant 자동 추론** — 현재 `match(state, "status")`로 키 명시. 단일 리터럴 키 union이면 추론 가능하나, 키가 여럿/중첩이면 불안정 → 명시 유지가 정직. 추론 오버로드를 _추가로_ 제공할지.
2. **non-terminal 확장** — `.map`(성공 가지 변환)·`.andThen`까지 빌릴지, 아니면 "변환은 JSX 밖, 렌더링만 안"을 지키며 **terminal-only 유지**할지. (직전 논의의 미결 지점)
3. **`<When>` 형제 패턴 동거 여부** — guard·deep pattern 같은 유연한 비-exhaustive 매칭이 필요한 경우용 보조 export로 둘지, 코어를 `match` 하나로 좁힐지.
4. **`partial` 유지** — 편의 vs API 표면 최소화.
5. **네이밍** — `match` / `matchOn` / 패키지명.

---

## 6. 제안 프로젝트 구조

> **[당시 제안 — 실제와 다름]** `when.tsx`는 제거됐고(§8.4), 빌드는 `tsup`이 아니라
> vite-plus(`vp pack`)이며, 테스트는 `test/`가 아니라 `tests/`다. 현재 구조는 저장소를
> 보라. 마지막 항목(**타입 테스트를 CI 필수로**)만은 그대로 지켜지고 있다(§10.1).

```
src/
  index.ts          # public exports
  match.ts          # 코어 (match-arm.tsx 기반)
  when.tsx          # (결정 #3) 선택적 형제 패턴
  types.ts          # Discriminant, Arms 등 타입 유틸
test/
  match.test-d.ts   # 타입 테스트 (tsd 또는 expect-type)
  match.test.tsx    # 런타임 테스트 (vitest + @testing-library/react)
```

- 빌드: `tsup` (ESM/CJS dual + `.d.ts`)
- `react`는 `peerDependencies` (`>=18`), 코어는 런타임 의존 0
- 타입 테스트를 CI 필수로 — 이 라이브러리는 **타입이 곧 기능**이라 negative 케이스(`@ts-expect-error`/`expectError`)가 핵심 회귀 방어선

---

## 7. Claude Code 시작 순서

> **[당시 계획 — 완료됨]** 이 체크리스트는 전부 소화됐다. 이후 진행은 §8.5(단계별
> 실행)와 §10(배포 준비)으로 이어진다.

1. scaffold (`tsup` + `vitest` + `tsd`/`expect-type`, peerDeps react)
2. `match-arm.tsx` → `src/match.ts`로 이관, `src/index.ts`에서 export
3. 결정 #1·#2·#3 확정 → 그에 맞게 API 표면 고정
4. 타입 테스트 이관: 지금까지의 `@ts-expect-error` 케이스를 `test/*.test-d.ts`로
5. 런타임 테스트: arm 분기·`partial` fallback 동작
6. README (motivation = IIFE 문제, "borrowed not bundled" 차용 원칙 명시)

---

## 8. 확장 로드맵 — 함수형 control-flow 패밀리

> Solid의 `<Show>`/`<For>`/`<Switch>`에서 **아이디어**를 빌리되, JSX element가
> 아니라 **표현식 함수**로 구현한다. matchx의 정체성은 "element가 아니라 slot에
> 그대로 들어가는 expression"이므로, 확장도 같은 형태를 지킨다.

### 8.1 방향 결정

- **확장한다.** 코어 `match` 하나로 좁히는 대신, JSX 제어흐름 전반을 **표현식
  함수**로 커버하는 패밀리로 넓힌다.
- **형태 = 함수.** Solid는 JSX element(`<Show>`)지만, 우리는 `match()`처럼
  값→ReactNode를 돌려주는 **함수**로 옮긴다. `{}` slot에 그대로 들어가고,
  IIFE·wrapper element가 필요 없다.
- 이 결정으로 기존 JSX 형제(`createMatch`/`<Match>/<When>`)는 **이질적 존재가
  된다** → §8.4에서 함수형으로 이전할지 결정.

### 8.2 채택 원칙 (sugar 방지선)

> **모든 primitive는 "타입 스토리"(narrowing 또는 exhaustiveness)로 자기 자리를
> 벌어야 한다. 단순 문법 설탕이면 탈락.**

이 선을 넘지 못하면 "또 하나의 jsx-control-statements"가 된다. Solid의 control
flow는 대부분 **반응성/성능** 때문에 존재하지만, React에는 그 이유가 없으므로
우리에겐 **타입**만이 존재 이유다.

### 8.3 primitive 후보 (원칙 통과 여부)

> **[당시 후보 검토 — 시그니처는 대체됨]** 아래 표와 코드는 착수 시점의 *제안*이다.
> 실제 결과는 §8.4(`show`의 falsy 범위 정정)·§8.5(`each`의 `R` 복원)·§14(둘 다
> `.arms({…})`로 전환)를 보라.

| primitive       | 타입 스토리                                                         | 판정                                |
| --------------- | ------------------------------------------------------------------- | ----------------------------------- |
| `match` (코어)  | exhaustiveness (arm 누락 → 컴파일 에러)                             | ✅ 유지 (왕관 보석)                 |
| **`show`**      | `when: T` → then 콜백이 `Exclude<T, null\|undefined\|false>` narrow | ✅ **1순위**                        |
| **`each`**      | iterable 지원 + typed 빈-`fallback` (item 타입은 자명, 값은 약함)   | ⚠️ **2순위** (ergonomic)            |
| 가드 체인(§8.4) | predicate `is` type guard / pattern narrow, non-exhaustive          | ⚠️ **3순위** (ts-pattern 중복 검토) |
| `iff`/`unless`  | 없음 (boolean sugar, `show`와 중복)                                 | ❌ 탈락                             |
| `Iterator` 전용 | `each`가 `Iterable` 받으면 흡수됨                                   | → `each`로 통합                     |

제안 시그니처:

```ts
// 8.3.1 show — truthy-narrowing 조건부 (1순위)
//   when이 falsy면 otherwise(없으면 null), truthy면 좁혀서 then에 전달.
export function show<T, R = ReactNode>(
  when: T,
  then: (value: Exclude<T, null | undefined | false>) => R,
  otherwise?: () => R,
): R

// {show(user, (u) => <Profile user={u} />, () => <Guest />)}
//   u: NonNullable — null/undefined/false 걷어냄 (Solid <Show>의 핵심 이득)

// 8.3.2 each — iterable 리스트 + 빈 fallback (2순위)
//   .map 대비 이득: (a) Map/Set/generator 등 임의 iterable, (b) 빈 상태 fallback 내장.
//   key는 마법으로 해결하지 않는다 — render가 keyed element를 반환해야 함(.map과 동일).
export function each<T, R = ReactNode>(
  items: Iterable<T>,
  render: (item: T, index: number) => R,
  fallback?: () => R,
): ReactNode
```

### 8.4 열린 결정 (구현 전 확정)

1. ~~**`createMatch`/`<When>` 처리**~~ **[확정]** → 함수형 가드 체인 `cond`로
   **이전 완료**. `src/when.tsx`(JSX 형제)를 제거하고 `src/cond.ts`로 대체:
   `cond(v).when(pattern|guard, render).otherwise(render)`. 근거 — `match`와 동일한
   "expression, no JSX element" 형태로 통일되어 정체성이 정합해짐. `<When>`이 쓰던
   pattern narrowing·guard·runtime-exhaustive를 모두 보존:
   - `when(pattern, render)` / `when(pattern, guard, render)` / `when(predicate, render)`
   - 터미널 `otherwise` / `run()`(→ `undefined`) / `exhaustive()`(→ throw)
   - first-match-wins, 매칭된 arm의 render만 실행
     > **ts-pattern 대비 [실측 정정]** — 이전에 적었던 "차별점 = zero-dep"은 **오류**다.
     > ts-pattern 5.9.0도 런타임 의존이 0이다. 실측(esbuild bundle+minify+gzip):
     > matchx 전체 630 B vs ts-pattern `match`+`P` 2,685 B, 매처만 비교하면 493 B vs
     > 1,792 B. 그리고 결정적으로 ts-pattern의 `.exhaustive()`는 **컴파일타임**이며
     > 누락 멤버를 `NonExhaustiveError<...>`로 지목한다 — `cond.exhaustive()`는 런타임뿐.
     > `P.select`/`P.not`/`P.optional` 등 패턴 어휘도 훨씬 넓다. 즉 **`cond`는 매처로서
     > ts-pattern에 밀린다**(크기 제외). `cond`의 존재 근거는 "렌더 안의 단순 가드 분기를
     > 두 번째 의존 없이 493 B로 덮는 것"이며, 본격 패턴 매칭이 필요하면 ts-pattern을
     > 쓰라고 안내해야 한다. matchx의 정체성은 매처가 아니라 `match`(레코드 arms,
     > 컴파일타임 exhaustive, 순서 독립·섀도잉 불가) + `show`/`each` 렌더 패밀리에 있다.
2. ~~**`show` truthy 범위**~~ **[확정]** → **`null|undefined`만 걷는다**(`NonNullable<T>`).
   당초 `false`까지 걷으려 `Exclude<T, null|undefined|false>`(가칭 `Truthy<T>`)를 썼으나,
   그 커스텀 conditional을 파라미터 위치에 두면 `otherwise` 없는 2-arg 호출에서 `T`가
   `never`로 추론되는 문제가 있었다. 빌트인 `NonNullable<T>`는 추론이 안정적이라 이걸
   채택. `false`/`0`/`''`는 **런타임에선 falsy로 처리**(→ `otherwise`)되지만 타입에선
   유지된다. `Truthy<T>` 타입은 제거.
3. **네이밍 충돌** — `match()` 함수와 Solid `<Match>`가 헷갈림. 가드 체인을 만들면
   `<Match>` 어휘를 피하고 `cond`/`when` 계열로 간다. → §8.4 #1에서 `cond`로 확정하며 해소.
4. **패밀리 export 경로** — 전부 top-level export vs `matchx/flow` 하위 경로 분리.
   → 현재 `match`/`cond`/`show` 모두 top-level. primitive가 더 늘면 재검토.

### 8.5 단계별 실행 순서

1. ~~**Phase 1 — `show`**~~ **[완료]** `src/show.ts`(overload로 `otherwise` 유무별
   반환 타입 구분) + `show.test.ts`/`show.test-d.ts`. `index.ts` export, README 갱신.
2. ~~**Phase 2 — `each`**~~ **[완료]** `src/each.ts`(임의 `Iterable<T>` + 빈-`fallback`,
   반환은 `ReactNode`) + `each.test.ts`/`each.test-d.ts`(Array/Map/Set/generator).
   key는 마법 처리 없음(render가 keyed element 반환).
   > **`R` 제네릭 [정정]**: 한때 "리스트는 본질적으로 노드를 내므로 `R` 불필요"라며
   > `ReactNode`로 고정했으나 **되돌렸다**. `match`/`cond`/`show`/`iife`가 모두 `R`을
   > 흘려보내는데 `each`만 고정하는 건 패밀리 내 비일관이고, `each`를 타입 있는 map으로
   > 쓰지 못하게 막았다. 현재 `each<T, R, F>` + 오버로드로 `fallback` 유무에 따라
   > `R[] | F` / `R[] | null`을 구분한다(`show`와 동일한 구조).
   > **Iterator Helpers 관련 [확정]**: `.map/.filter/.take/…`나 `Iterator.from()`을
   > 재구현하지 않는다. 이건 네이티브(Node 22+/모던 브라우저)이고 lazy 변환 담당.
   > `each`는 `Iterable<T>`를 받으므로 helper 체인 결과(`IteratorObject`)를 그대로
   > 소비하는 **렌더 터미널**이다 — 변환은 플랫폼, materialize는 `each`. 우리만의
   > 이터레이터 API를 만드는 건 §8.2(타입 스토리 없는 sugar) 위반이라 배제.
3. ~~**Phase 3 — §8.4 #1 결정**~~ **[완료]** `<When>` → `cond` 가드 체인 이전 (§8.4 #1).
4. 전 구간 **타입 테스트 CI 필수** 유지 — 이 패밀리도 "타입이 곧 기능".

---

## 9. Rust 패턴 차용 검토 (the Rust Book ch19)

### 9.1 "패턴이 쓰이는 자리"(ch19-01) → 렌더링 매핑

| Rust 자리      | 렌더링 대응               | 상태                       |
| -------------- | ------------------------- | -------------------------- |
| match arms     | 유니온 분기               | ✅ `match`+`cond`          |
| if let / else  | 있으면/없으면·몇 갈래만   | ✅ `show`/`cond`/`partial` |
| while let      | (선언적 렌더에 루프 없음) | ❌ 도메인 밖               |
| for loops      | 컬렉션 반복 + 구조분해    | ✅ `each` + JS 구조분해    |
| let statements | 구조분해                  | ❌ JS 네이티브             |
| fn params      | 구조분해                  | ❌ JS 네이티브             |

**결론**: "자리" 관점에서 렌더링에 매핑되는 것은 모두 커버됨. 나머지는 명령형이거나
JS가 이미 하는 것 → 신규 primitive 없음.

### 9.2 "패턴 문법"(ch19-04) → §8.2 원칙으로 필터

- match guard / `..` 나머지 무시 / literal / `_` → 이미 `cond`에 존재.
- **or-pattern `P1 | P2`** → 유일한 신규 후보(유니온 narrowing = 타입 스토리 통과).
- range `1..=5`, `@` 바인딩 → 렌더링엔 니치/저가치 → 보류.

### 9.3 [확정] or-pattern = `anyOf`

`cond`에 `anyOf(...patterns)` 결합자 추가. 배열을 그대로 쓰면 array-shaped pattern과
모호하므로 **심볼 브랜딩된 박스**(`AnyOf<P>`)로 구분. `.when(anyOf(...), render)`는
매칭된 멤버들의 **유니온**으로 narrow. `.when` 오버로드는 AnyOf 케이스를 먼저 두어
평범한 pattern과 충돌 안 나게 함(평범한 pattern은 심볼 키가 없어 `AnyOf<P>`에 미할당).

### 9.4 refutability 렌즈 (설계 완결성 근거)

Rust의 irrefutable(항상 매칭) vs refutable(실패 가능) 구분으로 보면 패밀리가 완결:

- irrefutable(let·params) → **JS 네이티브 구조분해** (matchx 밖)
- refutable + exhaustive → **`match`**
- refutable + non-exhaustive → **`cond` / `show` / `partial`**

즉 "렌더링에서 필요한 refutable 매칭"은 matchx가 전부 덮는다. `cond`의 컴파일타임
exhaustive는 임의 guard 체인에선 증명 불가라 런타임 `exhaustive()`가 한계선.

---

## 10. 1.0 배포 준비

### 10.1 완료 항목

- **메타데이터** — `package.json`의 placeholder(`author/matchx`, `Author Name`)를
  `cbcruk/matchx` · `cbcruk <cbcruk@gmail.com>`로 교체. `LICENSE`(MIT) 추가.
- **CI** — `.github/workflows/ci.yml`: `pnpm run check`(format+lint+type-check,
  `*.test-d.ts` 포함) → `test` → `build`. 타입 테스트가 CI 필수 관문 = 회귀 방어선.
- **빌드 검증** — `vp pack` → `dist/index.mjs`(ESM) + `dist/index.d.mts`. `exports`는
  vite-plus(`pack.exports: true`)가 관리하며 `".": "./dist/index.mjs"` 문자열 형태.
  타입은 `.mjs` 옆 `.d.mts` **co-location**으로 nodenext/bundler 해석에서 자동 인식되므로
  별도 `types` 조건 불필요(수동으로 넣으면 `vp config`가 덮어씀).

### 10.2 남은 수동 단계 (npm 인증 필요 → 사용자 몫)

1. `pnpm run build`로 `dist` 생성 확인 (publish 시 `prepublishOnly`가 자동 수행).
2. `bumpp`로 버전 확정 (`0.0.0` → `1.0.0`), 태그/커밋 생성.
3. `npm publish` (`publishConfig.access: public`). npm 토큰은 로컬/CI 시크릿으로.

---

## 11. 이스터에그 — `iife` 🥚

matchx의 존재 이유(§1)는 JSX slot의 `(() => { … })()`를 없애는 것. 그래서 바로 그
IIFE를 **이름 붙여** 다시 싣는다 — 오리진 스토리에 대한 윙크. `iife(body) = body()`.
타입 스토리 없음(§8.2 원칙에서 유일하게 면제되는 항목), narrowing·exhaustive 없음.
정직한 escape hatch이자 농담. "유니온이면 `match`/`cond`를 쓰라"는 안내를 문서에 못박음.

---

## 12. 코드리뷰 반영 (JSX 제어흐름 툴킷 관점)

### 12.1 `cond` 패턴 의미론 — "조용한 match-all" 제거

`matches()`가 세 경로에서 **모든 값에 매칭**되어 뒤 arm을 전부 죽이는 버그가 있었다.
셋 다 캐스팅 없이 공개 타입 API로 도달 가능했고, 증상이 예외가 아니라 **잘못된 렌더**라
가장 위험한 부류였다. 기존 테스트가 평평한 문자열 discriminant만 덮어 잡히지 않았다.

| 대상                        | 이전 (버그)                                                   | 현재 (확정)                                                                 |
| --------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `when(undefined,…)`         | `pattern === undefined`를 "패턴 없음" 센티널로 씀 → 전부 매칭 | `hasPattern` 플래그 분리, `undefined`는 정상 패턴                           |
| 배열 패턴                   | **prefix** 매칭 → `[]`가 모든 배열에 매칭                     | **exact length** → `[]` = "빈 배열"                                         |
| `Date`/`Map`/`Set`/`RegExp` | `Object.entries`가 `[]` → 공허참 → 모든 객체에 매칭           | 구조 매칭은 **plain object 한정**; `Date`는 instant 비교, 나머지는 identity |

의사결정 근거: 렌더링 도메인에서 `[]`("빈 리스트면 fallback")와 날짜 비교는 흔한
반면, prefix 매칭·클래스 인스턴스의 구조 매칭을 원하는 경우는 드물다. 애매하면
**매칭 안 함**이 안전하다 — 잘못 렌더하느니 다음 arm으로 넘어가는 편이 낫다.

### 12.2 진단 메시지

- `cond.exhaustive()`가 `JSON.stringify`로 값을 찍다가 순환참조·BigInt에서 **자신이
  throw**해 `[matchx] non-exhaustive`가 무관한 `TypeError`로 가려졌다 → `describe()`
  (`src/internal.ts`)로 안전 직렬화.
- `match`의 arm 조회가 프로토타입 체인에 닿아 discriminant가 `'toString'`이면
  `Object.prototype.toString`이 호출되고 `partial`의 fallback도 건너뛰었다 →
  `hasOwnProperty` + `typeof === 'function'` 검사. 런타임 경계를 넘어온 미지의
  discriminant는 이제 `[matchx] no arm for discriminant …`로 실패한다.

### 12.3 패밀리 일관성

- `show`가 두 갈래를 하나의 `R`로 강제해 `show(count, n => n*2, () => 'none')`이
  컴파일되지 않았다 → `R1`/`R2` 분리(`cond`의 `R | R2` 누적과 정합).
- `each`의 `R` 제네릭 복원(§8.5 참조).

### 12.4 패키징 — node10 소비자

`exports`만 있고 top-level `main`/`types`가 없어 `moduleResolution: "node"`(TS 5.x)
소비자에게 `TS2307` + implicit any가 발생, **라이브러리의 존재 이유인 타입이 통째로
소실**됐다. `main`/`types` 추가로 해결(실측 검증: 추가 전 실패 → 추가 후 통과).
`vp config`가 덮어쓰지 않는 것도 확인. TS 6.0부터는 `node10`이 제거되어 해당 없음.

---

## 13. 네이밍 — `render*` 접두사 [확정]

### 13.1 문제

기존 이름(`match`/`cond`/`each`/`show`)은 **차용한 라이브러리 이름을 그대로 따라간**
것이라 두 가지 대가가 있었다.

| export  | 충돌 대상                                 |
| ------- | ----------------------------------------- |
| `match` | **ts-pattern**, react-router(`matchPath`) |
| `cond`  | **lodash `_.cond`**, ramda `cond`         |
| `each`  | lodash `_.each`                           |
| `anyOf` | ajv / JSON Schema                         |

특히 `match`는 자기모순이었다 — §8.4에서 "본격 패턴 매칭이 필요하면 ts-pattern을
쓰라"고 권해놓고, 그러면 같은 파일에서 두 `match`가 충돌해 alias가 강제된다.

### 13.2 결정

렌더링 primitive에만 **`render*` 접두사**를 붙인다. 0.x 미배포이므로 구 이름은
남기지 않고 **전면 교체**(deprecated alias 없음).

| 이전                       | 현재                            |
| -------------------------- | ------------------------------- |
| `match(v, on).match(arms)` | `renderMatch(v, on).arms(arms)` |
| `match(v, on).partial(…)`  | `renderMatch(v, on).partial(…)` |
| `show(…)`                  | `renderShow(…)`                 |
| `each(…)`                  | `renderEach(…)`                 |
| `cond(v).when(…)`          | `renderCond(v).when(…)`         |
| `anyOf(…)` / `iife(…)`     | **그대로**                      |

### 13.3 근거와 예외

- **충돌 제거** — ts-pattern 병용이 우리가 권장하는 조합이므로 필수.
- **도메인 명시** — §8.4에서 확정한 "패턴 매칭 라이브러리가 아니라 JSX 제어흐름
  툴킷"이라는 정체성을 이름이 직접 말한다.
- **stutter 해소** — `match(...).match(...)`는 원래도 어색했다. 접두사를 붙이면
  `renderMatch(...).match(...)`로 더 나빠지므로 터미널을 **`.arms(...)`**로 바꿨다.
  `arms`는 이미 이 라이브러리의 도메인 용어(`Arms<T,D,R>` 타입)라 정합적이다.
- **`anyOf`/`iife` 예외** — 렌더러가 아니다. `anyOf`는 패턴 조합자, `iife`는 탈출구.
  `renderAnyOf`는 "렌더하지 않는데 render라 부르는" 거짓말이 된다.
- **타입 이름은 유지** — `Cond`/`Matchable`/`Arms`/`Pattern` 등은 동작이 아니라
  **형태를 서술하는 명사**이고, 값 공간에서 충돌하지도 않는다.

> 반대 논거도 기록해둔다: ESM에서 이름 충돌의 관용적 해법은 접두사가 아니라
> `import * as mx` / `import { match as … }` 별칭이다. 그럼에도 접두사를 택한 이유는,
> 이 라이브러리가 간결함이 아니라 **명시성**으로 승부하는 물건(그게 IIFE를 대체하는
> 이유)이고, JSX 마크업 더미 속에서 제어흐름 호출이 시각적으로 드러나는 값이 호출당
> 6자보다 크다고 봤기 때문이다.

---

## 14. arm 어휘 통일 — `Some`/`None` 차용 [확정]

### 14.1 문제 — 분기 문법이 두 개였다

`renderMatch`는 **명명된 arm 객체**인데 `renderShow`/`renderEach`는 **위치 인자
콜백**이었다. 같은 "분기해서 렌더한다"를 두 문법으로 표현하고 있었고, §4의 코어
DNA("값을 감싸 terminal에서 소비")도 코어만 따르고 있었다.

```tsx
renderMatch(state, 'status').arms({ loading: …, error: …, success: … })  // 명명
renderShow(user, (u) => …, () => …)                                       // 위치
renderEach(users, (u) => …, () => …)                                      // 위치
```

### 14.2 결정

패밀리 전체를 **`renderX(값).arms({…})`** 한 형태로 통일한다. arm 이름은 각
primitive가 실제로 분기하는 축의 어휘를 쓴다.

| primitive     | arm             | 어휘 출처                     |
| ------------- | --------------- | ----------------------------- |
| `renderMatch` | discriminant 값 | 도메인(유니온 자체)           |
| `renderShow`  | `some`/`none`   | **Option** (Rust/neverthrow)  |
| `renderEach`  | `each`/`empty`  | 컬렉션 도메인                 |
| `renderCond`  | `.when()` 체인  | 그대로(non-exhaustive라 열림) |

`some`/`none`이 `then`/`otherwise`보다 정확하다 — 이 함수가 실제로 판별하는 건
**유무(presence/absence)**이고 `NonNullable` 좁히기가 정확히 그 의미다.

### 14.3 두 arm 모두 **필수**

optional은 정확히 두 경우뿐이므로 하나를 빠뜨리면 컴파일 에러다. 이전의
"`otherwise` 생략 시 `R | null`"은 제거했다 — 없음을 렌더 안 하려면
`none: () => null`이라고 **명시**한다. `renderEach`의 `empty`도 같다.

근거: 이 라이브러리의 존재 이유가 §1의 "조용히 통과하는 분기 제거"인데,
생략 가능한 갈래는 그 기조와 어긋난다. `renderShow`/`renderEach`가 exhaustive
진영(`renderMatch`)에 서고, `renderCond`만 non-exhaustive로 남아 대비가 선명해진다.

### 14.4 "빌리되 담지 않는다"의 재확인

`Some`/`None`은 **arm 키일 뿐**이다. Option 타입도, `Some(x)`/`None` 생성자도,
`.map`/`.andThen`도 들여오지 않는다 — neverthrow에서 `.match`의 *형태*만 빌린
것과 정확히 같은 선택(§4). 부수 효과로 **export 표면이 늘지 않는다**: 객체 키라서
새 export도 이름 충돌(§13)도 없다.

### 14.5 검증

프로토타입을 먼저 타입 레벨로 실측한 뒤 구현했다: `some`이 `NonNullable`로 좁혀짐,
두 arm이 독립적으로 union(`number | string`), 갈래 누락이 컴파일 에러, 미지의 arm 키
거부 — 4개 모두 확인 후 `*.test-d.ts`에 회귀 케이스로 고정.
