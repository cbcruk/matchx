# DESIGN.md — JSX exhaustive match (가칭: `matchx`)

> JSX 표현식 위치에서 IIFE 없이, 컴파일 타임 exhaustive가 보장되는 조건부 렌더링.

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

| 접근                          | 형태                   | 구조       | exhaustive | 유연성                     | 상태                                  |
| ----------------------------- | ---------------------- | ---------- | :--------: | -------------------------- | ------------------------------------- |
| `<When>` 형제                 | JSX element            | open       |     ✗      | 높음 (guard, deep pattern) | 보조 후보                             |
| `<Match cases>`               | JSX element            | closed     |     ✓      | discriminant 한정          | 폐기 (element라 IIFE 자리 대체 못 함) |
| **`match(v,on).match(arms)`** | **값 래퍼 + terminal** | **closed** |   **✓**    | **discriminant 한정**      | **✅ 코어로 채택**                    |

**채택 근거**: neverthrow `.match`의 인터페이스를 빌린 형태. 값을 감싸 terminal에서 소비하므로 JSX **표현식**이고, IIFE 자리에 1:1로 들어간다. 닫힌 arm 객체라 exhaustive가 공짜.

> `result-view.tsx`(neverthrow를 실제 `import`해 `.match` 호출) 방향은 **폐기**. 우리가 원한 건 구현체 의존이 아니라 **인터페이스 차용**이었다.

---

## 3. 확정된 코어 API

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

1. **discriminant 자동 추론** — 현재 `match(state, "status")`로 키 명시. 단일 리터럴 키 union이면 추론 가능하나, 키가 여럿/중첩이면 불안정 → 명시 유지가 정직. 추론 오버로드를 _추가로_ 제공할지.
2. **non-terminal 확장** — `.map`(성공 가지 변환)·`.andThen`까지 빌릴지, 아니면 "변환은 JSX 밖, 렌더링만 안"을 지키며 **terminal-only 유지**할지. (직전 논의의 미결 지점)
3. **`<When>` 형제 패턴 동거 여부** — guard·deep pattern 같은 유연한 비-exhaustive 매칭이 필요한 경우용 보조 export로 둘지, 코어를 `match` 하나로 좁힐지.
4. **`partial` 유지** — 편의 vs API 표면 최소화.
5. **네이밍** — `match` / `matchOn` / 패키지명.

---

## 6. 제안 프로젝트 구조

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

1. scaffold (`tsup` + `vitest` + `tsd`/`expect-type`, peerDeps react)
2. `match-arm.tsx` → `src/match.ts`로 이관, `src/index.ts`에서 export
3. 결정 #1·#2·#3 확정 → 그에 맞게 API 표면 고정
4. 타입 테스트 이관: 지금까지의 `@ts-expect-error` 케이스를 `test/*.test-d.ts`로
5. 런타임 테스트: arm 분기·`partial` fallback 동작
6. README (motivation = IIFE 문제, "borrowed not bundled" 차용 원칙 명시)

```

```
