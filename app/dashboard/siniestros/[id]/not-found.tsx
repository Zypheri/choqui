import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-xl border border-border bg-bg-surface px-6 py-16 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-text-primary">
        Siniestro no encontrado
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        El siniestro que buscás no existe o no tenés acceso.
      </p>
      <Link
        href="/dashboard/siniestros"
        className="mt-6 inline-block text-sm font-medium text-accent hover:text-accent-hover"
      >
        Volver al listado
      </Link>
    </div>
  );
}
