const DEFAULT_COLOR = "#E3F6EA"; // verde estándar para cuando NO hay tag

export function getColorForTag(tag?: string) {
  if (!tag) return DEFAULT_COLOR;

  // HASH
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convertir hash → HSL pastel
  let hue = Math.abs(hash) % 360;

  // Evitar el rango verde (100–160)
  if (hue >= 100 && hue <= 160) {
    hue = (hue + 80) % 360; 
  }

  // Color estilo pastel
  return `hsl(${hue}, 65%, 85%)`;
}

