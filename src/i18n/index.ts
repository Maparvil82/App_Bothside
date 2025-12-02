import { getLocales } from 'expo-localization';
import { es } from './es';
import { en } from './en';

// Detección del idioma del dispositivo
const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';
const isSpanish = deviceLanguage.includes('es');

// Idioma activo
export const activeLocale = isSpanish ? 'es' : 'en';

// Diccionarios
export const translations = {
    es,
    en,
};

// Función de traducción simple
export const translate = (key: keyof typeof es, options?: Record<string, string | number>) => {
    const lang = activeLocale;
    // @ts-ignore
    let text = translations[lang][key];

    // Fallback a ES si falta en EN (o viceversa, pero ES es la base)
    if (!text && lang === 'en') {
        // @ts-ignore
        text = translations['es'][key];
    }

    // Fallback a EN si falta en ES (caso raro si ES es base)
    if (!text && lang === 'es') {
        // @ts-ignore
        text = translations['en'][key];
    }

    if (text && options) {
        Object.keys(options).forEach(option => {
            text = text.replace(new RegExp(`{${option}}`, 'g'), String(options[option]));
        });
    }

    return text || key;
};
