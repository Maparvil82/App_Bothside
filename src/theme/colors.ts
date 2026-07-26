export const AppColors = {
    primary: '#000',
    dark: {
        primary: '#ff9800ff',

    }
    // Add other shared colors here if needed
};

export const ShelfColors = {
  green: { text: '#28a745', bg: '#e8f5e9' },
  blue: { text: '#0284c7', bg: '#e0f2fe' },
  red: { text: '#dc2626', bg: '#fee2e2' },
  purple: { text: '#7c3aed', bg: '#f3e8ff' },
  orange: { text: '#d97706', bg: '#fef3c7' },
  teal: { text: '#0d9488', bg: '#f0fdfa' },
};

export const getShelfColor = (colorName?: string) => {
  const name = (colorName && ShelfColors[colorName as keyof typeof ShelfColors]) ? colorName : 'green';
  return ShelfColors[name as keyof typeof ShelfColors];
};

