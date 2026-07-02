import { anyOf, cond } from '../src/cond.ts'

/* -------------------------------------------------------------------------- */
/*  Type-level tests for the `cond` guard chain. Not run by vitest; the         */
/*  `@ts-expect-error` negatives are the regression surface.                   */
/* -------------------------------------------------------------------------- */

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string; code: number }
  | { status: 'success'; data: number[] }

declare const state: State

/* --- positive: a pattern arm narrows its render argument ------------------ */

export const narrowed = cond(state)
  .when({ status: 'error' }, (s) => s.message)
  .when({ status: 'success' }, (s) => String(s.data.length))
  .otherwise((s) => s.status)

/* --- positive: R is the union of every arm's return type ------------------ */

export const asUnion: number | string = cond(state)
  .when({ status: 'error' }, () => 1)
  .otherwise(() => 'x')

/* --- positive: a type-guard predicate narrows to its `is` type ------------- */

const isError = (s: State): s is Extract<State, { status: 'error' }> => s.status === 'error'

export const guarded = cond(state)
  .when(isError, (s) => s.message)
  .otherwise(() => 'other')

/* --- negative: an arm cannot read fields outside its narrowed member ------- */

export const wrongField = cond(state)
  // @ts-expect-error 'data' does not exist on the 'error' member
  .when({ status: 'error' }, (s) => s.data)
  .otherwise(() => null)

/* --- negative: a pattern must be shaped like the union ---------------------- */

export const badPattern = cond(state)
  // @ts-expect-error 'idle' is not a valid discriminant value
  .when({ status: 'idle' }, () => 'idle')
  .otherwise(() => null)

/* --- negative: run() has no fallback, so the result may be undefined -------- */

// @ts-expect-error run() can return undefined when nothing matches
export const mustHandleUndefined: string = cond(state)
  .when({ status: 'error' }, (s) => s.message)
  .run()

/* --- positive: anyOf narrows to the union of the matched members ----------- */

export const orNarrowed = cond(state)
  .when(anyOf({ status: 'loading' }, { status: 'error' }), (s) => s.status)
  .otherwise(() => 'other')

/* --- negative: an anyOf arm only sees fields common to the whole union ------ */

export const orWrongField = cond(state)
  .when(
    anyOf({ status: 'loading' }, { status: 'error' }),
    (s) =>
      // @ts-expect-error 'message' is absent on the 'loading' member of the union
      s.message,
  )
  .otherwise(() => null)

/* --- negative: anyOf alternatives must still be valid patterns ------------- */

export const orBadPattern = cond(state)
  // @ts-expect-error 'idle' is not a valid discriminant value
  .when(anyOf({ status: 'error' }, { status: 'idle' }), () => 'x')
  .otherwise(() => null)
