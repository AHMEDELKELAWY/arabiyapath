import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { TrackingProvider } from "@/components/analytics/TrackingProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/admin/AdminRoute";
import { AffiliateRoute } from "@/components/affiliate/AffiliateRoute";

// Critical pages - loaded immediately
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages for code splitting
const Dialects = lazy(() => import("./pages/Dialects"));
const Pricing = lazy(() => import("./pages/Pricing"));
const About = lazy(() => import("./pages/About"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Contact = lazy(() => import("./pages/Contact"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DashboardProgress = lazy(() => import("./pages/DashboardProgress"));
const DashboardAccount = lazy(() => import("./pages/DashboardAccount"));
const FreeTrial = lazy(() => import("./pages/FreeTrial"));
const FreeGulfLesson = lazy(() => import("./pages/FreeGulfLesson"));
const FreeGulfLessonThankYou = lazy(() => import("./pages/FreeGulfLessonThankYou"));
const BecomeAffiliate = lazy(() => import("./pages/BecomeAffiliate"));
const FlashCards = lazy(() => import("./pages/FlashCards"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Checkout = lazy(() => import("./pages/Checkout"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancel = lazy(() => import("./pages/PaymentCancel"));

// Learning pages
const GulfArabicLanding = lazy(() => import("./pages/learn/GulfArabicLanding"));
const FushaArabicLanding = lazy(() => import("./pages/learn/FushaArabicLanding"));
const EgyptianArabicComingSoon = lazy(() => import("./pages/learn/EgyptianArabicComingSoon"));
const DialectOverview = lazy(() => import("./pages/learn/DialectOverview"));
const LevelOverview = lazy(() => import("./pages/learn/LevelOverview"));
const UnitOverview = lazy(() => import("./pages/learn/UnitOverview"));
const LessonPlayer = lazy(() => import("./pages/learn/LessonPlayer"));
const QuizPage = lazy(() => import("./pages/learn/QuizPage"));

// Admin pages
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

// Affiliate pages
const AffiliateDashboard = lazy(() => import("./pages/affiliate/AffiliateDashboard"));
const AffiliateCommissions = lazy(() => import("./pages/affiliate/AffiliateCommissions"));
const AffiliateReferrals = lazy(() => import("./pages/affiliate/AffiliateReferrals"));

const queryClient = new QueryClient();

// Minimal loading fallback (invisible to avoid layout shift)
function PageLoader() {
  return <div className="min-h-screen" />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <TrackingProvider />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/free-trial" element={<FreeTrial />} />
              <Route path="/free-gulf-lesson" element={<FreeGulfLesson />} />
              <Route path="/free-gulf-lesson/thank-you" element={<FreeGulfLessonThankYou />} />
              <Route path="/flash-cards" element={<FlashCards />} />
              <Route path="/dialects" element={<Dialects />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/become-affiliate" element={<BecomeAffiliate />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/progress" element={<ProtectedRoute><DashboardProgress /></ProtectedRoute>} />
              <Route path="/dashboard/account" element={<ProtectedRoute><DashboardAccount /></ProtectedRoute>} />
              {/* Payment Routes */}
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/cancel" element={<PaymentCancel />} />
              <Route path="/checkout" element={<Checkout />} />
              {/* Learning Routes */}
              <Route path="/learn/gulf-arabic" element={<GulfArabicLanding />} />
              <Route path="/learn/fusha-arabic" element={<FushaArabicLanding />} />
              <Route path="/learn/egyptian-arabic" element={<EgyptianArabicComingSoon />} />
              <Route path="/learn/dialect/:dialectId" element={<DialectOverview />} />
              <Route path="/learn/level/:levelId" element={<LevelOverview />} />
              <Route path="/learn/unit/:unitId" element={<UnitOverview />} />
              <Route path="/learn/lesson/:lessonId" element={<LessonPlayer />} />
              <Route path="/learn/quiz/:quizId" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
              {/* Admin Routes */}
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
              {/* Affiliate Routes */}
              <Route path="/affiliate" element={<AffiliateRoute><AffiliateDashboard /></AffiliateRoute>} />
              <Route path="/affiliate/commissions" element={<AffiliateRoute><AffiliateCommissions /></AffiliateRoute>} />
              <Route path="/affiliate/referrals" element={<AffiliateRoute><AffiliateReferrals /></AffiliateRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;