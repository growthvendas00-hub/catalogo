import Link from "next/link";

export default function ProductNotFound() {
  return <main className="grid min-h-screen place-items-center px-6 text-center"><div><p className="eyebrow mb-4">404</p><h1 className="text-4xl font-medium tracking-[-.04em] uppercase">Esta peça não está disponível.</h1><Link className="button-primary mt-8" href="/">Ver catálogo</Link></div></main>;
}
