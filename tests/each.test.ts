import { expect, test } from 'vite-plus/test'
import { each } from '../src/each.ts'

test('each maps every item, passing the index', () => {
  expect(each([10, 20, 30], (n, i) => n + i)).toEqual([10, 21, 32])
})

test('each renders the fallback when empty', () => {
  expect(
    each(
      [],
      (n) => n,
      () => 'empty',
    ),
  ).toBe('empty')
})

test('each returns null when empty and no fallback given', () => {
  expect(each([], (n) => n)).toBeNull()
})

test('each consumes a Set', () => {
  expect(each(new Set([1, 2, 2, 3]), (n) => n * 2)).toEqual([2, 4, 6])
})

test('each consumes a Map as [key, value] entries', () => {
  const byId = new Map([
    ['a', 1],
    ['b', 2],
  ])

  expect(each(byId, ([k, v]) => `${k}=${v}`)).toEqual(['a=1', 'b=2'])
})

test('each consumes a generator', () => {
  function* gen() {
    yield 'x'
    yield 'y'
  }

  expect(each(gen(), (s) => s.toUpperCase())).toEqual(['X', 'Y'])
})

test('each consumes a generator that yields nothing via the fallback', () => {
  function* empty(): Generator<number> {}

  expect(
    each(
      empty(),
      (n) => n,
      () => 'none',
    ),
  ).toBe('none')
})
