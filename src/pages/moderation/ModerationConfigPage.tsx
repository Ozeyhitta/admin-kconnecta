import * as React from "react";
import { useNotify } from "ra-core";
import { Save } from "lucide-react";
import { Breadcrumb, BreadcrumbPage } from "@/components/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/services/axiosInstance";

interface ConfigFields {
  rate_limit_max_messages: string;
  rate_limit_window_seconds: string;
  duplicate_window_seconds: string;
  duplicate_threshold: string;
}

const DEFAULTS: ConfigFields = {
  rate_limit_max_messages: "10",
  rate_limit_window_seconds: "60",
  duplicate_window_seconds: "120",
  duplicate_threshold: "3",
};

const FIELDS: {
  key: keyof ConfigFields;
  label: string;
  unit?: string;
  description: (val: string) => string;
}[] = [
  {
    key: "rate_limit_max_messages",
    label: "Số tin nhắn tối đa trong cửa sổ thời gian",
    description: (val) =>
      `Một user chỉ được gửi tối đa ${val || "?"} tin nhắn trong khoảng thời gian rate limit.`,
  },
  {
    key: "rate_limit_window_seconds",
    label: "Cửa sổ thời gian rate limit",
    unit: "giây",
    description: (val) =>
      `Hệ thống sẽ đếm số tin nhắn user gửi trong ${val || "?"} giây. Nếu vượt quá giới hạn, user có thể bị coi là spam.`,
  },
  {
    key: "duplicate_window_seconds",
    label: "Thời gian phát hiện tin nhắn lặp lại",
    unit: "giây",
    description: (val) =>
      `Hệ thống kiểm tra các tin nhắn có nội dung giống nhau trong vòng ${val || "?"} giây.`,
  },
  {
    key: "duplicate_threshold",
    label: "Số lần gửi cùng nội dung tối đa",
    description: (val) =>
      `Nếu user gửi cùng một nội dung quá ${val || "?"} lần trong khoảng thời gian phát hiện lặp lại, hệ thống sẽ coi đó là spam.`,
  },
];

export const ModerationConfigPage = () => {
  const notify = useNotify();
  const [fields, setFields] = React.useState<ConfigFields>(DEFAULTS);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      try {
        const { data } = await apiClient.get<Record<string, string>>("/api/v1/admin/moderation-config");
        setFields((prev) => ({ ...prev, ...data }));
      } catch {
        // keep defaults if server unreachable
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (key: keyof ConfigFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    for (const { key, label } of FIELDS) {
      const n = Number(fields[key]);
      if (!Number.isInteger(n) || n <= 0) {
        notify(`"${label}" phải là số nguyên dương.`, { type: "error" });
        return;
      }
    }
    setSaving(true);
    try {
      await apiClient.put("/api/v1/admin/moderation-config", fields);
      notify("Đã lưu cấu hình spam. Cấu hình mới sẽ được áp dụng ở lần quét tiếp theo.", {
        type: "success",
      });
    } catch {
      notify("Lưu thất bại. Vui lòng thử lại.", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const maxMsg = fields.rate_limit_max_messages;
  const windowSec = fields.rate_limit_window_seconds;
  const dupWindow = fields.duplicate_window_seconds;
  const dupThresh = fields.duplicate_threshold;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Breadcrumb>
        <BreadcrumbPage>Cấu hình kiểm duyệt</BreadcrumbPage>
      </Breadcrumb>

      <h2 className="text-2xl font-bold tracking-tight">Cấu hình kiểm duyệt chat</h2>

      <Card>
        <CardHeader>
          <CardTitle>Giới hạn spam tin nhắn</CardTitle>
          <CardDescription>
            Thay đổi các ngưỡng phát hiện spam. Cấu hình mới sẽ có hiệu lực ở lần quét tiếp theo,
            hệ thống quét mỗi 60 giây.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Đang tải...</p>
          ) : (
            <>
              {FIELDS.map(({ key, label, unit, description }) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={key}>{label}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={key}
                      type="number"
                      min={1}
                      value={fields[key]}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="w-32"
                    />
                    {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{description(fields[key])}</p>
                </div>
              ))}

              <div className="rounded-md border bg-muted/40 p-4 text-sm space-y-2">
                <p className="font-medium">Ví dụ:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    Nếu một user gửi <span className="font-medium text-foreground">{Number(maxMsg) + 1}</span> tin
                    nhắn trong <span className="font-medium text-foreground">{windowSec} giây</span>, user đó vượt
                    giới hạn <span className="font-medium text-foreground">{maxMsg} tin nhắn / {windowSec} giây</span>{" "}
                    và có thể bị đánh dấu là spam.
                  </li>
                  <li>
                    Nếu một user gửi cùng nội dung{" "}
                    <span className="font-medium text-foreground">&quot;hello&quot;</span>{" "}
                    <span className="font-medium text-foreground">{Number(dupThresh) + 1} lần</span> trong{" "}
                    <span className="font-medium text-foreground">{dupWindow} giây</span>, user đó vượt giới hạn lặp
                    lại <span className="font-medium text-foreground">{dupThresh} lần / {dupWindow} giây</span> và có
                    thể bị đánh dấu là spam.
                  </li>
                </ul>
              </div>

              <Button onClick={() => void handleSave()} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Đang lưu..." : "Lưu cấu hình"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ModerationConfigPage;
