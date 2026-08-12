/* -------------------------------------------------------------------------- */
/*  The IIFE. Yes, that one.                                                    */
/*                                                                            */
/*  matchx exists to kill the inline `(() => { … })()` in a JSX slot (see the  */
/*  README's "The problem"). So shipping it back — named — is the easter egg.  */
/*  It earns NO type story: no exhaustiveness, no narrowing. It's literally     */
/*  `body()`. But `iife(() => { … })` reads better than `(() => { … })()`, and  */
/*  names the escape hatch for the rare slot where you genuinely want           */
/*  procedural code and none of the guarantees.                                 */
/*                                                                            */
/*  If your branches are a union, you wanted renderMatch/renderCond. You know. */
/* -------------------------------------------------------------------------- */

/**
 * Immediately invoke `body` and return its result — the honest, named form of
 * the very IIFE matchx was built to replace.
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
