# REPORT DE AUDITORÍA Y MEJORA: FORCH.i ORACLE v3

## 1. Verificación del Reporte Previo (`FULL_REVIEW_REPORT.md`)
Se realizó una auditoría del código actual para verificar si los problemas críticos reportados anteriormente fueron resueltos.

| Punto Auditado | Estado | Observación |
| :--- | :--- | :--- |
| **Seguridad: API Unauthenticated** | ✅ Corregido | El endpoint `/api/match-result` ahora usa `validateCronAuth` con validación de Bearer Token. |
| **Seguridad: Leak de CRON_SECRET** | ✅ Corregido | `lib/cron-auth.ts` ya no acepta el secreto por URL query params. |
| **Seguridad: Leak de API Key** | ✅ Corregido | Se eliminó el `slice(0, 6)` en los diagnósticos de ingesta. |
| **Diseño: Colores Hardcodeados** | ⚠️ Parcial | Se implementaron variables CSS en `globals.css` (tokens de estado de partido), pero persisten colores hexadecimales específicos en `app/fixture/page.tsx` (ej. badges de podio). |
| **Accesibilidad: ARIA y Modales** | ✅ Mejorado | El modal de detalles en `fixture/page.tsx` ya incluye `role="dialog"` y `aria-modal`. |
| **Rendimiento: Dead Code** | ✅ Corregido | Se eliminaron los 12 componentes no utilizados mencionados. |

---

## 2. Diagnóstico del Motor de Predicción (Prioridad ⭐⭐⭐⭐⭐)

### Hallazgos Críticos:
1. **Incoherencia entre Vistas:** El Dashboard (`app/page.tsx`) usa un cálculo **determinista basado en Elo** (instantáneo pero menos preciso) como fallback, mientras que la sección Fixture depende del **motor Monte Carlo** (5,000 simulaciones). Esto causa que un equipo pueda aparecer como favorito en el Dashboard y no en el Fixture.
2. **Cuello de Botella en `/api/fixture`:** Este endpoint intenta predecir 72 partidos de fase de grupos usando el motor *Ensemble* (4 modelos por partido) + 5,000 simulaciones para el bracket en una sola petición. Esto excede fácilmente el timeout de 10-15s de Vercel en planes Hobby/Pro.
3. **Overhead Asíncrono:** La función `calculateStatisticalPrediction` es `async`, lo que introduce latencia en el bucle de simulación de 5,000 iteraciones. En un motor matemático, esto debería ser puramente sincrónico para ejecutarse en milisegundos.

### Sugerencia de Mejora:
* **Motor Sincrónico:** Refactorizar `predictor-engine.ts` y `ensemble-engine.ts` para que el núcleo matemático no sea asíncrono.
* **Pre-computación:** Las simulaciones pesadas deben ocurrir en el Cron Job y persistirse en la base de datos (Single Source of Truth), no calcularse *on-the-fly* cuando el usuario entra a la página.

---

## 3. Arquitectura de Datos y Fluidez (Prioridad ⭐⭐⭐⭐)

### Problema de "Bloqueos Visuales":
Los bloqueos se deben a que el hilo principal (Main Thread) de React está procesando un JSON de fixture masivo y recalculando estados complejos mientras SWR intenta revalidar.

### Soluciones Recomendadas:

#### A. Web Workers (Cómputo en Segundo Plano)
Mover el archivo `lib/tournament-sim.ts` a un **Web Worker**.
* **Beneficio:** Si el usuario quiere ejecutar una simulación personalizada (ej. "Simular 10,000 veces"), la UI permanecerá 100% responsiva (60fps) mientras el Worker usa un hilo separado de la CPU.

#### B. Zustand como "Local Mirror"
Actualmente usas Zustand de forma muy limitada (`refreshKey`).
* **Mejora:** Implementar un `useTournamentStore` que guarde el fixture completo y los resultados. SWR solo debería actualizar este Store. Todos los componentes de la app consumirían el Store, eliminando la necesidad de pasar props pesadas o hacer cálculos de "standings" repetitivos en cada componente.

#### C. Vercel Edge Functions
Mover `/api/predict` a **Edge Runtime**.
* **Beneficio:** Al no depender de Node.js pesado, la latencia de respuesta para predicciones individuales baja de ~200ms a ~30ms.

---

## 4. Plan de Acción Propuesto (Fases)

### Fase 1: Estabilización del Motor (Lógica)
*   **Unificar Fuente de Verdad:** Hacer que el Dashboard y el Fixture lean estrictamente del mismo registro en la DB (`consensusBracket`).
*   **Sincronización:** Convertir el motor Monte Carlo a funciones sincrónicas.
*   **FIFA Tiebreakers:** Validar el sistema de "Mejores Terceros" con los criterios oficiales de desempate (actualmente usa una aproximación simplificada).

### Fase 2: Optimización de Rendimiento (UX)
*   **Implementar Web Worker:** Para simulaciones on-demand en la pestaña de Forecast.
*   **Virtualización de Listas:** Usar una librería de virtualización para la lista de 128 partidos en móviles, reduciendo la carga del DOM.
*   **Mejora de SWR:** Configurar `dedupingInterval` más agresivo para evitar peticiones duplicadas en cambios de pestaña rápidos.

### Fase 3: Refactorización Estructural (Arquitectura)
*   **Tokenización 100%:** Migrar los últimos colores hardcodeados para soporte total de Modo Claro.
*   **Zustand Global:** Migrar la lógica de "liveStandings" del frontend al Store global para que sea persistente entre navegaciones.

---

**¿Deseas que procedamos con la Fase 1 centrada en unificar la lógica de predicción y estabilizar el motor de simulación?**
