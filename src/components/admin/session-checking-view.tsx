import { Spinner } from "@/components/admin/spinner";

/** Full-screen session check — used on login and while ra-core runs checkAuth. */
export function SessionCheckingView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Spinner size="large" />
        <p className="text-sm text-muted-foreground">Đang xác thực phiên đăng nhập...</p>
      </div>
    </div>
  );
}
