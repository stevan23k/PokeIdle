import React from 'react';
import { useAuth } from '../context/AuthContext';

export function AuthPage() {
  const { loginWithGoogle, loading } = useAuth();

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-8 crt-screen"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      <div className="w-full max-w-md z-10 flex flex-col items-center">
        <h1 className="font-display text-4xl md:text-5xl text-center text-brand mb-2 drop-shadow-[4px_4px_0_rgba(0,0,0,0.8)]">
          PokéIdle
        </h1>
        <h2 className="font-display text-xs md:text-sm text-center text-white mb-12 tracking-[0.3em] opacity-80">
          ROGUELIKE TRAINER
        </h2>

        <div className="bg-surface-alt border-4 border-border p-6 md:p-8 w-full pixel-shadow flex flex-col items-center gap-6">
          <h3 className="font-display text-xs md:text-sm text-center text-accent tracking-widest drop-shadow-[0_0_5px_rgba(255,215,0,0.3)]">
            INICIAR SESIÓN
          </h3>
          
          <p className="font-body text-xs text-muted text-center mb-2">
            Guarda tu progreso en la nube y juega en cualquier lugar.
          </p>

          <button
            onClick={() => loginWithGoogle()}
            disabled={loading}
            className="w-full py-4 bg-white text-black border-4 border-border font-display text-[0.65rem] md:text-xs tracking-widest pixel-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? "CONECTANDO..." : "ENTRAR CON GOOGLE"}
          </button>
        </div>
      </div>
    </div>
  );
}
