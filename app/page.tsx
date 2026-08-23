import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-4">
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold text-text-primary">Choqui</h1>
        <p className="mb-8 text-text-muted">
          Sistema de gestión de siniestros viales
        </p>
        <Link
          href="/dashboard"
          className="rounded-xl bg-accent px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Ir al dashboard
        </Link>
      </div>
    </main>
  );
}
