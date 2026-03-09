import React from "react";
import { useGame } from "../../../context/GameContext";
import { useAuth } from "../../../context/AuthContext";
import { PixelSprite } from "../../../components/ui/PixelSprite";
import { PixelWindow, GBAButton, C } from "../../../components/ui/GBAUI";
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
  ChevronRight,
} from "lucide-react";

interface Props {
  onBack: () => void;
}

export function GlobalStatsView({ onBack }: Props) {
  const { user: authUser, isGuest } = useAuth();
  const displayName = isGuest
    ? "Invitado"
    : authUser?.user_metadata?.full_name ||
      authUser?.user_metadata?.name ||
      authUser?.email ||
      "Entrenador";

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
  const totalPokemonPossible = 1010;

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col p-4 md:p-8 crt-screen overflow-y-auto"
      style={{ backgroundColor: C.bg }}
    >
      <div className="w-full max-w-6xl mx-auto flex flex-col items-stretch">
        <PixelWindow title="REGISTRO ENTRENADOR" contentPadding={0}>
          {/* Header/Toolbar */}
          <div className="flex items-center justify-between p-4 border-b-2 border-border bg-[#d0dbd4] sticky top-0 z-10">
            <GBAButton onClick={onBack} variant="secondary">
              &lt; VOLVER
            </GBAButton>
            <div className="flex flex-col items-end">
              <h1 className="font-display text-[0.8rem] text-brand tracking-widest uppercase mb-1">
                CENTRO <span className="text-[#141a1c]">ESTADÍSTICAS</span>
              </h1>
              <div className="flex items-center gap-2 bg-[#4a5a52] px-3 py-1 border border-[#0e1418] shadow-[inset_2px_2px_0_rgba(0,0,0,0.2)]">
                <User size={10} className="text-[#e8a838]" />
                <span className="font-display text-[0.45rem] text-[#d0dbd4] tracking-widest uppercase">
                  {displayName}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-8 flex flex-col gap-10">
            {/* Section 1: 📊 HISTORIAL GLOBAL */}
            <section>
              <h2 className="font-display text-[0.6rem] text-[#141a1c] flex items-center gap-2 mb-6 tracking-[0.2em] uppercase">
                <History size={14} className="text-brand" /> HISTORIAL GLOBAL
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
                  color="text-[#c09c28]"
                />
                <StatCard
                  label="Victorias Totales"
                  value={totalVictoriesEver}
                  icon={<Swords />}
                  sub="Enemigos derrotados"
                  color="text-brand"
                />
                <StatCard
                  label="Capturas Totales"
                  value={totalCapturesEver}
                  icon={<Target />}
                  sub="Pokémon atrapados"
                  color="text-[#304c8c]"
                />
                <StatCard
                  label="Faint Totales"
                  value={totalFaintedEver}
                  icon={<TrendingUp />}
                  sub="Aliados debilitados"
                  color="text-[#d86818]"
                />
                <StatCard
                  label="Pokédólares"
                  value={`${totalMoneyEver} ₽`}
                  icon={<Coins />}
                  sub="Ganancia histórica"
                  color="text-[#307438]"
                />
              </div>
            </section>

            {/* Section 2: 🎯 RÉCORDS PERSONALES */}
            <section>
              <h2 className="font-display text-[0.6rem] text-[#141a1c] flex items-center gap-2 mb-6 tracking-[0.2em] uppercase">
                <Star size={14} className="text-[#c09c28]" /> RÉCORDS PERSONALES
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <RecordItem
                  label="Mayor Nivel Alcanzado"
                  value={`Nv. ${meta.highestLevelReached}`}
                  sub="Máximo alcanzado en equipo"
                />
                <RecordItem
                  label="Máxima Racha Victorias"
                  value={`${meta.maxWinStreakEver} Batallas`}
                  sub="Sin derrotas consecutivas"
                />
                <RecordItem
                  label="Gimnasio más Difícil"
                  value={
                    meta.bestRun?.badges
                      ? `Gimnasio ${meta.bestRun.badges}`
                      : "N/A"
                  }
                  sub="Récord de progresión"
                />

                {/* Shiny Records as a special double-wide/high callout if needed, but keeping grid for now */}
                <div className="col-span-1 bg-[#d0dbd4] border-2 border-[#0e1418] p-4 shadow-[4px_4px_0_#2a3a32] flex flex-col justify-between">
                  <h3 className="font-display text-[0.5rem] text-[#141a1c] mb-4 tracking-widest uppercase">
                    ENCUENTROS ESPECIALES
                  </h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 bg-[#e8e8d0] p-2 border border-[#0e1418]/20">
                      <div className="w-12 h-12 bg-[#d0dbd4] border border-[#0e1418] flex items-center justify-center">
                        {meta.firstShiny ? (
                          <PixelSprite
                            pokemonId={meta.firstShiny.id}
                            variant="front"
                            shiny={true}
                            size={40}
                          />
                        ) : (
                          <span className="text-[#141a1c]/20 text-[0.6rem]">
                            ?
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-display text-[0.45rem] text-[#141a1c] tracking-tighter">
                          PRIMER SHINY
                        </span>
                        <span className="font-body text-[0.55rem] text-[#4c5c54] font-bold">
                          {meta.firstShiny ? "¡CAPTURADO!" : "AÚN NADA..."}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-[#e8e8d0] p-2 border border-[#0e1418]/20">
                      <div className="w-12 h-12 bg-[#d0dbd4] border border-[#0e1418] flex items-center justify-center">
                        {meta.lastShiny ? (
                          <PixelSprite
                            pokemonId={meta.lastShiny.id}
                            variant="front"
                            shiny={true}
                            size={40}
                          />
                        ) : (
                          <span className="text-[#141a1c]/20 text-[0.6rem]">
                            ?
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-display text-[0.45rem] text-[#141a1c] tracking-tighter">
                          ÚLTIMO SHINY
                        </span>
                        <span className="font-body text-[0.55rem] text-[#4c5c54] font-bold">
                          {meta.lastShiny ? "¡CAPTURADO!" : "AÚN NADA..."}
                        </span>
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
              <h2 className="font-display text-[0.6rem] text-[#141a1c] flex items-center gap-2 mb-6 tracking-[0.2em] uppercase">
                <Package size={14} className="text-[#307438]" /> COLECCIÓN Y
                PROGRESO
              </h2>
              <div className="border-2 border-[#0e1418] bg-[#d0dbd4] shadow-[4px_4px_0_#2a3a32] overflow-hidden">
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 bg-[#e8e8d0]">
                  <ProgressStat
                    label="Pokémon Únicos"
                    current={uniqueCapturedCount}
                    total={totalPokemonPossible}
                    color="#304c8c"
                  />
                  <ProgressStat
                    label="Genética Inicial"
                    current={meta.unlockedStarters.length}
                    total={totalStartersPossible}
                    color="#e8a838"
                  />
                  <ProgressStat
                    label="Regiones"
                    current={meta.unlockedRegions.length}
                    total={8}
                    color="#307438"
                  />
                  <div className="flex flex-col gap-2">
                    <span className="font-display text-[0.45rem] text-[#4c5c54] tracking-widest uppercase">
                      Objetos Usados
                    </span>
                    <span className="font-display text-lg text-[#141a1c]">
                      {Object.values(meta.totalItemsUsed).reduce(
                        (a, b) => a + b,
                        0,
                      )}
                    </span>
                    <span className="font-body text-[0.55rem] text-[#4c5c54] italic">
                      Total histórico de consumo
                    </span>
                  </div>
                </div>

                <div className="bg-[#d0dbd4] p-6 border-t border-[#0e1418]">
                  <h3 className="font-display text-[0.5rem] text-[#141a1c] mb-6 tracking-widest uppercase">
                    GENÉTICA DE INICIALES DESBLOQUEADA
                  </h3>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-9 gap-4">
                    {meta.unlockedStarters.map((starter) => (
                      <div
                        key={starter.id}
                        className="aspect-square bg-[#e8e8d0] border border-[#0e1418]/30 flex items-center justify-center relative group hover:border-brand transition-all shadow-[2px_2px_0_rgba(0,0,0,0.05)]"
                        title={starter.name}
                      >
                        <PixelSprite
                          pokemonId={starter.id}
                          variant="front"
                          size={40}
                          shiny={starter.isShiny}
                        />
                        {starter.isShiny && (
                          <div className="absolute top-0 right-0 text-[0.4rem] bg-[#e8a838] text-black px-0.5 border-l border-b border-[#0e1418]/20">
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
                        className="aspect-square bg-[#000000]/5 border border-[#0e1418]/10 flex items-center justify-center opacity-30"
                      >
                        <span className="font-display text-[0.4rem] text-[#141a1c]/20">
                          ?
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Footer Information */}
            <div className="flex flex-col items-center gap-4 mt-8 py-8 border-t border-[#0e1418]/10">
              <div className="flex items-center gap-4">
                <span className="font-display text-[0.5rem] text-[#4c5c54]">
                  POKÉIDLE v1.2
                </span>
                <div className="h-4 w-px bg-[#0e1418]/10"></div>
                <span className="font-display text-[0.5rem] text-brand">
                  RANGO: {meta.totalRuns > 5 ? "VETERANO" : "ASPIRANTE"}
                </span>
              </div>
              <p className="font-body text-[0.55rem] text-[#4c5c54] text-center opacity-80 max-w-sm leading-relaxed">
                LOS DATOS DEL ENTRENADOR SE REGISTRAN AUTOMÁTICAMENTE EN LA
                MEMORIA DEL DISPOSITIVO.
              </p>
            </div>
          </div>
        </PixelWindow>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, sub, color = "text-[#141a1c]" }: any) {
  return (
    <div className="bg-[#d0dbd4] border-2 border-[#0e1418] p-4 shadow-[4px_4px_0_#2a3a32] hover:-translate-y-1 transition-all group flex flex-col items-start gap-1">
      <div className="flex items-center gap-2 mb-2 w-full">
        <div className="p-1.5 bg-[#4a5a52]/10 border border-[#0e1418]/20 group-hover:border-brand transition-colors text-brand shrink-0">
          {React.cloneElement(icon, { size: 12 })}
        </div>
        <span className="font-display text-[0.45rem] text-[#4c5c54] tracking-tighter uppercase truncate">
          {label}
        </span>
      </div>
      <div className={`font-display text-lg ${color} leading-none mb-1`}>
        {value}
      </div>
      <div className="font-body text-[0.55rem] text-[#4c5c54] opacity-70 italic">
        {sub}
      </div>
    </div>
  );
}

function RecordItem({ label, value, sub }: any) {
  return (
    <div className="bg-[#d0dbd4] border-2 border-[#0e1418] p-4 shadow-[4px_4px_0_#2a3a32] relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-8 h-8 bg-[#cc2a16]/5 rotate-45 translate-x-4 -translate-y-4"></div>
      <h3 className="font-display text-[0.5rem] text-[#4c5c54] mb-2 tracking-widest uppercase">
        {label}
      </h3>
      <div className="font-display text-md text-brand group-hover:scale-105 transition-transform origin-left mb-1">
        {value}
      </div>
      <p className="font-body text-[0.55rem] text-[#4c5c54] opacity-70 italic">
        {sub}
      </p>
    </div>
  );
}

function ProgressStat({ label, current, total, color }: any) {
  const percent = Math.min(100, (current / total) * 100);
  return (
    <div className="flex flex-col gap-2">
      <span className="font-display text-[0.45rem] text-[#4c5c54] tracking-widest uppercase">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-xl text-[#141a1c] mb-0">
          {current}
        </span>
        <span className="font-display text-[0.55rem] text-[#4c5c54]">
          / {total}
        </span>
      </div>
      <div className="w-full h-3 bg-[#4a5a52]/10 border border-[#0e1418] p-0.5 mt-1">
        <div
          className="h-full transition-all duration-1000 ease-out"
          style={{
            width: `${percent}%`,
            backgroundColor: color,
            boxShadow: `inset -2px 0 0 rgba(0,0,0,0.2)`,
          }}
        ></div>
      </div>
    </div>
  );
}
