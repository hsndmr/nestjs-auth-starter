import { stringToBool } from './string-to-bool';

describe('stringToBool', () => {
  it("returns true when given 'true'", () => {
    const result = stringToBool('true');
    expect(result).toBe(true);
  });

  it("returns true when given 'TRUE'", () => {
    const result = stringToBool('TRUE');
    expect(result).toBe(true);
  });

  it("returns false when given 'false'", () => {
    const result = stringToBool('false');
    expect(result).toBe(false);
  });

  it("returns false when given 'FALSE'", () => {
    const result = stringToBool('FALSE');
    expect(result).toBe(false);
  });

  it("returns true when given '1'", () => {
    const result = stringToBool('1');
    expect(result).toBe(true);
  });

  it("returns false when given '0'", () => {
    const result = stringToBool('0');
    expect(result).toBe(false);
  });

  it('returns false when given an empty string', () => {
    const result = stringToBool('');
    expect(result).toBe(false);
  });

  it('returns undefined when given undefined', () => {
    const result = stringToBool(undefined);
    expect(result).toBe(false);
  });

  it('returns undefined when given null', () => {
    const result = stringToBool(null);
    expect(result).toBe(false);
  });
});
