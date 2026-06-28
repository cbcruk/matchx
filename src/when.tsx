import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import type { Narrow, Pattern, Render } from './types.ts'

/* -------------------------------------------------------------------------- */
/*  Optional sibling pattern — the flexible, NON-exhaustive counterpart.       */
/*                                                                            */
/*  `match` is closed and exhaustive. `createMatch` trades that away for      */
/*  guards and deep patterns: use it when a branch depends on more than a      */
/*  single discriminant (cf. DESIGN.md §5.3).                                 */
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

function render<V>(node: Render<V>, value: V): ReactNode {
  return typeof node === 'function' ? (node as (v: V) => ReactNode)(value) : node
}

export interface MatchControls<T> {
  /** Container: renders the first `<When>` whose pattern/guard matches. */
  Match: (props: {
    value: T
    /** Throw at runtime if nothing matched and no `<Otherwise>` is present. */
    exhaustive?: boolean
    children: ReactNode
  }) => ReactNode
  /** A single branch. `children` is narrowed by `pattern`. */
  When: <const P extends Pattern<T>>(props: {
    pattern?: P
    guard?: (value: T) => boolean
    children: Render<Narrow<T, P>>
  }) => ReactElement | null
  /** Fallback branch, rendered when no `<When>` matched. */
  Otherwise: (props: { children: Render<T> }) => ReactElement | null
}

/**
 * Build a `{ Match, When, Otherwise }` set bound to union type `T`, so the
 * sibling `<When>` branches can narrow against it.
 *
 * @example
 * ```tsx
 * const { Match, When, Otherwise } = createMatch<State>()
 * <Match value={state}>
 *   <When pattern={{ status: 'error' }} guard={(s) => s.code >= 500}>
 *     {(s) => <Fatal code={s.code} />}
 *   </When>
 *   <Otherwise>{(s) => <Content state={s} />}</Otherwise>
 * </Match>
 * ```
 */
export function createMatch<T>(): MatchControls<T> {
  // When / Otherwise are markers — Match reads their props and renders.
  const When: MatchControls<T>['When'] = () => null
  const Otherwise: MatchControls<T>['Otherwise'] = () => null

  const Match: MatchControls<T>['Match'] = ({ value, exhaustive, children }) => {
    const cases = Children.toArray(children).filter(isValidElement) as ReactElement<
      Record<string, unknown>
    >[]

    for (const c of cases) {
      if (c.type === Otherwise) continue
      const {
        pattern,
        guard,
        children: body,
      } = c.props as {
        pattern?: unknown
        guard?: (v: T) => boolean
        children: Render<T>
      }
      const patternOk = pattern === undefined || matches(value, pattern)
      const guardOk = guard ? guard(value) : true
      if (patternOk && guardOk) return render(body, value)
    }

    const fallback = cases.find((c) => c.type === Otherwise)
    if (fallback) {
      return render((fallback.props as { children: Render<T> }).children, value)
    }
    if (exhaustive) {
      throw new Error(`[matchx] non-exhaustive match for value: ${JSON.stringify(value)}`)
    }
    return null
  }

  return { Match, When, Otherwise }
}
