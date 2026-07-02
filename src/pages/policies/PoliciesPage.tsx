import { useCallback, useEffect, useState } from "react";
import { useNotify } from "ra-core";
import { useNavigate } from "react-router";
import { AlertCircle, Save, RotateCcw, ScrollText } from "lucide-react";
import { Breadcrumb, BreadcrumbPage } from "@/components/admin";
import { Confirm } from "@/components/admin/confirm";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { usePolicyConfig } from "./usePolicyConfig";
import {
  ModerationPlaygroundSection,
  AiModerationSection,
  AuditSection,
  KeywordsSection,
  PostPolicySection,
  AdminSetupSection,
  SECTION_META,
} from "./policy-sections";
import type { PolicySectionKey } from "./types";

type PendingUnsavedAction = { targetLabel: string; path: string };

function getRouteLabel(pathname: string): string {
  if (pathname === "/" || pathname === "") return "Dashboard";
  if (pathname.startsWith("/stats")) return "Thống kê tương tác";
  if (pathname.startsWith("/post-trends")) return "Phân tích xu hướng";
  if (pathname.startsWith("/notifications")) return "Thông báo";
  if (pathname.startsWith("/policies")) return "Chính sách";
  if (pathname.startsWith("/posts")) return "Bài viết";
  if (pathname.startsWith("/customers")) return "Người dùng";
  if (pathname.startsWith("/comments")) return "Bình luận";
  if (pathname.startsWith("/conversations")) return "Tin nhắn";
  if (pathname.startsWith("/postReports")) return "Báo cáo bài viết";
  if (pathname.startsWith("/supportRequests")) return "Hỗ trợ";
  if (pathname.startsWith("/activityLogs")) return "Nhật ký hoạt động";
  return pathname;
}

const PoliciesPage = () => {
  const notify = useNotify();
  const navigate = useNavigate();
  const {
    config,
    savedConfig,
    update,
    save,
    resetToDefaults,
    revertChanges,
    dirty,
    lastSaved,
    loading,
    apiReady,
    loadError,
  } = usePolicyConfig();
  const [tab, setTab] = useState<PolicySectionKey>("keywords");
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmUnsaved, setConfirmUnsaved] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingUnsavedAction | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const requestRouteLeave = useCallback((path: string) => {
    setPendingAction({ targetLabel: getRouteLabel(path), path });
    setConfirmUnsaved(true);
  }, []);

  useEffect(() => {
    if (!dirty) return;

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      let nextUrl: URL;
      try {
        nextUrl = new URL(href, window.location.origin);
      } catch {
        return;
      }

      if (nextUrl.origin !== window.location.origin) return;

      const currentPath = window.location.pathname;
      const nextPath = nextUrl.pathname;
      if (!currentPath.startsWith("/policies") || nextPath === currentPath) return;

      event.preventDefault();
      event.stopPropagation();
      requestRouteLeave(`${nextPath}${nextUrl.search}${nextUrl.hash}`);
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [dirty, requestRouteLeave]);

  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const currentSectionLabel =
    SECTION_META.find((s) => s.key === tab)?.label ?? "Chính sách";
  const pendingSectionLabel = pendingAction?.targetLabel ?? "trang khác";

  const closeUnsavedDialog = () => {
    setConfirmUnsaved(false);
    setPendingAction(null);
  };

  const handleSave = async () => {
    const sectionLabel = currentSectionLabel;
    setSaving(true);
    try {
      await save("Chính sách", `Cập nhật mục: ${sectionLabel}`);
      notify("Đã lưu cấu hình chính sách vào database", {
        type: "success",
        messageArgs: { _: "Đã lưu cấu hình chính sách" },
      });
    } catch {
      notify("Không thể lưu cấu hình. Kiểm tra kết nối Admin backend.", {
        type: "error",
        messageArgs: { _: "Không thể lưu cấu hình" },
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (next: PolicySectionKey) => {
    if (next === tab) return;
    setTab(next);
  };

  const handleDiscardAndContinue = () => {
    revertChanges();
    if (pendingAction) {
      const nextPath = pendingAction.path;
      closeUnsavedDialog();
      navigate(nextPath);
      return;
    }
    closeUnsavedDialog();
  };

  const handleSaveAndContinue = async () => {
    setSaving(true);
    try {
      await save("Chính sách", `Cập nhật mục: ${currentSectionLabel}`);
      notify("Đã lưu cấu hình chính sách vào database", {
        type: "success",
        messageArgs: { _: "Đã lưu cấu hình chính sách" },
      });
      if (pendingAction) {
        const nextPath = pendingAction.path;
        closeUnsavedDialog();
        navigate(nextPath);
        return;
      }
      closeUnsavedDialog();
    } catch {
      notify("Không thể lưu cấu hình. Kiểm tra kết nối Admin backend.", {
        type: "error",
        messageArgs: { _: "Không thể lưu cấu hình" },
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetToDefaults();
      notify("Đã đặt lại cấu hình về mặc định trên server", {
        type: "success",
        messageArgs: { _: "Đã đặt lại cấu hình" },
      });
      setConfirmReset(false);
    } catch {
      notify("Không thể đặt lại cấu hình. Kiểm tra kết nối Admin backend.", {
        type: "error",
        messageArgs: { _: "Không thể đặt lại cấu hình" },
      });
    } finally {
      setResetting(false);
    }
  };

  const renderSection = () => {
    if (!config) {
      return (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {loading ? "Đang tải cấu hình từ database…" : "Không có dữ liệu cấu hình."}
        </p>
      );
    }

    switch (tab) {
      case "playground":
        return (
          <ModerationPlaygroundSection
            aiModeration={config?.aiModeration}
            savedAiModeration={savedConfig?.aiModeration}
            policyDirty={dirty}
          />
        );
      case "keywords":
        return <KeywordsSection config={config} update={update} />;
      case "ai":
        return <AiModerationSection config={config} update={update} />;
      case "posts":
        return <PostPolicySection config={config} update={update} />;
      case "audit":
        return <AuditSection config={config} />;
      case "admin_setup":
        return <AdminSetupSection />;
      default:
        return null;
    }
  };

  const formDisabled = !apiReady || loading || !config;

  return (
    <>
      <Breadcrumb>
        <BreadcrumbPage>Chính sách</BreadcrumbPage>
      </Breadcrumb>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <ScrollText className="size-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">Quản lý chính sách</h1>
            <p className="text-xs text-muted-foreground">
              Từ khóa · AI · bài viết · audit
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loading ? (
            <Badge variant="outline">Đang tải…</Badge>
          ) : null}
          {!loading && apiReady ? (
            <Badge variant="outline" className="text-success border-success-border">
              Đã kết nối database
            </Badge>
          ) : null}
          {dirty ? (
            <Badge variant="outline" className="text-amber-700 border-amber-400">
              Chưa lưu
            </Badge>
          ) : lastSaved ? (
            <span className="text-xs text-muted-foreground">
              Lưu lúc {lastSaved.toLocaleString("vi-VN")}
            </span>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmReset(true)}
            disabled={formDisabled || resetting}
          >
            <RotateCcw className="size-4 mr-1" />
            Mặc định
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={
              !dirty ||
              formDisabled ||
              saving
            }
          >
            <Save className="size-4 mr-1" />
            {saving ? "Đang lưu…" : "Lưu thay đổi"}
          </Button>
        </div>
      </div>

      {!loading && !apiReady ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Không kết nối Admin API — không thể chỉnh sửa</p>
            {loadError ? (
              <p className="text-xs mt-0.5 opacity-80">{loadError}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <Tabs
        value={tab}
        onValueChange={(v) => handleTabChange(v as PolicySectionKey)}
        className="gap-4"
      >
        <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <TabsList className="inline-flex h-auto w-max min-w-full flex-nowrap justify-start gap-1 bg-muted/80 p-1">
            {SECTION_META.map(({ key, label, title, icon: Icon }) => (
              <TabsTrigger
                key={key}
                value={key}
                title={title ?? label}
                className="h-8 shrink-0 flex-none px-2.5 text-xs gap-1.5 sm:px-3 sm:text-sm"
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="whitespace-nowrap">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={tab} className="mt-0 space-y-4">
          <fieldset disabled={formDisabled} className="min-w-0 border-0 p-0 m-0">
            {renderSection()}
          </fieldset>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground mt-6">
        Cấu hình lưu trong database (
        <code className="text-[11px]">platform_policies</code>
        , <code className="text-[11px]">policy_keywords</code>
        ) qua Admin API (
        <code className="text-[11px]">/api/v1/admin/policies</code>
        ). User app đọc tại{" "}
        <code className="text-[11px]">/api/v1/policies/public</code> — không qua Admin API.
      </p>

      <Confirm
        isOpen={confirmReset}
        title="Đặt lại về mặc định?"
        content="Toàn bộ cấu hình chính sách trên database sẽ bị ghi đè bằng giá trị mặc định server. Thao tác này không thể hoàn tác."
        confirm={resetting ? "Đang xử lý…" : "Đặt lại"}
        cancel="Huỷ"
        confirmColor="warning"
        onConfirm={handleReset}
        onClose={() => setConfirmReset(false)}
      />

      <Dialog
        open={confirmUnsaved}
        onOpenChange={(open) => {
          if (!open) closeUnsavedDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chưa lưu cấu hình</DialogTitle>
            <DialogDescription>
              Bạn có thay đổi chưa được lưu ở mục{" "}
              <span className="font-medium text-foreground">{currentSectionLabel}</span>.
              {" "}
              Hãy lưu cấu hình trước khi chuyển sang{" "}
              <span className="font-medium text-foreground">{pendingSectionLabel}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" disabled={saving} onClick={closeUnsavedDialog}>
              Ở lại
            </Button>
            <Button
              variant="outline"
              disabled={saving}
              onClick={handleDiscardAndContinue}
            >
              Rời không lưu
            </Button>
            <Button disabled={saving} onClick={handleSaveAndContinue}>
              {saving ? "Đang lưu…" : "Lưu và rời"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PoliciesPage;
