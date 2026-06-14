import { useEffect, useState } from "react";
import { useAuthenticated } from "ra-core";
import { Spinner } from "@/components/admin/spinner";
import { validateAuthSession, redirectToLogin, hasStoredAuth } from "@/lib/authSession";
import { setLoginNotice } from "@/lib/authDebug";
import { Dashboard } from "./Dashboard";

/**
 * Gate dashboard behind react-admin auth + live backend session check.
 */
export function AuthenticatedDashboard() {
  const { isPending: authPending } = useAuthenticated();
  const [sessionPending, setSessionPending] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!hasStoredAuth()) {
        if (!cancelled) {
          setSessionValid(false);
          setSessionPending(false);
        }
        redirectToLogin();
        return;
      }

      const status = await validateAuthSession();
      if (cancelled) return;

      if (status !== "ok") {
        setSessionValid(false);
        setSessionPending(false);
        if (status === "backend_down") {
          setLoginNotice("api_unreachable");
          redirectToLogin();
        } else {
          redirectToLogin("session");
        }
        return;
      }

      setSessionValid(true);
      setSessionPending(false);
    };

    void verify();
    return () => {
      cancelled = true;
    };
  }, []);

  if (authPending || sessionPending) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8">
        <Spinner size="large" />
        <p className="text-sm text-muted-foreground">Đang xác thực phiên đăng nhập...</p>
      </div>
    );
  }

  if (!sessionValid) {
    return null;
  }

  return <Dashboard />;
}
