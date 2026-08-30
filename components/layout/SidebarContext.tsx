'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface SidebarContextValue {
  forceCollapsed: boolean;
  setForceCollapsed: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  forceCollapsed: false,
  setForceCollapsed: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [forceCollapsed, setForceCollapsed] = useState(false);
  return (
    <SidebarContext.Provider value={{ forceCollapsed, setForceCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarCollapse() {
  return useContext(SidebarContext);
}
