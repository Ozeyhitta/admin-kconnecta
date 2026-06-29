import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InteractionBreakdownRow } from "../lib/postTrendsAnalytics";
import { fmt } from "../utils";

type InteractionBreakdownTableProps = {
  rows: InteractionBreakdownRow[];
  loading: boolean;
};

export function InteractionBreakdownTable({ rows, loading }: InteractionBreakdownTableProps) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Phân rã tương tác</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Chưa có dữ liệu tương tác</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loại</TableHead>
                  <TableHead className="text-right">Số lượng</TableHead>
                  <TableHead className="text-right">Điểm đóng góp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.kind}
                    className={row.kind === "total" ? "font-semibold bg-muted/30" : undefined}
                  >
                    <TableCell>{row.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt.format(row.count)}</TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        row.kind === "report" && row.points < 0
                          ? "text-red-600"
                          : row.kind === "total"
                            ? ""
                            : "text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {row.kind === "report" ? fmt.format(row.points) : `+${fmt.format(row.points)}`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
