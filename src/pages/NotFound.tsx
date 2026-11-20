import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Log 404 error for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error(
        "404 Error: User attempted to access non-existent route:",
        location.pathname
      );
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center animate-fade-in max-w-md">
        <div className="bg-gradient-hero bg-clip-text text-transparent text-7xl font-extrabold mb-3">404</div>
        <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
        <p className="text-sm text-muted-foreground mb-6">
          The requested page <code className="bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-xs">{location.pathname}</code> does not exist or has been relocated.
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-dark transition-smooth text-sm font-medium shadow-sm"
        >
          Return to Institutional Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
