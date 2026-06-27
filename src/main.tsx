import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.css";
import App from "./App.tsx";
import {
  getLoginPath,
  getHomePath,
  hasStoredAuth,
  isLoginPath,
  isRootPath,
} from "@/lib/authSession";

function AuthSessionGuard() {
  useEffect(() => {
    const redirectToLoginIfNeeded = () => {
      if (hasStoredAuth() || isLoginPath(window.location.pathname)) {
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

function redirectBeforeRender() {
  const path = window.location.pathname;
  if (isLoginPath(path)) {
    return;
  }
  if (!hasStoredAuth()) {
    window.history.replaceState(null, "", getLoginPath());
    return;
  }
  if (isRootPath(path)) {
    window.history.replaceState(null, "", getHomePath());
  }
}

redirectBeforeRender();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthSessionGuard />
      <App />
    </BrowserRouter>
  </StrictMode>,
);
