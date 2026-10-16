
export const sanitizeId = (input) => {
  if (!input) return '';

  // Handle special calc() syntax first, don't sanitize the expression
  const calcMatch = input.match(/^calc\((.+)\)$/);
  if (calcMatch) {
      // We don't touch the inside of calc() as it contains formulas
      return `calc(${calcMatch[1]})`;
  }

  // Handle special docso() syntax
  const docsoMatch = input.match(/^docso\(([^)]+)\)$/);
  let content = input;
  let isDocso = false;
if (docsoMatch) {
    content = docsoMatch[1];
    isDocso = true;
  }

  // Transliterate Vietnamese and other accented characters
  let sanitized = content.toString()
    .toLowerCase()
    .trim()
    // Decompose accented characters into base character + combining mark
    .normalize('NFD') 
    // Remove the combining marks (diacritics)
    .replace(/[\u0300-\u036f]/g, '')
    // Special handling for the Vietnamese letter 'đ'
    .replace(/[đĐ]/g, 'd');

  // Replace spaces with underscores and remove any remaining invalid characters
  sanitized = sanitized
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  if (isDocso) {
    return `docso(${sanitized})`;
  }

  return sanitized;
};
