import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.css";
import App from "./App.tsx";

const getLoginPath = () => {
  const basename = (import.meta.env.VITE_BASENAME ?? "").replace(/\/$/, "");
  const path = `${basename}/login`.replace(/\/+/g, "/");
  return path.startsWith("/") ? path : `/${path}`;
};

const isAuthenticated = () => Boolean(localStorage.getItem("auth"));

const isLoginPath = (pathname: string) => {
  const loginPath = getLoginPath();
  return pathname === loginPath || pathname.endsWith("/login");
};

function AuthSessionGuard() {
  useEffect(() => {
    const redirectToLoginIfNeeded = () => {
      if (isAuthenticated() || isLoginPath(window.location.pathname)) {
        return;
      }
      window.location.replace(getLoginPath());
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        redirectToLoginIfNeeded();
      }
    };

    const handlePopState = () => {
      redirectToLoginIfNeeded();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        redirectToLoginIfNeeded();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}

const redirectToLoginBeforeRender = () => {
  if (isAuthenticated() || isLoginPath(window.location.pathname)) {
    return;
  }
  window.history.replaceState(null, "", getLoginPath());
};

redirectToLoginBeforeRender();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthSessionGuard />
      <App />
    </BrowserRouter>
  </StrictMode>,
);
