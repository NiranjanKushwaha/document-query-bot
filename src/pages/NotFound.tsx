import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-secondary px-4">
      <div className="text-center max-w-md w-full">
        <h1 className="mb-3 sm:mb-4 text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          404
        </h1>
        <p className="mb-4 sm:mb-6 text-lg sm:text-xl md:text-2xl text-muted-foreground">
          Oops! Page not found
        </p>
        <a 
          href="/" 
          className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-gradient-primary text-white rounded-lg hover:bg-primary-hover transition-all duration-300 text-sm sm:text-base font-medium"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
