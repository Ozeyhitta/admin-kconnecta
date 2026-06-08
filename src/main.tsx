import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.css";
import App from "./App.tsx";
import {
  getLoginPath,
  hasStoredAuth,
  isLoginPath,
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

function redirectToLoginBeforeRender() {
  if (hasStoredAuth() || isLoginPath(window.location.pathname)) {
    return;
  }
  window.history.replaceState(null, "", getLoginPath());
}

redirectToLoginBeforeRender();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthSessionGuard />
      <App />
    </BrowserRouter>
  </StrictMode>,
);
