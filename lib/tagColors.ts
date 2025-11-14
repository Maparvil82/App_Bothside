/**
 * Genera un color pastel único basado en el nombre del tag.
 * 
 * @param tag - El nombre del tag (puede ser null, undefined o string vacío)
 * @returns Un color hexadecimal en formato "#RRGGBB"
 */
export function getColorForTag(tag: string | null | undefined): string {
  const DEFAULT_COLOR = "#E3F6EA"; // verde base para "sin tag"

  // Si el tag está vacío, null o undefined, devolver el color por defecto
  if (!tag || tag.trim() === '') {
    return DEFAULT_COLOR;
  }

  // Función hash simple para convertir el string en un número
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    const char = tag.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a entero de 32 bits
  }

  // Convertir el hash a un valor positivo
  const positiveHash = Math.abs(hash);

  // Generar un hue (0-360) evitando el rango de verdes (100-160)
  let hue = positiveHash % 360;

  // Si el hue cae en el rango de verdes, ajustarlo
  if (hue >= 100 && hue <= 160) {
    // Mapear el rango 100-160 a otros rangos
    // Dividir en dos: 100-130 -> 0-30, 131-160 -> 200-230
    if (hue <= 130) {
      hue = hue - 100; // 0-30
    } else {
      hue = 200 + (hue - 131); // 200-230
    }
  }

  // Saturación y luminosidad fijas para colores pastel
  const saturation = 60; // 60%
  const lightness = 85; // 85%

  // Convertir HSL a RGB
  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l; // acromático
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  };

  const [r, g, b] = hslToRgb(hue, saturation, lightness);

  // Convertir RGB a hexadecimal
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

