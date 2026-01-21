import { usePageTracking } from '@/hooks/usePageTracking';

// Component to enable SPA page tracking
export const TrackingProvider = () => {
  usePageTracking();
  return null;
};
