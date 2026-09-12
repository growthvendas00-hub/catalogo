export default function Loading() {
  return <main className="min-h-screen animate-pulse bg-[#f4f1e9] p-[var(--page-gutter)]"><div className="h-20 border-b fine-rule" /><div className="my-12 h-32 w-2/3 bg-black/5" /><div className="catalog-grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="catalog-cell aspect-[4/5] bg-black/5" />)}</div></main>;
}
