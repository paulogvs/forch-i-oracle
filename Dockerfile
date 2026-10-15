# FORCH.iA — Dockerfile.template (pod kit v5)
# Template del kit pod. Lo instancia scripts/harness-pod-create.js →
# infra/podman/Dockerfile.<app>. Placeholders:
#   forch-i-oracle next 3008 3008 npm exec -- next dev --hostname 0.0.0.0 --port ${PORT:-3008}
#
# ── CONTRATO DEL KIT (arregla los bugs #1/#2/#3/#5/#6/#7) ─────────────────
# 1. El build CONTEXT es la carpeta REAL de la app (la que tiene su
#    package.json), NO la raíz del ecosistema. Se resuelve desde
#    config/harness/app-layout.json → appsRoot + dir.
# 2. El código aterriza en /app (WORKDIR) porque el context ES la app:
#    COPY package.json y COPY . . quedan coherentes.
# 3. El host binding va AQUÍ (0.0.0.0 + --port), NUNCA en el package.json
#    de la app: vite sin --host escucha 127.0.0.1 dentro del contenedor y el
#    puerto mapeado no responde. Cero ediciones al código de la app.
# 5. El RUNNER del CMD debe ser el MISMO manejador que instala (paso 1).
#    Lo decide scripts/harness-pod-create.js → computeDevCmd() leyendo el
#    lockfile real de la app (pnpm-lock.yaml → `pnpm exec`, yarn.lock →
#    `yarn exec`, package-lock.json → `npm exec --`). Si no coincide, el
#    contenedor muere con `sh: pnpm: not found` (bug #5) — las apps npm NO
#    tienen pnpm en la imagen porque `corepack enable` solo corre en la rama
#    pnpm. Este Dockerfile trae npm exec -- next dev --hostname 0.0.0.0 --port ${PORT:-3008} ya resuelto.
# 6. La rama npm degrada igual que la de pnpm: si `npm ci`/`npm install`
#    aborta por un conflicto de peers legítimo de la app (ERESOLVE), se
#    reintenta con --legacy-peer-deps. Antes el build moría y el bug parecía
#    del kit. Cero ediciones al package.json de la app.
# 7. La imagen trae TOOLCHAIN nativo (python3/make/g++). Alpine = musl: los
#    módulos nativos no tienen prebuild y node-gyp compila desde fuente.
# ──────────────────────────────────────────────────────────────────────────
FROM node:22-alpine

LABEL maintainer="FORCH.iA <paulo@forchi.dev>"
LABEL app="forch-i-oracle"
LABEL app.kind="next"
LABEL harness.version="4"
LABEL pod.kit.version="5"

# git para deps que instalan desde repos; tini para señales limpias.
# python3/make/g++ (bug #7): Alpine es musl, así que los módulos NATIVOS
# (better-sqlite3, bcrypt, sharp, …) NO tienen prebuild compatible y node-gyp
# compila desde fuente. Sin toolchain el build muere con
# "gyp ERR! find Python … Could not find any Python installation to use".
# Esta es una imagen de DEV: el toolchain es parte del mínimo que funciona.
RUN apk add --no-cache git tini python3 make g++

WORKDIR /app

# ── 1) dependencias (capa cacheable) ──────────────────────────────────────
# .dockerignore en la raíz del context impide que node_modules del host entre.
# HUSKY=0 / CI=true: los hooks `prepare` (husky) ABORTAN la instalación en el
# contenedor porque no existe .git (exit 1). Se desactivan por ENV aquí, NUNCA
# en el package.json de la app (cero ediciones al código de la app).
# Incluye pnpm-workspace.yaml + .npmrc ANTES del install: la config de builds
# (allowBuilds / onlyBuiltDependencies) vive ahí. Si NO se copia, pnpm trata los
# build scripts ignorados como error FATAL (ERR_PNPM_IGNORED_BUILDS, exit 1).
COPY package.json pnpm-lock.yaml* package-lock.json* yarn.lock* pnpm-workspace.yaml* .npmrc* ./
ENV HUSKY=0
ENV CI=true
# strictDepBuilds=false: red de seguridad para apps sin allowBuilds declarado
# (los builds ignorados dejan de abortar el build). Verificado en podman.
RUN if [ -f pnpm-lock.yaml ]; then \
      corepack enable && corepack prepare pnpm@9 --activate && \
      (pnpm install --frozen-lockfile --config.strictDepBuilds=false || pnpm install --config.strictDepBuilds=false); \
    elif [ -f yarn.lock ]; then \
      corepack enable && (yarn install --frozen-lockfile || yarn install); \
    elif [ -f package-lock.json ]; then \
      (npm ci --no-audit --no-fund || npm install --no-audit --no-fund --legacy-peer-deps); \
    else \
      (npm install --no-audit --no-fund || npm install --no-audit --no-fund --legacy-peer-deps); \
    fi

# ── 2) código de la app (excluye node_modules/.next/dist vía .dockerignore) ─
COPY . .

# ── 3) host binding — SIEMPRE en el contenedor, nunca en la app ───────────
ENV NODE_ENV=development
ENV HOST=0.0.0.0
ENV HOSTNAME=0.0.0.0
# Bug #10: aquí va el puerto del CONTENEDOR, no el del host. Con el puerto del
# host, un `podman run` sin `-e PORT` arrancaba en el puerto equivocado
# (legado: ENV PORT=3001 con el mapeo 3001:7000 → el server quedaba fuera del
# mapeo). Lo tapaban los dos lanzadores (harness --up y compose, que SÍ pasan
# PORT del contenedor), así que era una trampa latente. Debe coincidir con el
# `${PORT:-N}` del CMD y con `PORT=3008` del compose.
ENV PORT=3008

EXPOSE 3008

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "npm exec -- next dev --hostname 0.0.0.0 --port ${PORT:-3008}"]
