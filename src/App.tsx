import { lazy, Suspense, useLayoutEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LoadingAnimation } from "@/components/LoadingAnimation";

const Index = lazy(() => import("./pages/Index"));
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MyItineraries = lazy(() => import("./pages/MyItineraries"));
const SavedItinerary = lazy(() => import("./pages/SavedItinerary"));
const Community = lazy(() => import("./pages/Community"));
const CommunityItinerary = lazy(() => import("./pages/CommunityItinerary"));

function RouteScrollReset() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <RouteScrollReset />
      <Toaster position="top-right" closeButton richColors />
      <Suspense fallback={<LoadingAnimation compact message="Carregando o ExploraSC..." />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/planejar" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/auth" element={<Auth />} />
            <Route path="/meus-roteiros" element={<ProtectedRoute><MyItineraries /></ProtectedRoute>} />
            <Route path="/meus-roteiros/:id" element={<ProtectedRoute><SavedItinerary /></ProtectedRoute>} />
            <Route path="/comunidade" element={<ProtectedRoute><Community /></ProtectedRoute>} />
            <Route path="/comunidade/:id" element={<ProtectedRoute><CommunityItinerary /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
      </Suspense>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
