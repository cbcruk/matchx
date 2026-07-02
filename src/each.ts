import type { ReactNode } from 'react'

/* -------------------------------------------------------------------------- */
/*  Iterable list rendering — the collection member of the family.             */
/*                                                                            */
/*  Solid's `<For>` in function form. Its edge over a bare `.map` is small and */
/*  honest (DESIGN §8.3 marks it ergonomic, not a type win): it takes ANY      */
/*  `Iterable` — Map, Set, a generator — without spreading first, and folds    */
/*  the empty-state `fallback` in. It does NOT solve keys: `render` must return */
/*  keyed elements, exactly as `.map` requires.                                */
/*                                                                            */
/*  Taking any `Iterable` also makes `each` the render terminal for native     */
/*  Iterator Helpers: do the lazy map/filter/take with the platform, then let  */
/*  `each` materialize the result. We deliberately do NOT reimplement them.    */
/* -------------------------------------------------------------------------- */

/**
 * Render each item of `items`, or `fallback` (else `null`) when it is empty.
 *
 * @example
 * ```tsx
 * {each(users, (u) => <Row key={u.id} user={u} />, () => <Empty />)}
 * // Map/Set/generator work too — T is inferred from the iterable:
 * {each(byId, ([id, u]) => <Row key={id} user={u} />)} // byId: Map<Id, User>
 * ```
 */
export function each<T>(
  items: Iterable<T>,
  render: (item: T, index: number) => ReactNode,
  fallback?: () => ReactNode,
): ReactNode {
  const out: ReactNode[] = []
  let index = 0
  for (const item of items) {
    out.push(render(item, index))
    index += 1
  }
  if (out.length === 0) return fallback ? fallback() : null
  return out
}
