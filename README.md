# matchx

> Compile-time **exhaustive**, IIFE-free conditional rendering for JSX.
> The interface is **borrowed from [neverthrow](https://github.com/supermacro/neverthrow)'s `.match` — not bundled**.

## The problem

JSX `{}` only takes an **expression**. So branching logic ends up in an IIFE:

```tsx
{
  ;(() => {
    if (s.status === 'loading') return <Spinner />
    if (s.status === 'error') return <Error msg={s.message} />
    return <Content data={s.data} />
  })()
}
```

Add a new member to the union and this branch **silently passes** — there is no
exhaustiveness check. Nested ternaries narrow but read terribly.

## The fix

Wrap the value, consume it in a terminal `.match` with a **closed arm object**.
Miss a branch and it's a **compile error**; each arm is **narrowed**; the whole
thing is an expression, so it drops straight into the JSX slot.

```tsx
import { match } from 'matchx'

{
  match(state, 'status').match({
    loading: () => <Spinner />,
    error: (s) => <Error msg={s.message} />, // s: { status: 'error'; message: string }
    success: (s) => <Content data={s.data} />, // s: { status: 'success'; data: number[] }
  })
}
```

- Omit `success` → `Property 'success' is missing` at compile time.
- Each arm argument is narrowed to its member.
- All arms must return the same type (borrowed from neverthrow) — which lines up
  exactly with JSX's "every branch resolves to a `ReactNode`".

## Install

```bash
pnpm add matchx
# react >= 18 is a peer dependency
```

## API

### `match(value, on).match(arms)`

The core. `on` is the discriminant key. `arms` is closed and exhaustive.
`R` is inferred from the arms and defaults to `ReactNode`, so you can also return
plain values:

```ts
const label = match(state, 'status').match({
  loading: () => 'Loading…',
  error: (s) => s.message,
  success: (s) => `${s.data.length} items`,
}) // => string
```

### `match(value, on).partial(arms, fallback)`

Escape hatch when you only care about a few states. Drops exhaustiveness on
purpose, so it demands an explicit `fallback` (cf. neverthrow's `unwrapOr`):

```tsx
{
  match(state, 'status').partial({ error: (s) => <Error msg={s.message} /> }, () => <Spinner />)
}
```

### `cond(value).when(…).otherwise(…)` — guard chain

For branches that depend on more than a single discriminant (guards, deep
patterns). This is **non-exhaustive by design** — the flexible counterpart to
`match`. Like `match`, it's a plain expression (no JSX element), so it drops
straight into a `{}` slot:

```tsx
import { cond } from 'matchx'

{
  cond(state)
    .when(
      { status: 'error' },
      (s) => s.code >= 500,
      (s) => <Fatal code={s.code} />,
    )
    .when({ status: 'error' }, (s) => <Error msg={s.message} />) // s: error member
    .when({ status: 'loading' }, () => <Spinner />)
    .otherwise((s) => <Content state={s} />)
}
```

- **First matching arm wins**; only its render runs.
- `when(pattern, render)` — `pattern` deep-partially matches the value and
  **narrows** the render argument.
- `when(pattern, guard, render)` — same, refined by a runtime `guard`; both must
  hold.
- `when(predicate, render)` — a `(v) => v is U` type guard narrows to `U`.
- Terminals: `otherwise(render)` always produces a result; `run()` returns the
  match or `undefined`; `exhaustive()` throws at runtime if nothing matched.

## Borrowed, not bundled

From neverthrow's `.match` we kept the **shape**, not the code:

| Kept                                                                          | Dropped                                        |
| ----------------------------------------------------------------------------- | ---------------------------------------------- |
| value wrapped → terminal `.match` consumes it (an expression, no JSX element) | `ok`/`err` naming and error-handling semantics |
| closed arm object → exhaustiveness for free                                   | the 2-arm restriction (generalized to N arms)  |
| all arms share one return type                                                | every runtime dependency                       |

The core has **zero runtime dependencies**; `react` is only a peer.

## Development

```bash
vp install   # install dependencies
vp test      # runtime tests (tests/*.test.*)
vp check     # format, lint, type-check (this is where the type tests run)
vp pack      # build (ESM + .d.ts)
```

`tests/*.test-d.ts` hold the type-level tests — the negative `@ts-expect-error`
cases are the real regression line, since here the **types are the feature**.
