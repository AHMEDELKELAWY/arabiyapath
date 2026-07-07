import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

const PartnerLanding = lazy(() => import("./pages/PartnerLanding"));
const FullAppRoutes = lazy(() => import("./FullAppRoutes"));

const queryClient = new QueryClient();

function PageLoader() {
  return <div style={{ minHeight: "100vh" }} />;
}

function AppRoutes() {
  const location = useLocation();

  if (location.pathname.startsWith("/partner/")) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/partner/:slug" element={<PartnerLanding />} />
          <Route path="*" element={<FullAppRoutes />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <FullAppRoutes />
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;