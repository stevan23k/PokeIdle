import { GamePage } from './pages/GamePage';
import { AuthPage } from './pages/AuthPage';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div 
        className="fixed inset-0 bg-surface flex items-center justify-center crt-screen"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        <span className="font-display text-white text-xs tracking-widest animate-pulse">CARGANDO...</span>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <GamePage />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
