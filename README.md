# matchx

> Compile-time **exhaustive**, IIFE-free conditional rendering for JSX.
> The interface is **borrowed from [neverthrow](https://github.com/supermacro/neverthrow)'s `.match` — not bundled**.

## The problem

Every example below branches on this union:

```ts
type State =
  | { status: 'loading' }
  | { status: 'error'; message: string; code: number }
  | { status: 'success'; data: number[] }
```

JSX `{}` only takes an **expression**. So branching logic ends up in an IIFE:

```tsx
<div>
  {(() => {
    if (s.status === 'loading') return <Spinner />
    if (s.status === 'error') return <Error msg={s.message} />
    return <Content data={s.data} />
  })()}
</div>
```

Add a new member to the union and this branch **silently passes** — there is no
exhaustiveness check. Nested ternaries narrow but read terribly.

## The fix

Wrap the value, consume it in a terminal `.arms` with a **closed arm object**.
Miss a branch and it's a **compile error**; each arm is **narrowed**; the whole
thing is an expression, so it drops straight into the JSX slot.

```tsx
import { renderMatch } from 'matchx'

{
  renderMatch(state, 'status').arms({
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

## Naming

Every rendering primitive is prefixed **`render*`**. That is deliberate: the
obvious short names are all taken by libraries you may well be using in the same
file — `match` by [ts-pattern](https://github.com/gvergnaud/ts-pattern), `cond`
and `each` by lodash/ramda, `anyOf` by JSON Schema tooling. Since this README
actively recommends reaching for ts-pattern when you need real pattern matching,
colliding with it would be self-defeating:

```tsx
import { renderMatch, renderShow, renderEach, renderCond } from 'matchx'
import { match } from 'ts-pattern' // no clash
```

The prefix also names the domain — these are **rendering** primitives, not a
general pattern-matching kit — and makes the family discoverable from one
autocomplete on `render`. Two exports stay unprefixed on purpose: `anyOf` is a
pattern combinator and `iife` is an escape hatch; neither renders anything.

## Install

```bash
pnpm add matchx
# react >= 18 is a peer dependency
```

## API

### `renderMatch(value, on).arms(arms)`

The core. `on` is the discriminant key. `arms` is closed and exhaustive.
`R` is inferred from the arms and defaults to `ReactNode`, so you can also return
plain values:

```ts
const label = renderMatch(state, 'status').arms({
  loading: () => 'Loading…',
  error: (s) => s.message,
  success: (s) => `${s.data.length} items`,
}) // => string
```

### `renderMatch(value, on).partial(arms, fallback)`

Escape hatch when you only care about a few states. Drops exhaustiveness on
purpose, so it demands an explicit `fallback` (cf. neverthrow's `unwrapOr`):

```tsx
{
  renderMatch(state, 'status').partial({ error: (s) => <Error msg={s.message} /> }, () => (
    <Spinner />
  ))
}
```

### `renderShow(when).arms({ some, none })` — presence/absence

The two-case branch. Solid's `<Show>` supplied the idea; the **arm vocabulary is
borrowed from Option** — `some` / `none` — because presence is exactly what it
branches on. `some` receives the value with `null | undefined` removed
(`NonNullable`), so the everyday `T | null` guard narrows for free:

```tsx
{
  renderShow(user).arms({
    some: (u) => <Profile user={u} />, // u: NonNullable — no null/undefined
    none: () => <Guest />,
  })
}
```

- **Both arms are required.** An optional has exactly two cases, so there is no
  silent fall-through — omit one and it's a compile error. Write
  `none: () => null` when absence should render nothing.
- The arms may return different types; the result is their union.
- `false` / `0` / `''` take the `none` arm at runtime, but only `null` and
  `undefined` are removed from the value's type.

No Option type comes with the vocabulary — there are no `Some`/`None`
constructors, no `.map`, no `.andThen`. Borrowed, not bundled.

### `renderEach(items).arms({ each, empty })` — iterable list

Solid's `<For>` as a plain expression. Over a bare `.map` it adds two things: it
takes **any `Iterable`** (Map, Set, a generator — no spreading), and it makes the
empty case an **explicit arm** rather than something you remember to add. It does
**not** manage keys — `each` must return keyed elements, exactly as `.map` does:

```tsx
{
  renderEach(users).arms({
    each: (u) => <Row key={u.id} user={u} />,
    empty: () => <Empty />,
  })
}

{
  // byId: Map<Id, User>
  renderEach(byId).arms({
    each: ([id, u]) => <Row key={id} user={u} />,
    empty: () => null,
  })
}
```

Both arms are required, mirroring `renderShow`. The `each` return type flows
through, so it doubles as a typed map:

```ts
renderEach([1, 2]).arms({ each: (n) => n * 2, empty: () => null }) // => number[] | null
```

Because `renderEach` takes any `Iterable`, it's the **render terminal for native
[Iterator Helpers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator)** —
do the lazy `map` / `filter` / `take` with the platform, then let `renderEach`
materialize the result. `renderEach` deliberately does **not** reimplement them.
(Typing the chain needs `"lib": ["esnext"]` — or ES2025 — plus a runtime with
Iterator Helpers, e.g. Node 22+. `renderEach` itself only requires `Iterable`.)

```tsx
{
  renderEach(
    users
      .values()
      .filter((u) => u.active)
      .take(10),
  ).arms({
    each: (u) => <Row key={u.id} user={u} />,
    empty: () => <Empty />,
  })
}
```

### `renderCond(value).when(…).otherwise(…)` — guard chain

For branches that depend on more than a single discriminant (guards, deep
patterns). This is **non-exhaustive by design** — the flexible counterpart to
`renderMatch`. Like `renderMatch`, it's a plain expression (no JSX element), so it drops
straight into a `{}` slot:

```tsx
import { renderCond } from 'matchx'

{
  renderCond(state)
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
- `when(anyOf(p1, p2, …), render)` — an **or-pattern** (Rust's `P1 | P2`): matches
  if any alternative does, and narrows to the **union** of the members they pick.
- Terminals: `otherwise(render)` always produces a result; `run()` returns the
  match or `undefined`; `exhaustive()` throws at runtime if nothing matched.

How a pattern matches, precisely — the rules exist so that no pattern silently
becomes a match-all:

| Pattern                             | Matches                                                      |
| ----------------------------------- | ------------------------------------------------------------ |
| primitive                           | `Object.is` equality (`undefined` matches only `undefined`)  |
| `{}`-style object                   | **deep-partial** — only the keys you name are checked        |
| array                               | **exact length**, element-wise (so `[]` means "empty array") |
| `Date`                              | same instant                                                 |
| `Map`/`Set`/`RegExp`/class instance | reference identity only (use a guard for more)               |

```tsx
{
  renderCond(state)
    .when(anyOf({ status: 'loading' }, { status: 'error' }), (s) => <Busy state={s} />)
    //     s: the 'loading' | 'error' members — one arm, no duplicated render
    .otherwise((s) => <Content state={s} />)
}
```

### `iife(body)` — the thing we came to kill 🥚

matchx opens by mocking the inline `(() => { … })()` in a JSX slot. So of course
it ships one — named. No exhaustiveness, no narrowing; it's literally `body()`.
It just reads better than the anonymous version and says what it is, for the rare
slot where you genuinely want procedural code and none of the guarantees:

```tsx
{
  iife(() => {
    const now = Date.now()
    return <time dateTime={String(now)}>{now}</time>
  })
}
```

If your branches are a union, you wanted `renderMatch` / `renderCond`. You know this.

## Borrowed, not bundled

From neverthrow's `.match` we kept the **shape**, not the code:

| Kept                                                                         | Dropped                                        |
| ---------------------------------------------------------------------------- | ---------------------------------------------- |
| value wrapped → terminal `.arms` consumes it (an expression, no JSX element) | `ok`/`err` naming and error-handling semantics |
| closed arm object → exhaustiveness for free                                  | the 2-arm restriction (generalized to N arms)  |
| all arms share one return type                                               | every runtime dependency                       |

The core has **zero runtime dependencies**; `react` is only a peer.

## Development

```bash
vp install            # install dependencies
vp test               # runtime tests (tests/*.test.*)
vp check              # format, lint, type-check (this is where the type tests run)
pnpm run check:docs   # compile the examples in this file and in the JSDoc
vp pack               # build (ESM + .d.ts)
```

`tests/*.test-d.ts` hold the type-level tests — the negative `@ts-expect-error`
cases are the real regression line, since here the **types are the feature**.

Every example above is compiled against the real API in CI, so the docs cannot
drift away from it. They all branch on one `State` union and share a set of
placeholder components; both are declared in `scripts/check-docs.mjs`, which is
also where you go if a new example needs a name that does not exist yet. Mark a
fence `skip-check` to exempt it.

## Design log

[`src/DESIGN.md`](src/DESIGN.md) records how this API arrived at its current
shape — including the alternatives that were rejected and the decisions that were
later reversed, with the reasoning kept intact. It is a decision record, not an
API reference; this README is the reference.
