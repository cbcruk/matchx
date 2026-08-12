import { expect, test } from 'vite-plus/test'
import { renderEach } from '../src/each.ts'

test('renderEach maps every item, passing the index', () => {
  const out = renderEach([10, 20, 30]).arms({
    each: (n, i) => n + i,
    empty: () => 'empty',
  })

  expect(out).toEqual([10, 21, 32])
})

test('renderEach takes the empty arm for an empty collection', () => {
  const out = renderEach([]).arms({
    each: (n) => n,
    empty: () => 'empty',
  })

  expect(out).toBe('empty')
})

test('renderEach consumes a Set', () => {
  const out = renderEach(new Set([1, 2, 2, 3])).arms({
    each: (n) => n * 2,
    empty: () => null,
  })

  expect(out).toEqual([2, 4, 6])
})

test('renderEach consumes a Map as [key, value] entries', () => {
  const byId = new Map([
    ['a', 1],
    ['b', 2],
  ])

  const out = renderEach(byId).arms({
    each: ([k, v]) => `${k}=${v}`,
    empty: () => null,
  })

  expect(out).toEqual(['a=1', 'b=2'])
})

test('renderEach consumes a generator', () => {
  function* gen() {
    yield 'x'
    yield 'y'
  }

  const out = renderEach(gen()).arms({
    each: (s) => s.toUpperCase(),
    empty: () => null,
  })

  expect(out).toEqual(['X', 'Y'])
})

test('renderEach takes the empty arm for a generator that yields nothing', () => {
  function* empty(): Generator<number> {}

  const out = renderEach(empty()).arms({
    each: (n) => n,
    empty: () => 'none',
  })

  expect(out).toBe('none')
})

test('renderEach does not run the empty arm when there are items', () => {
  const calls: string[] = []

  renderEach([1]).arms({
    each: () => calls.push('each'),
    empty: () => calls.push('empty'),
  })

  expect(calls).toEqual(['each'])
})
