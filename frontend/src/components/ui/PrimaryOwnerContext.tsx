import React, { createContext, useContext, useState, useCallback } from 'react';

interface PrimaryOwnerContextValue {
  ownerId: string | null;
  claimPrimary: (id: string) => boolean;
  releasePrimary: (id: string) => void;
}

export const PrimaryOwnerContext = createContext<PrimaryOwnerContextValue | null>(null);

export interface PrimaryOwnerProviderProps {
  children: React.ReactNode;
  initialOwnerId?: string | null;
}

export const PrimaryOwnerProvider: React.FC<PrimaryOwnerProviderProps> = ({
  children,
  initialOwnerId = null,
}) => {
  const [ownerId, setOwnerId] = useState<string | null>(initialOwnerId);

  const claimPrimary = useCallback((id: string): boolean => {
    if (ownerId === null || ownerId === id) {
      setOwnerId(id);
      return true;
    }
    return false;
  }, [ownerId]);

  const releasePrimary = useCallback((id: string) => {
    setOwnerId((current) => (current === id ? null : current));
  }, []);

  return (
    <PrimaryOwnerContext.Provider value={{ ownerId, claimPrimary, releasePrimary }}>
      {children}
    </PrimaryOwnerContext.Provider>
  );
};

export function usePrimaryOwner(componentId: string, isPrimary: boolean): boolean {
  const ctx = useContext(PrimaryOwnerContext);

  // If no provider is present (e.g. isolated test or contact sheet without explicit provider), allow by default
  if (!ctx) {
    return true;
  }

  if (!isPrimary) {
    return true;
  }

  const isOwner = ctx.claimPrimary(componentId);
  if (!isOwner && process.env.NODE_ENV !== 'production') {
    console.warn(
      `[primaryOwner violation] Component "${componentId}" attempted to render as primary, but "${ctx.ownerId}" already owns primary action in this viewport. Downgrading to secondary.`
    );
  }

  return isOwner;
}
