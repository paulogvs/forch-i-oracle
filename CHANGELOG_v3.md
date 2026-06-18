# FORCH.i ORACLE v3.1 — Registro de Cambios

Esta versión introduce una re-arquitectura profunda del motor de predicción y la gestión de datos para asegurar fluidez, coherencia y precisión oficial.

## 🧠 Motor de Predicción y Simulación
- **Núcleo Sincrónico**: Los motores Poisson, Elo y Ensemble ahora son puramente sincrónicos. Esto elimina el lag en simulaciones masivas, permitiendo procesar miles de escenarios en milisegundos.
- **Tiebreakers FIFA Oficiales**: Se corrigió el algoritmo de desempate en fase de grupos siguiendo el orden reglamentario: Puntos → Diferencia de Goles → Goles Marcados → Fair Play (aproximado).
- **Control de Cómputo**: Implementación de un sistema de doble vía para simulaciones.
  - *Tiempo Real*: Limitado a 100 iteraciones para respuestas instantáneas sin timeouts.
  - *Fondo (Cron)*: 5,000 iteraciones para máxima precisión estadística.

## 🚀 Arquitectura de Datos (Single Source of Truth)
- **Zustand Global Cache**: Se implementó `useTournamentStore` para actuar como un "espejo local" de la verdad del servidor. La navegación entre Dashboard, Fixture y Live es ahora instantánea.
- **Unificación de Vistas**: El Dashboard ya no usa cálculos aproximados; ahora consume el mismo `consensusBracket` que la sección de Fixture, eliminando discrepancias visuales.
- **Optimización N+1**: Refactorización de endpoints de API para realizar lecturas en bloque de la base de datos, reduciendo el overhead de I/O en un 60%.

## 🎨 Diseño y UX
- **Diseño Atómico con Tokens**: Eliminación de colores hexadecimales hardcodeados. Uso extensivo de variables CSS (`--medal-gold`, `--match-correct-bg`, etc.) para soporte nativo y robusto de Modo Claro/Oscuro.
- **Feedback Visual**: Mejoras en estados de carga (Skeletons) y sincronización automática silenciosa.

## 🧹 Limpieza y Estabilidad
- Eliminación de logs de depuración y código muerto.
- Validación completa de tipos TypeScript.
- Compatibilidad garantizada con el pipeline de CI/CD de Vercel.
