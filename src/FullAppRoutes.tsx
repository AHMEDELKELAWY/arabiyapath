import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route, useLocation } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { TrackingProvider } from "@/components/analytics/TrackingProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/admin/AdminRoute";
import { AffiliateRoute } from "@/components/affiliate/AffiliateRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { classifyError, toastError } from "@/lib/errors";
import "./index.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/700.css";
import "@fontsource/work-sans/300.css";
import "@fontsource/work-sans/400.css";
import "@fontsource/work-sans/500.css";
import "@fontsource/work-sans/600.css";
import "@fontsource/work-sans/700.css";
import "@fontsource/work-sans/800.css";
import "@fontsource/reem-kufi/400.css";

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Dialects = lazy(() => import("./pages/Dialects"));
const Pricing = lazy(() => import("./pages/Pricing"));
const About = lazy(() => import("./pages/About"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Contact = lazy(() => import("./pages/Contact"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DashboardProgress = lazy(() => import("./pages/DashboardProgress"));
const DashboardAccount = lazy(() => import("./pages/DashboardAccount"));
const FreeTrial = lazy(() => import("./pages/FreeTrial"));
const FreeGulfLesson = lazy(() => import("./pages/FreeGulfLesson"));
const FreeGulfLessonThankYou = lazy(() => import("./pages/FreeGulfLessonThankYou"));
const ThankYouFreeGulf = lazy(() => import("./pages/ThankYouFreeGulf"));
const BecomeAffiliate = lazy(() => import("./pages/BecomeAffiliate"));
const PartnerLanding = lazy(() => import("./pages/PartnerLanding"));
const GulfArabicCourse = lazy(() => import("./pages/GulfArabicCourse"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const ChoosePlan = lazy(() => import("./pages/ChoosePlan"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./pages/PaymentCancel"));
const ThankYouPurchase = lazy(() => import("./pages/ThankYouPurchase"));
const MembershipContinue = lazy(() => import("./pages/MembershipContinue"));
const MembershipActivate = lazy(() => import("./pages/MembershipActivate"));
const StartFree = lazy(() => import("./pages/StartFree"));
const CertificateView = lazy(() => import("./pages/CertificateView"));
const GulfArabicLanding = lazy(() => import("./pages/learn/GulfArabicLanding"));
const FushaArabicLanding = lazy(() => import("./pages/learn/FushaArabicLanding"));
const EgyptianArabicComingSoon = lazy(() => import("./pages/learn/EgyptianArabicComingSoon"));
const DialectOverview = lazy(() => import("./pages/learn/DialectOverview"));
const LevelOverview = lazy(() => import("./pages/learn/LevelOverview"));
const UnitOverview = lazy(() => import("./pages/learn/UnitOverview"));
const LessonPlayer = lazy(() => import("./pages/learn/LessonPlayer"));
const QuizPage = lazy(() => import("./pages/learn/QuizPage"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminUserDetails = lazy(() => import("./pages/admin/AdminUserDetails"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminPurchases = lazy(() => import("./pages/admin/AdminPurchases"));
const AdminCertificates = lazy(() => import("./pages/admin/AdminCertificates"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminAffiliates = lazy(() => import("./pages/admin/AdminAffiliates"));
const AdminAffiliatePayouts = lazy(() => import("./pages/admin/AdminAffiliatePayouts"));
const AdminAffiliateApplications = lazy(() => import("./pages/admin/AdminAffiliateApplications"));
const AdminEmailCampaigns = lazy(() => import("./pages/admin/AdminEmailCampaigns"));
const AdminFlashcardUnits = lazy(() => import("./pages/admin/AdminFlashcardUnits"));
const AdminFlashcardCards = lazy(() => import("./pages/admin/AdminFlashcardCards"));
const AdminFlashcardPacks = lazy(() => import("./pages/admin/AdminFlashcardPacks"));
const AdminFlashcardPurchases = lazy(() => import("./pages/admin/AdminFlashcardPurchases"));
const AdminFlashcardDiagnostics = lazy(() => import("./pages/admin/AdminFlashcardDiagnostics"));
const AdminIntermediateUnit = lazy(() => import("./pages/admin/AdminIntermediateUnit"));
const AdminIntermediateAnalytics = lazy(() => import("./pages/admin/AdminIntermediateAnalytics"));
const AdminMembershipSubscriptions = lazy(() => import("./pages/admin/AdminMembershipSubscriptions"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminEmailLog = lazy(() => import("./pages/admin/AdminEmailLog"));
const FlashCardsHome = lazy(() => import("./pages/flashcards/FlashCardsHome"));
const FlashCardUnit = lazy(() => import("./pages/flashcards/FlashCardUnit"));
const FlashCardPack = lazy(() => import("./pages/flashcards/FlashCardPack"));
const FlashCardStudy = lazy(() => import("./pages/flashcards/FlashCardStudy"));
const FlashCardsSalesPage = lazy(() => import("./pages/FlashCardsSalesPage"));
const SpokenArabicOverview = lazy(() => import("./pages/flashcards/SpokenArabicOverview"));
const IntermediateHome = lazy(() => import("./pages/flashcards/IntermediateHome"));
const IntermediateUnit = lazy(() => import("./pages/flashcards/IntermediateUnit"));
const AffiliateDashboard = lazy(() => import("./pages/affiliate/AffiliateDashboard"));
const AffiliateCommissions = lazy(() => import("./pages/affiliate/AffiliateCommissions"));
const AffiliateReferrals = lazy(() => import("./pages/affiliate/AffiliateReferrals"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry transient failures but not auth/validation errors.
      retry: (failureCount, error) => {
        const kind = classifyError(error);
        if (kind === "auth" || kind === "validation" || kind === "not_found") return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Only toast for the initial load of an observed query — silences background
      // refetches and anything a component chooses to render inline via `meta.silent`.
      if (
        query.state.data === undefined &&
        query.getObserversCount() > 0 &&
        (query.meta as any)?.silent !== true
      ) {
        const kind = classifyError(error);
        if (kind !== "auth" && kind !== "not_found") {
          toastError(error, "Failed to load data");
        }
      }
    },
  }),
  // NOTE: no global mutation onError — individual mutations already surface
  // their own errors inline (forms, checkout, admin actions). A blanket toast
  // caused duplicate/confusing error banners.

});

function PageLoader() {
  return <div className="min-h-screen" />;
}

/**
 * Route-level error boundary that resets when the pathname changes, so a
 * crash on one page doesn't stick after the user navigates elsewhere.
 */
function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return <ErrorBoundary key={pathname} name={`route:${pathname}`}>{children}</ErrorBoundary>;
}

export default function FullAppRoutes() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ScrollToTop />
          <TrackingProvider />
          <Suspense fallback={<PageLoader />}>
            <RouteErrorBoundary>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/free-trial" element={<FreeTrial />} />
            <Route path="/free-gulf-lesson" element={<FreeGulfLesson />} />
            <Route path="/free-gulf-lesson/thank-you" element={<FreeGulfLessonThankYou />} />
            <Route path="/thank-you-free-gulf" element={<ThankYouFreeGulf />} />
            <Route path="/gulf-arabic-course" element={<GulfArabicCourse />} />
            <Route path="/dialects" element={<Dialects />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/start-free" element={<StartFree />} />
            <Route path="/become-affiliate" element={<BecomeAffiliate />} />
            <Route path="/partner/:slug" element={<PartnerLanding />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/progress" element={<ProtectedRoute><DashboardProgress /></ProtectedRoute>} />
            <Route path="/dashboard/account" element={<ProtectedRoute><DashboardAccount /></ProtectedRoute>} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
            <Route path="/thank-you-purchase" element={<ThankYouPurchase />} />
            <Route path="/choose-plan/:dialectId" element={<ChoosePlan />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/membership/continue" element={<MembershipContinue />} />
            <Route path="/membership/activate" element={<MembershipActivate />} />
            <Route path="/certificate/:certCode" element={<CertificateView />} />
            <Route path="/learn/gulf-arabic" element={<GulfArabicLanding />} />
            <Route path="/learn/fusha-arabic" element={<FushaArabicLanding />} />
            <Route path="/learn/egyptian-arabic" element={<EgyptianArabicComingSoon />} />
            <Route path="/learn/dialect/:dialectId" element={<DialectOverview />} />
            <Route path="/learn/level/:levelId" element={<LevelOverview />} />
            <Route path="/learn/unit/:unitId" element={<UnitOverview />} />
            <Route path="/learn/lesson/:lessonId" element={<LessonPlayer />} />
            <Route path="/learn/quiz/:quizId" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/content" element={<AdminRoute><AdminContent /></AdminRoute>} />
            <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="/admin/users/:userId" element={<AdminRoute><AdminUserDetails /></AdminRoute>} />
            <Route path="/admin/coupons" element={<AdminRoute><AdminCoupons /></AdminRoute>} />
            <Route path="/admin/purchases" element={<AdminRoute><AdminPurchases /></AdminRoute>} />
            <Route path="/admin/certificates" element={<AdminRoute><AdminCertificates /></AdminRoute>} />
            <Route path="/admin/affiliates" element={<AdminRoute><AdminAffiliates /></AdminRoute>} />
            <Route path="/admin/affiliate-payouts" element={<AdminRoute><AdminAffiliatePayouts /></AdminRoute>} />
            <Route path="/admin/affiliate-applications" element={<AdminRoute><AdminAffiliateApplications /></AdminRoute>} />
            <Route path="/admin/email-campaigns" element={<AdminRoute><AdminEmailCampaigns /></AdminRoute>} />
            <Route path="/admin/flashcards/units" element={<AdminRoute><AdminFlashcardUnits /></AdminRoute>} />
            <Route path="/admin/flashcards/cards" element={<AdminRoute><AdminFlashcardCards /></AdminRoute>} />
            <Route path="/admin/flashcards/packs" element={<AdminRoute><AdminFlashcardPacks /></AdminRoute>} />
            <Route path="/admin/flashcards/purchases" element={<AdminRoute><AdminFlashcardPurchases /></AdminRoute>} />
            <Route path="/admin/flashcards/diagnostics" element={<AdminRoute><AdminFlashcardDiagnostics /></AdminRoute>} />
            <Route path="/admin/flashcards/intermediate/unit/:id" element={<AdminRoute><AdminIntermediateUnit /></AdminRoute>} />
            <Route path="/admin/flashcards/intermediate/analytics" element={<AdminRoute><AdminIntermediateAnalytics /></AdminRoute>} />
            <Route path="/admin/memberships" element={<AdminRoute><AdminMembershipSubscriptions /></AdminRoute>} />
            <Route path="/admin/notifications" element={<AdminRoute><AdminNotifications /></AdminRoute>} />
            <Route path="/admin/email-log" element={<AdminRoute><AdminEmailLog /></AdminRoute>} />
            <Route path="/flashcards/course/spoken-arabic" element={<SpokenArabicOverview />} />
            <Route path="/flashcards" element={<FlashCardsHome />} />
            <Route path="/flashcards-pack" element={<FlashCardsSalesPage />} />
            <Route path="/flashcards/level/intermediate" element={<IntermediateHome />} />
            <Route path="/flashcards/intermediate/unit/:slug" element={<IntermediateUnit />} />
            <Route path="/flashcards/unit/:slug" element={<FlashCardUnit />} />
            <Route path="/flashcards/pack/:slug" element={<FlashCardPack />} />
            <Route path="/flashcards/study/:unitSlug" element={<ProtectedRoute><FlashCardStudy /></ProtectedRoute>} />
            <Route path="/affiliate" element={<AffiliateRoute><AffiliateDashboard /></AffiliateRoute>} />
            <Route path="/affiliate/commissions" element={<AffiliateRoute><AffiliateCommissions /></AffiliateRoute>} />
            <Route path="/affiliate/referrals" element={<AffiliateRoute><AffiliateReferrals /></AffiliateRoute>} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="*" element={<NotFound />} />
            </Routes>
            </RouteErrorBoundary>
          </Suspense>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}