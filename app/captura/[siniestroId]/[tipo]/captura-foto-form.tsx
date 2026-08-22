"use client";

import { ChangeEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FotoInsert } from "@/types/foto";

interface CapturaFotoFormProps {
  siniestroId: string;
  tipo: string;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export function CapturaFotoForm({ siniestroId, tipo }: CapturaFotoFormProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setErrorMessage(null);

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Geolocalización no disponible en este dispositivo"));
            return;
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        }
      );

      const capturedAt = new Date().toISOString();
      const fileExt = file.name.split(".").pop() || "jpg";
      const storagePath = `${siniestroId}/${tipo}/${Date.now()}.${fileExt}`;

      const supabase = createClient();

      const { error: uploadError } = await supabase.storage
        .from("siniestros-fotos")
        .upload(storagePath, file, { contentType: file.type });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const foto: FotoInsert = {
        siniestro_id: siniestroId,
        tipo,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        captured_at: capturedAt,
        fuente: "mini_app",
        storage_path: storagePath,
      };

      const { error: insertError } = await supabase.from("fotos").insert(foto);

      if (insertError) {
        throw new Error(insertError.message);
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Error al subir la foto"
      );
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-md bg-green-50 p-4 text-center">
        <p className="font-medium text-green-800">Foto subida correctamente</p>
        <p className="mt-1 text-sm text-green-600">
          Ya podés volver a WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 hover:border-blue-400 hover:bg-blue-50">
        <span className="mb-2 text-4xl">📷</span>
        <span className="text-sm font-medium text-gray-700">
          {status === "uploading" ? "Subiendo foto…" : "Tocá para sacar foto"}
        </span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={status === "uploading"}
          onChange={handleFileChange}
        />
      </label>

      {status === "error" && errorMessage && (
        <p className="text-center text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
