// Access control utilities for free trial content and purchase verification
// First unit of Beginner level (order_index === 1) is free for all visitors

export interface PurchaseProduct {
  scope: string;
  dialect_id?: string | null;
  level_id?: string | null;
}

export interface PurchaseData {
  id: string;
  product_id: string;
  status: string;
  products?: PurchaseProduct | null;
}

/**
 * Check if content qualifies for free trial
 * Only the first unit of the Beginner level is free
 */
export const isFreeTrial = (
  levelOrderIndex: number,
  unitOrderIndex: number
): boolean => {
  return levelOrderIndex === 1 && unitOrderIndex === 1;
};

/**
 * Check if user can access content (basic check for free trial)
 * User can access if logged in OR if content is free trial
 * Note: This does NOT check purchases - use hasAccessToLevel for that
 */
export const canAccessContent = (
  isLoggedIn: boolean,
  levelOrderIndex: number,
  unitOrderIndex: number
): boolean => {
  return isLoggedIn || isFreeTrial(levelOrderIndex, unitOrderIndex);
};

/**
 * Check if user has purchased access to a specific level
 * This is the main function to verify purchase-based access
 * 
 * @param purchases - User's purchases array from database
 * @param levelId - The level ID to check access for
 * @param dialectId - The dialect ID the level belongs to
 * @param levelOrderIndex - The order index of the level (for free trial check)
 * @param unitOrderIndex - The order index of the unit (for free trial check)
 * @returns boolean indicating if user has access
 */
export const hasAccessToLevel = (
  purchases: PurchaseData[] | null | undefined,
  levelId: string,
  dialectId: string,
  levelOrderIndex?: number,
  unitOrderIndex?: number
): boolean => {
  // Free trial content is always accessible
  if (levelOrderIndex !== undefined && unitOrderIndex !== undefined) {
    if (isFreeTrial(levelOrderIndex, unitOrderIndex)) {
      return true;
    }
  }

  // No purchases = no access (except free trial above)
  if (!purchases || purchases.length === 0) return false;

  return purchases.some((purchase) => {
    const scope = purchase.products?.scope;
    const prodLevelId = purchase.products?.level_id;
    const prodDialectId = purchase.products?.dialect_id;

    // All Access Bundle = everything is accessible
    if (scope === "all") return true;

    // Dialect Bundle = all levels in that specific dialect are accessible
    if (scope === "bundle" && prodDialectId === dialectId) return true;

    // Level = only that specific level is accessible
    if (scope === "level" && prodLevelId === levelId) return true;

    return false;
  });
};

/**
 * Check if user has any all-access purchase (full platform access)
 */
export const hasAllAccess = (purchases: PurchaseData[] | null | undefined): boolean => {
  if (!purchases || purchases.length === 0) return false;
  return purchases.some((purchase) => purchase.products?.scope === "all");
};

/**
 * Check if user has bundle access for a specific dialect
 */
export const hasDialectBundleAccess = (
  purchases: PurchaseData[] | null | undefined,
  dialectId: string
): boolean => {
  if (!purchases || purchases.length === 0) return false;
  return purchases.some((purchase) => {
    const scope = purchase.products?.scope;
    const prodDialectId = purchase.products?.dialect_id;
    return scope === "bundle" && prodDialectId === dialectId;
  });
};
