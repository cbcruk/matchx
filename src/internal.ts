/* -------------------------------------------------------------------------- */
/*  Internal helpers. Not part of the public API (not re-exported by index).   */
/* -------------------------------------------------------------------------- */

/**
 * Render a value for an error message without ever throwing. `JSON.stringify`
 * itself throws on circular structures and BigInt, which would otherwise mask
 * our diagnostic with an unrelated `TypeError`.
 */
export function describe(value: unknown): string {
  try {
    const json = JSON.stringify(value)
    if (json !== undefined) return json
  } catch {
    // circular, BigInt, or a throwing toJSON — fall through to String()
  }
  try {
    return String(value)
  } catch {
    return '[unprintable]'
  }
}

/**
 * True only for `{}`-style objects. A `Map`/`Set`/`RegExp`/class instance has no
 * own enumerable entries, so structural matching over it would be vacuously
 * true — i.e. it would match everything.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const proto: unknown = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}
