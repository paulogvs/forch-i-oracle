# FORCH.i ORACLE

> Predicciones IA del Mundial FIFA 2026

**FORCH.i ORACLE** es una aplicación web full-stack que predice resultados de partidos del Mundial 2026 usando Inteligencia Artificial (Gemini 1.5 Flash) y datos en tiempo real.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| AI | Google Gemini 1.5 Flash (gratis) |
| Datos | API-Football (gratis) + worldcup26.ir |
| Deploy | Vercel |

## Setup

### 1. Instalar dependencias

```bash
npm install
```

### 2. Obtener API Keys (GRATIS)

#### Gemini API Key
1. Ve a [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API Key"
3. Copia la key

#### API-Football Key
1. Ve a [API-Football](https://www.api-football.com/pricing)
2. Regístrate (plan Free — 100 req/día)
3. Copia tu API key desde el dashboard

### 3. Configurar variables de entorno

Copia el archivo de ejemplo:
```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tus keys:
```
GEMINI_API_KEY=tu_key_aqui
FOOTBALL_API_KEY=tu_key_aqui
```

### 4. Ejecutar

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Deploy en Vercel

```bash
npm i -g vercel
vercel --prod
```

O conecta el repo a Vercel Dashboard y configura las variables de entorno.

## Cómo funciona

```
1. Seleccionas 2 equipos (de 48 del Mundial 2026)
2. La app fetch datos de API-Football (lesiones, forma, h2h)
3. Gemini 1.5 Flash analiza con Grounding (búsqueda en tiempo real)
4. Recibes: % Victoria Local, % Empate, % Victoria Visitante + Análisis táctico
```

## Estructura

```
forch-i-oracle/
├── app/
│   ├── page.tsx           # Página principal
│   ├── layout.tsx         # Layout + metadata
│   ├── globals.css        # Estilos Tailwind
│   └── api/predict/
│       └── route.ts       # POST → Gemini + API-Football
├── lib/
│   ├── teams.ts           # 48 equipos Mundial 2026
│   ├── gemini.ts          # Cliente Gemini + prompt
│   └── football-api.ts    # Fetch API-Football
├── components/
│   ├── TeamSelector.tsx   # Dropdown de equipos
│   └── ResultCard.tsx     # Card de resultados
├── .env.local.example
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.mjs
└── tailwind.config.ts
```

## Costo

**$0.00** — Todo es gratis:
- Gemini 1.5 Flash: 1,500 req/día (gratis)
- API-Football: 100 req/día (gratis)
- Vercel Hobby: gratis

## Built with FORCH.i

By Paulo Velasco — Bolivia
