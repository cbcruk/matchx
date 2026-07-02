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
export function show<T, R = ReactNode>(
  when: T,
  then: (value: NonNullable<T>) => R,
  otherwise: () => R,
): R
export function show<T, R = ReactNode>(when: T, then: (value: NonNullable<T>) => R): R | null
export function show<T, R>(
  when: T,
  then: (value: NonNullable<T>) => R,
  otherwise?: () => R,
): R | null {
  if (when) return then(when as NonNullable<T>)
  return otherwise ? otherwise() : null
}
