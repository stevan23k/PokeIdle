import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar", 
  onConfirm, 
  onClose 
}: Props) {
  
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div 
        className="bg-surface w-full max-w-md border-2 border-brand pixel-shadow flex flex-col pointer-events-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="bg-surface-alt p-3 border-b-2 border-border flex justify-between items-center">
          <h2 id="modal-title" className="font-display text-sm text-brand">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-white" aria-label="Cerrar">
             <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-5 text-sm font-body text-foreground leading-relaxed">
          {message}
        </div>
        
        {/* Footer */}
        <div className="p-4 pt-0 flex justify-end gap-3">
           <button 
             onClick={onClose}
             className="px-4 py-2 bg-surface-alt border-2 border-border text-xs font-display text-white pixel-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
           >
             {cancelText}
           </button>
           <button 
             onClick={() => { onConfirm(); onClose(); }}
             className="px-4 py-2 bg-brand border-2 border-brand text-white text-xs font-display pixel-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-brand-dark transition-colors"
           >
             {confirmText}
           </button>
        </div>
      </div>
    </div>
  );
}
