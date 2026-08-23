"use client";

import { ChangeEvent } from "react";
import type { CapturaFotoStatus } from "@/hooks/use-captura-foto";

interface CapturaFotoStepProps {
  titulo: string;
  instruccion: string;
  progressLabel: string;
  status: CapturaFotoStatus;
  errorMessage: string | null;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRetryGeo: () => void;
  onCancelGeo: () => void;
}

export function CapturaFotoStep({
  titulo,
  instruccion,
  progressLabel,
  status,
  errorMessage,
  onFileChange,
  onRetryGeo,
  onCancelGeo,
}: CapturaFotoStepProps) {
  if (status === "geo_denied") {
    return (
      <div className="space-y-5">
        <p className="text-lg leading-relaxed text-gray-800">
          Necesitamos tu ubicación para verificar que la foto se tomó en el
          lugar del accidente. Activá el permiso de ubicación e intentá de
          nuevo.
        </p>
        <button
          type="button"
          onClick={onRetryGeo}
          className="w-full rounded-xl bg-emerald-600 px-4 py-4 text-lg font-semibold text-white active:bg-emerald-700"
        >
          Reintentar con ubicación
        </button>
        <button
          type="button"
          onClick={onCancelGeo}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-4 text-lg font-medium text-gray-800"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-center text-base font-medium text-emerald-800">
        {progressLabel}
      </p>

      <div>
        <h1 className="text-2xl font-bold leading-tight text-gray-900">
          {titulo}
        </h1>
        <p className="mt-2 text-lg leading-relaxed text-gray-600">
          {instruccion}
        </p>
      </div>

      <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white px-6 py-10 active:border-emerald-500 active:bg-emerald-50">
        <span className="text-lg font-semibold text-gray-800">
          {status === "uploading"
            ? "Subiendo foto…"
            : "Tocá para elegir o sacar una foto"}
        </span>
        <span className="mt-2 text-center text-sm text-gray-500">
          Podés usar la cámara o elegir una de la galería.
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={status === "uploading"}
          onChange={onFileChange}
        />
      </label>

      {status === "error" && errorMessage && (
        <p className="text-center text-base text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
