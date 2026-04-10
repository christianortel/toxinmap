type EmptyStateProps = {
  title: string;
  body: string;
};

export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <div className="surface-panel-soft p-8 text-center">
      <p className="eyebrow mb-3">Empty state</p>
      <h3 className="font-serif text-3xl tracking-[-0.05em] text-white">{title}</h3>
      <p className="mx-auto mt-4 max-w-xl body-sm">{body}</p>
    </div>
  );
}
