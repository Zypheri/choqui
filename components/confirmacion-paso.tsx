export function ConfirmacionPaso() {
  return (
    <div className="flex flex-col items-center px-2 py-10 text-center">
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700"
        aria-hidden
      >
        ✓
      </div>
      <p className="text-xl font-semibold leading-snug text-gray-900">
        Listo, ya podés volver a WhatsApp para seguir
      </p>
    </div>
  );
}
