export const stringToBool = (value?: string): boolean => {
  if (!value) {
    return false;
  }
  value = value.toLowerCase();

  return value === 'true' || value === '1';
};
