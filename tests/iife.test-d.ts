import { iife } from '../src/iife.ts'

/* -------------------------------------------------------------------------- */
/*  Type-level tests for the easter egg. It has no narrowing to prove — only    */
/*  that R flows straight through from the body.                               */
/* -------------------------------------------------------------------------- */

/* --- positive: R is inferred from the body's return ----------------------- */

export const asNumber: number = iife(() => 5)

/* --- negative: R is not widened away — a number body is not a string ------- */

// @ts-expect-error the body returns number, not string
export const wrongType: string = iife(() => 5)
