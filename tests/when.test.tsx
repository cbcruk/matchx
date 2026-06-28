import { createElement } from 'react'
import { expect, test } from 'vite-plus/test'
import { createMatch } from '../src/when.tsx'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string; code: number }
  | { status: 'success'; data: number[] }

function run(value: State, exhaustive?: boolean): unknown {
  const { Match, When, Otherwise } = createMatch<State>()

  return Match({
    value,
    exhaustive,
    children: [
      createElement(When, {
        key: 'fatal',
        pattern: { status: 'error' },
        guard: (s) => s.status === 'error' && s.code >= 500,
        children: 'fatal',
      }),
      createElement(When, {
        key: 'error',
        pattern: { status: 'error' },
        children: (s) => `error: ${s.status === 'error' ? s.message : ''}`,
      }),
      createElement(When, {
        key: 'loading',
        pattern: { status: 'loading' },
        children: 'loading',
      }),
      createElement(Otherwise, { key: 'rest', children: 'otherwise' }),
    ],
  })
}

test('when renders the first matching branch', () => {
  expect(run({ status: 'loading' })).toBe('loading')
})

test('when honours guards before falling through', () => {
  expect(run({ status: 'error', message: 'boom', code: 500 })).toBe('fatal')
  expect(run({ status: 'error', message: 'boom', code: 400 })).toBe('error: boom')
})

test('when falls back to Otherwise when nothing matches', () => {
  expect(run({ status: 'success', data: [] })).toBe('otherwise')
})

test('when passes the value to function children', () => {
  const { Match, When } = createMatch<State>()
  const out = Match({
    value: { status: 'success', data: [1, 2, 3] },
    children: createElement(When, {
      pattern: { status: 'success' },
      children: (s) => (s.status === 'success' ? s.data.length : -1),
    }),
  })

  expect(out).toBe(3)
})

test('when returns null on no match without Otherwise', () => {
  const { Match, When } = createMatch<State>()
  const out = Match({
    value: { status: 'success', data: [] },
    children: createElement(When, {
      pattern: { status: 'loading' },
      children: 'loading',
    }),
  })

  expect(out).toBeNull()
})

test('when throws on no match when exhaustive is set', () => {
  const { Match, When } = createMatch<State>()

  expect(() =>
    Match({
      value: { status: 'success', data: [] },
      exhaustive: true,
      children: createElement(When, {
        pattern: { status: 'loading' },
        children: 'loading',
      }),
    }),
  ).toThrow(/non-exhaustive/)
})
