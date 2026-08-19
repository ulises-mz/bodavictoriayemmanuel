# Confirmaciones (RSVP) — Base de datos compartida

## Como funciona ahora
- Las confirmaciones se guardan en una base de datos compartida (Supabase,
  tabla `boda_rsvps`) a traves de `rsvp-api.js`.
- La invitacion (invite.js) guarda y edita confirmaciones ahi.
- El Panel de Novios (panel-novios.js) las carga desde la misma base al
  abrir y con el boton "Actualizar": los novios ven todas las
  confirmaciones desde cualquier dispositivo.
- El plan de mesas (mesas, asignaciones y croquis) sigue guardandose
  localmente en el dispositivo donde se trabaja.

## Rutas
- Login privado: panel-login.html
- Dashboard de novios: panel-novios.html
- Invitacion principal: invitation.html

## Credenciales del panel
- Correo inicial: novios@boda.local
- Contrasena inicial: VictoriaEmanuel2026!

Se cambian en panel-login.js, constante PANEL_CREDENTIALS.

## Reglas activas del RSVP
- Correo electronico obligatorio.
- Grupo o familia obligatorio para organizar mesas.
- Bloqueo de confirmaciones despues del 20 de septiembre de 2026.
- Deteccion de duplicados por nombre completo (contra la base de datos).
- Si ya existe un nombre, solo se puede editar con el mismo correo.
- Si asistira, se genera un campo de nombre por persona.

## Infraestructura
- Proyecto Supabase: sirius-enterprise (org Sirius Agency), tabla
  `public.boda_rsvps` con RLS: la clave publica puede leer, insertar y
  actualizar, pero no borrar.
