import type { ReactNode } from 'react'

/* -------------------------------------------------------------------------- */
/*  Core (`match`) types                                                       */
/* -------------------------------------------------------------------------- */

/** The literal value behind a discriminant key `D` of union member `T`. */
export type Discriminant<T, D extends keyof T> = T[D] & PropertyKey

/** Closed arm map: one handler per discriminant value, each narrowed. */
export type Arms<T, D extends keyof T, R> = {
  [V in Discriminant<T, D>]: (value: Extract<T, Record<D, V>>) => R
}

export interface Matchable<T extends Record<D, PropertyKey>, D extends keyof T> {
  /**
   * Exhaustive match. `R` is inferred from the arms and unified across all of
   * them — omit a discriminant value and it's a compile error.
   */
  match<R = ReactNode>(arms: Arms<T, D, R>): R

  /**
   * Escape hatch when you only care about a few states. Loses exhaustiveness
   * on purpose, so it demands an explicit fallback (cf. neverthrow's unwrapOr).
   */
  partial<R = ReactNode>(arms: Partial<Arms<T, D, R>>, fallback: (value: T) => R): R
}

/* -------------------------------------------------------------------------- */
/*  Sibling (`when`) types                                                     */
/* -------------------------------------------------------------------------- */

/** A deep-partial shape used to match against a value of type `T`. */
export type Pattern<T> =
  T extends ReadonlyArray<infer E>
    ? ReadonlyArray<Pattern<E>>
    : T extends object
      ? { readonly [K in keyof T]?: Pattern<T[K]> }
      : T

/**
 * Narrow a union `T` by a pattern `P`.
 * For discriminated unions, `Extract<T, P>` picks the matching member exactly.
 * Falls back to `T` when the pattern is too loose to narrow.
 */
export type Narrow<T, P> = [Extract<T, P>] extends [never] ? T : Extract<T, P>

/** A renderable: either a node, or a function producing one from the value. */
export type Render<V> = ((value: V) => ReactNode) | ReactNode
