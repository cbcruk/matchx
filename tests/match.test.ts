import { expect, test } from 'vite-plus/test'
import { match } from '../src/match.ts'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: number[] }

test('match dispatches to the arm for the active discriminant', () => {
  const out = match({ status: 'success', data: [1, 2] } as State, 'status').match({
    loading: () => 'loading',
    error: (s) => `error: ${s.message}`,
    success: (s) => `success: ${s.data.length}`,
  })

  expect(out).toBe('success: 2')
})

test('match narrows the arm argument to the matched member', () => {
  const out = match({ status: 'error', message: 'boom' } as State, 'status').match({
    loading: () => 'loading',
    error: (s) => s.message,
    success: (s) => String(s.data),
  })

  expect(out).toBe('boom')
})

test('match works on any discriminant key, not just "status"', () => {
  type Shape = { kind: 'circle'; r: number } | { kind: 'square'; side: number }

  const area = match({ kind: 'square', side: 3 } as Shape, 'kind').match({
    circle: (s) => Math.PI * s.r * s.r,
    square: (s) => s.side * s.side,
  })

  expect(area).toBe(9)
})

test('partial uses the matching arm when present', () => {
  const out = match({ status: 'loading' } as State, 'status').partial(
    { loading: () => 'spin' },
    () => 'fallback',
  )

  expect(out).toBe('spin')
})

test('match ignores inherited Object.prototype members as arms', () => {
  type Weird = { kind: 'toString' } | { kind: 'ok' }

  const out = match({ kind: 'toString' } as Weird, 'kind').partial(
    { ok: () => 'ok' },
    () => 'fallback',
  )

  expect(out).toBe('fallback')
})

test('match throws a matchx error for an unknown runtime discriminant', () => {
  type S = { kind: 'a' } | { kind: 'b' }
  const rogue = { kind: 'c' } as unknown as S

  expect(() => match(rogue, 'kind').match({ a: () => 1, b: () => 2 })).toThrow(/\[matchx\] no arm/)
})

test('partial uses the fallback when the arm is absent', () => {
  const out = match({ status: 'success', data: [] } as State, 'status').partial(
    { loading: () => 'spin' },
    (s) => `fallback: ${s.status}`,
  )

  expect(out).toBe('fallback: success')
})
