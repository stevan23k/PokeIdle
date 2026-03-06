import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { RunState } from "../features/run/types/game.types";
import type { MetaState } from "../features/meta/types/meta.types";
import type { TrainingState } from "../features/training/types/training.types";
import {
  type GameNotification,
  useNotifications,
} from "../features/run/hooks/useNotifications";
import { loadFromStorage, saveToStorage } from "../utils/localStorage";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

interface GameContextValue {
  run: RunState;
  meta: MetaState;
  training: TrainingState;
  setRun: React.Dispatch<React.SetStateAction<RunState>>;
  setMeta: React.Dispatch<React.SetStateAction<MetaState>>;
  setTraining: React.Dispatch<React.SetStateAction<TrainingState>>;
  saveGame: () => void;
  resetRun: () => void;
  notify: (notification: Omit<GameNotification, "id">) => void;
  removeNotification: (id: string) => void;
  notifications: GameNotification[];
  isCloudSyncing: boolean;
}

export const defaultRun: RunState = {
  runId: "",
  startedAt: 0,
  isActive: false,
  starterId: 0,
  starterName: "",
  team: [],
  pc: [],
  currentRegion: "kanto",
  currentZoneIndex: 0,
  currentZoneProgress: 0, // 0 to 100
  zoneBattlesWon: 0,
  gymsBadges: [],
  eliteFourDefeated: false,
  items: { "poke-ball": 10, potion: 5 }, // Starter items
  expMultiplier: 1.0,
  hasMegaBracelet: false,
  speedMultiplier: 1,
  autoCapture: true,
  autoItems: true,
  autoHealThreshold: 0.3,
  isPaused: false,
  isManualBattle: false,
  autoLoot: true,
  currentBattle: null,
  battleLog: [],
  totalBattlesWon: 0,
  totalCaptured: 0,
  totalFainted: 0,
  money: 0,
  winStreak: 0,
  maxWinStreak: 0,
  itemUsage: {},
  pendingLootSelection: null,
  pendingMoveLearn: null,
  pendingEvolution: null,
  pendingZoneTransition: false,
  pinnedItems: [],
  inheritanceProgress: {},
};

const defaultTrainingState: TrainingState = {
  isActive: false,
  pokemonUid: "",
  pokemon: {} as any,
  currentBattle: null,
  battleLog: [],
  totalBattlesWon: 0,
  pendingLootSelection: null,
  items: {},
};

const defaultMeta: MetaState = {
  totalRuns: 0,
  bestRun: null,
  unlockedStarters: [
    { id: 1, name: "Bulbasaur" },
    { id: 4, name: "Charmander" },
    { id: 7, name: "Squirtle" },
    { id: 152, name: "Chikorita" },
    { id: 155, name: "Cyndaquil" },
    { id: 158, name: "Totodile" },
    { id: 252, name: "Treecko" },
    { id: 255, name: "Torchic" },
    { id: 258, name: "Mudkip" },
    { id: 387, name: "Turtwig" },
    { id: 390, name: "Chimchar" },
    { id: 393, name: "Piplup" },
    { id: 495, name: "Snivy" },
    { id: 498, name: "Tepig" },
    { id: 501, name: "Oshawott" },
    { id: 650, name: "Chespin" },
    { id: 653, name: "Fennekin" },
    { id: 656, name: "Froakie" },
    { id: 722, name: "Rowlet" },
    { id: 725, name: "Litten" },
    { id: 728, name: "Popplio" },
    { id: 810, name: "Grookey" },
    { id: 813, name: "Scorbunny" },
    { id: 816, name: "Sobble" },
    { id: 906, name: "Sprigatito" },
    { id: 909, name: "Fuecoco" },
    { id: 912, name: "Quaxly" },
  ].map((s) => ({
    ...s,
    maxIvs: {
      hp: 15,
      attack: 15,
      defense: 15,
      spAtk: 15,
      spDef: 15,
      speed: 15,
    },
    maxEvs: { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 },
    unlockedNatures: [],
  })),
  unlockedRegions: ["kanto"],
  runHistory: [],
  pokeCoins: 0,

  totalTimePlayed: 0,
  highestLevelReached: 0,
  mostCapturedPokemonId: null,
  fastestGym1Time: null,
  maxWinStreakEver: 0,
  firstShiny: null,
  lastShiny: null,
  capturedUniqueIds: [],
  totalItemsUsed: {},
  gachaPity: {},
  hideTutorial: false,
};

const GameContext = createContext<GameContextValue | null>(null);

function runMigrationsMeta(loaded: any) {
  const baseMeta = { ...defaultMeta };
  if (!loaded) return baseMeta;

  // Ensure unlockedStarters is an array and not empty
  if (!loaded.unlockedStarters || loaded.unlockedStarters.length === 0) {
    loaded.unlockedStarters = baseMeta.unlockedStarters;
  } else {
    // Check if the first element is a number (old format)
    if (typeof loaded.unlockedStarters[0] === "number") {
      loaded.unlockedStarters = baseMeta.unlockedStarters;
    } else {
      // Ensure all required fields exist for each starter
      loaded.unlockedStarters = loaded.unlockedStarters.map((s: any) => ({
        ...s,
        maxIvs: s.maxIvs || { hp: 15, attack: 15, defense: 15, spAtk: 15, spDef: 15, speed: 15 },
        maxEvs: s.maxEvs || { hp: 0, attack: 0, defense: 0, spAtk: 0, spDef: 0, speed: 0 },
        unlockedNatures: s.unlockedNatures || [],
      }));
    }
  }

  // Backfill other missing fields
  return {
    ...baseMeta,
    ...loaded,
    unlockedStarters: loaded.unlockedStarters,
    pokeCoins: loaded.pokeCoins ?? 0,
    runHistory: loaded.runHistory ?? [],
    unlockedRegions: loaded.unlockedRegions ?? ["kanto"],
  };
}

export function GameProvider({ children }: { children: ReactNode }) {
  const { user, isGuest } = useAuth();
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  const [run, setRun] = useState<RunState>(() =>
    loadFromStorage("pokeidle_run", defaultRun),
  );
  const [training, setTraining] = useState<TrainingState>(() => {
    const loaded = loadFromStorage("pokeidle_training", defaultTrainingState);
    if (!loaded.items) loaded.items = {};
    if (!loaded.battleLog) loaded.battleLog = [];
    return loaded;
  });
  const [meta, setMeta] = useState<MetaState>(() => {
    return runMigrationsMeta(loadFromStorage("pokeidle_meta", defaultMeta));
  });

  const {
    queue: notifications,
    notify,
    remove: removeNotification,
  } = useNotifications();

  // Load from Supabase on Login
  useEffect(() => {
    if (user) {
      setIsCloudSyncing(true);
      const loadFromCloud = async () => {
        try {
          const { data, error } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (error) throw error;

          if (data) {
            if (data.run_state && Object.keys(data.run_state).length > 0) {
              setRun(data.run_state as RunState);
            }
            if (
              data.training_state &&
              Object.keys(data.training_state).length > 0
            ) {
              setTraining(data.training_state as TrainingState);
            }
            if (data.meta_state && Object.keys(data.meta_state).length > 0) {
              setMeta(runMigrationsMeta(data.meta_state) as MetaState);
            }
          }
        } catch (e) {
          console.error("Failed to load state from cloud", e);
        } finally {
          setIsCloudSyncing(false);
        }
      };
      loadFromCloud();
    }
  }, [user]);

  const saveGame = useCallback(async () => {
    saveToStorage("pokeidle_run", run);
    saveToStorage("pokeidle_meta", meta);
    saveToStorage("pokeidle_training", training);

    if (user) {
      try {
        await supabase
          .from("user_profiles")
          .update({
            run_state: run,
            meta_state: meta,
            training_state: training,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      } catch (e) {
        console.error("Failed to sync state to cloud", e);
      }
    }
  }, [run, meta, training, user]);

  const resetRun = useCallback(() => {
    setRun(defaultRun);
    saveToStorage("pokeidle_run", defaultRun);
  }, []);

  // Auto-save every 10s
  useEffect(() => {
    let isCancelled = false; // Declare isCancelled here
    const interval = setInterval(() => {
      if (!isCancelled) {
        saveGame();
      }
    }, 10000);
    return () => {
      isCancelled = true;
      clearInterval(interval); // Ensure interval is cleared
    };
  }, [saveGame]);

  // Effect to handle logout or guest mode transition: Reset states
  useEffect(() => {
    if (!user && !isGuest) {
      setRun(defaultRun);
      setMeta(defaultMeta);
      setTraining(defaultTrainingState);
    }
  }, [user, isGuest]);

  // Sync on unmount or unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveGame();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveGame]);

  return (
    <GameContext.Provider
      value={{
        run,
        meta,
        training,
        setRun,
        setMeta,
        setTraining,
        saveGame,
        resetRun,
        notify,
        removeNotification,
        notifications,
        isCloudSyncing,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}