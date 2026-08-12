import type { ReactNode } from 'react'

/* -------------------------------------------------------------------------- */
/*  Iterable list rendering — the collection member of the family.             */
/*                                                                            */
/*  Solid's `<For>` in function form. Its edge over a bare `.map` is small and */
/*  honest (DESIGN §8.3 marks it ergonomic, not a type win): it takes ANY      */
/*  `Iterable` — Map, Set, a generator — without spreading first, and it makes */
/*  the empty case an explicit arm rather than something you remember to add.  */
/*  It does NOT solve keys: `each` must return keyed elements, like `.map`.    */
/*                                                                            */
/*  Taking any `Iterable` also makes it the render terminal for native         */
/*  Iterator Helpers: do the lazy map/filter/take with the platform, then let  */
/*  `renderEach` materialize the result. We deliberately do NOT reimplement.   */
/* -------------------------------------------------------------------------- */

/** An iterable wrapped by `renderEach`, awaiting its `each`/`empty` arms. */
export interface Eachable<T> {
  /**
   * Both arms are required, mirroring `renderShow` — an empty collection is a
   * real case, not an afterthought. Write `empty: () => null` to render nothing.
   *
   * Note the iterable is consumed here, so a one-shot iterator (a generator)
   * supports a single `arms` call.
   */
  arms<R = ReactNode, F = R>(arms: { each: (item: T, index: number) => R; empty: () => F }): R[] | F
}

/**
 * Render every item of `items`, or the `empty` arm when there are none.
 *
 * @example
 * ```tsx
 * {renderEach(users).arms({
 *   each: (u) => <Row key={u.id} user={u} />,
 *   empty: () => <Empty />,
 * })}
 * // Map/Set/generator work too — T is inferred from the iterable:
 * {renderEach(byId).arms({ each: ([id, u]) => <Row key={id} user={u} />, empty: () => null })}
 * ```
 */
export function renderEach<T>(items: Iterable<T>): Eachable<T> {
  return {
    arms({ each, empty }) {
      const out = []
      let index = 0
      for (const item of items) {
        out.push(each(item, index))
        index += 1
      }

      return (out.length === 0 ? empty() : out) as never
    },
  }
}
