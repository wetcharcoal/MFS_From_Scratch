import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useBackendActor } from "@/hooks/useBackendActor";

export default function Login() {
  const { login, isAuthenticated, isInitialized } = useAuth();
  const actor = useBackendActor();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated || !actor) return;
    actor.get_me().then((me) => {
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
    });
  }, [isAuthenticated, isInitialized, actor, navigate]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      <h1 className="text-2xl font-bold">Welcome to A Seed</h1>
      <p className="text-muted-foreground text-center max-w-md">
        A platform for food groups to exchange resources and needs. Login to continue.
      </p>
      {isAuthenticated ? (
        <p className="text-sm text-muted-foreground">Signing you in...</p>
      ) : (
        <Button onClick={login} size="lg">
          Login to continue
        </Button>
      )}
    </div>
  );
}
