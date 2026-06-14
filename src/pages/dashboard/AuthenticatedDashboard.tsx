import { useEffect, useState } from "react";
import { useAuthenticated } from "ra-core";
import { Spinner } from "@/components/admin/spinner";
import { Button } from "@/components/ui/button";
import { validateAuthSession, redirectToLogin, hasStoredAuth } from "@/lib/authSession";
import { Dashboard } from "./Dashboard";

/**
 * Gate dashboard behind react-admin auth + live backend session check.
 */
export function AuthenticatedDashboard() {
  const { isPending: authPending } = useAuthenticated();
  const [sessionPending, setSessionPending] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [apiUnreachable, setApiUnreachable] = useState(false);

  const verify = async () => {
    if (!hasStoredAuth()) {
      setSessionValid(false);
      setSessionPending(false);
      redirectToLogin();
      return;
    }

    const status = await validateAuthSession();
    if (status === "ok") {
      setApiUnreachable(false);
      setSessionValid(true);
      setSessionPending(false);
      return;
    }

    setSessionValid(false);
    setSessionPending(false);
    if (status === "backend_down") {
      setApiUnreachable(true);
      return;
    }
    redirectToLogin("session");
  };

  useEffect(() => {
    void verify();
  }, []);

  if (authPending || sessionPending) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8">
        <Spinner size="large" />
        <p className="text-sm text-muted-foreground">Đang xác thực phiên đăng nhập...</p>
      </div>
    );
  }

  if (apiUnreachable) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm font-medium">Không kết nối được Admin API</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Phiên đăng nhập vẫn được giữ. Render có thể đang khởi động — thử lại sau vài giây.
        </p>
        <Button type="button" onClick={() => { setSessionPending(true); void verify(); }}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (!sessionValid) {
    return null;
  }

  return <Dashboard />;
}
