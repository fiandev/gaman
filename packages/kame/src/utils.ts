/**
 * Mengubah karakter pertama menjadi huruf besar
 * Contoh: userCreator -> UserCreator
 */
export const capitalize = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Mengubah karakter pertama menjadi huruf kecil
 * Contoh: UserProfile -> userProfile
 */
export const toCamelCase = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
};