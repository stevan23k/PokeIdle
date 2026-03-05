import React from "react";
import { useGame } from "../../../context/GameContext";
import { PixelSprite } from "../../../components/ui/PixelSprite";
import {
  Trophy,
  Swords,
  Target,
  Coins,
  Map,
  User,
  History,
  Star,
  Zap,
  Clock,
  TrendingUp,
  Package,
  ShieldCheck,
} from "lucide-react";

interface Props {
  onBack: () => void;
}

export function GlobalStatsView({ onBack }: Props) {
  const { meta } = useGame();

  // Calculations from history
  const totalCapturesEver = meta.runHistory.reduce(
    (acc, run) => acc + (run.totalCaptured || 0),
    0,
  );
  const totalVictoriesEver = meta.runHistory.reduce(
    (acc, run) => acc + (run.totalBattlesWon || 0),
    0,
  );
  const totalFaintedEver = meta.runHistory.reduce(
    (acc, run) => acc + (run.totalFainted || 0),
    0,
  );
  const totalMoneyEver = meta.runHistory.reduce(
    (acc, run) => acc + (run.moneyEarned || 0),
    0,
  );
  const longestRunTime = Math.max(
    ...meta.runHistory.map((r) => r.duration || 0),
    0,
  );

  const totalStartersPossible = 27;
  const uniqueCapturedCount = meta.capturedUniqueIds.length;
  const totalPokemonPossible = 1010; // Approx total pokemon in PokeAPI

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div
      className="fixed cursor-default inset-0 z-50 bg-color-surface flex flex-col p-4 md:p-8 crt-screen overflow-y-auto"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-brand pb-4 sticky top-0 bg-surface/90 backdrop-blur-md z-10">
          <button
            onClick={onBack}
            className="px-6 py-2 bg-surface-dark border-4 border-border text-[#ffffff80] font-display text-sm tracking-widest uppercase hover:text-white hover:border-white transition-color duration-350 active:scale-90 ease-in-out pixel-shadow"
          >
            &lt; VOLVER
          </button>
          <div className="flex flex-col">
            <h1 className="cursor-default text-title text-brand">
              Centro de <span className="text-white">Estadísticas</span>
            </h1>
            <p className="cursor-default text-subtitle text-white flex justify-end">
              Registro del Entrenador — Datos Persistentes
            </p>
          </div>
        </div>

        {/* Section 1: 📊 HISTORIAL GLOBAL */}
        <section>
          <h2 className="text-section text-accent">
            <History size={18} /> Historial Global
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Runs Completadas"
              value={meta.totalRuns}
              icon={<Trophy />}
              sub="Intentos totales"
            />
            <StatCard
              label="Mejor Run"
              value={`${meta.bestRun?.badges || 0} / 8`}
              icon={<ShieldCheck />}
              sub="Máximo de medallas"
            />
            <StatCard
              label="Run más Larga"
              value={formatTime(longestRunTime)}
              icon={<Clock />}
              sub="Tiempo máximo"
            />
            <StatCard
              label="Tiempo Total"
              value={formatTime(meta.totalTimePlayed)}
              icon={<Zap />}
              sub="Histórico jugado"
              color="text-yellow-400"
            />
            <StatCard
              label="Victorias Totales"
              value={totalVictoriesEver}
              icon={<Swords />}
              sub="Enemigos derrotados"
              color="text-danger"
            />
            <StatCard
              label="Capturas Totales"
              value={totalCapturesEver}
              icon={<Target />}
              sub="Pokémon atrapados"
              color="text-brand"
            />
            <StatCard
              label="Faint Totales"
              value={totalFaintedEver}
              icon={<TrendingUp />}
              sub="Aliados debilitados"
              color="text-orange-500"
            />
            <StatCard
              label="Pokédólares"
              value={`${totalMoneyEver} ₽`}
              icon={<Coins />}
              sub="Ganancia histórica"
              color="text-accent"
            />
          </div>
        </section>

        {/* Section 2: 🎯 RÉCORDS PERSONALES */}
        <section>
          <h2 className="text-section text-brand-light">
            <Star size={18} /> Récords Personales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RecordItem
              label="Mayor Nivel Alcanzado"
              value={`Nv. ${meta.highestLevelReached}`}
              sub="De cualquier Pokémon en tu equipo"
            />
            <RecordItem
              label="Máxima Racha de Victorias"
              value={`${meta.maxWinStreakEver} Batallas`}
              sub="Sin derrotas consecutivas"
            />
            <RecordItem
              label="Gimnasio más Difícil"
              value={
                meta.bestRun?.badges ? `Gimnasio ${meta.bestRun.badges}` : "N/A"
              }
              sub="Récord de progresión"
            />

            {/* Shiny Records */}
            <div className="col-span-full md:col-span-1 lg:col-span-1 bg-surface-dark border-4 border-accent p-4 shadow-pixel flex flex-col justify-between">
              <div>
                <h3 className="text-label text-accent mb-3">
                  Encuentros Especiales
                </h3>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-surface border-2 border-border flex items-center justify-center">
                      {meta.firstShiny ? (
                        <PixelSprite
                          pokemonId={meta.firstShiny.id}
                          variant="front"
                          shiny={true}
                          size={60}
                        />
                      ) : (
                        <span className="text-[#ffff] text-[0.7rem]">?</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-label text-white">
                        PRIMER SHINY
                      </span>
                      <span className="text-label opacity-90">
                        {meta.firstShiny ? "¡Capturado!" : "Aún nada..."}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-surface border-2 border-border flex items-center justify-center">
                      {meta.lastShiny ? (
                        <PixelSprite
                          pokemonId={meta.lastShiny.id}
                          variant="front"
                          shiny={true}
                          size={60}
                        />
                      ) : (
                        <span className="text-muted text-[0.7rem]">?</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-label text-white">
                        ÚLTIMO SHINY
                      </span>
                      <span className="text-label opacity-90">
                        {meta.lastShiny ? "¡Capturado!" : "Aún nada..."}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <RecordItem
              label="Run más Rápida (Gym 1)"
              value={
                meta.fastestGym1Time
                  ? formatTime(meta.fastestGym1Time)
                  : "Pendiente"
              }
              sub="Velocidad récord"
            />
          </div>
        </section>

        {/* Section 3: 📦 COLECCIÓN */}
        <section>
          <h2 className="text-section text-success">
            <Package size={18} /> Colección y Progreso
          </h2>
          <div className="border-4 border-border bg-surface-dark overflow-hidden shadow-pixel">
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="flex flex-col gap-2">
                <span className="text-label text-white">
                  Pokémon Únicos
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl text-value text-brand mb-0">
                    {uniqueCapturedCount}
                  </span>
                  <span className="text-[0.8rem] text-white">
                    / {totalPokemonPossible}
                  </span>
                </div>
                <div className="w-full h-2 bg-surface border border-border mt-1">
                  <div
                    className="h-full bg-brand"
                    style={{
                      width: `${(uniqueCapturedCount / totalPokemonPossible) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-label text-white">
                  Iniciales (Genética)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl text-value text-accent mb-0">
                    {meta.unlockedStarters.length}
                  </span>
                  <span className="text-[0.8rem] text-white">
                    / {totalStartersPossible}
                  </span>
                </div>
                <div className="w-full h-2 bg-surface border border-border mt-1">
                  <div
                    className="h-full bg-accent"
                    style={{
                      width: `${(meta.unlockedStarters.length / totalStartersPossible) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-label text-white">
                  Regiones
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl text-value text-success mb-0">
                    {meta.unlockedRegions.length}
                  </span>
                  <span className="text-[0.8rem] text-white">/ 8</span>
                </div>
                <div className="w-full h-2 bg-surface border border-border mt-1">
                  <div
                    className="h-full bg-success"
                    style={{
                      width: `${(meta.unlockedRegions.length / 8) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="flex flex-col gap-2 cursor-pointer hover:bg-surface-light/5 p-2 -m-2 transition-colors">
                <span className="text-label text-white">
                  Objetos Usados
                </span>
                <span className="text-value text-foreground text-xl mb-0">
                  {Object.values(meta.totalItemsUsed).reduce(
                    (a, b) => a + b,
                    0,
                  )}
                </span>
                <span className="text-subtext opacity-95">
                  Click para ver por categoría
                </span>
              </div>
            </div>

            <div className="bg-surface/30 p-6 border-t border-border">
              <h3 className="text-label !text-[0.8rem] text-accent-blue mb-6">
                Genética de Iniciales Desbloqueada
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-8 gap-6">
                {meta.unlockedStarters.map((starter) => (
                  <div
                    key={starter.id}
                    className="aspect-square bg-surface border-2 border-border flex flex-col items-center justify-center relative group hover:border-brand transition-colors duration-150 ease-out"
                    title={starter.name}
                  >
                    <PixelSprite
                      pokemonId={starter.id}
                      variant="front"
                      size={100}
                      shiny={starter.isShiny}
                    />
                    <div>
                      <p className="text-subtext font-bold text-white">
                        {starter.name}
                      </p>
                    </div>

                    {starter.isShiny && (
                      <div className="absolute top-0 right-0 text-[0.5rem] bg-accent text-black px-0.5">
                        ★
                      </div>
                    )}
                  </div>
                ))}
                {Array.from({
                  length: Math.max(
                    0,
                    totalStartersPossible - meta.unlockedStarters.length,
                  ),
                }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="aspect-square bg-surface/10 border-2 border-border/20 flex items-center justify-center opacity-10"
                  >
                    <span className="text-[0.4rem] font-display">?</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="flex flex-col items-center gap-2 mt-8">
          <div className="flex gap-4">
            <span className="text-label !text-[1rem] text-white">
              PokéIdle v1.2
            </span>
            <span className="text-label !text-[1rem] text-white font-black">
              Entrenador: {meta.totalRuns > 0 ? "Veterano" : "Novato"}
            </span>
          </div>
          <p className="text-subtext text-white font-bold opacity-80">
            Los datos se guardan automáticamente cada 10 segundos.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, sub, color = "text-foreground" }: any) {
  return (
    <div className="bg-surface-alt border-4 border-border p-4 shadow-pixel hover:-translate-y-1 transition-transform group">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-surface-dark border-2 border-border group-hover:border-brand transition-colors text-brand">
          {React.cloneElement(icon, { size: 16 })}
        </div>
        <span className="text-label text-white">
          {label}
        </span>
      </div>
      <div
        className={`text-value ${color}`}
      >
        {value}
      </div>
      <div className="text-subtext text-white opacity-60">
        {sub}
      </div>
    </div>
  );
}

function RecordItem({ label, value, sub }: any) {
  return (
    <div className="bg-surface-alt border-4 border-border p-5 shadow-pixel relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-12 h-12 bg-brand/5 rotate-45 translate-x-6 -translate-y-6"></div>
      <h3 className="text-label text-white mb-2">
        {label}
      </h3>
      <div className="text-value text-brand text-xl group-hover:scale-105 transition-transform origin-left mb-1">
        {value}
      </div>
      <p className="text-subtext text-white opacity-70">
        {sub}
      </p>
    </div>
  );
}
