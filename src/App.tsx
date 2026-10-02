import { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import PageLoadBoundary from './components/PageLoadBoundary';
import { AuthProvider } from './context/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import RouteMeta from './seo/RouteMeta';
import { ROUTES } from './routes';

/** Providers and routes without a router, so the build-time renderer can supply its own. */
export function AppShell() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <AuthProvider>
        <ScrollToTop />
        <RouteMeta />
        <Routes>
          {ROUTES.map(({ path, Page, fallback }) => (
            <Route
              key={path}
              path={path}
              element={
                <PageLoadBoundary>
                  <Suspense fallback={fallback}>
                    <Page />
                  </Suspense>
                </PageLoadBoundary>
              }
            />
          ))}
        </Routes>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
