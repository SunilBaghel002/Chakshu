import React, { createContext, useContext, useRef, useEffect, useCallback, useMemo } from 'react';

interface PrimaryOwnerContextValue {
  readonly ownerId: string | null;
  claimPrimary: (id: string) => boolean;
  releasePrimary: (id: string) => void;
}

export const PrimaryOwnerContext = createContext<PrimaryOwnerContextValue | null>(null);

export interface PrimaryOwnerProviderProps {
  children: React.ReactNode;
  initialOwnerId?: string | null;
  activeOwnerId?: string | null;
}

/**
 * PrimaryOwnerProvider (PRD 10 §4 / L4, PRD 11 §1 / K1)
 *
 * Enforces the "one-primary rule across slots": at most one filled amber control
 * (variant "primary" OR "bar") per viewport.
 * When an activeOwnerId is designated (e.g., 'dossier-confirm'), it owns the primary action
 * and any competing claimant (such as 'detect-changes' in SLOT-02) downgrades to 'secondary'.
 */
export const PrimaryOwnerProvider: React.FC<PrimaryOwnerProviderProps> = ({
  children,
  initialOwnerId = null,
  activeOwnerId,
}) => {
  const ownerRef = useRef<string | null>(
    activeOwnerId !== undefined && activeOwnerId !== null ? activeOwnerId : initialOwnerId
  );

  if (activeOwnerId !== undefined) {
    ownerRef.current = activeOwnerId;
  }

  const claimPrimary = useCallback(
    (id: string): boolean => {
      // If an activeOwnerId is explicitly designated by shell, only that ID can claim it
      if (activeOwnerId !== undefined && activeOwnerId !== null) {
        return activeOwnerId === id;
      }
      if (ownerRef.current === null || ownerRef.current === id) {
        ownerRef.current = id;
        return true;
      }
      return false;
    },
    [activeOwnerId]
  );

  const releasePrimary = useCallback(
    (id: string) => {
      if (activeOwnerId === undefined && ownerRef.current === id) {
        ownerRef.current = null;
      }
    },
    [activeOwnerId]
  );

  const value = useMemo(
    () => ({
      get ownerId() {
        return activeOwnerId !== undefined ? activeOwnerId : ownerRef.current;
      },
      claimPrimary,
      releasePrimary,
    }),
    [activeOwnerId, claimPrimary, releasePrimary]
  );

  return (
    <PrimaryOwnerContext.Provider value={value}>
      {children}
    </PrimaryOwnerContext.Provider>
  );
};

/**
 * Hook for controls to claim primary ownership.
 * Returns true if allowed, false if rejected (which triggers automatic downgrade to secondary).
 */
export function usePrimaryOwner(componentId: string, isClaimingPrimary: boolean): boolean {
  const ctx = useContext(PrimaryOwnerContext);

  // If no provider is present (e.g. isolated test without explicit provider), allow by default
  if (!ctx) {
    return true;
  }

  if (!isClaimingPrimary) {
    return true;
  }

  useEffect(() => {
    return () => {
      if (ctx && isClaimingPrimary) {
        ctx.releasePrimary(componentId);
      }
    };
  }, [ctx, componentId, isClaimingPrimary]);

  const isOwner = ctx.claimPrimary(componentId);
  const isDev =
    (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') ||
    (typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV));

  if (!isOwner && isDev) {
    console.warn(
      `[primaryOwner violation] Component "${componentId}" attempted to render as primary/bar, but "${ctx.ownerId}" already owns primary action in this viewport. Downgrading to secondary.`
    );
  }

  return isOwner;
}
