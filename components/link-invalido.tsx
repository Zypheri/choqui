export function LinkInvalido() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-100 px-5">
      <div className="w-full max-w-md rounded-2xl bg-white px-6 py-10 text-center shadow-sm">
        <p className="text-2xl font-semibold text-gray-900">
          Este link no es válido o ya venció
        </p>
        <p className="mt-3 text-base text-gray-600">
          Volvé a WhatsApp y pedí un link nuevo si lo necesitás.
        </p>
      </div>
    </main>
  );
}
