import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/admin/AdminRoute";
import Index from "./pages/Index";
import Dialects from "./pages/Dialects";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import DashboardProgress from "./pages/DashboardProgress";
import DashboardAccount from "./pages/DashboardAccount";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminContent from "./pages/admin/AdminContent";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserDetails from "./pages/admin/AdminUserDetails";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminPurchases from "./pages/admin/AdminPurchases";
import AdminCertificates from "./pages/admin/AdminCertificates";
import AdminProducts from "./pages/admin/AdminProducts";
import DialectOverview from "./pages/learn/DialectOverview";
import LevelOverview from "./pages/learn/LevelOverview";
import UnitOverview from "./pages/learn/UnitOverview";
import LessonPlayer from "./pages/learn/LessonPlayer";
import QuizPage from "./pages/learn/QuizPage";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dialects" element={<Dialects />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/progress" element={<ProtectedRoute><DashboardProgress /></ProtectedRoute>} />
            <Route path="/dashboard/account" element={<ProtectedRoute><DashboardAccount /></ProtectedRoute>} />
            {/* Payment Routes */}
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />
            {/* Learning Routes */}
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
