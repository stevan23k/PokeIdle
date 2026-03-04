import React from 'react';
import { GameProvider } from '../context/GameContext';
import { GameLayout } from '../components/layout/GameLayout';
import { useEngineTick } from '../features/run/hooks/useEngineTick';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

function GameRunner() {
  useEngineTick(); // Start engine
  return <GameLayout />;
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
