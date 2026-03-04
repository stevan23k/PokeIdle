import React from "react";
import type { GameNotification } from "../../features/run/hooks/useNotifications";
import { X } from "lucide-react";
import { PixelSprite } from "./PixelSprite";

interface Props {
  notification: GameNotification;
  onDismiss: () => void;
}

export function EventToast({ notification, onDismiss }: Props) {
  let borderColor = "border-border";
  if (notification.type === "capture") borderColor = "border-success";
  if (notification.type === "defeat") borderColor = "border-danger";
  if (notification.type === "level_up" || notification.type === "evolution")
    borderColor = "border-accent";

  return (
    <div
      className={`pointer-events-auto w-80 bg-surface p-3 border-2 ${borderColor} pixel-shadow flex items-start gap-3 animate-in slide-in-from-right fade-in duration-300`}
      role="status"
    >
      <div className="text-2xl mt-1 select-none">{notification.icon}</div>
      <div className="flex-1">
        <p className="font-display text-[0.6rem] leading-snug mt-1 text-foreground">
          {notification.message}
        </p>
        {notification.pokemonId && (
          <div className="mt-2 w-16 h-16 bg-surface-dark border border-border flex items-center justify-center p-1">
            <PixelSprite
              pokemonId={notification.pokemonId}
              variant="front"
              shiny={notification.isShiny}
              size={48}
            />
          </div>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="text-muted hover:text-white transition-colors"
        aria-label="Cerrar notificación"
      >
        <X size={16} />
      </button>
    </div>
  );
}
