export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex h-14 items-center gap-4 border-b border-border px-4 pl-14 lg:pl-4">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-2xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="ml-auto flex items-center gap-2">{children}</div>
      )}
    </header>
  );
}
