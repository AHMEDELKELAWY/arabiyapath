import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAffiliateProfile } from "@/hooks/useAffiliateData";
import { Loader2 } from "lucide-react";

interface AffiliateRouteProps {
  children: ReactNode;
}

export function AffiliateRoute({ children }: AffiliateRouteProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { data: affiliateProfile, isLoading: affiliateLoading } = useAffiliateProfile();

  if (authLoading || affiliateLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!affiliateProfile) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
