import { expect, test } from 'vite-plus/test'
import { renderShow } from '../src/show.ts'

// Route the value through a parameter so it keeps its `{ name } | null` type at
// the call site — a `const x: T | null = null` would const-narrow to `null`.
const greet = (user: { name: string } | null) =>
  renderShow(
    user,
    (u) => `hi ${u.name}`,
    () => 'guest',
  )

test('renderShow renders then with the value when truthy', () => {
  expect(greet({ name: 'ada' })).toBe('hi ada')
})

test('renderShow renders otherwise when falsy', () => {
  expect(greet(null)).toBe('guest')
})

test('renderShow returns null when falsy and no otherwise given', () => {
  const name = (user: { name: string } | null) => renderShow(user, (u) => u.name)

  expect(name(null)).toBeNull()
  expect(name({ name: 'ada' })).toBe('ada')
})

test('renderShow treats null, undefined and false as absent', () => {
  expect(renderShow(null, () => 'x')).toBeNull()
  expect(renderShow(undefined, () => 'x')).toBeNull()
  expect(renderShow(false, () => 'x')).toBeNull()
})

test('renderShow treats 0 and empty string as falsy at runtime', () => {
  expect(
    renderShow(
      0,
      () => 'x',
      () => 'zero',
    ),
  ).toBe('zero')
  expect(
    renderShow(
      '',
      () => 'x',
      () => 'empty',
    ),
  ).toBe('empty')
})
