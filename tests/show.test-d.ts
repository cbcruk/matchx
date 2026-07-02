import { show } from '../src/show.ts'

/* -------------------------------------------------------------------------- */
/*  Type-level tests for `show`. The `@ts-expect-error` negatives are the       */
/*  regression surface.                                                        */
/* -------------------------------------------------------------------------- */

declare const user: { name: string } | null | undefined

/* --- positive: `then` receives the value with null/undefined removed ------- */

export const narrowed = show(
  user,
  (u) => u.name,
  () => 'guest',
)

/* --- positive: with an otherwise, the result is non-nullable --------------- */

export const withFallback: string = show(
  user,
  (u) => u.name,
  () => 'guest',
)

/* --- negative: without otherwise the result may be null -------------------- */

// @ts-expect-error result is `string | null` when otherwise is omitted
export const mustHandleNull: string = show(user, (u) => u.name)

/* --- negative: inside `then` the value has null/undefined removed ----------- */

export const argIsNonNull = show(user, (u) => {
  // @ts-expect-error 'u' is narrowed, so it is not assignable to a nullable-only target
  const nn: null | undefined = u
  return nn
})
