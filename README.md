# Treino

App personal de entrenamiento, nutrición y progreso corporal. React + Vite, con autenticación y sincronización en Supabase. Diseño oscuro, morado y mobile-first.

## Desarrollo

Usa Node.js 22 o superior. Instala las dependencias con `npm ci` y configura en `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-publica-anon
```

`npm run dev` inicia Vite. Solo deben usarse claves públicas en las variables `VITE_*`.

## Verificación

- `npm test`: códigos EAN/UPC, confirmación de lecturas, resumen semanal y caché offline.
- `npm run test:build`: build de producción y comprobación de que todas las pantallas y sus estilos se incluyen en la caché offline.
- `npm run preview`: sirve el build generado para revisión local.

La verificación en iPhone/Safari debe incluir teclado y modales, cámara, navegación del historial y reapertura de la PWA sin conexión. Las pruebas automatizadas no sustituyen esa revisión en el dispositivo.

## Publicación

`main` despliega automáticamente a producción en Vercel. Trabaja en una rama de feature/fix y revisa su Vercel Preview antes de integrar. Las actualizaciones de la PWA esperan a que se cierren las pestañas y ventanas abiertas de Treino para mantener juntos el HTML y los archivos de cada versión.

Open Food Facts y el lector Quagga2 conservan sus integraciones gratuitas. El catálogo local y los registros guardados en el dispositivo pueden usarse sin conexión; la búsqueda externa y la sincronización necesitan conectividad.
