import { describe, expect, it } from 'vitest';
import { safeNext } from './redirect';

describe('safeNext', () => {
    it('allows same-site paths only', () => {
        expect(safeNext('/training')).toBe('/training');
        expect(safeNext(null)).toBe('/');
        expect(safeNext('//evil.com')).toBe('/');
        expect(safeNext('/\\evil.com')).toBe('/');
        expect(safeNext('https://evil.com')).toBe('/');
    });
});
