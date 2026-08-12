import { renderShow } from '../src/show.ts'

/* -------------------------------------------------------------------------- */
/*  Type-level tests for `renderShow`. The `@ts-expect-error` negatives are     */
/*  the regression surface.                                                    */
/* -------------------------------------------------------------------------- */

declare const user: { name: string } | null | undefined
declare const count: number | null

/* --- positive: `some` receives the value with null/undefined removed ------- */

export const narrowed: string = renderShow(user).arms({
  some: (u) => u.name,
  none: () => 'guest',
})

/* --- positive: the two arms may return different types --------------------- */

export const mixed: number | string = renderShow(count).arms({
  some: (n) => n * 2,
  none: () => 'none',
})

/* --- negative: inside `some` the value has null/undefined removed ----------- */

export const argIsNonNull = renderShow(user).arms({
  some: (u) => {
    // @ts-expect-error 'u' is narrowed, so it is not assignable to a nullable-only target
    const nn: null | undefined = u
    return nn
  },
  none: () => null,
})

/* --- negative: both arms are required — no silent fall-through ------------- */

// @ts-expect-error 'none' is missing, so the optional is not covered
export const missingNone = renderShow(user).arms({ some: (u) => u.name })

// @ts-expect-error 'some' is missing, so the optional is not covered
export const missingSome = renderShow(user).arms({ none: () => 'guest' })

/* --- negative: an unknown arm key is rejected ------------------------------ */

export const extraArm = renderShow(user).arms({
  some: (u) => u.name,
  none: () => 'guest',
  // @ts-expect-error 'otherwise' is not an arm of an optional
  otherwise: () => 'x',
})
