import { test, expect, describe } from 'bun:test';
import { joinOmitSeperatorOnLast } from './arrayUtil';

describe('joinOmitSeperatorOnLast Tests', () => {
    test('should return empty string when input array is empty', () => {
        const result = joinOmitSeperatorOnLast([], ',');
        expect(result).toBe('');
    });

    test('should return the only element in the array when input array has only one element', () => {
        const result = joinOmitSeperatorOnLast(['a'], ',');
        expect(result).toBe('a');
    });

    test('should return the elements in the array joined by the seperator except the last element', () => {
        const result = joinOmitSeperatorOnLast(['a', 'b', 'c'], ',');
        expect(result).toBe('a,b,c');
    });
});
