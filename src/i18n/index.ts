import { getLocales } from 'expo-localization';
import { es } from './es';
import { en } from './en';
import { fr } from './fr';
import { it } from './it';
import { de } from './de';
import { pt } from './pt';
import { ja } from './ja';

// Detección del idioma del dispositivo
const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';

// Idioma activo (Fallback a EN si no es uno de los soportados)
// Supported: es, en, fr, it, de, ja, pt
let detectedLocale = 'en';
if (deviceLanguage.startsWith('es')) detectedLocale = 'es';
else if (deviceLanguage.startsWith('fr')) detectedLocale = 'fr';
else if (deviceLanguage.startsWith('it')) detectedLocale = 'it';
else if (deviceLanguage.startsWith('de')) detectedLocale = 'de';
else if (deviceLanguage.startsWith('ja')) detectedLocale = 'ja';
else if (deviceLanguage.startsWith('pt')) detectedLocale = 'pt';
else detectedLocale = 'en';

export const activeLocale = detectedLocale;

// Diccionarios
export const translations = {
    es,
    en,
    fr,
    it,
    de,
    ja,
    pt,
};

// Función de traducción simple
export const translate = (key: keyof typeof es, options?: Record<string, string | number>) => {
    const lang = activeLocale;
    // @ts-ignore
    let text = translations[lang]?.[key];

    // Fallback logic
    if (!text) {
        // Fallback to ES if active is not ES (Since ES is base)
        if (lang !== 'es') {
            // @ts-ignore
            text = translations['es']?.[key];
        }

        // If still empty (e.g. creating new keys in EN but missing in ES), try EN
        if (!text && lang !== 'en') {
            // @ts-ignore
            text = translations['en']?.[key];
        }
    }

    if (text && options) {
        Object.keys(options).forEach(option => {
            text = text.replace(new RegExp(`{${option}}`, 'g'), String(options[option]));
        });
    }

    return text || key;
};
