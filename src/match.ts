import type { Discriminant, Matchable } from './types.ts'

/* -------------------------------------------------------------------------- */
/*  Borrowed from neverthrow's `.match` — the SHAPE, not the implementation.  */
/*                                                                            */
/*  Kept:                                                                     */
/*    • value wrapped → terminal `.match` consumes it (fluent, no JSX element)*/
/*    • closed arm object → every discriminant required → exhaustive          */
/*    • all arms share one return type (neverthrow: "both fns must return     */
/*      the same type") → here every arm returns ReactNode                    */
/*  Dropped:                                                                  */
/*    • ok/err naming + "error handling" semantics                           */
/*    • the 2-arm restriction (generalized to N-arm discriminated unions)    */
/*    • any runtime dependency on neverthrow                                 */
/* -------------------------------------------------------------------------- */

/**
 * Wrap a discriminated-union value so it can be consumed by an exhaustive
 * terminal `.match` in a JSX expression slot — no IIFE, no missed branches.
 *
 * @param value the union value to match on
 * @param on    the discriminant key (e.g. `'status'`)
 *
 * @example
 * ```tsx
 * {match(state, 'status').match({
 *   loading: () => <Spinner />,
 *   error: (s) => <Error msg={s.message} />,
 *   success: (s) => <Content data={s.data} />,
 * })}
 * ```
 */
export function match<T extends Record<D, PropertyKey>, D extends keyof T>(
  value: T,
  on: D,
): Matchable<T, D> {
  const key = value[on] as Discriminant<T, D>

  return {
    match(arms) {
      return (arms[key] as (v: T) => unknown)(value) as never
    },
    partial(arms, fallback) {
      const arm = arms[key] as ((v: T) => unknown) | undefined

      return (arm ? arm(value) : fallback(value)) as never
    },
  }
}
