import { expect, test } from 'vitest'

test('easeInOut mathematical boundary checks', () => {
  // A simple cubic ease-in-out implementation test
  const easeInOut = t => t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1;
  
  expect(easeInOut(0)).toBe(0);
  expect(easeInOut(1)).toBe(1);
  expect(easeInOut(0.5)).toBe(0.5);
});
