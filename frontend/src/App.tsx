import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const actor = useBackendActor();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!actor) return;
    actor.list_all_users()
      .then(() => setIsAdmin(true))
      .catch(() => setIsAdmin(false))
      .finally(() => setChecking(false));
  }, [actor]);

  useEffect(() => {
    if (checking) return;
    if (!isAdmin) navigate("/", { replace: true });
  }, [checking, isAdmin, navigate]);

  if (checking) return <div className="p-8">Loading...</div>;
  if (!isAdmin) return null;
  return <>{children}</>;
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-6">{children}</main>
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
            <AdminRoute>
              <Layout><GroupsAdmin /></Layout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <Layout><UsersAdmin /></Layout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/events"
          element={
            <AdminRoute>
              <Layout><EventManagement /></Layout>
            </AdminRoute>
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
