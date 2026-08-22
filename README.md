# Choqui

Asistente de siniestros viales por WhatsApp, con panel de gestión para aseguradoras y corredores.

Cuando alguien choca, le escribe a Choqui por WhatsApp. El bot verifica si hay heridos, guía un checklist de fotos y datos (con verificación de ubicación y metadata, ya que WhatsApp borra esa información de las fotos), y arma automáticamente un parte de accidente estructurado. Un panel web permite a un operador revisar cada caso en tiempo real, incluyendo un análisis automático de riesgo de fraude.

## Qué problema resuelve

La gestión de siniestros hoy es lenta y manual: la persona no sabe qué hacer justo después de un choque, y la aseguradora depende de call centers para recolectar información básica. Choqui automatiza esa recolección desde el primer mensaje, y le da al operador un caso ya estructurado y con una primera evaluación de riesgo, en vez de partir de cero.

> **Nota:** este proyecto es una demo de hackathon para un solo cliente ("aseguradora demo"), no un SaaS multi-tenant productivo. El modelo de datos soporta múltiples organizaciones a futuro (tabla `organizaciones`), pero no se implementó onboarding, billing, ni gestión de múltiples clientes en esta versión.

## Arquitectura

```
WhatsApp (usuario)
      ↓ ↑
    Twilio
      ↓ ↑
      n8n  ──────────────► OpenAI (texto, audio, visión)
   (bot conversacional          │
    + análisis de fraude)       ▼
      ↓ ↑                   Supabase
      └──────────────────────► (DB, Storage, Auth, Realtime)
                                  ▲
                                  │
                          Next.js (Vercel)
                    Dashboard de gestión + mini-app de captura
```

- **n8n** contiene toda la lógica del bot y del análisis de fraude, como workflows visuales (no vive en este repo — ver `/n8n-workflows` para los exports de referencia).
  - *Workflow del bot*: recibe mensajes de WhatsApp, detecta si son texto/audio/imagen, agrupa mensajes seguidos con un buffer en Redis, y usa un agente de IA (con acceso acotado a herramientas) para guiar la conversación y avanzar el estado del siniestro en Supabase.
  - *Workflow de fraude*: se dispara cuando un siniestro completa su checklist. Calcula un score con reglas explícitas (fotos no verificadas, inconsistencias de ubicación, patentes repetidas, fotos duplicadas) y lo complementa con una revisión de un agente de IA, acotada a un ajuste de ±15 puntos sobre el score base.
- **Next.js (este repo)**: el panel de gestión para operadores y la mini-app de captura de fotos (cámara forzada + ubicación verificada, para resolver el problema de la metadata que WhatsApp elimina).
- **Supabase**: base de datos, storage de fotos, autenticación de operadores y actualizaciones en tiempo real del dashboard.

## Estructura del dashboard

El panel de gestión está organizado en 3 módulos:

- **Siniestros** — todos los casos, sin filtrar
- **Nuevos Siniestros** — cola de casos recién iniciados, para triage rápido
- **Diagnósticos de Fraude** — casos con score de fraude calculado, ordenados de mayor a menor riesgo

## Stack

- **n8n** — orquestación del bot de WhatsApp y del análisis de fraude
- **Next.js 14 (App Router) + TypeScript + Tailwind** — dashboard y mini-app
- **Supabase** — Postgres, Auth, Storage, Realtime
- **Twilio** — canal de WhatsApp (conectado desde n8n)
- **OpenAI** — interpretación de texto, transcripción de audio, y los dos agentes de IA (conversación y revisión de fraude)
- **Vercel** — deploy del proyecto Next.js

## Cómo correr el proyecto en local

```bash
npm install
cp .env.example .env.local
# Completar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

El bot de WhatsApp y el análisis de fraude no corren en local — son workflows de n8n que se configuran directamente en su interfaz, apuntando a la misma base de Supabase (ver `/n8n-workflows` para los JSON exportados como referencia).

## Base de datos

El esquema completo está en `/supabase/schema.sql`. Incluye las tablas `organizaciones`, `operadores`, `usuarios`, `siniestros`, `fotos` y `mensajes`, con Row Level Security, índices, y las tablas habilitadas para Realtime.

## Seguridad

- Las credenciales de Supabase, Twilio y OpenAI usadas por el bot viven en el sistema de credenciales de n8n, no en este repo.
- Este repo solo necesita la `anon key` de Supabase (pública por diseño) para el dashboard y la mini-app — no se usa la `service_role key` en ningún punto del código de Next.js.
- Si se exportan workflows de n8n a `/n8n-workflows`, se revisan antes de commitear para confirmar que no incluyan credenciales en texto plano.

## Equipo

Proyecto desarrollado para el Aleph Hackathon Rosario.