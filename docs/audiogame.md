# AudioGame - Sistema de Gamificación por Audio

Este documento define el sistema de audio gamificado como capa narrativa, mecánica y técnica del juego. El objetivo es que el audio no sea solo ambientación, sino un sistema activo de feedback, tensión y lectura táctica, especialmente en el **nivel 7**.

## 1) Propósito del sistema de audio

- Traducir el estado del tablero a señales auditivas comprensibles.
- Guiar decisiones sin depender exclusivamente de UI visual.
- Reforzar la fantasía de campaña: progreso, riesgo, crisis y recuperación.
- Escalar intensidad y claridad según dificultad y carga cognitiva.

## 2) Marco narrativo del audio

### 2.1 Rol narrativo

El audio representa la "temperatura ideológica" y el pulso geopolítico del mundo. Cada facción y cada evento importante tienen una firma sonora que comunica:

- estabilidad o colapso
- control territorial o pérdida de control
- ventaja táctica o presión enemiga

### 2.2 Arco narrativo por run

- **Inicio de run**: paisaje sonoro estable, capas mínimas, mensajes de control.
- **Mitad de run**: más densidad rítmica, indicios de fricción entre facciones.
- **Run avanzada**: mayor disonancia, eventos reactivos más frecuentes, señales de urgencia.
- **Post-victoria o derrota**: cierre sonoro que sintetiza rendimiento y prepara siguiente decisión meta.

### 2.3 Identidad por facción

Cada facción debe tener:

- motivo corto (1 a 2 segundos) para notificaciones críticas
- timbre dominante (ejemplo: percusivo, sintético, coral)
- variación de intensidad según influencia acumulada

Esto permite que la lectura auditiva sea rápida incluso con alta complejidad visual.

## 3) Capa gamificada del audio

### 3.1 Audio como feedback de mecánicas

El audio responde a los sistemas centrales del loop:

- **Epoch**: micro-feedback de acciones, gasto AP, resolución local.
- **Round (12 epochs)**: escalada de tensión y resumen intermedio por hitos.
- **Campaign**: cambios de tono acumulativos por racha de victorias y nerfs activos.

### 3.2 Estados gamificados clave

- **Estado de control**: música más estable, rango dinámico moderado, menor ruido.
- **Estado de disputa**: capas adicionales de conflicto, transientes marcados.
- **Estado crítico**: alertas priorizadas, reducción de elementos no esenciales, foco en señales de decisión.

### 3.3 Relación con progresión (nerfs, perks, unlocks)

- Los **nerfs activos** alteran color sonoro global (más fricción, menos resolución armónica).
- Los **perks equipados** introducen micro-señales positivas (confirmaciones más limpias, menos ruido de error).
- Los **unlocks meta** habilitan capas sonoras adicionales de anticipación (pre-alertas de eventos relevantes).

## 4) Nivel 7 - Eventos y comportamiento sonoro

El nivel 7 es un umbral de alta presión. El audio debe cambiar de "acompañamiento" a "instrumento de supervivencia táctica".

### 4.1 Eventos principales del nivel 7

1. **Escalada hostil por fricción acumulada**
   - Trigger: presión enemiga sostenida o pérdida rápida de control.
   - Audio: aumento de pulsos graves + textura de inestabilidad.
   - Impacto gameplay: indica que decisiones conservadoras pueden fallar; promueve acciones de contención.

2. **Atenuación de señal ideológica**
   - Trigger: baja transferencia/influencia efectiva.
   - Audio: filtro de banda más estrecha + caída de brillo en motivos de facción.
   - Impacto gameplay: advierte menor eficacia de propagación; incentiva reposicionamiento.

3. **Fatiga diplomática**
   - Trigger: secuencia de acciones diplomáticas con rendimiento decreciente.
   - Audio: repetición de motivo con degradación y menor resolución.
   - Impacto gameplay: comunica rendimientos marginales decrecientes; sugiere cambio de estrategia.

4. **Ventana de contraataque**
   - Trigger: combinación favorable de control local + recursos tácticos.
   - Audio: stinger ascendente breve + limpieza de capas de ruido.
   - Impacto gameplay: señala oportunidad temporal de jugada agresiva.

5. **Riesgo de colapso de round**
   - Trigger: cadena de resultados negativos cercana al cierre del round.
   - Audio: patrón de alarma espaciada, priorizado sobre ambiente.
   - Impacto gameplay: fuerza priorización y reducción de acciones de bajo impacto.

### 4.2 Priorización de eventos (cuando coinciden)

Orden sugerido de prioridad audible en nivel 7:

1. riesgo de colapso
2. ventana de contraataque
3. escalada hostil
4. atenuación de señal
5. fatiga diplomática

Regla: cuando hay concurrencia, suena solo el evento de mayor prioridad y los demás se encolan o se representan con versiones abreviadas.

### 4.3 Evaluador de crisis por voz (determinista)

En Epoch 7, la directiva de voz usa un evaluador LLM con salida JSON estricta y dos impactos simultáneos:

- **Macro (primary_hex_modifier, -12 a +12)**: ajusta afinidad global solo en hexágonos donde el elemento objetivo es dominante.
- **Micro (global_sub_element_modifier, -22 a +22)**: ajusta el sub-elemento objetivo en todos los hexágonos del mapa.

La puntuación final (`0..100`) se calcula con pesos fijos:

- resonancia temática: 45%
- convicción retórica: 35%
- viabilidad memética: 20%

Mapeo determinista:

- `primary_hex_modifier = round((score - 50) * (12 / 50))`
- `global_sub_element_modifier = round((score - 50) * (22 / 50))`

Regla de balance: si se repite el mismo elemento en ventana corta de epochs, los modificadores se amortiguan (damping) para evitar snowball.

### 4.4 Matriz de tuning recomendada (Level 7)

Para calibrar intensidad sin tocar la matemática base del evaluador, usar perfiles:

| Perfil | primaryAlignmentScale | subElementScale | repeatEpochWindow | repeatDamping | scoreFactorBase | scoreFactorBonus |
|---|---:|---:|---:|---:|---:|---:|
| arcade | 0.30 | 0.34 | 1 | 0.82 | 0.95 | 0.40 |
| standard | 0.22 | 0.25 | 2 | 0.70 | 0.85 | 0.30 |
| hardcore | 0.16 | 0.18 | 3 | 0.58 | 0.80 | 0.22 |

Lectura rápida:

- **arcade**: más impacto inmediato y menor castigo por repetir elemento.
- **standard**: punto medio para runs consistentes.
- **hardcore**: crisis más punitivas, menor efecto neto por speech y mayor freno al snowball.

## 5) Cómo el audio afecta al juego

El audio no modifica directamente la matemática del tablero, pero sí modifica el comportamiento del jugador. Su efecto está en:

- **tiempo de reacción**: alertas claras reducen latencia de decisión.
- **calidad de decisión**: señales diferenciadas evitan confundir estados de riesgo.
- **gestión de carga cognitiva**: segmentación y prioridad auditiva reducen saturación informativa.
- **retención y mastery**: el jugador aprende patrones sonoros y anticipa consecuencias.

## 6) Segmentación de audio (diseño funcional)

### 6.1 Segmentos por propósito

- **Ambiente base**: contexto continuo, baja prioridad.
- **Sistema/UI**: confirmación, error, bloqueo, transición.
- **Eventos tácticos**: señales de estado de tablero y amenazas.
- **Eventos narrativos**: hitos de facción, crisis, momentos de campaña.
- **Meta-progresión**: compra, unlock, equipamiento, fin de campaña.

### 6.2 Segmentación por criticidad

- **Crítica**: nunca se enmascara; ducking automático del resto.
- **Alta**: desplaza eventos medios si hay solapamiento.
- **Media**: suena si no hay eventos de prioridad mayor.
- **Baja**: se omite durante picos de tensión.

### 6.3 Segmentación por ventana temporal

- **Instantáneo** (0-300 ms): confirmaciones y errores de input.
- **Corto** (300 ms-2 s): eventos tácticos puntuales.
- **Medio** (2-8 s): estados de presión o oportunidad.
- **Largo** (8 s+): ambiente dinámico y continuidad narrativa.

### 6.4 Segmentación por capa técnica

- `bus_music`: música adaptativa y motivos de facción.
- `bus_sfx_ui`: feedback de interfaz y acciones del jugador.
- `bus_sfx_gameplay`: eventos del tablero y alertas críticas.
- `bus_voice_optional`: locuciones o textos narrados (si se habilitan).

## 7) Diseño técnico de implementación

### 7.1 Modelo de eventos recomendado

Definir un dispatcher de audio desacoplado con contrato de evento:

- `eventId`
- `priority`
- `category`
- `cooldownMs`
- `payload` (facción, severidad, epoch, round, campaignWins)

Principios:

- idempotencia de eventos (evitar duplicados simultáneos)
- throttling para spam de señales
- cooldown específico por tipo de alerta

### 7.2 Reglas de mezcla (mixing)

- Ducking automático del ambiente cuando entra evento crítico.
- Limitador suave en bus maestro para evitar clipping en picos.
- Curvas de volumen no lineales para que alertas sean audibles a bajo volumen general.

### 7.3 Mapeo mínimo de gameplay -> audio

- inicio/fin de epoch
- gasto AP significativo
- cambio fuerte de control territorial
- trigger de nerf percibible en run
- estado de derrota inminente
- victoria de round / derrota / campaign done

### 7.4 Observabilidad y tuning

Registrar telemetría de:

- eventos disparados por minuto
- eventos descartados por prioridad/cooldown
- latencia de disparo -> reproducción
- ratio de superposición de alertas

Con eso se ajustan prioridades, duraciones y densidad sonora.

## 8) UX y accesibilidad

- Opción de "audio táctico reforzado" para jugadores que dependen más de señales sonoras.
- Control separado por buses (música, UI, gameplay, voz).
- Presets: inmersivo / competitivo / nocturno.
- Subtítulos de eventos críticos para redundancia multimodal.

## 9) Riesgos y mitigaciones

- **Riesgo: fatiga auditiva** -> limitar repetición de stingers y aplicar variaciones.
- **Riesgo: sobrecarga en nivel 7** -> poda automática de eventos de baja prioridad.
- **Riesgo: confusión entre facciones** -> motivos más contrastados por timbre y ritmo.
- **Riesgo: latencia perceptible** -> precarga de assets y colas de reproducción ligeras.

## 10) Sugerencias (sección aparte)

### 10.1 Sugerencias narrativas

- Introducir "firmas de crisis" únicas para eventos mayores del nivel 7.
- Añadir una evolución de motivo por campaña (misma identidad, distinta intensidad).
- Usar silencios breves intencionales antes de eventos críticos para elevar impacto.

### 10.2 Sugerencias gamificadas

- Mostrar en tutorial un "diccionario de señales" para acelerar aprendizaje.
- Recompensar lectura auditiva correcta (micro-bonus de feedback, no balance-break).
- Añadir "desafío sin HUD" opcional donde audio sea canal principal de estado.

### 10.3 Sugerencias técnicas

- Implementar tabla central de prioridades editable (data-driven, no hardcode).
- Definir pruebas automáticas de no regresión para eventos críticos de nivel 7.
- Crear simulador offline de tormenta de eventos para calibrar mezcla y throttling.

### 10.4 Sugerencias de producto

- Medir si jugadores que activan audio táctico mejoran retención en runs avanzadas.
- A/B test de dos perfiles de mezcla para nivel 7 (claridad vs dramatismo).
- Incluir ajuste "densidad de alertas" como opción avanzada de accesibilidad.
