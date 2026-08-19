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

## Rutas
- Login privado: `panel-login.html`
- Dashboard de novios: `panel-novios.html`
- Invitacion principal: `invitation.html`

## Credenciales del panel
- Correo: novios@boda.com
- Contrasena: VictoriaEmanuel2026!

Se cambian en `panel-login.js`, constante `PANEL_CREDENTIALS`.

## Correo por cada confirmacion

Cada confirmacion (nueva o editada) genera un correo a los novios con el
diseño de la boda (animado en los clientes que lo soportan).

### Como se envia (cola con control de ritmo)
1. Un trigger en `boda_rsvps` **encola** el correo en `boda_email_queue`.
   Encolar es instantaneo: un problema de correo nunca bloquea ni pierde
   una confirmacion.
2. La Edge Function `process-email-queue` corre **cada minuto** (pg_cron)
   y envia por lotes respetando el limite por hora.
3. Si el proveedor responde 429 (limite alcanzado), el correo se
   reprograma en 5 minutos **sin gastar intento**. Otros fallos
   reintentan con backoff exponencial (1, 2, 4... hasta 30 min, max 8
   intentos).
4. Si se alcanza el limite por hora, la cola simplemente espera: los
   correos salen solos cuando se libera la ventana.

### Activar el envio (falta la API key)
Los correos quedan en cola hasta configurar el proveedor. Con una cuenta
en https://resend.com (plan gratuito: 100 correos/dia, 3000/mes) se
ejecuta una sola vez en el SQL Editor de Supabase:

```sql
update public.boda_notify_config
set resend_api_key = 'AQUI_LA_API_KEY',
    notify_emails = array['correo1@ejemplo.com', 'correo2@ejemplo.com'],
    from_email    = 'Boda E&V <onboarding@resend.dev>'
where id = 1;
```

Sin configuracion, el worker responde "sin configuracion de correo" y no
se pierde nada: los correos encolados se envian en cuanto se configure.

### Ajustar el ritmo de envio
```sql
update public.boda_notify_config
set max_emails_per_hour = 100,  -- limite por hora
    batch_size = 8              -- correos por ejecucion (cada minuto)
where id = 1;
```

### Revisar la cola
```sql
select status, count(*) from public.boda_email_queue group by status;
select * from public.boda_email_queue where status = 'failed';
select public.boda_emails_sent_last_hour();
```

## Reglas activas del RSVP
- Correo electronico obligatorio.
- Grupo o familia obligatorio para organizar mesas.
- Bloqueo de confirmaciones despues del 20 de septiembre de 2026.
- Deteccion de duplicados por nombre completo contra la base de datos.
- Si ya existe un nombre, solo se puede editar con el mismo correo.
- Si asistira, se genera un campo de nombre por persona.

## Infraestructura
- Proyecto Supabase: `sirius-enterprise` (org Sirius Agency).
- Tablas: `boda_rsvps` (confirmaciones), `boda_email_queue` (cola),
  `boda_notify_config` (configuracion de correo, sin acceso publico).
- Edge Functions: `process-email-queue` (worker), `notify-rsvp` (legado).
- RLS: la clave publica puede leer, insertar y actualizar confirmaciones;
  no puede borrarlas ni leer la configuracion de correo.
