import type { ReactNode } from 'react'

/* -------------------------------------------------------------------------- */
/*  Truthy-narrowing conditional — the two-branch member of the family.        */
/*                                                                            */
/*  Solid's `<Show when={x}>{(x) => …}</Show>` in function form: a plain       */
/*  expression for the JSX slot. Its reason to exist here is the TYPE story —  */
/*  when `when` is truthy, `then` receives it with `null | undefined` removed  */
/*  (`NonNullable<T>`), so the common `T | null` guard narrows for free.       */
/*                                                                            */
/*  Only null/undefined are stripped from the type. `false`/`0`/`''` are still */
/*  falsy at runtime (they route to `otherwise`), but stripping them from the  */
/*  type broke inference — see DESIGN §8.4 #2 — so the type keeps them.        */
/* -------------------------------------------------------------------------- */

/**
 * Render `then` (narrowed) when `when` is truthy, else `otherwise`.
 *
 * @example
 * ```tsx
 * {show(user, (u) => <Profile user={u} />, () => <Guest />)}
 * //             u: NonNullable — null | undefined removed
 * ```
 */
export function show<T, R1 = ReactNode, R2 = R1>(
  when: T,
  then: (value: NonNullable<T>) => R1,
  otherwise: () => R2,
): R1 | R2
export function show<T, R1 = ReactNode>(when: T, then: (value: NonNullable<T>) => R1): R1 | null
export function show<T, R1, R2>(
  when: T,
  then: (value: NonNullable<T>) => R1,
  otherwise?: () => R2,
): R1 | R2 | null {
  if (when) return then(when as NonNullable<T>)
  return otherwise ? otherwise() : null
}
