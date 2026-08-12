import { expect, test } from 'vite-plus/test'
import { renderShow } from '../src/show.ts'

// Route the value through a parameter so it keeps its `{ name } | null` type at
// the call site — a `const x: T | null = null` would const-narrow to `null`.
const greet = (user: { name: string } | null) =>
  renderShow(user).arms({
    some: (u) => `hi ${u.name}`,
    none: () => 'guest',
  })

test('renderShow takes the some arm when the value is present', () => {
  expect(greet({ name: 'ada' })).toBe('hi ada')
})

test('renderShow takes the none arm when the value is absent', () => {
  expect(greet(null)).toBe('guest')
})

test('renderShow treats null, undefined and false as absent', () => {
  const run = (v: unknown) => renderShow(v).arms({ some: () => 'some', none: () => 'none' })

  expect(run(null)).toBe('none')
  expect(run(undefined)).toBe('none')
  expect(run(false)).toBe('none')
})

test('renderShow treats 0 and empty string as absent at runtime', () => {
  const run = (v: unknown) => renderShow(v).arms({ some: () => 'some', none: () => 'none' })

  expect(run(0)).toBe('none')
  expect(run('')).toBe('none')
})

test('renderShow runs only the arm it selected', () => {
  const calls: string[] = []

  renderShow<number | null>(1).arms({
    some: () => calls.push('some'),
    none: () => calls.push('none'),
  })

  expect(calls).toEqual(['some'])
})

test('renderShow passes the narrowed value to the some arm', () => {
  const out = renderShow<{ n: number } | null>({ n: 3 }).arms({
    some: (v) => v.n * 2,
    none: () => -1,
  })

  expect(out).toBe(6)
})
