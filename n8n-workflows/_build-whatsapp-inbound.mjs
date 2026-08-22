/**
 * Builds n8n-workflows/whatsapp-inbound.json with patent check + grace period.
 * Run: node n8n-workflows/_build-whatsapp-inbound.mjs
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE = {
  supabaseApi: { id: "amVsCXcwGnSZOeob", name: "Supabase account" },
};
const REDIS = { redis: { id: "aH5LGc6z5ye1CVdj", name: "Redis account" } };
const OPENAI = { openAiApi: { id: "cR3FsfLU8pTufVkv", name: "OpenAi Zypheri" } };
const TWILIO = { twilioApi: { id: "pQaBclpf0JbwL5wY", name: "WPP MARGAL" } };
const HTTP_BASIC = {
  httpBasicAuth: { id: "ODM0npfGyMf0cKRK", name: "Form AXIS" },
};

const AGENT_SYSTEM = `# Quién sos

Sos Choqui, el asistente de WhatsApp que ayuda a alguien justo después de un choque de auto, en nombre de su aseguradora. Hablás en español rioplatense, tono cálido, tranquilizador y directo. Mensajes cortos (2-4 líneas), una sola pregunta o pedido por mensaje.

# Qué YA se resolvió fuera de este agente (no lo repitas)

- La patente del asegurado ya fue validada contra una póliza activa, o el usuario está retomando un siniestro existente.
- Si había un reclamo pendiente, la decisión de continuar vs. abrir uno nuevo ya se tomó antes de llegar acá.
- No pidas la patente del auto del asegurado. No crees siniestros. No preguntes si quiere continuar un caso viejo.

# El flujo que tenés que seguir (en este orden, sin saltear pasos)

1. **Heridos primero, siempre.** Si 'Hay heridos registrado' está vacío/null, preguntá si hay heridos. Si dice que sí: indicá llamar al 911, marcá hay_heridos=true y estado='requiere_info' con la tool. No sigas con el resto del flujo.

2. **Relato del accidente por WhatsApp** (una pregunta por mensaje). Completá datos_accidente con la tool (mergeá lo que ya haya):
   - que: qué pasó
   - como: cómo ocurrió
   - cuando: cuándo ocurrió
   Estado: 'pidiendo_relato' mientras falte alguno.

3. **Dónde (mapa, no texto).** Cuando el relato esté completo, mandá SOLO el link de la mini-app de mapa:
   {vercel_app_url}/captura/{siniestro_id}/ubicacion
   Pedile que marque el punto y confirme. Estado: 'pidiendo_ubicacion_mapa'. No le pidas la dirección por chat. Mirá el contexto: si ya hay ubicación reportada, no vuelvas a pedir el mapa.

4. **Documentación y fotos SOLO por mini-app** (nunca por este chat; WhatsApp borra metadatos). Estado: 'pidiendo_documentacion'. Mandá un link por vez:
   {vercel_app_url}/captura/{siniestro_id}/{tipo}
   Orden:
   a) Asegurado (obligatorio): dni_asegurado, cedula_verde_asegurado (cédula verde del auto), licencia_asegurado
   b) Tercero (si existe / si los tiene a mano): dni_tercero, cedula_verde_tercero, licencia_tercero — si no tiene, anotarlo en datos_otro_conductor y seguir
   c) Escena del vehículo: vista_frontal, vista_lateral_izq, vista_lateral_der, vista_trasera
   d) Daños: danios
   Mirá 'Fotos' del contexto: no pidas de nuevo una ya subida.

5. **Datos del tercero** (nombre / aseguradora) por texto si aparecen; guardalos en datos_otro_conductor.

6. **Cierre.** Cuando tengas relato completo (que/como/cuando), ubicación en mapa, docs mínimos del asegurado, las 4 vistas y danios: avisá que ya está, agradecé, y estado='generando_resumen'.

# Tus tools

Tenés una tool para actualizar el siniestro (estado, hay_heridos, datos_otro_conductor, datos_accidente). Usala cada vez que avance un paso — el estado real vive en la base.

# Límites

- Nunca inventes que una foto o la ubicación fueron recibidas si el contexto no lo muestra.
- Si manda foto directo por este chat, pedile el link de la mini-app.
- Fuera de tema (plazos, cobertura): no tenés esa info; un operador lo revisa; volvé al checklist.
- No inventes cambios de estado fuera de este flujo.`;

const CLASIFICAR_JS = `const PENDIENTES = new Set([
  'inicio','hay_heridos_check','pidiendo_patente','pidiendo_relato','pidiendo_ubicacion_mapa',
  'pidiendo_documentacion','pidiendo_foto_patente_otro',
  'pidiendo_foto_danio_propio','pidiendo_datos_otro_conductor','pidiendo_foto_carnet_seguro',
  'pidiendo_ubicacion','generando_resumen','esperando_decision_pendiente'
]);

const telefono = $('Concatenar mensajes').first().json.telefono;
const mensaje_texto = ($('Concatenar mensajes').first().json.mensaje_texto || '').trim();
const usuario_id = $('Edit Fields').first().json.usuario_id;

const awaitRaw = $('Leer await').first().json.propertyName
  ?? $('Leer await').first().json.await_value
  ?? $('Leer await').first().json.data
  ?? $('Leer await').first().json[telefono]
  ?? null;

// Redis "get" node may put value in different shapes
let awaitVal = null;
const leer = $('Leer await').first().json;
if (typeof leer === 'string') awaitVal = leer;
else if (leer && typeof leer.await_value === 'string') awaitVal = leer.await_value;
else if (leer && typeof leer.propertyName === 'string' && leer.propertyName.startsWith('{')) awaitVal = leer.propertyName;
else {
  // n8n redis get often returns { [propertyName]: value } or the value under "await_value"
  const keys = Object.keys(leer || {}).filter(k => !['telefono','usuario_id'].includes(k));
  for (const k of keys) {
    if (typeof leer[k] === 'string' && (leer[k].startsWith('{') || leer[k] === 'patente' || leer[k].startsWith('decision'))) {
      awaitVal = leer[k];
      break;
    }
  }
  if (!awaitVal && typeof leer.await_value !== 'undefined') awaitVal = leer.await_value;
}

let awaitObj = null;
if (awaitVal && typeof awaitVal === 'string') {
  try { awaitObj = JSON.parse(awaitVal); } catch { awaitObj = { type: awaitVal }; }
}

const rows = $('Buscar pendientes').all().map(i => i.json).filter(r => r && r.id && PENDIENTES.has(r.estado));
rows.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
const pendiente = rows[0] || null;

const HOUR = 3600e3;
const DAY = 24 * HOUR;
const now = Date.now();
const ageMs = pendiente ? now - new Date(pendiente.updated_at).getTime() : null;

function normalizePatente(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function parseDecision(text) {
  const t = text.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
  if (/\\b(continuar|continuarlo|seguir|retomar|el mismo|ese)\\b/.test(t)) return 'continuar';
  if (/\\b(nuevo|nueva|otro|abrir|empezar|arrancar)\\b/.test(t)) return 'nuevo';
  return 'ambigua';
}

const base = { telefono, mensaje_texto, usuario_id };

// 1) Awaiting decision reply
if (awaitObj && awaitObj.type === 'decision') {
  const decision = parseDecision(mensaje_texto);
  if (decision === 'continuar') {
    return [{ json: { ...base, accion: 'decision_continuar', siniestro_id: awaitObj.siniestro_id, estado_prev: awaitObj.estado_prev || 'inicio', hay_heridos: awaitObj.hay_heridos ?? null, datos_otro_conductor: awaitObj.datos_otro_conductor ?? null } }];
  }
  if (decision === 'nuevo') {
    return [{ json: { ...base, accion: 'decision_nuevo', siniestro_id: awaitObj.siniestro_id } }];
  }
  return [{ json: { ...base, accion: 'decision_ambigua', siniestro_id: awaitObj.siniestro_id, fecha_label: awaitObj.fecha_label || '' } }];
}

// 2) Awaiting patente
if (awaitObj && awaitObj.type === 'patente') {
  const patente = normalizePatente(mensaje_texto);
  if (!patente || patente.length < 5) {
    return [{ json: { ...base, accion: 'pedir_patente_de_nuevo' } }];
  }
  return [{ json: { ...base, accion: 'validar_patente', patente } }];
}

// 3) Pending siniestro grace logic
if (pendiente) {
  if (pendiente.estado === 'esperando_decision_pendiente') {
    const decision = parseDecision(mensaje_texto);
    const fecha = new Date(pendiente.created_at);
    const fecha_label = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
    if (decision === 'continuar') {
      return [{ json: { ...base, accion: 'decision_continuar', siniestro_id: pendiente.id, estado_prev: 'inicio', hay_heridos: pendiente.hay_heridos, datos_otro_conductor: pendiente.datos_otro_conductor } }];
    }
    if (decision === 'nuevo') {
      return [{ json: { ...base, accion: 'decision_nuevo', siniestro_id: pendiente.id } }];
    }
    return [{ json: { ...base, accion: 'decision_ambigua', siniestro_id: pendiente.id, fecha_label } }];
  }

  if (ageMs != null && ageMs < DAY) {
    return [{ json: { ...base, accion: 'continuar', siniestro_id: pendiente.id, estado: pendiente.estado, hay_heridos: pendiente.hay_heridos, datos_otro_conductor: pendiente.datos_otro_conductor } }];
  }

  if (ageMs != null && ageMs <= 30 * DAY) {
    const fecha = new Date(pendiente.created_at);
    const fecha_label = fecha.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
    return [{ json: {
      ...base,
      accion: 'preguntar_gracia',
      siniestro_id: pendiente.id,
      estado_prev: pendiente.estado,
      hay_heridos: pendiente.hay_heridos,
      datos_otro_conductor: pendiente.datos_otro_conductor,
      fecha_label
    } }];
  }

  // expired > 30 days
  return [{ json: { ...base, accion: 'expirado', siniestro_id: pendiente.id } }];
}

// 4) No pending → ask patent
return [{ json: { ...base, accion: 'pedir_patente' } }];
`;

const RESUMIR_JS = `const fotos = $('Buscar fotos ya subidas').all().map(i => i.json).filter(x => x && x.tipo);
const tipos = [
  'dni_asegurado','cedula_verde_asegurado','licencia_asegurado',
  'dni_tercero','cedula_verde_tercero','licencia_tercero',
  'vista_frontal','vista_lateral_izq','vista_lateral_der','vista_trasera','danios'
];
const resumen = tipos.map(t => {
  const f = fotos.find(x => x.tipo === t);
  if (!f) return \`\${t}: no subida\`;
  return \`\${t}: \${f.validada ? 'subida y validada' : 'subida (geo+timestamp)'}\`;
}).join(' | ');

const detalle = $('Cargar siniestro detalle').first().json || {};
const merge = $('Merge siniestro').first().json;
const siniestro_id = merge.siniestro_id || detalle.id;
const vercel = $env.VERCEL_APP_URL || 'https://choqui.vercel.app';

const da = detalle.datos_accidente || {};
const relato = 'que=' + (da.que || '(falta)') + '; como=' + (da.como || '(falta)') + '; cuando=' + (da.cuando || '(falta)');
const ubicacion = (detalle.ubicacion_reportada_lat != null && detalle.ubicacion_reportada_lng != null)
  ? (detalle.ubicacion_reportada_lat + ',' + detalle.ubicacion_reportada_lng)
  : 'sin marcar';

return [{
  json: {
    telefono: $('Concatenar mensajes').first().json.telefono,
    mensaje_texto: $('Concatenar mensajes').first().json.mensaje_texto,
    siniestro_id,
    estado: detalle.estado || merge.estado,
    hay_heridos: detalle.hay_heridos ?? merge.hay_heridos,
    datos_otro_conductor: detalle.datos_otro_conductor ?? merge.datos_otro_conductor,
    datos_accidente: da,
    relato_resumen: relato,
    ubicacion_reportada: ubicacion,
    fotos_resumen: resumen,
    vercel_app_url: vercel,
    link_mapa: vercel + '/captura/' + siniestro_id + '/ubicacion',
  }
}];
`;

function node(partial) {
  return {
    typeVersion: partial.typeVersion ?? 1,
    position: partial.position,
    id: partial.id,
    name: partial.name,
    type: partial.type,
    parameters: partial.parameters ?? {},
    ...(partial.credentials ? { credentials: partial.credentials } : {}),
    ...(partial.alwaysOutputData ? { alwaysOutputData: true } : {}),
    ...(partial.webhookId ? { webhookId: partial.webhookId } : {}),
  };
}

function mkRule(accion, outputKey) {
  return {
    conditions: {
      options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 1 },
      conditions: [
        {
          leftValue: "={{ $json.accion }}",
          rightValue: accion,
          operator: { type: "string", operation: "equals" },
          id: `r-${accion}`,
        },
      ],
      combinator: "and",
    },
    renameOutput: true,
    outputKey,
  };
}

const nodes = [
  node({
    id: "84c33373-536a-4eae-9f5f-e1f646010237",
    name: "Webhook WhatsApp",
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position: [2848, 9904],
    webhookId: "9deb3466-54e7-4865-83c0-17cd1db9a4c2",
    parameters: { httpMethod: "POST", path: "whatsapp-inbound", options: {} },
  }),
  node({
    id: "e3d1d5a9-e8b1-4b18-81a8-ba517f72ea20",
    name: "Datos",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [3072, 9904],
    parameters: {
      jsCode: `const body = $input.item.json.body || $input.item.json;
const numMedia = parseInt(body.NumMedia || '0', 10);
return [{
  json: {
    telefono: (body.From || '').replace('whatsapp:', ''),
    message_id: body.MessageSid || body.SmsMessageSid || '',
    body_text: body.Body || '',
    num_media: numMedia,
    media_content_type0: body.MediaContentType0 || '',
    media_url0: numMedia > 0 ? body.MediaUrl0 : null
  }
}];`,
    },
  }),
  node({
    id: "c1856b69-4e41-44d0-b2db-c14d2a5cc4e5",
    name: "Tipo mensaje",
    type: "n8n-nodes-base.switch",
    typeVersion: 3,
    position: [3296, 9888],
    parameters: {
      rules: {
        values: [
          {
            conditions: {
              options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 1 },
              conditions: [
                { leftValue: "={{ $json.num_media }}", rightValue: 0, operator: { type: "number", operation: "gt" }, id: "a1" },
                { leftValue: "={{ $json.media_content_type0 }}", rightValue: "audio", operator: { type: "string", operation: "contains" }, id: "a2" },
              ],
              combinator: "and",
            },
            renameOutput: true,
            outputKey: "audio",
          },
          {
            conditions: {
              options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 1 },
              conditions: [
                { leftValue: "={{ $json.num_media }}", rightValue: 0, operator: { type: "number", operation: "gt" }, id: "i1" },
                { leftValue: "={{ $json.media_content_type0 }}", rightValue: "image", operator: { type: "string", operation: "contains" }, id: "i2" },
              ],
              combinator: "and",
            },
            renameOutput: true,
            outputKey: "imagen",
          },
        ],
      },
      options: { fallbackOutput: "extra", renameFallbackOutput: "texto" },
    },
  }),
  node({
    id: "82585783-5cb3-474f-94a3-4cefb880fbbf",
    name: "Descargar audio",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [3520, 9712],
    credentials: HTTP_BASIC,
    parameters: {
      url: "={{ $json.media_url0 }}",
      authentication: "genericCredentialType",
      genericAuthType: "httpBasicAuth",
      options: { response: { response: { responseFormat: "file", outputPropertyName: "whatsapp_audio" } } },
    },
  }),
  node({
    id: "61e61a41-2a62-4605-8498-3781276da42c",
    name: "Transcribir audio",
    type: "@n8n/n8n-nodes-langchain.openAi",
    typeVersion: 1.8,
    position: [3744, 9712],
    credentials: OPENAI,
    parameters: {
      resource: "audio",
      operation: "transcribe",
      binaryPropertyName: "whatsapp_audio",
      options: { language: "es" },
    },
  }),
  node({
    id: "9931fd61-8158-4d82-a1f0-75adefa125c4",
    name: "Mensaje desde audio",
    type: "n8n-nodes-base.set",
    typeVersion: 3.4,
    position: [3968, 9712],
    parameters: {
      assignments: {
        assignments: [
          { id: "e1", name: "telefono", type: "string", value: "={{ $('Datos').item.json.telefono }}" },
          { id: "e2", name: "message_id", type: "string", value: "={{ $('Datos').item.json.message_id }}" },
          { id: "e3", name: "mensaje", type: "string", value: "={{ $json.text }}" },
          { id: "e4", name: "es_imagen_directa", type: "boolean", value: false },
        ],
      },
      options: {},
    },
  }),
  node({
    id: "80e1cf50-d8be-4318-b2ec-35126de3b181",
    name: "Mensaje desde imagen",
    type: "n8n-nodes-base.set",
    typeVersion: 3.4,
    position: [3968, 9904],
    parameters: {
      assignments: {
        assignments: [
          { id: "i1", name: "telefono", type: "string", value: "={{ $json.telefono }}" },
          { id: "i2", name: "message_id", type: "string", value: "={{ $json.message_id }}" },
          { id: "i3", name: "mensaje", type: "string", value: "[el usuario mandó una foto directo por WhatsApp, sin pasar por la mini-app de captura verificada]" },
          { id: "i4", name: "es_imagen_directa", type: "boolean", value: true },
        ],
      },
      options: {},
    },
  }),
  node({
    id: "53989a68-ce80-4b11-b3a6-658a06f2aca6",
    name: "Mensaje de texto",
    type: "n8n-nodes-base.set",
    typeVersion: 3.4,
    position: [3968, 10096],
    parameters: {
      assignments: {
        assignments: [
          { id: "t1", name: "telefono", type: "string", value: "={{ $json.telefono }}" },
          { id: "t2", name: "message_id", type: "string", value: "={{ $json.message_id }}" },
          { id: "t3", name: "mensaje", type: "string", value: "={{ $json.body_text }}" },
          { id: "t4", name: "es_imagen_directa", type: "boolean", value: false },
        ],
      },
      options: {},
    },
  }),
  node({
    id: "066cf83d-0ac5-4f2e-99f9-f17cb4a8a130",
    name: "Guardar en buffer",
    type: "n8n-nodes-base.redis",
    typeVersion: 1,
    position: [4192, 9904],
    credentials: REDIS,
    parameters: {
      operation: "push",
      list: "={{ $json.telefono }}",
      messageData: "={{ JSON.stringify({ mensaje: $json.mensaje, sessionid: $json.message_id, date_time: $now.toISO() }) }}",
      tail: true,
    },
  }),
  node({
    id: "dc9ca747-4c95-4880-9266-846ae36c82f4",
    name: "Esperar mensajes seguidos",
    type: "n8n-nodes-base.wait",
    typeVersion: 1.1,
    position: [4416, 9904],
    webhookId: "0f96d781-51b7-4bed-be12-7a6e7a2565d7",
    parameters: { amount: 8 },
  }),
  node({
    id: "a15cf573-d36b-4586-a897-2ce94787fea3",
    name: "Leer buffer",
    type: "n8n-nodes-base.redis",
    typeVersion: 1,
    position: [4640, 9904],
    credentials: REDIS,
    parameters: {
      operation: "get",
      propertyName: "mensajes",
      key: "={{ $('Guardar en buffer').item.json.telefono || $json.telefono }}",
      options: {},
    },
  }),
  node({
    id: "9e1a67d9-7587-433e-a581-93e1bfb60fa3",
    name: "Soy el ultimo mensaje?",
    type: "n8n-nodes-base.switch",
    typeVersion: 3,
    position: [4864, 9904],
    parameters: {
      rules: {
        values: [
          {
            conditions: {
              options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 1 },
              conditions: [
                {
                  leftValue: "={{ JSON.parse($json.mensajes.last()).sessionid }}",
                  rightValue: "={{ $('Guardar en buffer').item.json.message_id }}",
                  operator: { type: "string", operation: "notEquals" },
                  id: "f1",
                },
              ],
              combinator: "and",
            },
            renameOutput: true,
            outputKey: "ignorar",
          },
        ],
      },
      options: { fallbackOutput: "extra", renameFallbackOutput: "continuar" },
    },
  }),
  node({
    id: "bd7fb2e1-0ac5-4fe3-8b05-3058733ca75f",
    name: "Ignorar (llego un mensaje mas nuevo)",
    type: "n8n-nodes-base.noOp",
    position: [5088, 9808],
  }),
  node({
    id: "9a48d1c9-74c0-439d-9efb-d90378f0b11f",
    name: "Vaciar buffer",
    type: "n8n-nodes-base.redis",
    typeVersion: 1,
    position: [5088, 10000],
    credentials: REDIS,
    parameters: {
      operation: "delete",
      key: "={{ $('Guardar en buffer').item.json.telefono }}",
    },
  }),
  node({
    id: "979d6177-8518-42a1-b065-12d693849c17",
    name: "Concatenar mensajes",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [5312, 10000],
    parameters: {
      jsCode: `const items = $('Leer buffer').first().json.mensajes.map(m => JSON.parse(m));
const mensaje_texto = items.map(i => i.mensaje).join('\\n');
return [{ json: { telefono: $('Datos').first().json.telefono, mensaje_texto } }];`,
    },
  }),
  node({
    id: "e9280079-e166-4c37-aea7-be1424c7ff12",
    name: "Buscar usuario",
    type: "n8n-nodes-base.supabase",
    typeVersion: 1,
    position: [5760, 10000],
    alwaysOutputData: true,
    credentials: SUPABASE,
    parameters: {
      operation: "getAll",
      tableId: "usuarios",
      limit: 1,
      filters: {
        conditions: [
          {
            keyName: "telefono",
            condition: "eq",
            keyValue: "={{ $('Concatenar mensajes').item.json.telefono }}",
          },
        ],
      },
    },
  }),
  node({
    id: "136114f4-e259-4eb7-808e-eed2d2c45a90",
    name: "Usuario existe?",
    type: "n8n-nodes-base.if",
    typeVersion: 2,
    position: [5984, 10000],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 1 },
        conditions: [
          {
            leftValue: "={{ $input.all().length }}",
            rightValue: 0,
            operator: { type: "number", operation: "notExists", singleValue: true },
            id: "u1",
          },
        ],
        combinator: "and",
      },
      options: {},
    },
  }),
  node({
    id: "09960eed-c8e9-4316-9113-06c947d54a11",
    name: "Usuario encontrado",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [6432, 9904],
    parameters: { jsCode: "return [{ json: { usuario_id: $input.item.json.id } }];" },
  }),
  node({
    id: "aef722e2-e35c-433d-8ec2-4899a292d2bf",
    name: "Crear usuario",
    type: "n8n-nodes-base.supabase",
    typeVersion: 1,
    position: [6208, 10096],
    credentials: SUPABASE,
    parameters: {
      tableId: "usuarios",
      fieldsUi: {
        fieldValues: [
          {
            fieldId: "telefono",
            fieldValue: "={{ $('Concatenar mensajes').item.json.telefono }}",
          },
        ],
      },
    },
  }),
  node({
    id: "ec827b18-20ce-4e73-8a05-c5e45baad2dc",
    name: "Usuario creado",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [6432, 10096],
    parameters: { jsCode: "return [{ json: { usuario_id: $input.item.json.id } }];" },
  }),
  node({
    id: "f98a7272-686a-4c8a-a85f-9e7e78eb5518",
    name: "Edit Fields",
    type: "n8n-nodes-base.set",
    typeVersion: 3.4,
    position: [6736, 9968],
    parameters: {
      assignments: {
        assignments: [
          { id: "u", name: "usuario_id", value: "={{ $json.usuario_id }}", type: "string" },
        ],
      },
      options: {},
    },
  }),

  // --- NEW: grace + patent ---
  node({
    id: "a1000001-0001-4000-8000-000000000001",
    name: "Leer await",
    type: "n8n-nodes-base.redis",
    typeVersion: 1,
    position: [6960, 9968],
    alwaysOutputData: true,
    credentials: REDIS,
    parameters: {
      operation: "get",
      propertyName: "await_value",
      key: "=choqui:await:{{ $('Concatenar mensajes').item.json.telefono }}",
      options: {},
    },
  }),
  node({
    id: "a1000001-0001-4000-8000-000000000002",
    name: "Buscar pendientes",
    type: "n8n-nodes-base.supabase",
    typeVersion: 1,
    position: [7184, 9968],
    alwaysOutputData: true,
    credentials: SUPABASE,
    parameters: {
      operation: "getAll",
      tableId: "siniestros",
      returnAll: true,
      filters: {
        conditions: [
          {
            keyName: "usuario_id",
            condition: "eq",
            keyValue: "={{ $('Edit Fields').item.json.usuario_id }}",
          },
        ],
      },
    },
  }),
  node({
    id: "a1000001-0001-4000-8000-000000000003",
    name: "Clasificar flujo",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [7408, 9968],
    parameters: { jsCode: CLASIFICAR_JS },
  }),
  node({
    id: "a1000001-0001-4000-8000-000000000004",
    name: "Rama flujo",
    type: "n8n-nodes-base.switch",
    typeVersion: 3,
    position: [7632, 9968],
    parameters: {
      rules: {
        values: [
          mkRule("continuar", "continuar"),
          mkRule("preguntar_gracia", "preguntar_gracia"),
          mkRule("decision_continuar", "decision_continuar"),
          mkRule("decision_nuevo", "decision_nuevo"),
          mkRule("decision_ambigua", "decision_ambigua"),
          mkRule("pedir_patente", "pedir_patente"),
          mkRule("pedir_patente_de_nuevo", "pedir_patente_de_nuevo"),
          mkRule("validar_patente", "validar_patente"),
          mkRule("expirado", "expirado"),
        ],
      },
      options: {},
    },
  }),

  // continuar (activo <24h)
  node({
    id: "a1000001-0001-4000-8000-000000000010",
    name: "Touch updated_at",
    type: "n8n-nodes-base.supabase",
    typeVersion: 1,
    position: [7920, 9400],
    credentials: SUPABASE,
    parameters: {
      operation: "update",
      tableId: "siniestros",
      filters: {
        conditions: [
          { keyName: "id", condition: "eq", keyValue: "={{ $json.siniestro_id }}" },
        ],
      },
      fieldsUi: {
        fieldValues: [
          { fieldId: "updated_at", fieldValue: "={{ $now.toISO() }}" },
        ],
      },
    },
  }),
  node({
    id: "a1000001-0001-4000-8000-000000000011",
    name: "Pack continuar",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [8144, 9400],
    parameters: {
      jsCode: `const c = $('Clasificar flujo').first().json;
return [{ json: { siniestro_id: c.siniestro_id, estado: c.estado, hay_heridos: c.hay_heridos, datos_otro_conductor: c.datos_otro_conductor } }];`,
    },
  }),

  // preguntar gracia
  node({
    id: "a1000001-0001-4000-8000-000000000020",
    name: "Set esperando decision",
    type: "n8n-nodes-base.supabase",
    typeVersion: 1,
    position: [7920, 9600],
    credentials: SUPABASE,
    parameters: {
      operation: "update",
      tableId: "siniestros",
      filters: {
        conditions: [
          { keyName: "id", condition: "eq", keyValue: "={{ $json.siniestro_id }}" },
        ],
      },
      fieldsUi: {
        fieldValues: [
          { fieldId: "estado", fieldValue: "esperando_decision_pendiente" },
          { fieldId: "updated_at", fieldValue: "={{ $now.toISO() }}" },
        ],
      },
    },
  }),
  node({
    id: "a1000001-0001-4000-8000-000000000021",
    name: "Guardar await decision",
    type: "n8n-nodes-base.redis",
    typeVersion: 1,
    position: [8144, 9600],
    credentials: REDIS,
    parameters: {
      operation: "set",
      key: "=choqui:await:{{ $('Clasificar flujo').item.json.telefono }}",
      value: "={{ JSON.stringify({ type: 'decision', siniestro_id: $('Clasificar flujo').item.json.siniestro_id, estado_prev: $('Clasificar flujo').item.json.estado_prev, hay_heridos: $('Clasificar flujo').item.json.hay_heridos, datos_otro_conductor: $('Clasificar flujo').item.json.datos_otro_conductor, fecha_label: $('Clasificar flujo').item.json.fecha_label }) }}",
      expire: true,
      ttl: 2592000,
    },
  }),
  node({
    id: "a1000001-0001-4000-8000-000000000022",
    name: "Twilio preguntar gracia",
    type: "n8n-nodes-base.twilio",
    typeVersion: 1,
    position: [8368, 9600],
    credentials: TWILIO,
    parameters: {
      from: "+15636665928",
      to: "={{ $('Clasificar flujo').item.json.telefono }}",
      toWhatsapp: true,
      message: "=Tenés un reclamo del {{ $('Clasificar flujo').item.json.fecha_label }} sin terminar. ¿Continuamos ese o abrimos uno nuevo? Respondé *continuar* o *nuevo*.",
      options: {},
    },
  }),

  // decision continuar
  node({
    id: "a1000001-0001-4000-8000-000000000030",
    name: "Restaurar estado previo",
    type: "n8n-nodes-base.supabase",
    typeVersion: 1,
    position: [7920, 9800],
    credentials: SUPABASE,
    parameters: {
      operation: "update",
      tableId: "siniestros",
      filters: {
        conditions: [
          { keyName: "id", condition: "eq", keyValue: "={{ $json.siniestro_id }}" },
        ],
      },
      fieldsUi: {
        fieldValues: [
          { fieldId: "estado", fieldValue: "={{ $json.estado_prev }}" },
          { fieldId: "updated_at", fieldValue: "={{ $now.toISO() }}" },
        ],
      },
    },
  }),
  node({
    id: "a1000001-0001-4000-8000-000000000031",
    name: "Clear await (continuar)",
    type: "n8n-nodes-base.redis",
    typeVersion: 1,
    position: [8144, 9800],
    credentials: REDIS,
    parameters: {
      operation: "delete",
      key: "=choqui:await:{{ $('Clasificar flujo').item.json.telefono }}",
    },
  }),
  node({
    id: "a1000001-0001-4000-8000-000000000032",
    name: "Pack decision continuar",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [8368, 9800],
    parameters: {
      jsCode: `const c = $('Clasificar flujo').first().json;
return [{ json: { siniestro_id: c.siniestro_id, estado: c.estado_prev, hay_heridos: c.hay_heridos, datos_otro_conductor: c.datos_otro_conductor } }];`,
    },
  }),

  // decision nuevo / expirado → abandonar
  node({
    id: "a1000001-0001-4000-8000-000000000040",
    name: "Abandonar pendiente",
    type: "n8n-nodes-base.supabase",
    typeVersion: 1,
    position: [7920, 10000],
    credentials: SUPABASE,
    parameters: {
      operation: "update",
      tableId: "siniestros",
      filters: {
        conditions: [
          { keyName: "id", condition: "eq", keyValue: "={{ $json.siniestro_id }}" },
        ],
      },
      fieldsUi: {
        fieldValues: [
          { fieldId: "estado", fieldValue: "abandonado" },
          { fieldId: "updated_at", fieldValue: "={{ $now.toISO() }}" },
        ],
      },
    },
  }),
  node({
    id: "a1000001-0001-4000-8000-000000000041",
    name: "Clear await (nuevo)",
    type: "n8n-nodes-base.redis",
    typeVersion: 1,
    position: [8144, 10000],
    credentials: REDIS,
    parameters: {
      operation: "delete",
      key: "=choqui:await:{{ $('Clasificar flujo').item.json.telefono }}",
    },
  }),
  node({
    id: "a1000001-0001-4000-8000-000000000042",
    name: "Hacia pedir patente",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [8368, 10000],
    parameters: {
      jsCode: `const c = $('Clasificar flujo').first().json;
return [{ json: { ...c, accion: 'pedir_patente' } }];`,
    },
  }),

  // decision ambigua
  node({
    id: "a1000001-0001-4000-8000-000000000050",
    name: "Twilio decision ambigua",
    type: "n8n-nodes-base.twilio",
    typeVersion: 1,
    position: [7920, 10200],
    credentials: TWILIO,
    parameters: {
      from: "+15636665928",
      to: "={{ $json.telefono }}",
      toWhatsapp: true,
      message: "No te entendí del todo. Respondé solo *continuar* (seguimos el reclamo pendiente) o *nuevo* (abrimos uno distinto).",
      options: {},
    },
  }),

  // pedir patente
  node({
    id: "a1000001-0001-4000-8000-000000000060",
    name: "Guardar await patente",
    type: "n8n-nodes-base.redis",
    typeVersion: 1,
    position: [7920, 10400],
    credentials: REDIS,
    parameters: {
      operation: "set",
      key: "=choqui:await:{{ $json.telefono }}",
      value: "={{ JSON.stringify({ type: 'patente' }) }}",
      expire: true,
      ttl: 86400,
    },
  }),
  node({
    id: "a1000001-0001-4000-8000-000000000061",
    name: "Twilio pedir patente",
    type: "n8n-nodes-base.twilio",
    typeVersion: 1,
    position: [8144, 10400],
    credentials: TWILIO,
    parameters: {
      from: "+15636665928",
      to: "={{ $('Clasificar flujo').item.json.telefono }}",
      toWhatsapp: true,
      message: "Para abrir el reclamo necesito la patente del auto asegurado (la tuya). Escribila sin espacios, por ejemplo ABC123 o AB123CD.",
      options: {},
    },
  }),
  node({
    id: "a1000001-0001-4000-8000-000000000062",
    name: "Twilio patente invalida",
    type: "n8n-nodes-base.twilio",
    typeVersion: 1,
    position: [7920, 10600],
    credentials: TWILIO,
    parameters: {
      from: "+15636665928",
      to: "={{ $json.telefono }}",
      toWhatsapp: true,
      message: "No pude leer esa patente. Mandala de nuevo sin espacios ni guiones (ej: ABC123).",
      options: {},
    },
  }),

  // validar patente
  node({
    id: "a1000001-0001-4000-8000-000000000070",
    name: "Buscar poliza activa",
    type: "n8n-nodes-base.supabase",
    typeVersion: 1,
    position: [7920, 10800],
    alwaysOutputData: true,
    credentials: SUPABASE,
    parameters: {
      operation: "getAll",
      tableId: "polizas",
      limit: 1,
      matchType: "allFilters",
      filters: {
        conditions: [
          { keyName: "patente", condition: "eq", keyValue: "={{ $json.patente }}" },
          { keyName: "activa", condition: "eq", keyValue: "true" },
        ],
      },
    },
  }),
  node({
    id: "a1000001-0001-4000-8000-000000000071",
    name: "Poliza existe?",
    type: "n8n-nodes-base.if",
    typeVersion: 2,
    position: [8144, 10800],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 1 },
        conditions: [
          {
            leftValue: "={{ $json.id }}",
            rightValue: "",
            operator: { type: "string", operation: "exists", singleValue: true },
            id: "p1",
          },
        ],
        combinator: "and",
      },
      options: {},
    },
  }),
  node({
    id: "a1000001-0001-4000-8000-000000000072",
    name: "Twilio sin poliza",
    type: "n8n-nodes-base.twilio",
    typeVersion: 1,
    position: [8368, 10960],
    credentials: TWILIO,
    parameters: {
      from: "+15636665928",
      to: "={{ $('Clasificar flujo').item.json.telefono }}",
      toWhatsapp: true,
      message: "No encontré una póliza activa para esa patente. Revisá que esté bien escrita o contactá a tu corredor. Cuando tengas la patente correcta, mandámela de nuevo.",
      options: {},
    },
  }),
  node({
    id: "a1000001-0001-4000-8000-000000000073",
    name: "Linkear poliza usuario",
    type: "n8n-nodes-base.supabase",
    typeVersion: 1,
    position: [8368, 10640],
    credentials: SUPABASE,
    parameters: {
      operation: "update",
      tableId: "polizas",
      filters: {
        conditions: [
          { keyName: "id", condition: "eq", keyValue: "={{ $json.id }}" },
        ],
      },
      fieldsUi: {
        fieldValues: [
          {
            fieldId: "usuario_id",
            fieldValue: "={{ $('Clasificar flujo').item.json.usuario_id }}",
          },
        ],
      },
    },
  }),
  node({
    id: "a1000001-0001-4000-8000-000000000074",
    name: "Clear await (patente ok)",
    type: "n8n-nodes-base.redis",
    typeVersion: 1,
    position: [8592, 10640],
    credentials: REDIS,
    parameters: {
      operation: "delete",
      key: "=choqui:await:{{ $('Clasificar flujo').item.json.telefono }}",
    },
  }),
  node({
    id: "a1000001-0001-4000-8000-000000000075",
    name: "Crear siniestro",
    type: "n8n-nodes-base.supabase",
    typeVersion: 1,
    position: [8816, 10640],
    credentials: SUPABASE,
    parameters: {
      tableId: "siniestros",
      fieldsUi: {
        fieldValues: [
          {
            fieldId: "usuario_id",
            fieldValue: "={{ $('Clasificar flujo').item.json.usuario_id }}",
          },
          { fieldId: "estado", fieldValue: "inicio" },
          {
            fieldId: "patente_asegurado",
            fieldValue: "={{ $('Clasificar flujo').item.json.patente }}",
          },
        ],
      },
    },
  }),
  node({
    id: "a1000001-0001-4000-8000-000000000076",
    name: "Siniestro creado",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [9040, 10640],
    parameters: {
      jsCode: `const s = $input.item.json;
return [{ json: { siniestro_id: s.id, estado: s.estado, hay_heridos: s.hay_heridos, datos_otro_conductor: s.datos_otro_conductor } }];`,
    },
  }),

  // merge + agent path
  node({
    id: "d098b492-c846-47ed-8dd4-2c4cde5fb5c1",
    name: "Merge siniestro",
    type: "n8n-nodes-base.set",
    typeVersion: 3.4,
    position: [9264, 9968],
    parameters: {
      assignments: {
        assignments: [
          { id: "s1", name: "siniestro_id", value: "={{ $json.siniestro_id }}", type: "string" },
          { id: "s2", name: "estado", value: "={{ $json.estado }}", type: "string" },
          { id: "s3", name: "hay_heridos", value: "={{ $json.hay_heridos }}", type: "string" },
          { id: "s4", name: "datos_otro_conductor", value: "={{ $json.datos_otro_conductor }}", type: "string" },
        ],
      },
      options: {},
    },
  }),
  node({
    id: "a1000001-0001-4000-8000-000000000080",
    name: "Cargar siniestro detalle",
    type: "n8n-nodes-base.supabase",
    typeVersion: 1,
    position: [9376, 9968],
    alwaysOutputData: true,
    credentials: SUPABASE,
    parameters: {
      operation: "getAll",
      tableId: "siniestros",
      limit: 1,
      filters: {
        conditions: [
          {
            keyName: "id",
            condition: "eq",
            keyValue: "={{ $('Merge siniestro').item.json.siniestro_id }}",
          },
        ],
      },
    },
  }),
  node({
    id: "629d3419-a06a-4bed-8f86-0d14345a90a5",
    name: "Buscar fotos ya subidas",
    type: "n8n-nodes-base.supabase",
    typeVersion: 1,
    position: [9488, 9968],
    alwaysOutputData: true,
    credentials: SUPABASE,
    parameters: {
      operation: "getAll",
      tableId: "fotos",
      returnAll: true,
      filters: {
        conditions: [
          {
            keyName: "siniestro_id",
            condition: "eq",
            keyValue: "={{ $('Merge siniestro').item.json.siniestro_id }}",
          },
        ],
      },
    },
  }),
  node({
    id: "d7ccb30c-3a1d-4abe-ac06-7e5c75e4e33e",
    name: "Resumir contexto",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [9712, 9968],
    parameters: { jsCode: RESUMIR_JS },
  }),
  node({
    id: "051771c8-f283-42b0-b4b6-cd494be91ae1",
    name: "Agente Choqui",
    type: "@n8n/n8n-nodes-langchain.agent",
    typeVersion: 1.7,
    position: [9936, 9968],
    parameters: {
      promptType: "define",
      text: "={{ 'Estado: ' + $json.estado + '\\nHay heridos: ' + $json.hay_heridos + '\\nRelato: ' + $json.relato_resumen + '\\nUbicacion mapa: ' + $json.ubicacion_reportada + '\\nLink mapa: ' + $json.link_mapa + '\\nFotos: ' + $json.fotos_resumen + '\\nLink fotos: ' + $json.vercel_app_url + '/captura/' + $json.siniestro_id + '/[tipo]' + '\\n\\nMensaje del usuario: ' + $json.mensaje_texto }}",
      options: { systemMessage: AGENT_SYSTEM },
    },
  }),
  node({
    id: "79f1bf98-4ea7-42aa-9e33-8dbd0719455e",
    name: "OpenAI Chat Model",
    type: "@n8n/n8n-nodes-langchain.lmChatOpenAi",
    typeVersion: 1.2,
    position: [9952, 10192],
    credentials: OPENAI,
    parameters: {
      model: { __rl: true, value: "gpt-4o", mode: "list", cachedResultName: "gpt-4o" },
      options: { temperature: 0.4 },
    },
  }),
  node({
    id: "9187b74f-b796-475e-9b1d-5105be4cfecc",
    name: "Update a row in Supabase",
    type: "n8n-nodes-base.supabaseTool",
    typeVersion: 1,
    position: [10176, 10192],
    credentials: SUPABASE,
    parameters: {
      operation: "update",
      tableId: "siniestros",
      filters: {
        conditions: [
          {
            keyName: "id",
            condition: "eq",
            keyValue: "={{ $('Resumir contexto').item.json.siniestro_id }}",
          },
        ],
      },
      fieldsUi: {
        fieldValues: [
          { fieldId: "estado", fieldValue: "=" },
          { fieldId: "hay_heridos", fieldValue: "=" },
          { fieldId: "datos_otro_conductor", fieldValue: "=" },
          { fieldId: "datos_accidente", fieldValue: "=" },
        ],
      },
    },
  }),
  node({
    id: "e9fe5acb-0119-45a5-8b09-1b8e8f27741f",
    name: "Send an SMS/MMS/WhatsApp message",
    type: "n8n-nodes-base.twilio",
    typeVersion: 1,
    position: [10288, 9968],
    credentials: TWILIO,
    parameters: {
      from: "+15636665928",
      to: "={{ $node[\"Resumir contexto\"].json.telefono }}",
      toWhatsapp: true,
      message: "={{ $json.output }}",
      options: {},
    },
  }),
];

// Build connections object
const connections = {};
function connect(from, to, fromOut = 0) {
  if (!connections[from]) connections[from] = { main: [] };
  while (connections[from].main.length <= fromOut) connections[from].main.push([]);
  connections[from].main[fromOut].push({ node: to, type: "main", index: 0 });
}

connect("Webhook WhatsApp", "Datos");
connect("Datos", "Tipo mensaje");
connect("Tipo mensaje", "Descargar audio", 0);
connect("Tipo mensaje", "Mensaje desde imagen", 1);
connect("Tipo mensaje", "Mensaje de texto", 2);
connect("Descargar audio", "Transcribir audio");
connect("Transcribir audio", "Mensaje desde audio");
connect("Mensaje desde audio", "Guardar en buffer");
connect("Mensaje desde imagen", "Guardar en buffer");
connect("Mensaje de texto", "Guardar en buffer");
connect("Guardar en buffer", "Esperar mensajes seguidos");
connect("Esperar mensajes seguidos", "Leer buffer");
connect("Leer buffer", "Soy el ultimo mensaje?");
connect("Soy el ultimo mensaje?", "Ignorar (llego un mensaje mas nuevo)", 0);
connect("Soy el ultimo mensaje?", "Vaciar buffer", 1);
connect("Vaciar buffer", "Concatenar mensajes");
connect("Concatenar mensajes", "Buscar usuario");
connect("Buscar usuario", "Usuario existe?");
connect("Usuario existe?", "Usuario encontrado", 0);
connect("Usuario existe?", "Crear usuario", 1);
connect("Usuario encontrado", "Edit Fields");
connect("Crear usuario", "Usuario creado");
connect("Usuario creado", "Edit Fields");
connect("Edit Fields", "Leer await");
connect("Leer await", "Buscar pendientes");
connect("Buscar pendientes", "Clasificar flujo");
connect("Clasificar flujo", "Rama flujo");

// Switch outputs order must match rules array order
connect("Rama flujo", "Touch updated_at", 0); // continuar
connect("Rama flujo", "Set esperando decision", 1); // preguntar_gracia
connect("Rama flujo", "Restaurar estado previo", 2); // decision_continuar
connect("Rama flujo", "Abandonar pendiente", 3); // decision_nuevo
connect("Rama flujo", "Twilio decision ambigua", 4);
connect("Rama flujo", "Guardar await patente", 5); // pedir_patente
connect("Rama flujo", "Twilio patente invalida", 6);
connect("Rama flujo", "Buscar poliza activa", 7); // validar_patente
connect("Rama flujo", "Abandonar pendiente", 8); // expirado

connect("Touch updated_at", "Pack continuar");
connect("Pack continuar", "Merge siniestro");

connect("Set esperando decision", "Guardar await decision");
connect("Guardar await decision", "Twilio preguntar gracia");

connect("Restaurar estado previo", "Clear await (continuar)");
connect("Clear await (continuar)", "Pack decision continuar");
connect("Pack decision continuar", "Merge siniestro");

connect("Abandonar pendiente", "Clear await (nuevo)");
connect("Clear await (nuevo)", "Hacia pedir patente");
connect("Hacia pedir patente", "Guardar await patente");

connect("Guardar await patente", "Twilio pedir patente");

connect("Buscar poliza activa", "Poliza existe?");
connect("Poliza existe?", "Linkear poliza usuario", 0);
connect("Poliza existe?", "Twilio sin poliza", 1);
connect("Linkear poliza usuario", "Clear await (patente ok)");
connect("Clear await (patente ok)", "Crear siniestro");
connect("Crear siniestro", "Siniestro creado");
connect("Siniestro creado", "Merge siniestro");

connect("Merge siniestro", "Cargar siniestro detalle");
connect("Cargar siniestro detalle", "Buscar fotos ya subidas");
connect("Buscar fotos ya subidas", "Resumir contexto");
connect("Resumir contexto", "Agente Choqui");
connect("Agente Choqui", "Send an SMS/MMS/WhatsApp message");

connections["OpenAI Chat Model"] = {
  ai_languageModel: [[{ node: "Agente Choqui", type: "ai_languageModel", index: 0 }]],
};
connections["Update a row in Supabase"] = {
  ai_tool: [[{ node: "Agente Choqui", type: "ai_tool", index: 0 }]],
};

const workflow = {
  name: "Choqui WhatsApp inbound (patente + gracia)",
  nodes,
  connections,
  settings: { executionOrder: "v1" },
  meta: {
    templateCredsSetupCompleted: true,
    instanceId: "8878b8b5c932dadc98af3b054e2b2d9c2e89ea4b81903d3501ca4fa6df3783b1",
  },
};

const out = join(__dirname, "whatsapp-inbound.json");
writeFileSync(out, JSON.stringify(workflow, null, 2));
console.log("Wrote", out, "nodes:", nodes.length);
