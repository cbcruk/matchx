import { each } from '../src/each.ts'

/* -------------------------------------------------------------------------- */
/*  Type-level tests for `each`. The `@ts-expect-error` negatives are the        */
/*  regression surface.                                                        */
/* -------------------------------------------------------------------------- */

declare const users: { id: number; name: string }[]
declare const byId: Map<string, { name: string }>
declare const ids: Set<number>

/* --- positive: item is inferred from the array element -------------------- */

export const rows = each(users, (u, i) => `${i}:${u.name}`)

/* --- positive: a Map is iterated as [key, value] entries ------------------ */

export const entries = each(byId, ([id, u]) => `${id}=${u.name}`)

/* --- positive: a Set is iterated by element ------------------------------- */

export const set = each(ids, (n) => n * 2)

/* --- negative: the render cannot read fields the item does not have -------- */

export const wrongField = each(
  users,
  (u) =>
    // @ts-expect-error 'email' does not exist on the item type
    u.email,
)

/* --- negative: the index is a number, not a string ------------------------ */

export const wrongIndex = each(users, (u, i) =>
  // @ts-expect-error 'i' is a number; string methods are not available
  i.toUpperCase(),
)

/* --- positive: R flows through, so `each` is usable as a typed map --------- */

export const doubled: number[] | null = each([1, 2, 3], (n) => n * 2)

/* --- positive: the fallback may differ in type from the item render -------- */

export const withFallback: string[] | number = each(
  ['a'],
  (s) => s,
  () => 0,
)

/* --- positive: a native Iterator Helper chain is accepted ------------------ */

export const helpers = each(
  users
    .values()
    .filter((u) => u.id > 0)
    .take(10),
  (u) => u.name,
)

/* --- negative: a non-iterable is rejected --------------------------------- */

// @ts-expect-error a plain number is not an Iterable
export const notIterable = each(42, (n) => n)
