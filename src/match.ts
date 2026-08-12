import { describe } from './internal.ts'
import type { Discriminant, Matchable } from './types.ts'

/* -------------------------------------------------------------------------- */
/*  Borrowed from neverthrow's `.match` — the SHAPE, not the implementation.  */
/*                                                                            */
/*  Kept:                                                                     */
/*    • value wrapped → terminal `.arms` consumes it (fluent, no JSX element) */
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
 * {renderMatch(state, 'status').arms({
 *   loading: () => <Spinner />,
 *   error: (s) => <Error msg={s.message} />,
 *   success: (s) => <Content data={s.data} />,
 * })}
 * ```
 */
export function renderMatch<T extends Record<D, PropertyKey>, D extends keyof T>(
  value: T,
  on: D,
): Matchable<T, D> {
  const key = value[on] as Discriminant<T, D>

  return {
    arms(arms) {
      const arm = armFor<T>(arms, key)
      if (!arm) {
        // Types make this unreachable; a value crossing a runtime boundary
        // (JSON, `any`) can still get here, so fail with our own diagnostic
        // rather than an opaque "arms[key] is not a function".
        throw new Error(`[matchx] no arm for discriminant ${describe(key)}`)
      }
      return arm(value) as never
    },
    partial(arms, fallback) {
      const arm = armFor<T>(arms, key)

      return (arm ? arm(value) : fallback(value)) as never
    },
  }
}

/**
 * Look up an arm without reaching the prototype chain — a discriminant such as
 * `'toString'` or `'constructor'` would otherwise resolve to `Object.prototype`
 * and get called instead of the arm (or the `partial` fallback).
 */
function armFor<T>(arms: object, key: PropertyKey): ((value: T) => unknown) | undefined {
  if (!Object.prototype.hasOwnProperty.call(arms, key)) return undefined
  const arm: unknown = (arms as Record<PropertyKey, unknown>)[key]

  return typeof arm === 'function' ? (arm as (value: T) => unknown) : undefined
}
