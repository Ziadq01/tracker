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
    <header className="flex h-14 items-center gap-4 border-b border-border px-6 pl-16 lg:pl-6">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-bold text-foreground">{title}</h1>
        {subtitle && (
          <p className="truncate text-2xs text-secondary">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="ml-auto flex items-center gap-4">{children}</div>
      )}
    </header>
  );
}
