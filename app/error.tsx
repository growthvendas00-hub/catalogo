"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="grid min-h-screen place-items-center px-6 text-center"><div><p className="eyebrow mb-4">Algo saiu do lugar</p><h1 className="text-3xl font-medium">Não foi possível abrir o catálogo.</h1><p className="mx-auto mt-3 max-w-md text-sm text-[var(--muted)]">Verifique sua conexão e tente novamente.</p><button className="button-primary mt-8" onClick={reset}>Tentar novamente</button></div></main>;
}
