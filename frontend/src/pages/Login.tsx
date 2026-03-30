import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useBackendActor } from "@/hooks/useBackendActor";
import { useToast } from "@/hooks/useToast";

const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || "ii";

export default function Login() {
  const { login, isAuthenticated, isInitialized } = useAuth();
  const actor = useBackendActor();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const isDevKeyMode = AUTH_MODE === "dev_key";

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated || !actor) return;
    actor
      .get_me()
      .then((me) => {
        if (me && me.length > 0) {
          const user = me[0]!;
          if (user.groupIds.length === 0) {
            navigate("/registration");
          } else {
            navigate("/");
          }
        } else {
          navigate("/user-form");
        }
      })
      .catch((err) => {
        addToast("Could not load profile. Is the replica running?", "error");
        console.error("Login get_me failed:", err);
      });
  }, [isAuthenticated, isInitialized, actor, navigate, addToast]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      <h1 className="text-2xl font-bold">Welcome to A Seed</h1>
      <p className="text-muted-foreground text-center max-w-md">
        {isDevKeyMode
          ? "A platform for food groups to exchange resources and needs. Local mode uses a development identity for fast testing."
          : "A platform for food groups to exchange resources and needs. Login to continue."}
      </p>
      {isAuthenticated ? (
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      ) : (
        <Button onClick={login} size="lg">
          {isDevKeyMode ? "Continue (Local Dev Identity)" : "Login to continue"}
        </Button>
      )}
    </div>
  );
}
