# Mis Nóminas — instrucciones para Claude

App de Expo en `app/` (ver README.md). Los datos están en Supabase, tabla `nominas` (una fila por documento: `user_id`, `id`, `data` JSON).

## Cuando el usuario sube una nómina o el calendario al chat

Guárdalo tú directamente en la base de datos para que aparezca en la app (no le mandes a pegar nada en la app).

1. Lee el PDF o la imagen. El calendario se lee mejor como imagen (colores).
2. Escribe un JSON en el scratchpad con el formato de la app:
   - **Nóminas:** el formato de `PROMPT_NOMINA` en `app/src/logic.ts` (`{"nominas":[...]}`), con `codigo` en cada devengo cuando aparezca (74, 76, 85, 212, 721, 3551, 3555, 3575…).
   - **Calendario de la empresa:** `{"meses":[{"m":10,"a":2026,"d":["MT","TN R1",...]}],"notas":""}`, un texto por día con las marcas de `promptCalendario` en `app/src/logic.ts`: MT, TN, R1/R2/R3/R123, RD (o RD18-06 si el horario está escrito), F (casilla roja), B (baja, amarillo), V (vacaciones, verde).
3. Ejecuta `python3 herramientas/guardar.py nominas|calendario <archivo.json>` y luego `python3 herramientas/guardar.py listar` para comprobarlo.
4. Dile al usuario qué meses has guardado y los totales principales, y que cierre y abra la app (o vuelva a la pestaña) para verlo.

Reglas: no supongas horarios de RED ni días de baja que no estén escritos; pregunta. Si un mes ya existía, se sustituye.

La red y la clave secreta de Supabase vienen del entorno de Claude Code `nominas-app` (el proxy pone la cabecera `apikey`); el script nunca ve la clave. Si da 401/403 o no conecta, la sesión no está en ese entorno.

## Publicar cambios de la app

Un push a `main` que toque `app/` publica solo con la Action **App (EAS Update)**. Enlace de Expo Go: `exp://u.expo.dev/1ff2af4a-a0e2-42b7-9c2f-13e4d868acc9?channel-name=main`.
