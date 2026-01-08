"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type SidebarMode = "wide" | "narrow" | "auto";

interface SidebarContextType {
  mode: SidebarMode;
  setMode: (mode: SidebarMode) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  effectiveWidth: "wide" | "narrow";
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = "devatar-sidebar-mode";

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<SidebarMode>("wide");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as SidebarMode | null;
    if (stored && ["wide", "narrow", "auto"].includes(stored)) {
      setModeState(stored);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage when mode changes
  const setMode = useCallback((newMode: SidebarMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
    // Reset expanded state when changing modes
    setIsExpanded(false);
  }, []);

  // Calculate effective width based on mode and hover state
  const effectiveWidth: "wide" | "narrow" =
    mode === "wide" ? "wide" :
    mode === "narrow" ? "narrow" :
    // auto mode: narrow unless hovered
    isExpanded ? "wide" : "narrow";

  // Prevent flash of wrong state during hydration
  if (!isHydrated) {
    return <>{children}</>;
  }

  return (
    <SidebarContext.Provider value={{ mode, setMode, isExpanded, setIsExpanded, effectiveWidth }}>
      {children}
    </SidebarContext.Provider>
  );
}

// Default values for when provider is not available (SSR/static generation)
const defaultContext: SidebarContextType = {
  mode: "wide",
  setMode: () => {},
  isExpanded: false,
  setIsExpanded: () => {},
  effectiveWidth: "wide",
};

export function useSidebar() {
  const context = useContext(SidebarContext);
  // Return default context during SSR/static generation
  if (context === undefined) {
    return defaultContext;
  }
  return context;
}
