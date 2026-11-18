# Mis Nóminas

App para iPhone (Expo Go) para revisar las nóminas de la Policía Local: desglose de cada nómina, historial, resumen anual, comparación entre meses, cálculo de pluses, retenes, desplazamientos y RED a partir del calendario de trabajo, y lista de conceptos por cobrar.

- Código de la app en `app/`. Se publica sola con la Action **App (EAS Update)** al cambiar algo en `app/`.
- Datos en su propio proyecto de Supabase (tabla `nominas`, una fila por documento con su JSON en `data`). No comparte nada con Bitácora.
- Las nóminas y el calendario de la empresa se leen con Claude: la app copia las instrucciones y abre Claude, adjuntas el PDF y pegas la respuesta en la app.
- Google Calendar (opcional) se lee con las direcciones iCal secretas de los calendarios Trabajo, Retenes y RED.

## Puesta en marcha (una vez)

1. **Supabase:** crea un proyecto nuevo en supabase.com. En SQL Editor ejecuta `supabase.sql`. En Authentication → Sign In / Providers → Email, desactiva «Confirm email».
2. **Expo:** crea un token en expo.dev → Account settings → Access tokens.
3. **Secretos del repositorio** (Settings → Secrets and variables → Actions): `EXPO_TOKEN`, `SUPABASE_URL` (Project URL) y `SUPABASE_ANON` (clave publicable o anon), sacados de Supabase → Project Settings → API.
4. La primera publicación crea el proyecto **Mis Nóminas** en Expo y guarda su `projectId` en `app/app.json`.
5. En el iPhone: Expo Go → tu cuenta de Expo → **Mis Nóminas**, o un atajo que abra `exp://u.expo.dev/<projectId>?channel-name=main`.

## Reglas de cálculo

Por el día en que empieza el turno. MT (06-18) en sábado = 2 sábados; en domingo o festivo = 2 festivos. TN (18-06) = 1 noche; viernes +1 sábado; sábado +1 sábado y +1 festivo; domingo o festivo +1 festivo. Retén: R123 = 1, cada tercio = 1/3. RED: horas × precio + plus por hora nocturna (22-06), de sábado y festiva, acumulables. Desplazamiento por día trabajado (turno o RED), no en baja ni vacaciones. La nómina de un mes paga lo trabajado el mes natural anterior. Tarifas editables en la app.
