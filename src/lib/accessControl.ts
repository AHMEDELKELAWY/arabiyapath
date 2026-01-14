// Access control utilities for free trial content
// First unit of Beginner level (order_index === 1) is free for all visitors

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
 * Check if user can access content
 * User can access if logged in OR if content is free trial
 */
export const canAccessContent = (
  isLoggedIn: boolean,
  levelOrderIndex: number,
  unitOrderIndex: number
): boolean => {
  return isLoggedIn || isFreeTrial(levelOrderIndex, unitOrderIndex);
};
