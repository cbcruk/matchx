import type { ReactNode } from 'react'

/** A value wrapped by {@link renderShow}, awaiting its `some`/`none` arms. */
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
 * Branch on whether `when` is present. The arm vocabulary is borrowed from
 * Option — `some`/`none` — because presence is exactly what this branches on;
 * no Option type, constructors, or combinators come with it.
 *
 * `some` receives the value with `null | undefined` removed (`NonNullable`), so
 * the everyday `T | null` guard narrows for free. `false`, `0` and `''` take the
 * `none` arm at runtime, but only `null` and `undefined` leave the type.
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
