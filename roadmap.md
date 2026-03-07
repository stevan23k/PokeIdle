# PokéIdle — Roadmap de Mejoras

## 🔴 Alta Prioridad (Gameplay Core)

### 1. Recordador de Movimientos

En la tienda del `ZoneTransitionModal`, permitir recuperar movimientos que el Pokémon debería saber a su nivel actual pero no tiene.

- Costo en dinero (escalado por nivel del Pokémon)
- Llama a `getFullMovesetForLevel()` para obtener movimientos faltantes
- Resuelve el problema de movimientos perdidos al cancelar el modal de reemplazo
- **Archivos:** `ZoneTransitionModal.tsx`, `pokeapi.service.ts`

### 2. Pantalla de Victoria (Post-Campeón)

Al derrotar al Campeón, `eliteFourDefeated` se setea pero no hay pantalla especial.

- Modal de victoria con estadísticas de la run (tiempo, batallas, capturas, dinero ganado)
- Medallas obtenidas
- Opción de nueva run con herencia de IVs/naturalezas
- Animación/fanfare de celebración
- **Archivos:** nuevo `VictoryModal.tsx`, `GameContext.tsx`, `useEngineTick.ts`

### 3. PC Navegable

El PC existe en el estado pero no hay UI para verlo ni interactuar con él.

- Ver todos los Pokémon almacenados
- Mover Pokémon del PC al equipo y viceversa
- Liberar Pokémon (con confirmación)
- Ordenar por nivel, tipo, BST
- **Archivos:** nuevo `PCModal.tsx` o vista `PCView.tsx`

---

## 🟡 QoL Medio

### 4. Indicador de Medallas en la UI

Mostrar las 8 medallas de Kanto obtenidas en algún lugar visible.

- Sprites de cada medalla (Boulder, Cascade, Thunder, Rainbow, Soul, Marsh, Volcano, Earth)
- Estado visual: obtenida vs pendiente
- Ubicación sugerida: panel lateral o pestaña de progresión
- **Archivos:** nuevo `BadgeDisplay.tsx`, `RunView.tsx`

### 5. Aviso Pre-Gimnasio

Cuando el jugador está a punto de enfrentar a un líder, mostrar una notificación con:

- Nombre del líder y tipo especialidad
- Mecánica especial de la batalla (ej. "Suelo Ardiente", "Niebla Tóxica")
- Consejo breve de estrategia
- **Archivos:** `ZoneTransitionModal.tsx` o nuevo `GymPreviewBanner.tsx`

### 6. Mejoras al Modal de Reemplazo de Movimientos

Cuando el moveset está lleno y hay un movimiento nuevo disponible:

- Ordenar movimientos actuales por poder/utilidad
- Mostrar comparativa clara (poder, tipo, PP, categoría)
- Indicar si el movimiento nuevo es de estado, físico o especial
- **Archivos:** `MoveLearnModal.tsx` (o equivalente)

---

## 🟢 Menor Prioridad (Impacto Visual)

### 7. Sprites/Avatar de Líderes de Gimnasio

Actualmente la batalla de gym se ve igual que cualquier batalla salvaje.

- Mostrar el nombre del líder en la UI de combate cuando `bState.type === "gym"`
- Mostrar un avatar o badge del gimnasio como indicador visual
- Posible: sprite del líder en lugar del Pokémon rival durante la intro
- **Archivos:** `BattleView.tsx`, `gyms` data en Supabase

### 8. Historial de Runs

Ya se guarda en `meta.runHistory` pero no hay pantalla para consultarlo.

- Lista de runs anteriores con: badges obtenidas, nivel máximo alcanzado, duración, motivo de fin (derrota/victoria)
- Ordenar por fecha, badges, nivel
- **Archivos:** nuevo `RunHistoryView.tsx` o modal en `MetaView.tsx`

### 9. Indicador de Progreso del Alto Mando

Durante las batallas del Elite Four, el jugador no sabe en qué punto está.

- Mostrar "Miembro 2/5" o los nombres/avatares de los 5 miembros con el actual resaltado
- Integrado en la UI de combate cuando `bState.type === "elite"`
- **Archivos:** `BattleView.tsx`

---

## Estado Actual del Juego

| Sistema                              | Estado                         |
| ------------------------------------ | ------------------------------ |
| Zonas Kanto (18 zonas)               | ✅ Completo                    |
| Gimnasios (8 líderes, multi-Pokémon) | ✅ Completo                    |
| Elite Four + Campeón                 | ✅ Completo                    |
| Mega Evoluciones                     | ✅ Completo                    |
| Sistema de evolución                 | ✅ Completo                    |
| Aprendizaje de movimientos           | ✅ Completo (con fix reciente) |
| Caramelos Raros                      | ✅ Completo                    |
| MTs (72 movimientos)                 | ✅ Completo                    |
| Cache Supabase                       | ✅ Completo                    |
| PC navegable                         | ❌ Pendiente                   |
| Pantalla de victoria                 | ❌ Pendiente                   |
| Recordador de movimientos            | ✅ Completo                    |
| Historial de runs                    | ❌ Pendiente                   |
| Indicador de medallas                | ❌ Pendiente                   |
