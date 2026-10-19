import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { BackLink } from "@/components/shared/BackLink";
import logo from "@/assets/socialmotive-logo.jpg";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <img src={logo} alt="SocialMotive" className="mx-auto mb-6 h-12 w-auto rounded-md" />
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <div className="flex justify-center"><BackLink /></div>
      </div>
    </div>
  );
};

export default NotFound;
