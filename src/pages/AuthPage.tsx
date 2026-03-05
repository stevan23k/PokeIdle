import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmModal } from '../components/ui/ConfirmModal';

export function AuthPage() {
  const { 
    loginWithGoogle, 
    loginWithEmail, 
    registerWithEmail, 
    loginAsGuest,
    loading, 
    error,
    clearError 
  } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'register' | 'success'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showGuestWarning, setShowGuestWarning] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('Por favor completa todos los campos.');
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setLocalError('Las contraseñas no coinciden.');
        return;
      }
      if (password.length < 6) {
        setLocalError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      await registerWithEmail(email, password);
      // If no error, assume success state for email confirmation
      if (!error) setMode('success');
    } else {
      await loginWithEmail(email, password);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setLocalError(null);
    clearError();
  };

  if (mode === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-surface crt-screen">
        <Card className="w-full max-w-md p-8 flex flex-col items-center text-center gap-6 border-4 border-success animate-in zoom-in duration-300">
          <div className="w-16 h-16 bg-success/20 flex items-center justify-center rounded-full border-4 border-success text-success text-4xl">
            ✓
          </div>
          <h2 className="font-display text-lg text-success tracking-widest">
            ¡REGISTRO EXITOSO!
          </h2>
          <p className="font-body text-sm text-muted leading-relaxed">
            Te hemos enviado un correo de confirmación a <strong className="text-white">{email}</strong>.<br/><br/>
            Por favor, verifica tu bandeja de entrada antes de iniciar sesión.
          </p>
          <Button 
            variant="primary" 
            size="lg"
            className="w-full" 
            onClick={() => setMode('login')}
          >
            VOLVER AL LOGIN
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-8 crt-screen"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      <div className="w-full max-w-md z-10 flex flex-col items-center">
        <h1 className="font-display text-5xl md:text-6xl text-center text-brand mb-2 drop-shadow-[4px_4px_0_rgba(0,0,0,0.8)]">
          PokéIdle
        </h1>
        <h2 className="font-display text-sm md:text-base text-center text-white mb-10 tracking-[0.3em] opacity-80">
          ROGUELIKE TRAINER
        </h2>

        <Card className="w-full p-8 md:p-10 border-4 border-border bg-surface-alt flex flex-col gap-8" noPadding={false}>
          <div className="flex flex-col gap-2">
            <h3 className="font-display text-xs md:text-sm text-accent tracking-widest drop-shadow-[0_0_5px_rgba(255,215,0,0.3)]">
              {mode === 'login' ? 'INICIAR SESIÓN' : 'CREAR CUENTA'}
            </h3>
            <p className="font-body text-xs text-muted">
              {mode === 'login' 
                ? 'Ingresa tus credenciales para continuar tu aventura.' 
                : 'Únete a miles de entrenadores en la nube.'}
            </p>
          </div>

          {(error || localError) && (
            <div className="bg-danger/10 border-2 border-danger p-4 text-xs font-body text-danger animate-in fade-in slide-in-from-top-1">
              {localError || error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <label className="font-display text-[0.6rem] text-muted-foreground uppercase tracking-widest">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-black border-2 border-border p-4 font-body text-sm text-white focus:border-brand outline-none transition-colors pixel-shadow-sm"
                placeholder="ejemplo@entrenador.com"
              />
            </div>
            
            <div className="flex flex-col gap-3">
              <label className="font-display text-[0.6rem] text-muted-foreground uppercase tracking-widest">Contraseña</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black border-2 border-border p-4 font-body text-sm text-white focus:border-brand outline-none transition-colors pixel-shadow-sm"
                placeholder="••••••••"
              />
            </div>

            {mode === 'register' && (
              <div className="flex flex-col gap-3 animate-in fade-in duration-300">
                <label className="font-display text-[0.6rem] text-muted-foreground uppercase tracking-widest">Confirmar Contraseña</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-black border-2 border-border p-4 font-body text-sm text-white focus:border-brand outline-none transition-colors pixel-shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            )}

            <Button 
              type="submit"
              variant="primary" 
              size="lg"
              disabled={loading}
              className="mt-2 text-sm"
            >
              {loading ? 'PROCESANDO...' : (mode === 'login' ? 'ENTRAR' : 'REGISTRARSE')}
            </Button>
          </form>

          <div className="relative h-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
            <span className="relative bg-surface-alt px-4 font-display text-xs text-muted uppercase">o</span>
          </div>

          <button
            type="button"
            onClick={() => loginWithGoogle()}
            disabled={loading}
            className="w-full py-4 bg-white text-black border-2 border-border font-display text-xs tracking-widest pixel-shadow hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            GOOGLE
          </button>

          <button
            type="button"
            onClick={toggleMode}
            className="text-center font-display text-[0.6rem] text-brand hover:text-accent transition-colors uppercase tracking-widest"
          >
            {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
          </button>

          <div className="border-t border-border pt-6 mt-2 flex flex-col gap-4">
             <p className="font-body text-[0.6rem] text-muted text-center px-4 leading-relaxed">
              <span className="text-accent underline">MODO INVITADO:</span> Juega al instante. Tus datos <strong>NO persistirán</strong> al cerrar el navegador.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowGuestWarning(true)}
              className="w-full text-xs border-2 border-border opacity-80 hover:opacity-100"
            >
              ENTRAR COMO INVITADO
            </Button>
          </div>
        </Card>
      </div>

      <ConfirmModal
        isOpen={showGuestWarning}
        title="ADVERTENCIA DE SEGURIDAD"
        message={
          <div className="flex flex-col gap-4">
            <p>
              Estás a punto de entrar en <strong>Modo Invitado</strong>. 
            </p>
            <p className="text-warning bg-warning/10 p-3 border border-warning/20">
              Tu progreso <strong>SOLO</strong> se guardará en la sesión actual. Si cierras la pestaña o el navegador, 
              perderás toda tu aventura.
            </p>
            <p>
              Te recomendamos crear una cuenta para guardar tu progreso en la nube de forma segura.
            </p>
          </div>
        }
        confirmText="JUGAR COMO INVITADO"
        cancelText="CANCELAR"
        onConfirm={loginAsGuest}
        onClose={() => setShowGuestWarning(false)}
      />
    </div>
  );
}
