import React from 'react';
import { GameProvider } from '../context/GameContext';
import { GameLayout } from '../components/layout/GameLayout';
import { useEngineTick } from '../features/run/hooks/useEngineTick';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

function GameRunner() {
  const { regionZones } = useEngineTick(); // Start engine and get data
  return <GameLayout zones={regionZones} />;
}

export function GamePage() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <GameRunner />
      </GameProvider>
    </ErrorBoundary>
  );
}
