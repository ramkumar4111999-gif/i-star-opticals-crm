'use client';

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

export type SectionKey =
  | 'dashboard'
  | 'customers'
  | 'sales'
  | 'inventory'
  | 'appointments'
  | 'lab-orders'
  | 'accounting'
  | 'reports'
  | 'staff'
  | 'campaigns'
  | 'purchase-orders'
  | 'lens-calculator';

interface CrmState {
  activeSection: SectionKey;
  sidebarOpen: boolean;
  searchQuery: string;
  darkMode: boolean;
  settingsOpen: boolean;
  loadingBar: boolean;
  triggerNewSale: number; // increment to signal "open new sale dialog"
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  sidebarCollapsed: boolean;
  moreSheetOpen: boolean;
}

interface CrmContextValue extends CrmState {
  setActiveSection: (section: SectionKey) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setLoadingBar: (loading: boolean) => void;
  triggerNewSaleDialog: () => void;
  focusSearchInput: () => void;
  setSearchInputRef: (ref: React.RefObject<HTMLInputElement | null>) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setMoreSheetOpen: (open: boolean) => void;
}

const CrmContext = createContext<CrmContextValue>({
  activeSection: 'dashboard',
  sidebarOpen: false,
  searchQuery: '',
  darkMode: false,
  settingsOpen: false,
  loadingBar: false,
  triggerNewSale: 0,
  searchInputRef: { current: null } as React.RefObject<HTMLInputElement | null>,
  sidebarCollapsed: false,
  moreSheetOpen: false,
  setActiveSection: () => {},
  toggleSidebar: () => {},
  setSidebarOpen: () => {},
  setSearchQuery: () => {},
  toggleDarkMode: () => {},
  setDarkMode: () => {},
  setSettingsOpen: () => {},
  setLoadingBar: () => {},
  triggerNewSaleDialog: () => {},
  focusSearchInput: () => {},
  setSearchInputRef: () => {},
  setSidebarCollapsed: () => {},
  toggleSidebarCollapsed: () => {},
  setMoreSheetOpen: () => {},
});

export function CrmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CrmState>({
    activeSection: 'dashboard',
    sidebarOpen: false,
    searchQuery: '',
    darkMode: false,
    settingsOpen: false,
    loadingBar: false,
    triggerNewSale: 0,
    searchInputRef: { current: null } as React.RefObject<HTMLInputElement | null>,
    sidebarCollapsed: false,
    moreSheetOpen: false,
  });

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const setActiveSection = useCallback((section: SectionKey) => {
    setState((prev) => ({ ...prev, activeSection: section, sidebarOpen: false }));
  }, []);

  const toggleSidebar = useCallback(() => {
    setState((prev) => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
  }, []);

  const setSidebarOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, sidebarOpen: open }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const toggleDarkMode = useCallback(() => {
    setState((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  }, []);

  const setDarkMode = useCallback((dark: boolean) => {
    setState((prev) => ({ ...prev, darkMode: dark }));
  }, []);

  const setSettingsOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, settingsOpen: open }));
  }, []);

  const setLoadingBar = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loadingBar: loading }));
  }, []);

  const triggerNewSaleDialog = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeSection: 'sales',
      triggerNewSale: prev.triggerNewSale + 1,
    }));
  }, []);

  const focusSearchInput = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const setSearchInputRef = useCallback((ref: React.RefObject<HTMLInputElement | null>) => {
    (searchInputRef as React.MutableRefObject<HTMLInputElement | null>).current = ref.current;
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setState((prev) => ({ ...prev, sidebarCollapsed: collapsed }));
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setState((prev) => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  }, []);

  const setMoreSheetOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, moreSheetOpen: open }));
  }, []);

  const store: CrmContextValue = {
    ...state,
    searchInputRef: searchInputRef as unknown as React.RefObject<HTMLInputElement | null>,
    setActiveSection,
    toggleSidebar,
    setSidebarOpen,
    setSearchQuery,
    toggleDarkMode,
    setDarkMode,
    setSettingsOpen,
    setLoadingBar,
    triggerNewSaleDialog,
    focusSearchInput,
    setSearchInputRef,
    setSidebarCollapsed,
    toggleSidebarCollapsed,
    setMoreSheetOpen,
  };

  return (
    <CrmContext.Provider value={store}>
      {children}
    </CrmContext.Provider>
  );
}

export function useCrmStore() {
  return useContext(CrmContext);
}