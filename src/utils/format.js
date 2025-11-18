/**
 * Capitaliza la primera letra de cada palabra en un texto
 * @param {string} text - Texto a capitalizar
 * @returns {string} - Texto con la primera letra de cada palabra en mayúscula
 */
export const capitalizeName = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  return text
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

