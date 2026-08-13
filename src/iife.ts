/**
 * Immediately invoke `body` and return its result — the honest, named form of
 * the very IIFE matchx was built to replace.
 *
 * It offers no exhaustiveness and no narrowing; it is literally `body()`. Reach
 * for it only in the rare slot that genuinely wants procedural code and none of
 * the guarantees. If the branches are a union, you wanted {@link renderMatch} or
 * {@link renderCond}.
 *
 * @example
 * ```tsx
 * {iife(() => {
 *   const now = Date.now()
 *   return <time dateTime={String(now)}>{now}</time>
 * })}
 * ```
 */
export function iife<R>(body: () => R): R {
  return body()
}
