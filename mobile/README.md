# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

# Proyecto iAlert

Este proyecto se compone de dos partes:
* `/backend`: El backend de Node.js, Express y Drizzle.
* `/mobile`: La aplicación móvil de React Native (Expo).

---

## 🚀 Cómo Ejecutar el Proyecto

Debes ejecutar **ambas partes** (backend y mobile) en terminales separadas.

### 1. Configuración del Backend

1.  Navega a la carpeta del backend:
    ```bash
    cd backend
    ```
2.  Instala las dependencias:
    ```bash
    npm install
    ```
3.  **Crea tu archivo de secretos:** Crea un archivo llamado `.env` en la carpeta `backend/` y copia el contenido de `.env.example`.
4.  **Completa el `.env`:** Necesitarás agregar la URL de tu base de datos PostgreSQL, tu llave secreta de Clerk y tu clave de API de OpenWeatherMap.
5.  Ejecuta las migraciones de la base de datos:
    ```bash
    npx drizzle-kit push:pg
    ```
6.  Inicia el servidor:
    ```bash
    node src/server.js
    ```
    El servidor se ejecutará en `http://localhost:5001`.

### 2. Configuración de la App Móvil

1.  En una **nueva terminal**, navega a la carpeta de la app móvil:
    ```bash
    cd mobile
    ```
2.  Instala las dependencias:
    ```bash
    npm install
    ```
3.  **Crea tu archivo de secretos:** Crea un archivo llamado `.env` en la carpeta `mobile/` y copia el contenido de `.env.example`. Agrega tu `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.
4.  **Encuentra la dirección IP de tu computadora.**

    > **Cómo encontrar tu IP:**
    > * **Mac:** Ve a Configuración del Sistema > Wi-Fi > Detalles... > Dirección IP.
    > * **Windows:** Abre el Símbolo del sistema (cmd) y escribe `ipconfig`. Busca la "Dirección IPv4".
    > * Se verá algo como `192.168.1.X` o `10.0.0.X`.

5.  **Crea el archivo de configuración de la API:** Crea un nuevo archivo en `mobile/app/constants/api.js`.
6.  Copia el contenido de `mobile/app/constants/api.js.example` en tu nuevo archivo `api.js` y **reemplaza `"YOUR_LOCAL_IP_HERE"` con tu IP real** del Paso 4.
7.  Construye y ejecuta la app:
    ```bash
    npx expo run:ios
    ```
    (o `npx expo run:android`)