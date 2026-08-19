# Confirmaciones (RSVP) — Base de datos y correos

## Como funciona
- Las confirmaciones se guardan en una base de datos compartida
  (Supabase, tabla `boda_rsvps`) a traves de `rsvp-api.js`.
- La invitacion (`invite.js`) guarda y edita confirmaciones ahi,
  incluyendo cancion sugerida y mensaje para los novios.
- El Panel de Novios (`panel-novios.js`) las carga al abrir y con el
  boton "Actualizar": se ven desde cualquier dispositivo.
- El plan de mesas (mesas, asignaciones y croquis) se guarda localmente
  en el dispositivo donde se trabaja.

## Secciones del panel
El panel se organiza en pestañas: **Invitados** (grupos y quienes no
asistiran), **Mesas** (planificador) y **Canciones y mensajes**. El
resumen general queda fijo arriba y la pestaña elegida se recuerda.

## Rutas
- Login privado: `panel-login.html`
- Dashboard de novios: `panel-novios.html`
- Invitacion principal: `invitation.html`

## Credenciales del panel
- Correo: novios@boda.com
- Contrasena: VictoriaEmanuel2026!

Se cambian en `panel-login.js`, constante `PANEL_CREDENTIALS`.

## Aviso de confirmaciones nuevas

No se envian correos ni se usan servicios externos. El propio panel avisa:

- Al entrar, un banner verde indica cuantas confirmaciones llegaron desde
  la ultima visita, con los nombres y el total de personas.
- Esos grupos aparecen resaltados con la etiqueta "Nuevo" en la lista.
- El boton "Marcar como visto" limpia el aviso; la marca se guarda en el
  dispositivo, asi que cada quien ve sus propias novedades.

## Reglas activas del RSVP
- Correo electronico obligatorio.
- Grupo o familia obligatorio para organizar mesas.
- Bloqueo de confirmaciones despues del 20 de septiembre de 2026.
- Deteccion de duplicados por nombre completo contra la base de datos.
- Si ya existe un nombre, solo se puede editar con el mismo correo.
- Si asistira, se genera un campo de nombre por persona.

## Infraestructura
- Proyecto Supabase: `sirius-enterprise` (org Sirius Agency).
- Tabla: `boda_rsvps` (confirmaciones).
- RLS: la clave publica puede leer, insertar y actualizar confirmaciones,
  pero no borrarlas.
