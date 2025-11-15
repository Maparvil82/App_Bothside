/**
 * Formatea un valor numérico como moneda en formato español (EUR)
 * Si el valor es entero, no muestra decimales (ej: "40 €" en lugar de "40,00 €")
 * Si el valor tiene decimales, muestra 2 decimales (ej: "40,50 €")
 */
export const formatCurrencyES = (value: number): string => {
  return value.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
};

