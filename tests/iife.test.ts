import { expect, test } from 'vite-plus/test'
import { iife } from '../src/iife.ts'

test('iife immediately invokes the body and returns its result', () => {
  expect(iife(() => 1 + 1)).toBe(2)
})

test('iife closes over its surroundings', () => {
  const base = 10
  expect(iife(() => base * 2)).toBe(20)
})

test('iife runs the body exactly once', () => {
  let calls = 0
  iife(() => {
    calls += 1
  })
  expect(calls).toBe(1)
})
