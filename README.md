# Bothside - App de Música con React Native y Expo

Una aplicación móvil para buscar y descubrir música usando la API de Discogs, con autenticación y base de datos en Supabase.

## 🚀 Características

- 🔐 Autenticación con Supabase
- 🎵 Búsqueda de discos con la API de Discogs
- 📱 Interfaz nativa con React Native y Expo
- 🔄 Navegación por pestañas
- 💾 Persistencia de sesión
- 🎨 Diseño moderno y responsive

## 📋 Prerrequisitos

- Node.js (versión 16 o superior)
- npm o yarn
- Expo CLI
- Cuenta en Supabase
- Token de la API de Discogs

## 🛠️ Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <tu-repositorio>
   cd App_Bothside
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   
   Edita el archivo `config/env.ts` y reemplaza los valores con tus credenciales:

   ```typescript
   export const ENV = {
     // Supabase - Obtén estos valores de tu proyecto en Supabase
     SUPABASE_URL: 'https://tu-proyecto.supabase.co',
     SUPABASE_ANON_KEY: 'tu-anon-key',
     
     // Discogs API - Obtén tu token en https://www.discogs.com/settings/developers
     DISCOGS_TOKEN: 'tu-discogs-token',
     
     // App
     APP_NAME: 'Bothside',
     APP_VERSION: '1.0.0',
   };
   ```

## 🔧 Configuración

### Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Ve a Settings > API y copia:
   - Project URL
   - anon/public key
4. Actualiza `config/env.ts` con estos valores

### Discogs API

1. Ve a [Discogs](https://www.discogs.com/settings/developers)
2. Crea una nueva aplicación
3. Copia el token generado
4. Actualiza `config/env.ts` con el token

## 🏃‍♂️ Ejecutar la aplicación

### Desarrollo

```bash
# Iniciar el servidor de desarrollo
npm start

# O usar Expo CLI directamente
npx expo start
```

### Plataformas específicas

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Web
npm run web
```

## 📱 Estructura del proyecto

```
App_Bothside/
├── config/
│   └── env.ts              # Configuración de variables de entorno
├── contexts/
│   └── AuthContext.tsx     # Contexto de autenticación
├── lib/
│   └── supabase.ts         # Cliente de Supabase
├── navigation/
│   └── AppNavigator.tsx    # Navegación principal
├── screens/
│   ├── LoginScreen.tsx     # Pantalla de login/registro
│   ├── SearchScreen.tsx    # Pantalla de búsqueda
│   └── ProfileScreen.tsx   # Pantalla de perfil
├── services/
│   └── discogs.ts          # Servicio de API de Discogs
├── types/
│   └── index.ts            # Tipos TypeScript
├── App.tsx                 # Componente principal
└── package.json
```

## 🔐 Autenticación

La aplicación usa Supabase para la autenticación con las siguientes características:

- Registro de usuarios con email y contraseña
- Inicio de sesión
- Persistencia de sesión
- Cierre de sesión
- Validación de formularios

## 🎵 API de Discogs

La aplicación integra la API de Discogs para:

- Búsqueda de discos por título, artista, etc.
- Paginación de resultados
- Información detallada de releases
- Imágenes de portada

## 🎨 Características de la UI

- Diseño nativo para iOS y Android
- Navegación por pestañas
- Indicadores de carga
- Manejo de errores
- Interfaz responsive

## 🚨 Solución de problemas

### Error de configuración
Si ves advertencias sobre variables de entorno faltantes, asegúrate de configurar correctamente `config/env.ts`.

### Error de conexión a Supabase
Verifica que las credenciales de Supabase sean correctas y que el proyecto esté activo.

### Error de API de Discogs
Verifica que el token de Discogs sea válido y que no hayas excedido los límites de la API.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

Si tienes problemas o preguntas, crea un issue en el repositorio. 