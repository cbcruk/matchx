import { renderMatch } from '../src/match.ts'

/* -------------------------------------------------------------------------- */
/*  Type-level tests. Not run by vitest (no `.test.` suffix); they are the     */
/*  real regression surface — this library's behaviour IS its types, so the    */
/*  negatives below (`@ts-expect-error`) must keep erroring.                   */
/* -------------------------------------------------------------------------- */

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: number[] }

declare const state: State

/* --- positive: arms are narrowed to the matched member -------------------- */

export const narrowed = renderMatch(state, 'status').arms({
  loading: () => 'loading',
  error: (s) => s.message,
  success: (s) => String(s.data.length),
})

/* --- positive: R is generic, not pinned to ReactNode ---------------------- */

export const asNumber: number = renderMatch(state, 'status').arms({
  loading: () => 0,
  error: () => 1,
  success: (s) => s.data.length,
})

/* --- negative: a missing arm is a compile error --------------------------- */

export const missingArm =
  // @ts-expect-error 'success' arm is missing → not exhaustive
  renderMatch(state, 'status').arms({
    loading: () => 'loading',
    error: (s) => s.message,
  })

/* --- negative: arms cannot read fields outside their narrowed member ------- */

export const wrongField = renderMatch(state, 'status').arms({
  loading: () => 'loading',
  // @ts-expect-error 'data' does not exist on the 'error' member
  error: (s) => String(s.data),
  success: (s) => String(s.data.length),
})

/* --- negative: unknown discriminant key is rejected ----------------------- */

export const extraArm = renderMatch(state, 'status').arms({
  loading: () => 'loading',
  error: (s) => s.message,
  success: (s) => String(s.data.length),
  // @ts-expect-error 'idle' is not a member of the union
  idle: () => 'idle',
})

/* --- negative: discriminant key must exist on the value ------------------- */

// @ts-expect-error 'kind' is not a key of State
export const badKey = renderMatch(state, 'kind')

/* --- positive: partial pairs a subset of arms with a fallback ------------- */

export const partialOut = renderMatch(state, 'status').partial(
  { loading: () => 'spin' },
  (s) => s.status,
)

/* --- negative: partial demands the fallback ------------------------------- */

export const partialNoFallback =
  // @ts-expect-error fallback argument is required
  renderMatch(state, 'status').partial({ loading: () => 'spin' })
