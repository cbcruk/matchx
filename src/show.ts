import type { ReactNode } from 'react'

/* -------------------------------------------------------------------------- */
/*  Presence/absence branching — the two-case member of the family.            */
/*                                                                            */
/*  Solid's `<Show when={x}>` supplied the idea; the ARM VOCABULARY is         */
/*  borrowed from Option — `some` / `none` — because that is precisely what    */
/*  this branches on. Nothing of Option's machinery comes with it: there is no */
/*  Option type, no constructors, no `.map`/`.andThen`. Borrowed, not bundled. */
/*                                                                            */
/*  `some` receives the value with `null | undefined` removed (`NonNullable`), */
/*  so the everyday `T | null` guard narrows for free. `false`/`0`/`''` still  */
/*  route to `none` at runtime, but only null/undefined leave the type — see   */
/*  DESIGN §8.4 #2 for why the stricter version broke inference.               */
/* -------------------------------------------------------------------------- */

/** A value wrapped by `renderShow`, awaiting its `some`/`none` arms. */
export interface Showable<T> {
  /**
   * Both arms are required: an optional has exactly two cases, so there is no
   * silent fall-through. Write `none: () => null` when absence renders nothing.
   */
  arms<R1 = ReactNode, R2 = R1>(arms: {
    some: (value: NonNullable<T>) => R1
    none: () => R2
  }): R1 | R2
}

/**
 * Branch on whether `when` is present.
 *
 * @example
 * ```tsx
 * {renderShow(user).arms({
 *   some: (u) => <Profile user={u} />, // u: NonNullable — no null/undefined
 *   none: () => <Guest />,
 * })}
 * ```
 */
export function renderShow<T>(when: T): Showable<T> {
  return {
    arms({ some, none }) {
      return (when ? some(when as NonNullable<T>) : none()) as never
    },
  }
}
