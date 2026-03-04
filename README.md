# PokéIdle - Roguelike Trainer

Un juego inactivo (idle) y roguelike de entrenamiento de Pokémon construido con React, TypeScript y Tailwind CSS, con integración de Supabase para guardado en la nube y autenticación de Google.

## Características

- **Combate Automático:** Envía a tus Pokémon a expediciones en diversas zonas.
- **Captura y Evolución:** Atrapa nuevos Pokémon y evolucionalos cuando alcancen el nivel y condiciones necesarias.
- **Sistema de Genética:** Los Pokémon tienen IVs, EVs y Naturalezas que afectan sus estadísticas máximas.
- **Guardado en la Nube:** Tu progreso (estado de la partida, Pokémon desbloqueados, historial) se guarda en Supabase, vinculado a tu cuenta de Google.
- **Estética Retro:** UI pixel-art inspirada en los juegos clásicos.

## Estructura del Proyecto

- `src/components`: Componentes de interfaz de usuario (botones, modales, etc.).
- `src/context`: Estados globales de la aplicación (`GameContext`, `AuthContext`).
- `src/engine`: Lógica principal del juego (combate, estadísticas, objetos).
- `src/features`: Funcionalidades específicas agrupadas (meta-progresión, partida activa, entrenamiento).
- `src/pages`: Vistas principales (`AuthPage`, `GamePage`).
- `src/services`: Integraciones con APIs externas (PokeAPI, Supabase).
- `src/types`: Definiciones de TypeScript.

## Requisitos Previos

- Node.js (v18 o superior)
- npm o yarn
- Una cuenta de Supabase (para la base de datos y autenticación)
- Un proyecto en Google Cloud Console (para las credenciales de OAuth)

## Configuración del Entorno Local

1.  **Clona el repositorio:**

    ```bash
    git clone https://github.com/tu-usuario/pokeidle.git
    cd pokeidle
    ```

2.  **Instala las dependencias:**

    ```bash
    npm install
    ```

3.  **Configura las variables de entorno:**
    - Copia el archivo `.env.example` a `.env.local`:
      ```bash
      cp .env.example .env.local
      ```
    - Llena las variables con tu URL y tu clave pública anónima de Supabase.

    > [!IMPORTANT]
    > **Medida de Seguridad:** Nunca incluyas el archivo `.env` o `.env.local` en tus commits de Git. Asegúrate de que `.env.local` esté en tu `.gitignore` para no exponer tus claves de Supabase.

4.  **Configura la Base de Datos (Supabase):**
    - Ve al editor SQL en tu panel de Supabase.
    - Pega y ejecuta el contenido del archivo `supabase_schema.sql` que se encuentra en la raíz del proyecto. Esto creará la tabla `user_profiles`, las políticas de seguridad (RLS) y los triggers necesarios.

5.  **Configura Google OAuth:**
    - Obtén tu _Client ID_ y _Client Secret_ desde Google Cloud Console.
    - Enlaza estas credenciales en el panel de Supabase (Authentication > Providers > Google).

6.  **Inicia el servidor de desarrollo:**
    ```bash
    npm run dev
    ```

## Despliegue (Deploy) para Beta Testers

Para que otros puedan probar el juego sin tener que instalarlo localmente, puedes desplegarlo en Vercel o Netlify.

### Vercel (Recomendado)

1.  Asegúrate de haber hecho push de tu código a un repositorio de GitHub.
2.  Entra a [Vercel](https://vercel.com/) e importa tu repositorio.
3.  En la configuración del proyecto en Vercel, ve a la sección de **Environment Variables** y añade:
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`
4.  Haz clic en **Deploy**.

> [!WARNING]
> **Configuración Final Crucial:**
> Después de desplegar, obtendrás una URL pública (ej. `https://pokeidle-beta.vercel.app`).
> DEBES agregar esta URL como un "Origen autorizado" en tu cliente de Google Cloud Console y como una redirección válida en el panel de configuración de URLs de Supabase, de lo contrario el inicio de sesión fallará en el entorno online.

## Seguridad: Mejores Prácticas

1.  **Row Level Security (RLS) en Supabase:** La base de datos está configurada con políticas RLS obligatorias. Esto asegura que la API solo responderá cuando un usuario pida sus _propios_ datos guardados (`auth.uid() = id`), mitigando la manipulación de estados de otros jugadores mediante peticiones externas.
2.  **Manejo de Secrets:** Las claves que están en tu `.env` (anon key) son seguras para el cliente (Vite las compila gracias al prefijo `VITE_`), siempre y cuando el RLS esté activo en tus tablas. **Nunca** uses una _Service Role Key_ (llave maestra) en el lado del cliente (código de React).
3.  **App en Producción de Google Cloud:** Si mantienes la App OAuth de Google en estado de "Prueba" (Testing), recuerda que solo las personas en tu lista explícita de "Test Users" podrán ingresar. Una vez que estés listo para un público abierto, asegúrate de publicar (Publish) la App OAuth.
