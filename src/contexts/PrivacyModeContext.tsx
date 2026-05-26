import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";

const STORAGE_KEY = "familydesk_privacy_mode";

type PrivacyModeContextValue = {
  isPrivate: boolean;
  togglePrivacy: () => void;
  setPrivacy: (value: boolean) => void;
};

const PrivacyModeContext = createContext<PrivacyModeContextValue | undefined>(undefined);

const readInitial = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

export const PrivacyModeProvider = ({ children }: { children: ReactNode }) => {
  const [isPrivate, setIsPrivate] = useState<boolean>(readInitial);

  useEffect(() => {
    try {
      if (isPrivate) {
        window.sessionStorage.setItem(STORAGE_KEY, "1");
      } else {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [isPrivate]);

  const setPrivacy = useCallback((value: boolean) => setIsPrivate(value), []);
  const togglePrivacy = useCallback(() => setIsPrivate((v) => !v), []);

  const value = useMemo(() => ({ isPrivate, togglePrivacy, setPrivacy }), [isPrivate, togglePrivacy, setPrivacy]);

  return <PrivacyModeContext.Provider value={value}>{children}</PrivacyModeContext.Provider>;
};

export const usePrivacyMode = (): PrivacyModeContextValue => {
  const ctx = useContext(PrivacyModeContext);
  if (!ctx) {
    // Safe fallback when used outside provider (e.g. tests / isolated stories)
    return { isPrivate: false, togglePrivacy: () => {}, setPrivacy: () => {} };
  }
  return ctx;
};