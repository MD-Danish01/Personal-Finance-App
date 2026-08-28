"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@/components/ui/Icon";
import { FinancialAdvisorModal } from "./FinancialAdvisorModal";

interface Position {
  x: number;
  y: number;
}

const BUTTON_WIDTH = 140;
const BUTTON_HEIGHT = 56;
const SCREEN_MARGIN = 20;

// Bottom navigation/menu ki approximate height
const BOTTOM_MENU_HEIGHT = 80;

// Copilot aur menu ke beech gap
const MENU_GAP = 20;

// New storage key so old broken position doesn't affect this version
const STORAGE_KEY = "copilot_btn_pos_v2";

// Keep button safely inside viewport
function getSafePosition(x: number, y: number): Position {
  const maxX = Math.max(
    SCREEN_MARGIN,
    window.innerWidth - BUTTON_WIDTH - SCREEN_MARGIN
  );

  const maxY = Math.max(
    SCREEN_MARGIN,
    window.innerHeight - BUTTON_HEIGHT - SCREEN_MARGIN
  );

  return {
    x: Math.max(SCREEN_MARGIN, Math.min(maxX, x)),
    y: Math.max(SCREEN_MARGIN, Math.min(maxY, y)),
  };
}

// Default position: CENTERED ABOVE BOTTOM MENU
function getDefaultPosition(): Position {
  const x = (window.innerWidth - BUTTON_WIDTH) / 2;

  const y =
    window.innerHeight - BUTTON_HEIGHT - BOTTOM_MENU_HEIGHT - MENU_GAP;

  return getSafePosition(x, y);
}

function getInitialPosition(): Position | null {
  if (typeof window === "undefined") return null;

  const saved = sessionStorage.getItem(STORAGE_KEY);

  if (saved) {
    try {
      const parsed = JSON.parse(saved);

      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        return getSafePosition(parsed.x, parsed.y);
      }
    } catch {
      // Invalid saved position -> use default
    }
  }

  return getDefaultPosition();
}

export function DraggableChatbotButton() {
  const [modalOpen, setModalOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(getInitialPosition);
  const [isDragging, setIsDragging] = useState(false);

  const isPointerDownRef = useRef(false);
  const hasMovedRef = useRef(false);

  const dragStartPosRef = useRef<Position>({
    x: 0,
    y: 0,
  });

  const startBtnPosRef = useRef<Position>({
    x: 0,
    y: 0,
  });

  const positionRef = useRef<Position | null>(position);

  const buttonRef = useRef<HTMLDivElement>(null);

  // Keep ref updated
  const updatePosition = useCallback((newPosition: Position) => {
    positionRef.current = newPosition;
    setPosition(newPosition);
  }, []);

  // Handle resize (legitimate side effect - external event subscription)
  useEffect(() => {
    const handleResize = () => {
      const currentPosition = positionRef.current;

      if (!currentPosition) {
        updatePosition(getDefaultPosition());
        return;
      }

      updatePosition(getSafePosition(currentPosition.x, currentPosition.y));
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [updatePosition]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    isPointerDownRef.current = true;
    hasMovedRef.current = false;

    dragStartPosRef.current = {
      x: e.clientX,
      y: e.clientY,
    };

    const currentPosition = positionRef.current;

    if (currentPosition) {
      startBtnPosRef.current = {
        ...currentPosition,
      };
    } else if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();

      startBtnPosRef.current = {
        x: rect.left,
        y: rect.top,
      };
    }

    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isPointerDownRef.current) return;

      const deltaX = e.clientX - dragStartPosRef.current.x;
      const deltaY = e.clientY - dragStartPosRef.current.y;

      const distance = Math.hypot(deltaX, deltaY);

      // Small movement = click, not drag
      if (distance <= 5) return;

      hasMovedRef.current = true;
      setIsDragging(true);

      const newX = startBtnPosRef.current.x + deltaX;
      const newY = startBtnPosRef.current.y + deltaY;

      updatePosition(getSafePosition(newX, newY));
    },
    [updatePosition]
  );

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;

    isPointerDownRef.current = false;

    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignore
    }

    if (hasMovedRef.current) {
      setIsDragging(false);

      const currentPosition = positionRef.current;

      if (currentPosition) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(currentPosition));
      }

      return;
    }

    // Normal click opens chatbot
    setModalOpen(true);
  };

  return (
    <>
      <div
        ref={buttonRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          left: position ? `${position.x}px` : undefined,
          top: position ? `${position.y}px` : undefined,
          touchAction: "none",
        }}
        className={`
          fixed
          z-[45]
          select-none
          cursor-grab
          active:cursor-grabbing
          transition-transform
          duration-200
          ${isDragging ? "scale-105" : ""}
        `}
        role="button"
        tabIndex={0}
        aria-label="Open Financial Copilot"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setModalOpen(true);
          }
        }}
      >
        <div className="relative group">
          {/* Ambient Glow */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/30 via-indigo-500/20 to-purple-500/30 blur-md opacity-75 group-hover:opacity-100 transition-opacity animate-pulse" />

          {/* Main Button */}
          <div
            className="
              relative
              flex
              items-center
              gap-2
              px-3.5
              py-2.5
              rounded-2xl
              bg-card/85
              dark:bg-card/75
              backdrop-blur-xl
              border
              border-white/40
              dark:border-white/15
              shadow-xl
              shadow-indigo-500/10
              hover:shadow-primary/20
              text-foreground
              transition-all
              duration-200
              group-hover:border-primary/50
              group-active:scale-95
            "
          >
            {/* AI Icon */}
            <div
              className="
                flex
                h-7
                w-7
                items-center
                justify-center
                rounded-xl
                bg-gradient-to-br
                from-primary
                via-emerald-500
                to-teal-600
                text-white
                shadow-sm
              "
            >
              <Icon name="sparkles" size={15} />
            </div>

            {/* Text */}
            <span className="text-xs font-bold tracking-tight text-foreground">
              Copilot
            </span>

            {/* Online Indicator */}
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />

              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </div>
        </div>
      </div>

      <FinancialAdvisorModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
