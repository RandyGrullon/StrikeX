# 🎳 StrikeX — Gestión completa de ligas de boliche

App **React Native (Expo) + Supabase** para administrar ligas de boliche de punta a punta:
ligas, equipos, jugadores, calendario, captura de puntajes, standings, promedios, handicap,
estadísticas avanzadas, torneos especiales y notificaciones. Corre en **iOS, Android y web**
con diseño oscuro moderno y full responsive.

## Roles

- **Administrador**: crea ligas, equipos, jugadores, jornadas y partidos; captura puntajes;
  crea torneos; envía avisos. **El primer usuario que se registra se vuelve admin automáticamente.**
- **Jugador**: ve standings, calendario, sus estadísticas y notificaciones.

## Setup (3 pasos)

### 1. Base de datos

En tu proyecto de Supabase: **SQL Editor → New query**, pega el contenido completo de
[`supabase/migrations/001_schema.sql`](supabase/migrations/001_schema.sql) y ejecútalo.
Eso crea todas las tablas, vistas (standings, promedios, handicap) y políticas de seguridad.

> Recomendado: en **Authentication → Providers → Email**, desactiva "Confirm email" si
> quieres que los usuarios entren sin confirmar correo.

### 2. Credenciales

Edita el archivo `.env` en la raíz con los datos de **Project Settings → API**:

```
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

### 3. Arrancar

```bash
npm install
npx expo start          # escanea el QR con Expo Go, o presiona w para web
```

## Flujo de uso

1. **Regístrate** (el primer usuario es admin).
2. En **Perfil → Crear nueva liga**: configura juegos por serie, sistema de puntos y handicap
   (fórmula `(Base − Promedio) × %`, con tope opcional).
3. En **Administrar liga**: agrega equipos, jugadores (con promedio inicial opcional y
   vinculación a cuentas), y jornadas con sus partidos.
4. En **Calendario**, toca un partido para **capturar el pinfall** de cada jugador por juego.
   El handicap se congela automáticamente con el promedio del momento.
5. **Posiciones, Estadísticas y el Inicio** se calculan solos: puntos por juego y por serie
   (con handicap), promedios, juego alto, serie alta, récords y evolución por jornada.

## Torneos especiales

- **⚔️ Eliminación directa**: selecciona jugadores de una liga, se genera el bracket al azar
  (con byes si son non), capturas duelos y avanzas rondas hasta tener campeón.
- **🎯 Por puntos**: agrega "juegos" para todos los participantes y la tabla se ordena por
  pinfall total acumulado.

## Notificaciones

- Los avisos del admin (**Perfil → Enviar aviso**) aparecen in-app para todos, con contador
  de no leídos.
- **Push (opcional)**: la app registra el token de Expo de cada dispositivo. Para que los
  avisos lleguen como push, despliega la edge function:

  ```bash
  supabase functions deploy send-push
  ```

  La app la invoca automáticamente al enviar un aviso; si no está desplegada, el aviso
  in-app funciona igual. Nota: el push requiere un development build (`npx expo run:android`
  / `run:ios` o EAS); en Expo Go las push tienen limitaciones.

## Estructura

```
supabase/
  migrations/001_schema.sql    # esquema completo + RLS + vistas
  functions/send-push/         # edge function de push (opcional)
src/
  app/                         # rutas (expo-router)
    (auth)/                    # login y registro
    (tabs)/                    # inicio, posiciones, calendario, estadísticas, perfil
    league/                    # crear y administrar ligas
    match/[id].tsx             # captura de puntajes
    tournaments/               # torneos especiales
    notifications/             # avisos
  components/                  # UI kit (Card, Button, Select, etc.)
  context/                     # sesión (Auth) y liga seleccionada
  hooks/                       # queries de React Query + push token
  lib/                         # cliente supabase, theme, tipos, formato
```

## Cómo se calculan los puntos

Por cada juego de un partido se comparan los totales de equipo **(pinfall + handicap)**:
el ganador se lleva los "puntos por juego" de la liga (empate reparte mitad). Al final se
compara el total de la serie para los "puntos por serie". Todo se calcula en vistas SQL,
así que nunca hay resultados desactualizados.
