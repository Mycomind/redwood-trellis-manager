type EmptyStateProps = {
  title: string;
  message: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-barkSoft/35 bg-linen p-6 text-center">
      <div className="text-xl font-bold text-bark">{title}</div>
      <div className="mt-2 text-base text-barkSoft">{message}</div>
    </div>
  );
}
