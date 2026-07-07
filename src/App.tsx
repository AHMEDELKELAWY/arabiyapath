import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

const PartnerLanding = lazy(() => import("./pages/PartnerLanding"));
const FullAppRoutes = lazy(() => import("./FullAppRoutes"));

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
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

export default App;