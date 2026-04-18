# Panel de Novios sin Google Sheets

## Como funciona ahora
- Las confirmaciones RSVP se guardan localmente en el navegador (localStorage).
- El panel privado de novios tambien trabaja con esos datos locales.
- No usa Google Sheets ni servicios externos.
- El login y el panel estan completamente separados de la invitacion principal.

## Rutas nuevas
- Login privado: panel-login.html
- Dashboard de novios: panel-novios.html
- Invitacion principal: invitation.html

## Credenciales del panel
- Correo inicial: novios@boda.local
- Contrasena inicial: VictoriaEmanuel2026!

Las puedes cambiar en panel-login.js, dentro de la constante PANEL_CREDENTIALS.

## Lo que incluye el panel
- Login con correo y contrasena.
- Resumen de grupos, confirmaciones, personas y no asistentes.
- Lista de invitados agrupada por grupo/familia.
- Planificador de mesas mixto: mesas manuales una a una con capacidad variable, acomodo manual por grupo, acomodo automatico y croquis visual arrastrable.

## Reglas activas del RSVP
- Correo electronico obligatorio.
- Grupo o familia obligatorio para organizar mesas.
- Bloqueo de confirmaciones despues del 20 de septiembre de 2026.
- Deteccion de duplicados por nombre completo.
- Si ya existe un nombre, solo se puede editar con el mismo correo.
- Si asistira, el total de personas debe coincidir con la cantidad de nombres.

## Importante
- Como no hay backend, los datos viven en el navegador/dispositivo donde se guardaron.
- Si quieres acceso compartido entre varios dispositivos, se puede conectar luego a una base de datos (por ejemplo Supabase) sin cambiar la interfaz del panel.
