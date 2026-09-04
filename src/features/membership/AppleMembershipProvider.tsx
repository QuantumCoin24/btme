import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";
import {
  fetchProducts,
  type ProductSubscription,
} from "expo-iap";

import { useAuth } from "../auth/AuthContext";
import {
  connectAppleMembershipStore,
  disconnectAppleMembershipStore,
  restoreAppleMembershipPurchases,
  startAppleMembershipPurchase,
  subscribeToAppleMembershipPurchases,
} from "./applePurchase";
import {
  APPLE_PREMIUM_PRODUCT_IDS,
  type ApplePremiumPlan,
  type ApplePremiumProductId,
} from "./appleProducts";
import { useMembership } from "./MembershipContext";

export type AppleStoreProduct = {
  productId: ApplePremiumProductId;
  displayPrice: string;
};

type AppleMembershipContextValue = {
  storeReady: boolean;
  productsLoading: boolean;
  products: AppleStoreProduct[];
  purchasing: boolean;
  restoring: boolean;
  purchaseError: string | null;
  purchase: (plan: ApplePremiumPlan) => Promise<void>;
  restore: () => Promise<void>;
};

const AppleMembershipContext =
  createContext<AppleMembershipContextValue | null>(null);

export function AppleMembershipProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const { refreshMembership } = useMembership();

  const [storeReady, setStoreReady] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [products, setProducts] =
    useState<AppleStoreProduct[]>([]);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [purchaseError, setPurchaseError] =
    useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== "ios") {
      return;
    }

    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    void (async () => {
      try {
        await connectAppleMembershipStore();

        if (!mounted) {
          return;
        }

        setProductsLoading(true);

        const storeProducts = await fetchProducts({
          skus: [...APPLE_PREMIUM_PRODUCT_IDS],
          type: "subs",
        });

        if (!mounted) {
          return;
        }

        const normalizedProducts = (
          (storeProducts ?? []) as ProductSubscription[]
        )
          .filter((product) =>
            APPLE_PREMIUM_PRODUCT_IDS.includes(
              product.id as ApplePremiumProductId,
            ),
          )
          .map((product) => ({
            productId: product.id as ApplePremiumProductId,
            displayPrice: product.displayPrice,
          }));

        setProducts(normalizedProducts);
        setProductsLoading(false);

        unsubscribe =
          subscribeToAppleMembershipPurchases({
            onVerified: async () => {
              if (!mounted) {
                return;
              }

              setPurchasing(false);
              setPurchaseError(null);
              await refreshMembership();
            },

            onError: async (error) => {
              if (!mounted) {
                return;
              }

              setPurchasing(false);
              setPurchaseError(error.message);
            },
          });

        setStoreReady(true);
      } catch (caught) {
        if (!mounted) {
          return;
        }

        setStoreReady(false);
        setProductsLoading(false);
        setPurchaseError(
          caught instanceof Error
            ? caught.message
            : "Apple membership store is unavailable.",
        );
      }
    })();

    return () => {
      mounted = false;
      unsubscribe?.();

      void disconnectAppleMembershipStore().catch(() => {
        // Store disconnect is cleanup only.
      });
    };
  }, [refreshMembership]);

  const purchase = useCallback(
    async (plan: ApplePremiumPlan) => {
      if (!user?.id) {
        throw new Error(
          "You must be signed in before purchasing membership.",
        );
      }

      if (!storeReady) {
        throw new Error(
          "Apple membership store is not ready yet.",
        );
      }

      setPurchaseError(null);
      setPurchasing(true);

      try {
        await startAppleMembershipPurchase(
          plan,
          user.id,
        );

        // Completion is event-driven.
        // purchasing remains true until StoreKit reports success/error.
      } catch (caught) {
        setPurchasing(false);

        const error =
          caught instanceof Error
            ? caught
            : new Error(
                "Unable to start Apple membership purchase.",
              );

        setPurchaseError(error.message);
        throw error;
      }
    },
    [storeReady, user?.id],
  );

  const restore = useCallback(async () => {
    if (!user?.id) {
      throw new Error(
        "You must be signed in before restoring membership.",
      );
    }

    if (!storeReady) {
      throw new Error(
        "Apple membership store is not ready yet.",
      );
    }

    setPurchaseError(null);
    setRestoring(true);

    try {
      const restored =
        await restoreAppleMembershipPurchases();

      await refreshMembership();

      if (restored.length === 0) {
        throw new Error(
          "No active BTME Premium purchase was found for this Apple ID.",
        );
      }
    } catch (caught) {
      const error =
        caught instanceof Error
          ? caught
          : new Error(
              "Unable to restore Apple membership.",
            );

      setPurchaseError(error.message);
      throw error;
    } finally {
      setRestoring(false);
    }
  }, [refreshMembership, storeReady, user?.id]);

  const value = useMemo(
    () => ({
      storeReady,
      productsLoading,
      products,
      purchasing,
      restoring,
      purchaseError,
      purchase,
      restore,
    }),
    [
      products,
      productsLoading,
      purchase,
      purchaseError,
      purchasing,
      restore,
      restoring,
      storeReady,
    ],
  );

  return (
    <AppleMembershipContext.Provider value={value}>
      {children}
    </AppleMembershipContext.Provider>
  );
}

export function useAppleMembership() {
  const context = useContext(AppleMembershipContext);

  if (!context) {
    throw new Error(
      "useAppleMembership must be used inside AppleMembershipProvider",
    );
  }

  return context;
}
