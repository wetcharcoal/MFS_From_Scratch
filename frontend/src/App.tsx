import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useBackendActor } from "./hooks/useBackendActor";
import { ToastProvider } from "./hooks/useToast";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";

import Login from "./pages/Login";
import UserForm from "./pages/UserForm";
import Registration from "./pages/Registration";
import Homepage from "./pages/Homepage";
import Profile from "./pages/Profile";
import Post from "./pages/Post";
import Exchange from "./pages/Exchange";
import Events from "./pages/Events";
import Request from "./pages/Request";
import GroupsAdmin from "./pages/admin/GroupsAdmin";
import UsersAdmin from "./pages/admin/UsersAdmin";
import EventManagement from "./pages/admin/EventManagement";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useAuth();
  if (!isInitialized) return <div className="p-8">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function OnboardedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useAuth();
  const actor = useBackendActor();
  const [isChecking, setIsChecking] = useState(true);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!isInitialized) {
      setIsChecking(true);
      return;
    }

    if (!isAuthenticated) {
      setRedirectTo("/login");
      setIsChecking(false);
      return;
    }

    if (!actor) {
      setIsChecking(true);
      return;
    }

    setIsChecking(true);
    actor.get_me()
      .then((me) => {
        if (cancelled) return;
        const user = me?.[0];
        if (!user) {
          setRedirectTo("/user-form");
          return;
        }
        if (user.groupIds.length === 0) {
          setRedirectTo("/registration");
          return;
        }
        setRedirectTo(null);
      })
      .catch(() => {
        if (cancelled) return;
        setRedirectTo("/login");
      })
      .finally(() => {
        if (!cancelled) setIsChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isInitialized, actor]);

  if (isChecking) return <div className="p-8">Loading...</div>;
  if (redirectTo) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const actor = useBackendActor();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!actor) return;
    let cancelled = false;
    setChecking(true);
    actor
      .is_admin()
      .then((ok) => {
        if (!cancelled) setIsAdmin(ok);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [actor]);

  if (!actor) return <div className="p-8">Loading...</div>;
  if (checking) return <div className="p-8">Loading...</div>;
  if (!isAdmin) {
    return (
      <Layout>
        <p className="text-lg text-neutral-600">You&apos;re not an admin</p>
      </Layout>
    );
  }
  return <>{children}</>;
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto w-full px-4 sm:px-6 md:px-8 lg:px-12 py-6">
        {children}
      </main>
      <Footer />
    </div>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Layout><Login /></Layout>} />
        <Route
          path="/user-form"
          element={
            <ProtectedRoute>
              <Layout><UserForm /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/registration"
          element={
            <ProtectedRoute>
              <Layout><Registration /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <OnboardedRoute>
              <Layout><Homepage /></Layout>
            </OnboardedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <OnboardedRoute>
              <Layout><Profile /></Layout>
            </OnboardedRoute>
          }
        />
        <Route
          path="/post"
          element={
            <OnboardedRoute>
              <Layout><Post /></Layout>
            </OnboardedRoute>
          }
        />
        <Route
          path="/exchange"
          element={
            <ProtectedRoute>
              <Layout><Exchange /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <Layout><Events /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/request"
          element={
            <ProtectedRoute>
              <Layout><Request /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/groups"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Layout><GroupsAdmin /></Layout>
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Layout><UsersAdmin /></Layout>
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Layout><EventManagement /></Layout>
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
