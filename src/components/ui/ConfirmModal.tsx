import React, { useEffect } from "react";
import { PixelWindow, GBAButton, C } from "./GBAUI";

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
  onClose,
}: Props) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md pointer-events-auto">
        <PixelWindow title={title}>
          {/* Body */}
          <div
            className="p-5 font-body leading-relaxed text-center mb-4"
            style={{ color: C.text, fontSize: "14px" }}
          >
            {message}
          </div>

          {/* Footer */}
          <div className="flex justify-center gap-4">
            <GBAButton onClick={onClose}>{cancelText}</GBAButton>
            <GBAButton
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              {confirmText}
            </GBAButton>
          </div>
        </PixelWindow>
      </div>
    </div>
  );
}
