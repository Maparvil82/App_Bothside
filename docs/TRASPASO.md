# Traspaso de Bothside

Estado comprobado el 15 de noviembre de 2026.

## Qué está disponible hoy

| Destino | Versión y build | Procedencia y estado |
| --- | --- | --- |
| App Store, iPhone | **1.2.1 (52)** | La ficha pública española muestra 1.2.1 desde el 27 de julio. EAS confirma que el 52 se compiló y envió correctamente ese día desde la línea de `main`, con base registrada `0dffa51*`. [Ficha pública](https://apps.apple.com/es/app/bothside/id6757703583) · [Build](https://expo.dev/accounts/funkman_82/projects/AppBothside/builds/cf29ec16-a146-47bc-acc7-e06b6fc30d72) · [Envío](https://expo.dev/accounts/funkman_82/projects/AppBothside/submissions/faa35668-2b37-4361-a1ad-bfd21a5ad763) |
| Google Play, prueba cerrada `TesterV1` | **1.1.20 (15)**, release `beta4` | Play Console indica que está disponible para determinados testers desde el 11 de julio. EAS registra el AAB de la línea de `main` con base `0d8a26b*`. El panel muestra también una prueba interna activa y el acceso a producción aún bloqueado. [Canal cerrado](https://play.google.com/console/u/0/developers/9171103523078027080/app/4973072589962370274/tracks/4698621707701588603) · [Build](https://expo.dev/accounts/funkman_82/projects/AppBothside/builds/1b0e7562-c5df-4a0e-b45d-d8e0a1694fcc) |
| Google Play, release pendiente en `TesterV1` | **1.2.1 (16)**, `Tester-V2_color_estanteria` | El AAB se compiló el 27 de julio desde la línea de `main`, con base `0d1ffed*`. Play Console ya tiene el código 16 en la release y muestra «Aún no se ha enviado a revisión». [Release](https://play.google.com/console/u/0/developers/9171103523078027080/app/4973072589962370274/tracks/4698621707701588603/releases/7/details) · [Build](https://expo.dev/accounts/funkman_82/projects/AppBothside/builds/4ae91711-1925-4c6e-97f9-03429832c91a) |
| Apple, último envío registrado en EAS | **1.2.2 (57)** | Compilación y envío correctos el 2 de octubre desde la línea de `main`, con base `257e729*`. La ficha pública sigue en 1.2.1. App Store Connect pidió iniciar sesión, así que queda por comprobar la disponibilidad en TestFlight y el estado de revisión de 1.2.2. [Build](https://expo.dev/accounts/funkman_82/projects/AppBothside/builds/5b32d97a-cb28-446e-9b22-aebbf422e0f5) · [Envío](https://expo.dev/accounts/funkman_82/projects/AppBothside/submissions/1579eb3f-b413-42e3-b0cd-b9cce0b66cfd) |

`*` es la marca de cambios locales de EAS. Los SHA identifican las bases registradas y `main` se deduce de su historia. Para reproducir los binarios, cuenta con los cambios que había en el árbol de trabajo. `0dffa51` precede al commit que guarda el número 52 y `257e729` precede al que guarda el 57. El perfil EAS `production` genera un binario de tienda. La disponibilidad se comprueba en cada consola.

## Ramas y comparación con GitHub

En este checkout, `origin` apunta a `/Users/manuelparravillar/Documents/Proyectos/App_Bothside`. Tras ejecutar `git fetch origin`, `origin/main` pasó de `653f31c` a `c4b933d`, que coincide con el SHA consultado directamente en [GitHub](https://github.com/Maparvil82/App_Bothside/commit/c4b933d5f966576c41cca5182f89e823a467e757). La rama local `main` sigue en `653f31c`, ancestro común. Antes del commit de este documento, la divergencia era **9 commits de main y 6 de feature**.

| Rama | Para qué sirve y qué falta |
| --- | --- |
| `fix/cover-scan-expo-57` · `6703284` | Primera migración a SDK 57 con `c43bd65`, cambio de `expo-av` a `expo-audio`, ajustes al escaneo de portada, proyectos nativos regenerables y perfil de simulador iOS sin firma. Sus commits están en las otras dos ramas locales. |
| `diagnose/expo-go-57` · `3f49d79` | Diagnóstico del escáner en Expo Go. `ae011d6` aproxima el flujo al escáner de producción y `3f49d79` encamina los resultados a los tabs anidados. Falta verificar cámara, micrófono y compras con el cliente nativo en dispositivo. |
| `feature/collection-shelf-view` · `220bced` antes del traspaso | **Rama de entrega del trabajo local.** Incluye las dos anteriores, la vista de estantería `cb063f7` y los cambios de detalle y audio `220bced`. Falta incorporar la configuración nativa y la reordenación de ubicación de `origin/main` y validar en dispositivo. Para publicar, la base recomendada es `origin/main` en una rama nueva. |

### Qué aportan los nueve commits de main

| Commit | Contenido y relación con el trabajo local |
| --- | --- |
| `c41261d` · estanteria | Integra SDK 57, `expo-audio`, cambios de escáner y la estantería. Al comparar las dos puntas, `CollectionShelfView.tsx` tiene el mismo blob. `SearchScreen.tsx`, escáneres, Gemini, PurchaseService y traducciones coinciden. Main conserva `ios/` y `android/` bajo Git. La rama local usa prebuild. |
| `167b8aa` · cambio de sitio de ubicacion en detalle | Recoloca el bloque de ubicación, ajusta el color de tab activo y elimina la devolución de fila de `AlbumService.updateAlbum`. Incluye el mismo arreglo de desmontaje del grabador que `220bced`. Ambas ramas montan el grabador solo cuando se abre. Queda por trasladar el encabezado del detalle dentro del contenido, conservando la nueva posición de la ubicación. |
| `82cbd14` · depliegue 53 | Prepara 1.2.1 (53). EAS registra la compilación como fallida. [Build 53](https://expo.dev/accounts/funkman_82/projects/AppBothside/builds/1170592b-f56f-4756-bf09-ab11f8a4d522) |
| `fedc144` · cambio de version y depliegue | Pasa a 1.2.2 (54). La compilación 54 falló. |
| `c6e7117` · mínimo iOS 16.4 | Sube el mínimo en el proyecto Xcode y el `Podfile` de 15.1 a 16.4. La ficha de 1.2.1 aún indica 15.1. |
| `fe247f3` · cambio de | Sube a 1.2.2 (55). La compilación 55 falló. |
| `a346b93` · delegate | Cambia la importación de Expo a `internal import Expo` en `AppDelegate.swift`. |
| `257e729` · fallo | Ajusta la visibilidad de `AppDelegate`, quita `bindReactNativeFactory(factory)` y guarda el 56. El 56 falló. EAS registró este SHA con cambios locales como base del 57 que sí compiló. |
| `c4b933d` · fix(ios) AppDelegate | El título alude a AppDelegate, pero el diff solo guarda el 57 en `app.json` e `Info.plist`. Los cambios Swift vienen de los dos commits anteriores. |

### Cómo juntarlas

1. Crear una rama de integración desde `origin/main`, por ejemplo `git switch -c integrate/expo57-shelf origin/main`. Esta base conserva los proyectos nativos que se usaron en el build 57. Si interesa la regeneración con prebuild, probarla en una rama aparte.
2. Revisar `git show 220bced`. Trasladar el encabezado localizado a `AlbumDetailScreen.tsx` y el título vacío a `AppNavigator.tsx`, preservando el botón de volver y la ubicación en la posición de main. El arreglo de audio ya es idéntico. Revisar los consumidores de `AlbumService.updateAlbum` por si alguno necesita la fila que antes devolvía.
3. Incorporar el perfil `development-simulator` de `6703284` y el dev client si se van a usar. La rama local asigna identificadores `.dev` vía `APP_VARIANT` en `app.config.js`. Con proyectos nativos en Git, comprobar el bundle y paquete efectivos del binario antes de instalarlo junto a la app de tienda.
4. Revisar el diff y las versiones por plataforma. La simulación con `git merge-tree --name-only origin/main 220bced` mostró seis conflictos de borrado/modificación en iOS y dos de contenido en `package.json` y `package-lock.json`. Los borrados de otros archivos nativos también entrarían en ese merge. La transferencia puntual preserva Xcode, Pods, Swift y Gradle.

## Producto y trabajo pendiente

- La propuesta es encontrar el vinilo físico a partir de su estantería y hueco. Discogs aporta el catálogo y las ediciones. «Sacar temporalmente» conserva la ubicación habitual y las maletas tienen su flujo propio, incluidas las compartidas. La simplificación a «solo catalogador» se llegó a valorar y queda como decisión de producto pendiente.
- El modelo pasó del paywall en onboarding a freemium. La decisión más reciente registrada es **20 discos gratis** y paywall al intentar añadir el 21.º, con **un escaneo de lomo gratis** y paywall en el segundo. La referencia inicial era 14,99 €/año con 14 días de prueba y 4,99 €/mes. Confirmar precio, planes y elegibilidad de prueba en las tiendas y en el offering antes de actualizar el copy.
- El incentivo anunciado para la beta Android era un año de Pro al añadir al menos cinco discos, una estantería y una maleta. El objetivo de captación era 20 personas. Play Console muestra para esta cuenta un mínimo de **12 testers inscritos de forma continua durante 14 días** y la solicitud de acceso a producción sigue deshabilitada.
- En estantería quedan por probar colecciones antiguas y grandes, registros sin ubicar, huecos vacíos, colores, discos temporalmente fuera, mover entre huecos y persistencia al volver del detalle. Revisar también cuadrícula/lista, los siete idiomas y cómo quedan el encabezado y la ubicación juntos.
- En Expo 57 probar portada reconocida, ambigua y sin coincidencias, selección de edición, importación, lomo, código de barras, permisos y navegación de vuelta. En audio probar cerrar el modal durante una grabación, reabrir, guardar, reproducir, cambiar de pantalla y denegar permiso. Expo Go sirve para diagnóstico. Las compras, la firma y el comportamiento del binario se validan en un cliente nativo.

## Servicios externos y nombres de variables

| Servicio | Qué recuperar o comprobar |
| --- | --- |
| Supabase | Proyecto `jbzafvoavdbcwfgoyrzl` en Frankfurt. Storage confirma los buckets públicos `albums`, `avatars`, `covers` y `list-covers`. Revisar políticas de escritura, Auth y redirecciones de los esquemas de app antes de probar una instalación nueva. Variables de cliente `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`. En servidor aparecen `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y el alias `SERVICE_ROLE_KEY`. Mantener los roles privilegiados en servidor. [Proyecto](https://supabase.com/dashboard/project/jbzafvoavdbcwfgoyrzl) |
| Edge Functions | Hay funciones activas que no viajan con el checkout, entre ellas `search-discogs`, `fetch-discogs-release-details`, `fetch-discogs-master-versions`, `fetch-master-versions`, `enqueue-discogs-import`, `process-discogs-import-queue`, `recognize-audio-audd`, `get-collection-prices`, `process-music-query` y las de maletas/listas. `save-discogs-release`, `get-leaderboard`, `delete-account`, `update-youtube-videos` y `extract-youtube-audio` constan tanto en Git como activas. `audio-fingerprint` está en Git y no figura activa. Recuperar el código y los nombres de secretos de las funciones que falten antes de reconstruir el backend. [Funciones](https://supabase.com/dashboard/project/jbzafvoavdbcwfgoyrzl/functions) |
| Discogs, cámara y vídeo | `DISCOGS_TOKEN` en Edge. El cliente contempla `EXPO_PUBLIC_DISCOGS_TOKEN`, `EXPO_PUBLIC_GEMINI_API_KEY`, `EXPO_PUBLIC_GOOGLE_VISION_API_KEY` y `EXPO_PUBLIC_YOUTUBE_API_KEY`. Los nombres `EXPO_PUBLIC_*` corresponden a valores expuestos en el binario. Comprobar restricciones y cuotas de los proveedores. |
| RevenueCat | Dos apps de tienda, con `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` y `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`. Confirmar offering actual, entitlement `pro`, suscripción por tienda y paquetes de créditos. El cliente busca `bothside_credits_50`, `bothside_credits_200` y `bothside_credits_master`. La referencia histórica al pack de 500 usa otra nomenclatura. Comparar contra ambos catálogos antes de tocar los IDs. Probar compra nueva, restauración, cancelación y login con la misma identidad. |
| PostHog | `EXPO_PUBLIC_POSTHOG_KEY` y `EXPO_PUBLIC_POSTHOG_HOST` figuran en la configuración local. La lectura directa del host no aparece en el cliente de esta rama. Revisar la inicialización y Live Events con una compilación de distribución. En una prueba previa faltó la configuración de producción. |
| EAS | Cuenta/proyecto `@funkman_82/AppBothside`. Ambas ramas incluyen `development` (cliente interno), `preview` (distribución interna), `production` (tienda y autoincremento) y submit `production`. Solo la rama local añade `development-simulator`. La fuente de números es `local`. Revisar variables por entorno y las credenciales administradas para cada plataforma. En iOS, certificado y provisioning, más la clave de App Store Connect si se usa EAS Submit. En Android, upload keystore y cuenta de servicio si se automatiza el envío. Queda por verificar vigencia y permisos de las credenciales. [EAS](https://expo.dev/accounts/funkman_82/projects/AppBothside) |
| App Store Connect | App `6757703583`, bundle `com.manuelparra.bothside`, solo iPhone. Revisar el 57 en TestFlight y en Distribución con una sesión válida. Confirmar compras, localizaciones, capturas y estado de revisión. [App Store Connect](https://appstoreconnect.apple.com/apps/6757703583/distribution) |
| Play Console | Paquete `com.manuelparra.bothside`, canal cerrado activo `TesterV1`. Revisar Resumen de publicación, release pendiente, testers, Play App Signing y monetización. El panel pide declarar el estado de operador antes de febrero de 2027. [Panel de Bothside](https://play.google.com/console/u/0/developers/9171103523078027080/app/4973072589962370274/app-dashboard) |

## Orden recomendado para publicar

1. Integrar desde el `origin/main` verificado y fijar el commit candidato. Alinear dependencias y lockfile. Comprobar los números efectivos en `app.json`, `Info.plist`, Xcode y Gradle. En `c4b933d` ya hay 1.2.2 (57) para iOS, mientras Gradle conserva 1.2.1 (16). Elegir los siguientes números a partir de los aceptados por las tiendas y de `autoIncrement`.
2. Verificar credenciales y variables por entorno. Probar el candidato nativo en iPhone y Android tanto con instalación limpia como actualizando desde la versión de tienda o beta. Priorizar colección, ubicación, escaneo, audio y compra/restauración.
3. En Apple, revisar primero el estado del 57. Si se necesita un nuevo binario con el encabezado integrado, elegir un número posterior y pasar por TestFlight antes de enviarlo a revisión. Comprobar el mínimo iOS 16.4 y su impacto en usuarios de 15.1 a 16.3.
4. En Play, decidir si enviar a revisión el 16 pendiente para avanzar el testing o reemplazarlo con un AAB posterior del candidato verificado. Confirmar qué versión entrega el canal cerrado y seguir el contador de testers antes de solicitar acceso a producción.
5. Registrar por plataforma versión, número, SHA, perfil, URL de build y canal. Crear los builds de tienda desde commits completos para evitar otra referencia EAS con asterisco.

### Archivos locales y revisión

- La entrega de app contiene los tres cambios TSX de `220bced` y este documento. Se revisaron los diffs y la sintaxis TSX. No se ejecutaron builds.
- El `.gitignore` de la app cubre `.env`, `.env*.local`, `.expo/`, `dist/`, `web-build/`, credenciales nativas habituales y directorios nativos nuevos. `.env.production`, un AAB/IPA en raíz y un `tmp/` nuevo quedan fuera de las reglas. Además, `tmp/bundle.hbc` y varios assets bajo `tmp/` ya estaban versionados desde `476059c` y requieren una limpieza independiente. Preparar commits por rutas explícitas.
- Para la subida manual, recordar que `origin` de la app apunta a un checkout local. El destino de GitHub es `Maparvil82/App_Bothside` y la rama de entrega es `feature/collection-shelf-view`.

## Landing

- Repo `Maparvil82/Landing_Bothside`. El último despliegue de producción listo en Vercel corresponde a **`efa367a`** de **`redesign/commercial-3d`**. El anterior era `d7442c6` de `main`, que corrige el enlace de App Store. [Dominio](https://landing-bothside.vercel.app/) · [Despliegue de producción](https://vercel.com/maparvil-gmailcoms-projects/landing-bothside/HF73zs285PWbXD6zt99mh9vejG9q)
- **`1e7fb17`** guarda el hero pendiente en `src/App.tsx` y `src/index.css`. Sustituye la funda y el vinilo del rediseño anterior por una estantería con desplazamiento lateral, ligada a la promesa de encontrar cada disco. Se verificó el diff y la sintaxis TSX. Queda revisar el hero sticky y la transición hacia las siguientes secciones en Safari, Chrome, pantallas bajas, móvil y movimiento reducido.
- Vercel usa Vite. Formspree recibe las altas de Android y Vercel Web Analytics mide visitas. La rama no lee variables `VITE_*`. Verificar en preview el enlace de App Store, el envío y la recepción del formulario, la analítica y el copy de Android según el canal real. Confirmar en Vercel la rama configurada como producción antes de elegir cómo desplegar.
- El `.gitignore` de la landing cubre `dist/`, `.vercel`, `.env*` y vídeos. El commit contiene solo los dos archivos solicitados. La próxima secuencia es subir la rama manualmente, revisar una preview y publicar el commit elegido desde Vercel.
