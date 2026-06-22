import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isFirebaseConfigured } from "@/lib/firebase";
import { ensureDefaultServiceTypes, subscribeToServiceTypes } from "@/lib/firestore";
import { DEFAULT_SERVICE_TYPES, getActiveServiceTypes, getServiceTypeLabelFromValue, sortServiceTypes } from "@/lib/serviceTypes";
import { LanguageCode, ServiceType } from "@/types";

interface ServiceTypesContextValue {
  serviceTypes: ServiceType[];
  activeServiceTypes: ServiceType[];
  loading: boolean;
  refresh: () => Promise<void>;
  getLabel: (value: string, language: LanguageCode) => string;
}

const fallbackServiceTypes: ServiceType[] = sortServiceTypes(
  DEFAULT_SERVICE_TYPES.map((serviceType, index) => ({
    ...serviceType,
    createdAt: new Date(index).toISOString(),
    updatedAt: new Date(index).toISOString(),
  })),
);

const ServiceTypesContext = createContext<ServiceTypesContextValue>({
  serviceTypes: fallbackServiceTypes,
  activeServiceTypes: getActiveServiceTypes(fallbackServiceTypes),
  loading: true,
  refresh: async () => {},
  getLabel: (value) => value,
});

export function ServiceTypesProvider({ children }: { children: React.ReactNode }) {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>(fallbackServiceTypes);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setServiceTypes(fallbackServiceTypes);
      setLoading(false);
      return;
    }

    await ensureDefaultServiceTypes().catch(() => {});
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      if (!isFirebaseConfigured) {
        if (!cancelled) {
          setServiceTypes(fallbackServiceTypes);
          setLoading(false);
        }
        return;
      }

      try {
        await ensureDefaultServiceTypes();
      } catch {
        // fall through to subscription with whatever data already exists
      }

      unsubscribe = subscribeToServiceTypes(
        (items) => {
          if (cancelled) return;
          setServiceTypes(items.length > 0 ? items : fallbackServiceTypes);
          setLoading(false);
        },
        false,
        () => {
          if (cancelled) return;
          setServiceTypes(fallbackServiceTypes);
          setLoading(false);
        },
      );
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const value = useMemo<ServiceTypesContextValue>(() => {
    const activeServiceTypes = getActiveServiceTypes(serviceTypes);
    return {
      serviceTypes,
      activeServiceTypes,
      loading,
      refresh,
      getLabel: (value: string, language: LanguageCode) =>
        getServiceTypeLabelFromValue(language, value, serviceTypes),
    };
  }, [loading, refresh, serviceTypes]);

  return <ServiceTypesContext.Provider value={value}>{children}</ServiceTypesContext.Provider>;
}

export function useServiceTypes() {
  return useContext(ServiceTypesContext);
}
