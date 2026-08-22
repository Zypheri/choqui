# n8n workflows — Choqui

## `whatsapp-inbound.json`

Workflow de WhatsApp inbound con:

1. **Validación de patente** antes de crear un siniestro: solo si existe fila en `polizas` con esa `patente` y `activa = true`.
2. **Período de gracia (30 días)** para siniestros incompletos:
   - inactivo menos de 24h → continúa sin preguntar
   - inactivo entre 24h y 30d → pregunta *continuar* / *nuevo*
   - inactivo más de 30d → marca `abandonado` y pide patente para un caso nuevo
3. **Agente Choqui**: relato por WPP (qué/cómo/cuándo → `datos_accidente`), mapa en `/captura/{id}/ubicacion`, fotos/docs solo por mini-app.

### Redis

Clave `choqui:await:{telefono}` (JSON):

- `{"type":"patente"}` — esperando que el usuario mande la patente
- `{"type":"decision","siniestro_id":"...","estado_prev":"...","fecha_label":"..."}` — esperando continuar/nuevo

### Cómo importar

1. En n8n: **Workflows → Import from File** → este JSON.
2. Reasigná credenciales (Supabase, Redis, Twilio, OpenAI) si los IDs no matchean.
3. Seteá la variable de entorno `VERCEL_APP_URL` (base de la mini-app de captura).
4. Activá el workflow y apuntá el webhook de Twilio al path `whatsapp-inbound`.

### Regenerar el JSON

```bash
node n8n-workflows/_build-whatsapp-inbound.mjs
```
