# Configuración Rápida - App_Bothside

## 🚀 Configuración Inicial

### 1. Clonar el repositorio
```bash
git clone https://github.com/Maparvil82/App_Bothside.git
cd App_Bothside
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Copia el archivo de ejemplo y configura tus credenciales:

```bash
cp config/env.example.ts config/env.ts
```

Edita `config/env.ts` y reemplaza los valores:

```typescript
export const ENV = {
  SUPABASE_URL: 'https://tu-proyecto.supabase.co',
  SUPABASE_ANON_KEY: 'tu-anon-key-aqui',
  DISCOGS_TOKEN: 'tu-token-de-discogs',
  APP_NAME: 'Bothside',
  APP_VERSION: '1.0.0',
};
```

### 4. Obtener credenciales

#### Supabase:
1. Ve a [supabase.com](https://supabase.com)
2. Crea un proyecto
3. Ve a Settings > API
4. Copia Project URL y anon key

#### Discogs:
1. Ve a [Discogs Developers](https://www.discogs.com/settings/developers)
2. Crea una aplicación
3. Copia el token

### 5. Ejecutar la aplicación
```bash
npm start
```

## 📱 Comandos útiles

```bash
# Desarrollo
npm start          # Iniciar servidor de desarrollo
npm run ios        # Ejecutar en iOS Simulator
npm run android    # Ejecutar en Android Emulator
npm run web        # Ejecutar en web

# Git
git add .          # Agregar cambios
git commit -m "mensaje"  # Hacer commit
git push           # Subir cambios a GitHub
```

## 🔐 Seguridad

- El archivo `config/env.ts` está en `.gitignore` para proteger las credenciales
- Nunca subas credenciales reales al repositorio
- Usa `config/env.example.ts` como plantilla

## 📞 Soporte

Si tienes problemas, revisa:
1. Que las credenciales estén configuradas correctamente
2. Que todas las dependencias estén instaladas
3. Los logs de error en la consola 