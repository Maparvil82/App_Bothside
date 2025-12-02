import { translate } from './index';
import { es } from './es';

// Tipo para las claves (basado en español que es la fuente de verdad)
export type TxKeyPath = keyof typeof es;

export const useTranslation = () => {
    return {
        t: (key: TxKeyPath, options?: Record<string, string | number>) => translate(key, options),
    };
};
