import { renderShow } from '../src/show.ts'

/* -------------------------------------------------------------------------- */
/*  Type-level tests for `show`. The `@ts-expect-error` negatives are the       */
/*  regression surface.                                                        */
/* -------------------------------------------------------------------------- */

declare const user: { name: string } | null | undefined

/* --- positive: `then` receives the value with null/undefined removed ------- */

export const narrowed = renderShow(
  user,
  (u) => u.name,
  () => 'guest',
)

/* --- positive: with an otherwise, the result is non-nullable --------------- */

export const withFallback: string = renderShow(
  user,
  (u) => u.name,
  () => 'guest',
)

/* --- positive: the two branches may return different types ----------------- */

declare const count: number | null

export const mixed: number | string = renderShow(
  count,
  (n) => n * 2,
  () => 'none',
)

/* --- negative: without otherwise the result may be null -------------------- */

// @ts-expect-error result is `string | null` when otherwise is omitted
export const mustHandleNull: string = renderShow(user, (u) => u.name)

/* --- negative: inside `then` the value has null/undefined removed ----------- */

export const argIsNonNull = renderShow(user, (u) => {
  // @ts-expect-error 'u' is narrowed, so it is not assignable to a nullable-only target
  const nn: null | undefined = u
  return nn
})
