// cypress/support/utils.ts

export const dateString = (date: Date): string => {
  // Format strictly to MM/dd/yyyy as required by Angular Material
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
}

/**
 * Generates a random date string in 'MM/dd/yyyy' format
 * within a given range of days from today.
 * * @param minDays Minimum number of days in the future (e.g., 7 for one week)
 * @param maxDays Maximum number of days in the future (e.g., 14 for two weeks)
*/
export const generateFutureRandomDateString = (minDays: number, maxDays: number): string => {
  const today = new Date();

  // Calculate random days within the specified range
  const randomDays = Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays;

  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + randomDays);

  return dateString(futureDate);
};

/**
 * Calcula la diferencia en días desde hoy hasta una fecha dada.
 * @param dateStr Fecha en formato 'MM/dd/yyyy'
 * @returns Número de días (puede ser positivo, negativo o cero)
 */
export const daysFromToday = (dateStr: string): number => {
  const [month, day, year] = dateStr.split('/').map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(year, month - 1, day);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};