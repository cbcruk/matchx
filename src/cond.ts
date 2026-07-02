import type { Narrow, Pattern } from './types.ts'

/* -------------------------------------------------------------------------- */
/*  Function-form guard chain — the flexible, NON-exhaustive counterpart.      */
/*                                                                            */
/*  `match` is closed and exhaustive over a single discriminant. `cond` trades */
/*  that away for guards and deep patterns: use it when a branch depends on     */
/*  more than one discriminant. Unlike the old `<When>` JSX sibling, this is a  */
/*  plain expression — it drops into a `{}` slot with no wrapper element, the   */
/*  same shape as `match`. First matching arm wins; only its `render` runs.     */
/* -------------------------------------------------------------------------- */

function matches(value: unknown, pattern: unknown): boolean {
  if (Object.is(value, pattern)) return true
  if (typeof pattern !== 'object' || pattern === null) return false
  if (typeof value !== 'object' || value === null) return false

  if (Array.isArray(pattern)) {
    if (!Array.isArray(value) || value.length < pattern.length) return false
    return pattern.every((p, i) => matches(value[i], p))
  }
  return Object.entries(pattern as Record<string, unknown>).every(([k, p]) =>
    matches((value as Record<string, unknown>)[k], p),
  )
}

/**
 * A guard-chain builder over a value of type `T`. `R` accumulates the union of
 * every arm's return type, so the terminals (`otherwise`/`run`/`exhaustive`)
 * are typed against exactly the branches you added.
 */
export interface Cond<T, R = never> {
  /** Deep-partial pattern arm. `render` sees the value narrowed by `pattern`. */
  when<const P extends Pattern<T>, R2>(
    pattern: P,
    render: (value: Narrow<T, P>) => R2,
  ): Cond<T, R | R2>
  /** Pattern arm refined by a runtime `guard`; both must hold to match. */
  when<const P extends Pattern<T>, R2>(
    pattern: P,
    guard: (value: Narrow<T, P>) => boolean,
    render: (value: Narrow<T, P>) => R2,
  ): Cond<T, R | R2>
  /** Type-guard arm. `render` sees the value narrowed to `U`. */
  when<U extends T, R2>(guard: (value: T) => value is U, render: (value: U) => R2): Cond<T, R | R2>
  /** Predicate arm. No narrowing beyond `T`. */
  when<R2>(guard: (value: T) => boolean, render: (value: T) => R2): Cond<T, R | R2>

  /** Terminal fallback: the value if nothing matched. Always produces a result. */
  otherwise<R2>(render: (value: T) => R2): R | R2
  /** Terminal without a fallback: the matched result, or `undefined`. */
  run(): R | undefined
  /** Terminal that throws when nothing matched (runtime exhaustiveness). */
  exhaustive(): R
}

/**
 * Open a guard chain over `value`.
 *
 * @example
 * ```tsx
 * {cond(state)
 *   .when({ status: 'error' }, (s) => s.code >= 500, (s) => <Fatal code={s.code} />)
 *   .when({ status: 'error' }, (s) => <Error msg={s.message} />)
 *   .when({ status: 'loading' }, () => <Spinner />)
 *   .otherwise((s) => <Content state={s} />)}
 * ```
 */
export function cond<T>(value: T): Cond<T> {
  let matched = false
  let result: unknown

  const api = {
    when(...args: unknown[]) {
      let pattern: unknown
      let guard: ((v: T) => boolean) | undefined
      let render: (v: T) => unknown

      if (args.length >= 3) {
        pattern = args[0]
        guard = args[1] as (v: T) => boolean
        render = args[2] as (v: T) => unknown
      } else {
        const matcher = args[0]
        render = args[1] as (v: T) => unknown
        if (typeof matcher === 'function') {
          guard = matcher as (v: T) => boolean
        } else {
          pattern = matcher
        }
      }

      if (!matched) {
        const patternOk = pattern === undefined || matches(value, pattern)
        const guardOk = guard ? guard(value) : true
        if (patternOk && guardOk) {
          matched = true
          result = render(value)
        }
      }
      return api
    },
    otherwise(render: (v: T) => unknown) {
      return (matched ? result : render(value)) as never
    },
    run() {
      return (matched ? result : undefined) as never
    },
    exhaustive() {
      if (!matched) {
        throw new Error(`[matchx] non-exhaustive cond for value: ${JSON.stringify(value)}`)
      }
      return result as never
    },
  }

  return api as Cond<T>
}
