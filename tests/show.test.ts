import { expect, test } from 'vite-plus/test'
import { show } from '../src/show.ts'

// Route the value through a parameter so it keeps its `{ name } | null` type at
// the call site — a `const x: T | null = null` would const-narrow to `null`.
const greet = (user: { name: string } | null) =>
  show(
    user,
    (u) => `hi ${u.name}`,
    () => 'guest',
  )

test('show renders then with the value when truthy', () => {
  expect(greet({ name: 'ada' })).toBe('hi ada')
})

test('show renders otherwise when falsy', () => {
  expect(greet(null)).toBe('guest')
})

test('show returns null when falsy and no otherwise given', () => {
  const name = (user: { name: string } | null) => show(user, (u) => u.name)

  expect(name(null)).toBeNull()
  expect(name({ name: 'ada' })).toBe('ada')
})

test('show treats null, undefined and false as absent', () => {
  expect(show(null, () => 'x')).toBeNull()
  expect(show(undefined, () => 'x')).toBeNull()
  expect(show(false, () => 'x')).toBeNull()
})

test('show treats 0 and empty string as falsy at runtime', () => {
  expect(
    show(
      0,
      () => 'x',
      () => 'zero',
    ),
  ).toBe('zero')
  expect(
    show(
      '',
      () => 'x',
      () => 'empty',
    ),
  ).toBe('empty')
})
