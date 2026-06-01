import { useState } from "react";
import { useNotify } from "ra-core";
import { Save, RotateCcw, ScrollText } from "lucide-react";
import { Breadcrumb, BreadcrumbPage } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { usePolicyConfig } from "./usePolicyConfig";
import {
  AiInsightsSection,
  AiModerationSection,
  AuditSection,
  ChatPolicySection,
  CommunitySection,
  KeywordsSection,
  PostPolicySection,
  PrivacySection,
  RecommendationSection,
  RuleEngineSection,
  SECTION_META,
  ViolationsSection,
} from "./policy-sections";
import type { PolicySectionKey } from "./types";

const PoliciesPage = () => {
  const notify = useNotify();
  const { config, update, save, resetToDefaults, dirty, lastSaved, weightTotal, loading, apiReady } =
    usePolicyConfig();
  const [tab, setTab] = useState<PolicySectionKey>("community");

  const handleSave = async () => {
    const sectionLabel =
      SECTION_META.find((s) => s.key === tab)?.label ?? "Chính sách";
    await save("Chính sách", `Cập nhật mục: ${sectionLabel}`);
    notify(
      apiReady
        ? "Đã lưu cấu hình chính sách (đồng bộ User backend)"
        : "Đã lưu cục bộ — User backend chưa kết nối",
      {
        type: apiReady ? "success" : "warning",
        messageArgs: { _: "Đã lưu cấu hình chính sách" },
      }
    );
  };

  const renderSection = () => {
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
        return <PrivacySection config={config} update={update} />;
      case "posts":
        return <PostPolicySection config={config} update={update} />;
      case "chat":
        return <ChatPolicySection config={config} update={update} />;
      case "recommendation":
        return (
          <RecommendationSection
            config={config}
            update={update}
            weightTotal={weightTotal}
          />
        );
      case "rules":
        return <RuleEngineSection config={config} update={update} />;
      case "insights":
        return <AiInsightsSection config={config} />;
      case "audit":
        return <AuditSection config={config} />;
      default:
        return null;
    }
  };

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
              Cộng đồng · từ khóa · AI · quyền riêng tư · rule engine · audit
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {loading ? (
            <Badge variant="outline">Đang tải…</Badge>
          ) : null}
          {!loading && apiReady ? (
            <Badge variant="outline" className="text-emerald-700 border-emerald-400">
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
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="size-4 mr-1" />
            Mặc định
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty}>
            <Save className="size-4 mr-1" />
            Lưu thay đổi
          </Button>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as PolicySectionKey)}
        className="gap-4"
      >
        <TabsList className="flex flex-wrap h-auto w-full justify-start gap-1 bg-muted/80 p-1">
          {SECTION_META.map(({ key, label, icon: Icon }) => (
            <TabsTrigger key={key} value={key} className="text-xs sm:text-sm gap-1.5">
              <Icon className="size-3.5 shrink-0" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-0 space-y-4">
          {renderSection()}
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground mt-6">
        Cấu hình đồng bộ qua Admin API → User backend (
        <code className="text-[11px]">/api/v1/admin/policies</code>
        ). User app đọc tại{" "}
        <code className="text-[11px]">/api/v1/policies/public</code>.
      </p>
    </>
  );
};

export default PoliciesPage;
