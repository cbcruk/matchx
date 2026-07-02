import { expect, test } from 'vite-plus/test'
import { anyOf, cond } from '../src/cond.ts'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string; code: number }
  | { status: 'success'; data: number[] }

test('cond renders the first matching arm', () => {
  const out = cond({ status: 'loading' } as State)
    .when({ status: 'error' }, () => 'error')
    .when({ status: 'loading' }, () => 'loading')
    .otherwise(() => 'otherwise')

  expect(out).toBe('loading')
})

test('cond honours a guard before falling through', () => {
  const run = (v: State) =>
    cond(v)
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

test('cond only runs the first matching arm (no double render)', () => {
  const calls: string[] = []

  cond({ status: 'loading' } as State)
    .when({ status: 'loading' }, () => calls.push('first'))
    .when({ status: 'loading' }, () => calls.push('second'))
    .run()

  expect(calls).toEqual(['first'])
})

test('cond narrows the arm argument by pattern', () => {
  const out = cond({ status: 'success', data: [1, 2, 3] } as State)
    .when({ status: 'success' }, (s) => s.data.length)
    .otherwise(() => -1)

  expect(out).toBe(3)
})

test('cond accepts a type-guard predicate as the matcher', () => {
  const isError = (s: State): s is Extract<State, { status: 'error' }> => s.status === 'error'

  const out = cond({ status: 'error', message: 'boom', code: 500 } as State)
    .when(isError, (s) => s.message)
    .otherwise(() => 'other')

  expect(out).toBe('boom')
})

test('otherwise supplies the fallback when nothing matched', () => {
  const out = cond({ status: 'success', data: [] } as State)
    .when({ status: 'loading' }, () => 'loading')
    .otherwise((s) => s.status)

  expect(out).toBe('success')
})

test('run returns undefined when nothing matched', () => {
  const out = cond({ status: 'success', data: [] } as State)
    .when({ status: 'loading' }, () => 'loading')
    .run()

  expect(out).toBeUndefined()
})

test('exhaustive throws when nothing matched', () => {
  expect(() =>
    cond({ status: 'success', data: [] } as State)
      .when({ status: 'loading' }, () => 'loading')
      .exhaustive(),
  ).toThrow(/non-exhaustive/)
})

test('cond anyOf matches when any alternative pattern matches', () => {
  const run = (v: State) =>
    cond(v)
      .when(anyOf({ status: 'loading' }, { status: 'error' }), () => 'busy')
      .otherwise(() => 'done')

  expect(run({ status: 'loading' })).toBe('busy')
  expect(run({ status: 'error', message: 'boom', code: 1 })).toBe('busy')
  expect(run({ status: 'success', data: [] })).toBe('done')
})

test('cond anyOf narrows the render argument to the union of members', () => {
  const out = cond({ status: 'error', message: 'boom', code: 1 } as State)
    .when(anyOf({ status: 'error' }, { status: 'success' }), (s) => s.status)
    .otherwise(() => 'loading')

  expect(out).toBe('error')
})

test('cond anyOf still respects a guard', () => {
  const run = (v: State) =>
    cond(v)
      .when(
        anyOf({ status: 'error' }, { status: 'success' }),
        (s) => s.status === 'error',
        () => 'err',
      )
      .otherwise(() => 'other')

  expect(run({ status: 'error', message: 'boom', code: 1 })).toBe('err')
  expect(run({ status: 'success', data: [] })).toBe('other')
})
