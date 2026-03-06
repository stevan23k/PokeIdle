import React, { useState } from 'react';
import { useGame } from '../../../context/GameContext';
import { ITEMS } from '../../../lib/items';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { X, ChevronRight, ChevronDown, Package, Plus, Coins, Zap } from 'lucide-react';

import { PokemonInjectionModal } from './PokemonInjectionModal';

export function DebuggerPanel() {
  const { run, setRun, setMeta, meta } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'items' | 'pokemon'>('general');
  const [isPokeModalOpen, setIsPokeModalOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 bg-brand/80 border-2 border-brand text-white p-2 pixel-shadow-sm hover:translate-x-px hover:translate-y-px transition-all"
        title="Open Debugger"
      >
        <Zap size={16} />
      </button>
    );
  }

  const addMoney = (amount: number) => {
    setRun(prev => ({ ...prev, money: prev.money + amount }));
  };

  const addItem = (itemId: string, qty: number) => {
    setRun(prev => ({
      ...prev,
      items: {
        ...prev.items,
        [itemId]: (prev.items[itemId] || 0) + qty
      }
    }));
  };

  const unlockAllStarters = () => {
    // This is just a sample, usually you'd want to pull all IDs from elsewhere
    // For now we'll just set pokeCoins high to allow buying or similar
    setMeta(prev => ({ ...prev, pokeCoins: prev.pokeCoins + 999999 }));
  };

  const skipToNextZone = () => {
    setRun(prev => ({
      ...prev,
      currentZoneIndex: prev.currentZoneIndex + 1,
      currentZoneProgress: 0,
      zoneBattlesWon: 0
    }));
  };

  return (
    <>
      <div className="fixed bottom-4 left-4 z-50 w-[350px] max-h-[500px] flex flex-col bg-surface-dark border-4 border-brand pixel-shadow overflow-hidden font-display text-[0.6rem]">
        {/* Header */}
        <div className="bg-brand p-2 flex justify-between items-center text-white">
          <span className="tracking-widest">DEBUGGER ENGINE v1.0</span>
          <button onClick={() => setIsOpen(false)}><X size={16} /></button>
        </div>

        {/* Tabs */}
        <div className="flex bg-surface-alt border-b-2 border-border">
          {(['general', 'items', 'pokemon'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 p-2 uppercase tracking-tighter ${activeTab === tab ? 'bg-brand text-white' : 'text-muted hover:bg-surface'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-surface custom-scrollbar">
          {activeTab === 'general' && (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-accent uppercase underline">Economy</span>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" onClick={() => addMoney(1000)}>+1k Money</Button>
                  <Button size="sm" onClick={() => addMoney(50000)}>+50k Money</Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-accent uppercase underline">Progression</span>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" onClick={skipToNextZone}>Skip Zone</Button>
                  <Button size="sm" onClick={unlockAllStarters}>+999k Coins</Button>
                </div>
              </div>

              <div className="flex flex-col gap-2 p-2 bg-black/40 border border-border">
                <span className="text-muted italic">Session Info:</span>
                <div className="text-[0.5rem] flex flex-col gap-1">
                  <div className="flex justify-between"><span>Zone Index:</span> <span>{run.currentZoneIndex}</span></div>
                  <div className="flex justify-between"><span>Team Size:</span> <span>{run.team.length}</span></div>
                  <div className="flex justify-between"><span>Money:</span> <span>{run.money}</span></div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'items' && (
            <div className="flex flex-col gap-3">
               <span className="text-accent uppercase underline">Quick Items</span>
               <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={() => addItem('poke-ball', 50)}
                    className="bg-surface-alt border-2 border-border p-2 flex items-center justify-between hover:border-brand group transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" className="w-5 h-5 rendering-pixelated" alt="" />
                      <span>Poké Balls</span>
                    </div>
                    <span className="text-brand">+50</span>
                  </button>
                  <button 
                    onClick={() => addItem('master-ball', 5)}
                    className="bg-surface-alt border-2 border-border p-2 flex items-center justify-between hover:border-brand group transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png" className="w-5 h-5 rendering-pixelated" alt="" />
                      <span>Master Balls</span>
                    </div>
                    <span className="text-brand">+5</span>
                  </button>
                  <button 
                    onClick={() => addItem('rare-candy', 10)}
                    className="bg-surface-alt border-2 border-border p-2 flex items-center justify-between hover:border-brand group transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/rare-candy.png" className="w-5 h-5 rendering-pixelated" alt="" />
                      <span>Rare Candy</span>
                    </div>
                    <span className="text-brand">+10</span>
                  </button>
               </div>
            </div>
          )}

          {activeTab === 'pokemon' && (
            <div className="flex flex-col gap-4">
              <span className="text-accent uppercase underline">Pokémon Manager</span>
              <Button 
                variant="primary" 
                onClick={() => setIsPokeModalOpen(true)}
                className="w-full py-4 flex items-center justify-center gap-2 tracking-widest"
              >
                <Plus size={16} />
                INYECTOR POKÉMON
              </Button>
              <div className="p-3 bg-black/40 border border-border text-[0.55rem] text-muted leading-relaxed uppercase tracking-tighter">
                Usa esta herramienta para añadir Pokémon a tu equipo actual o desbloquearlos permanentemente como iniciales.
              </div>
            </div>
          )}
        </div>
      </div>
      {isPokeModalOpen && <PokemonInjectionModal onClose={() => setIsPokeModalOpen(false)} />}
    </>
  );
}
