import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function Header() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="font-semibold text-xl">
          A Seed
        </Link>
        <nav className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link to="/" className="text-sm hover:underline">
                Home
              </Link>
              <Link to="/exchange" className="text-sm hover:underline">
                Exchange
              </Link>
              <Link to="/events" className="text-sm hover:underline">
                Events
              </Link>
              <Link to="/post" className="text-sm hover:underline">
                Post
              </Link>
              <Link to="/profile" className="text-sm hover:underline">
                Profile
              </Link>
              <Link to="/request" className="text-sm hover:underline">
                Request
              </Link>
              <Link to="/admin/groups" className="text-sm hover:underline">
                Admin
              </Link>
              <Button variant="ghost" size="sm" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <Link to="/login" className="text-sm hover:underline">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
