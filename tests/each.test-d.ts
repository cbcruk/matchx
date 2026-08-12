import { renderEach } from '../src/each.ts'

/* -------------------------------------------------------------------------- */
/*  Type-level tests for `renderEach`. The `@ts-expect-error` negatives are     */
/*  the regression surface.                                                    */
/* -------------------------------------------------------------------------- */

declare const users: { id: number; name: string }[]
declare const byId: Map<string, { name: string }>
declare const ids: Set<number>

/* --- positive: the item type is inferred from the iterable ---------------- */

export const rows = renderEach(users).arms({
  each: (u, i) => `${i}:${u.name}`,
  empty: () => null,
})

/* --- positive: a Map is iterated as [key, value] entries ------------------ */

export const entries = renderEach(byId).arms({
  each: ([id, u]) => `${id}=${u.name}`,
  empty: () => null,
})

/* --- positive: a Set is iterated by element ------------------------------- */

export const set = renderEach(ids).arms({ each: (n) => n * 2, empty: () => null })

/* --- positive: R flows through, so it doubles as a typed map -------------- */

export const doubled: number[] | null = renderEach([1, 2, 3]).arms({
  each: (n) => n * 2,
  empty: () => null,
})

/* --- positive: the empty arm may differ in type from the item render ------- */

export const withFallback: string[] | number = renderEach(['a']).arms({
  each: (s) => s,
  empty: () => 0,
})

/* --- positive: a native Iterator Helper chain is accepted ------------------ */

export const helpers = renderEach(
  users
    .values()
    .filter((u) => u.id > 0)
    .take(10),
).arms({ each: (u) => u.name, empty: () => null })

/* --- negative: the render cannot read fields the item does not have -------- */

export const wrongField = renderEach(users).arms({
  // @ts-expect-error 'email' does not exist on the item type
  each: (u) => u.email,
  empty: () => null,
})

/* --- negative: the index is a number, not a string ------------------------ */

export const wrongIndex = renderEach(users).arms({
  // @ts-expect-error 'i' is a number; string methods are not available
  each: (u, i) => i.toUpperCase(),
  empty: () => null,
})

/* --- negative: both arms are required ------------------------------------- */

// @ts-expect-error 'empty' is missing
export const missingEmpty = renderEach(users).arms({ each: (u) => u.name })

/* --- negative: a non-iterable is rejected --------------------------------- */

// @ts-expect-error a plain number is not an Iterable
export const notIterable = renderEach(42)
