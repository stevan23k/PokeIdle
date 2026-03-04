import React from 'react';

interface Props {
  currentXP: number;
  nextLevelXP: number;
  prevLevelXP?: number;
}

export function XPBar({ currentXP, nextLevelXP, prevLevelXP = 0 }: Props) {
  const range = nextLevelXP - prevLevelXP;
  const progress = Math.max(0, currentXP - prevLevelXP);
  const percent = range > 0 ? Math.min(100, (progress / range) * 100) : 0;

  return (
    <div 
      className="w-full h-1 bg-surface-dark overflow-hidden mt-1"
      role="progressbar" 
      aria-label={`XP: ${currentXP}/${nextLevelXP}`}
    >
      <div 
        className="h-full bg-xp transition-all duration-500 motion-reduce:transition-none" 
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
