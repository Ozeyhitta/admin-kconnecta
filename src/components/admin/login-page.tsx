import { useMemo, useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, Mail, ServerCrash } from "lucide-react";
import { useLogin, useNotify } from "ra-core";
import { useSearchParams } from "react-router";
import { Notification } from "@/components/admin/notification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoV1 from "@/assets/LogoKConnecta_V1.png";

export const LoginPage = (props: { redirectTo?: string }) => {
  const { redirectTo } = props;
  const login = useLogin();
  const notify = useNotify();
  const [searchParams] = useSearchParams();

  const statusBanner = useMemo(() => {
    const reason = searchParams.get("reason");
    if (reason === "backend") {
      return {
        title: "Không kết nối được máy chủ",
        description:
          "Backend admin chưa chạy hoặc không phản hồi. Khởi động backend rồi đăng nhập lại.",
      };
    }
    if (reason === "session") {
      return {
        title: "Phiên đăng nhập đã hết hạn",
        description: "Vui lòng đăng nhập lại để tiếp tục.",
      };
    }
    return null;
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      await login({ email, password }, redirectTo ?? "/");
    } catch (error: unknown) {
      notify(
        typeof error === "string"
          ? error
          : typeof error === "undefined" || !(error as { message?: string }).message
            ? "ra.auth.sign_in_error"
            : (error as { message: string }).message,
        {
          type: "error",
          messageArgs: {
            _:
              typeof error === "string"
                ? error
                : (error as { message?: string })?.message,
          },
        },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={logoV1} alt="KConnecta Logo V1" className="mb-4 h-14 w-auto" />
          <h1 className="text-xl font-bold tracking-wide">HỆ THỐNG QUẢN TRỊ</h1>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          {statusBanner && (
            <div
              role="alert"
              className="mb-5 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
            >
              <ServerCrash className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{statusBanner.title}</p>
                <p className="mt-1 text-xs opacity-90">{statusBanner.description}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@kconnecta.vn"
                  value={email}
                  autoComplete="username"
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 border-border/60 bg-background pl-10 focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Mật khẩu</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  autoComplete="current-password"
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 border-border/60 bg-background pl-10 pr-10 focus:border-primary"
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="h-12 w-full text-base font-medium" size="lg" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>
        </div>
      </div>

      <Notification />
    </div>
  );
};



