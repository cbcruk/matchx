import { expect, test } from 'vite-plus/test'
import { anyOf, renderCond } from '../src/cond.ts'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string; code: number }
  | { status: 'success'; data: number[] }

test('renderCond renders the first matching arm', () => {
  const out = renderCond({ status: 'loading' } as State)
    .when({ status: 'error' }, () => 'error')
    .when({ status: 'loading' }, () => 'loading')
    .otherwise(() => 'otherwise')

  expect(out).toBe('loading')
})

test('renderCond honours a guard before falling through', () => {
  const run = (v: State) =>
    renderCond(v)
      .when(
        { status: 'error' },
        (s) => s.code >= 500,
        () => 'fatal',
      )
      .when({ status: 'error' }, (s) => `error: ${s.message}`)
      .otherwise(() => 'otherwise')

  expect(run({ status: 'error', message: 'boom', code: 500 })).toBe('fatal')
  expect(run({ status: 'error', message: 'boom', code: 400 })).toBe('error: boom')
})

test('renderCond only runs the first matching arm (no double render)', () => {
  const calls: string[] = []

  renderCond({ status: 'loading' } as State)
    .when({ status: 'loading' }, () => calls.push('first'))
    .when({ status: 'loading' }, () => calls.push('second'))
    .run()

  expect(calls).toEqual(['first'])
})

test('renderCond narrows the arm argument by pattern', () => {
  const out = renderCond({ status: 'success', data: [1, 2, 3] } as State)
    .when({ status: 'success' }, (s) => s.data.length)
    .otherwise(() => -1)

  expect(out).toBe(3)
})

test('renderCond accepts a type-guard predicate as the matcher', () => {
  const isError = (s: State): s is Extract<State, { status: 'error' }> => s.status === 'error'

  const out = renderCond({ status: 'error', message: 'boom', code: 500 } as State)
    .when(isError, (s) => s.message)
    .otherwise(() => 'other')

  expect(out).toBe('boom')
})

test('otherwise supplies the fallback when nothing matched', () => {
  const out = renderCond({ status: 'success', data: [] } as State)
    .when({ status: 'loading' }, () => 'loading')
    .otherwise((s) => s.status)

  expect(out).toBe('success')
})

test('run returns undefined when nothing matched', () => {
  const out = renderCond({ status: 'success', data: [] } as State)
    .when({ status: 'loading' }, () => 'loading')
    .run()

  expect(out).toBeUndefined()
})

test('exhaustive throws when nothing matched', () => {
  expect(() =>
    renderCond({ status: 'success', data: [] } as State)
      .when({ status: 'loading' }, () => 'loading')
      .exhaustive(),
  ).toThrow(/non-exhaustive/)
})

test('renderCond anyOf matches when any alternative pattern matches', () => {
  const run = (v: State) =>
    renderCond(v)
      .when(anyOf({ status: 'loading' }, { status: 'error' }), () => 'busy')
      .otherwise(() => 'done')

  expect(run({ status: 'loading' })).toBe('busy')
  expect(run({ status: 'error', message: 'boom', code: 1 })).toBe('busy')
  expect(run({ status: 'success', data: [] })).toBe('done')
})

test('renderCond anyOf narrows the render argument to the union of members', () => {
  const out = renderCond({ status: 'error', message: 'boom', code: 1 } as State)
    .when(anyOf({ status: 'error' }, { status: 'success' }), (s) => s.status)
    .otherwise(() => 'loading')

  expect(out).toBe('error')
})

test('renderCond anyOf still respects a guard', () => {
  const run = (v: State) =>
    renderCond(v)
      .when(
        anyOf({ status: 'error' }, { status: 'success' }),
        (s) => s.status === 'error',
        () => 'err',
      )
      .otherwise(() => 'other')

  expect(run({ status: 'error', message: 'boom', code: 1 })).toBe('err')
  expect(run({ status: 'success', data: [] })).toBe('other')
})

/* --- pattern semantics: each of these once matched EVERY value ------------- */

test('renderCond treats undefined as a real pattern, not a match-all sentinel', () => {
  const run = (v: number | undefined) =>
    renderCond(v)
      .when(undefined, () => 'nothing')
      .when(1, () => 'one')
      .otherwise(() => 'other')

  expect(run(undefined)).toBe('nothing')
  expect(run(1)).toBe('one')
  expect(run(2)).toBe('other')
})

test('renderCond array pattern [] means the empty array, not any array', () => {
  const run = (v: number[]) =>
    renderCond(v)
      .when([], () => 'empty')
      .otherwise(() => 'non-empty')

  expect(run([])).toBe('empty')
  expect(run([1, 2, 3])).toBe('non-empty')
})

test('renderCond array patterns match by exact length, not by prefix', () => {
  const run = (v: number[]) =>
    renderCond(v)
      .when([1, 2], () => 'pair')
      .otherwise(() => 'other')

  expect(run([1, 2])).toBe('pair')
  expect(run([1, 2, 3])).toBe('other')
})

test('renderCond matches Date patterns by instant, not identity or match-all', () => {
  const run = (v: { at: Date }) =>
    renderCond(v)
      .when({ at: new Date('2020-01-01') }, () => 'y2020')
      .otherwise(() => 'other')

  expect(run({ at: new Date('2020-01-01') })).toBe('y2020')
  expect(run({ at: new Date('1999-01-01') })).toBe('other')
})

test('renderCond does not treat a non-plain-object pattern as match-all', () => {
  const run = (v: { items: Map<string, number> }) =>
    renderCond(v)
      .when({ items: new Map([['a', 1]]) }, () => 'matched')
      .otherwise(() => 'other')

  expect(run({ items: new Map([['b', 2]]) })).toBe('other')
})

test('exhaustive reports non-exhaustive even for unstringifiable values', () => {
  const circular: Record<string, unknown> = {}
  circular.self = circular

  expect(() =>
    renderCond(circular)
      .when({ nope: 1 }, () => 'x')
      .exhaustive(),
  ).toThrow(/non-exhaustive/)

  expect(() =>
    renderCond(1n)
      .when(2n, () => 'x')
      .exhaustive(),
  ).toThrow(/non-exhaustive/)
})
