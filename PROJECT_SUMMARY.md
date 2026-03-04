# PokéIdle — Project Summary (Handoff)

This document provides an overview of the PokéIdle project for future development and AI context.

## Project Overview

PokéIdle is a Pokémon-themed roguelike/idle game built with React, Vite, and Tailwind CSS. It features multiple game modes, a persistent progression system (Meta), and dynamic combat mechanics.

## Tech Stack

- **Frontend**: React (Functional Components, Hooks)
- **State Management**: React Context (`GameContext.tsx`)
- **Styling**: Tailwind CSS (with custom design tokens)
- **Data Source**: PokéAPI (for Pokémon data and evolutions)
- **Assets**: Local sprite registry (`spriteRegistry.ts`) for items, types, and shiny Pokémon.

## Key Components & Features

### Game Modes

1.  **Story Mode**: Progressive zones with encounters and Bosses.
2.  **Infinite Training**: Endless battles with increasing difficulty.

### Core Systems

- **Combat Engine**: Handles damage, turn-based logic, Boss phases (+2 stat boosts), and held item effects (e.g., Focus Band).
- **Item System**: Includes healing items, evolution items (async API validation), and held items.
- **XP & Evolution**: Experience multipliers (Exp Cards), Exp Share (20% to bench), and multi-stage evolution logic.
- **Capture System**: Ball-based capture with status and HP modifiers. Bosses have a 0.5x capture multiplier and perfect IVs (31).
- **Meta Progression**: Persistent storage for unlocked starters, highest IVs per species, and run history.

### Directory Structure

- `/src/engine`: Core logic (combat, capture, items, stats).
- `/src/features/run`: Story mode and main game loop components.
- `/src/features/training`: Infinite Training mode logic and UI.
- `/src/features/meta`: Persistent progression components and types.
- `/src/context`: Global game state.
- `/src/lib`: Static data (regions, items, sprites).
- `/public/sprites`: Locally hosted assets.

## Recent Refinements

- **Boss Refinements**: Dynamic leveling (Team Max + 2), capturable Bosses with elite stats.
- **UI Optimizations**: Local sprite integration for performance, "Searching" overlays for exploration, and stat/status badges in battle.
- **Item System**: "Focus Band" implementation and asynchronous evolution item usage.

## Future Goals

- Global Statistics implementation.
- Favicon and UI polish.
- Further regional expansions.
