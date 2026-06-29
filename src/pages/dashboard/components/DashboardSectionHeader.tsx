type DashboardSectionHeaderProps = {
  title: string;
  subtitle?: string;
};

export function DashboardSectionHeader({ title, subtitle }: DashboardSectionHeaderProps) {
  return (
    <div>
      <h2 className="text-base sm:text-lg font-bold text-foreground leading-snug">{title}</h2>
      {subtitle ? (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      ) : null}
    </div>
  );
}
