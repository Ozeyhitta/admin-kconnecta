import { useState } from "react";
import { useNotify } from "ra-core";
import { AlertCircle, Save, RotateCcw, ScrollText } from "lucide-react";
import { Breadcrumb, BreadcrumbPage } from "@/components/admin";
import { Confirm } from "@/components/admin/confirm";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePolicyConfig } from "./usePolicyConfig";
import {
  AiModerationSection,
  AuditSection,
  CommunitySection,
  KeywordsSection,
  PostPolicySection,
  PrivacySection,
  RecommendationSection,
  SECTION_META,
  ViolationsSection,
} from "./policy-sections";
import type { PolicySectionKey } from "./types";

const PoliciesPage = () => {
  const notify = useNotify();
  const {
    config,
    update,
    save,
    resetToDefaults,
    dirty,
    lastSaved,
    weightTotal,
    loading,
    apiReady,
    loadError,
  } = usePolicyConfig();
  const [tab, setTab] = useState<PolicySectionKey>("community");
  const [confirmReset, setConfirmReset] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleSave = async () => {
    const sectionLabel =
      SECTION_META.find((s) => s.key === tab)?.label ?? "Chính sách";
    setSaving(true);
    try {
      await save("Chính sách", `Cập nhật mục: ${sectionLabel}`);
      notify("Đã lưu cấu hình chính sách (đồng bộ User backend)", {
        type: "success",
        messageArgs: { _: "Đã lưu cấu hình chính sách" },
      });
    } catch {
      notify("Không thể lưu cấu hình. Kiểm tra kết nối User backend.", {
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
      notify("Không thể đặt lại cấu hình. Kiểm tra kết nối User backend.", {
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
      case "community":
        return <CommunitySection config={config} update={update} />;
      case "keywords":
        return <KeywordsSection config={config} update={update} />;
      case "violations":
        return <ViolationsSection config={config} update={update} />;
      case "ai":
        return <AiModerationSection config={config} update={update} />;
      case "privacy":
        return <PrivacySection />;
      case "posts":
        return <PostPolicySection config={config} update={update} />;
      case "recommendation":
        return (
          <RecommendationSection
            config={config}
            update={update}
            weightTotal={weightTotal}
          />
        );
      case "audit":
        return <AuditSection config={config} />;
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
              Cộng đồng · từ khóa · AI · quyền riêng tư · audit
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loading ? (
            <Badge variant="outline">Đang tải…</Badge>
          ) : null}
          {!loading && apiReady ? (
            <Badge variant="outline" className="text-success border-success-border">
              Đồng bộ User API
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
            disabled={!dirty || formDisabled || saving}
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
            <p className="font-medium">Không kết nối User backend — không thể chỉnh sửa</p>
            {loadError ? (
              <p className="text-xs mt-0.5 opacity-80">{loadError}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as PolicySectionKey)}
        className="gap-4"
      >
        <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <TabsList className="inline-flex h-auto w-max min-w-full flex-nowrap justify-start gap-1 bg-muted/80 p-1">
            {SECTION_META.map(({ key, label, icon: Icon }) => (
              <TabsTrigger
                key={key}
                value={key}
                title={label}
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
        Cấu hình lưu trong database User backend (
        <code className="text-[11px]">platform_policies</code>
        ), đồng bộ qua Admin API (
        <code className="text-[11px]">/api/v1/admin/policies</code>
        ). User app đọc tại{" "}
        <code className="text-[11px]">/api/v1/policies/public</code>.
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
    </>
  );
};

export default PoliciesPage;
