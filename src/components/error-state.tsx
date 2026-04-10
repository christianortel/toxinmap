type ErrorStateProps = {
  title: string;
  body: string;
};

export function ErrorState({ title, body }: ErrorStateProps) {
  return (
    <div className="surface-panel border-[rgba(167,116,78,0.22)] bg-[rgba(47,22,14,0.2)] p-8">
      <p className="eyebrow mb-3 text-[var(--accent-warning)]">Error state</p>
      <h3 className="font-serif text-3xl tracking-[-0.05em] text-white">{title}</h3>
      <p className="mt-4 body-sm">{body}</p>
    </div>
  );
}
