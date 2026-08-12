import { expect, test } from 'vite-plus/test'
import { renderEach } from '../src/each.ts'

test('renderEach maps every item, passing the index', () => {
  expect(renderEach([10, 20, 30], (n, i) => n + i)).toEqual([10, 21, 32])
})

test('renderEach renders the fallback when empty', () => {
  expect(
    renderEach(
      [],
      (n) => n,
      () => 'empty',
    ),
  ).toBe('empty')
})

test('renderEach returns null when empty and no fallback given', () => {
  expect(renderEach([], (n) => n)).toBeNull()
})

test('renderEach consumes a Set', () => {
  expect(renderEach(new Set([1, 2, 2, 3]), (n) => n * 2)).toEqual([2, 4, 6])
})

test('renderEach consumes a Map as [key, value] entries', () => {
  const byId = new Map([
    ['a', 1],
    ['b', 2],
  ])

  expect(renderEach(byId, ([k, v]) => `${k}=${v}`)).toEqual(['a=1', 'b=2'])
})

test('renderEach consumes a generator', () => {
  function* gen() {
    yield 'x'
    yield 'y'
  }

  expect(renderEach(gen(), (s) => s.toUpperCase())).toEqual(['X', 'Y'])
})

test('renderEach consumes a generator that yields nothing via the fallback', () => {
  function* empty(): Generator<number> {}

  expect(
    renderEach(
      empty(),
      (n) => n,
      () => 'none',
    ),
  ).toBe('none')
})
