import { useState, useCallback, useRef, useEffect } from "react";
import type { BattleLogEntry } from "../types/game.types";
import { generateUid } from "../../../utils/random";

export function useBattleLog() {
  const [log, setLog] = useState<BattleLogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((text: string, type: BattleLogEntry["type"] = "normal") => {
    setLog(prev => {
      const entry: BattleLogEntry = { id: generateUid(), text, type };
      const nextLog = [...prev, entry];
      if (nextLog.length > 50) return nextLog.slice(-50);
      return nextLog;
    });
  }, []);

  const clearLog = useCallback(() => setLog([]), []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log]);

  return { log, addLog, clearLog, scrollRef, setLog };
}
