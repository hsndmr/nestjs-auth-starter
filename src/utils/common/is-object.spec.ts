import { isObject } from './is-object';

describe('isObject function', () => {
  it('should return true for an object with attributes', () => {
    const obj = { name: 'John', age: 30 };
    expect(isObject(obj)).toBe(true);
  });

  it('should return false for a non-object parameter', () => {
    expect(isObject('string')).toBe(false);
    expect(isObject(123)).toBe(false);
    expect(isObject(true)).toBe(false);
    expect(isObject(null)).toBe(false);
    expect(isObject(undefined)).toBe(false);
  });

  it('should return false for an array', () => {
    const arr = [1, 2, 3];
    expect(isObject(arr)).toBe(false);
  });
});
