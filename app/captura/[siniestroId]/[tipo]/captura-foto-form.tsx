"use client";

import { ChangeEvent, useState } from "react";
import { ConfirmacionPaso } from "@/components/confirmacion-paso";
import { createClient } from "@/lib/supabase/client";
import { sha256Hex } from "@/lib/sha256";
import {
  FOTO_TIPOS_MINI_APP,
  TOTAL_FOTOS_CHECKLIST,
} from "@/lib/captura-tipos";
import type { FotoInsert } from "@/types/foto";

interface CapturaFotoFormProps {
  siniestroId: string;
  tipo: string;
  titulo: string;
  instruccion: string;
  fotosCompletadasInicial: number;
}

type UploadStatus =
  | "idle"
  | "geo_denied"
  | "uploading"
  | "success"
  | "error";

async function getGeolocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalización no disponible en este dispositivo"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

export function CapturaFotoForm({
  siniestroId,
  tipo,
  titulo,
  instruccion,
  fotosCompletadasInicial,
}: CapturaFotoFormProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [completadas, setCompletadas] = useState(fotosCompletadasInicial);

  async function uploadWithGeo(file: File) {
    setStatus("uploading");
    setErrorMessage(null);

    try {
      let position: GeolocationPosition;
      try {
        position = await getGeolocation();
      } catch {
        setPendingFile(file);
        setStatus("geo_denied");
        return;
      }

      const capturedAt = new Date().toISOString();
      const hash = await sha256Hex(file);
      const timestamp = Date.now();
      const storagePath = `${siniestroId}/${tipo}-${timestamp}.jpg`;

      const supabase = createClient();

      const { error: uploadError } = await supabase.storage
        .from("siniestros-fotos")
        .upload(storagePath, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const foto: FotoInsert = {
        siniestro_id: siniestroId,
        tipo,
        storage_path: storagePath,
        hash,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        captured_at: capturedAt,
        fuente: "mini_app",
      };

      const { error: insertError } = await supabase.from("fotos").insert(foto);

      if (insertError) {
        // Reintento sin hash si la columna aún no existe en el proyecto remoto
        if (insertError.message.toLowerCase().includes("hash")) {
          const sinHash = {
            siniestro_id: foto.siniestro_id,
            tipo: foto.tipo,
            storage_path: foto.storage_path,
            lat: foto.lat,
            lng: foto.lng,
            captured_at: foto.captured_at,
            fuente: foto.fuente,
          };
          const { error: retryError } = await supabase
            .from("fotos")
            .insert(sinHash);
          if (retryError) throw new Error(retryError.message);
        } else {
          throw new Error(insertError.message);
        }
      }

      const { data: fotos } = await supabase
        .from("fotos")
        .select("tipo")
        .eq("siniestro_id", siniestroId)
        .in("tipo", [...FOTO_TIPOS_MINI_APP]);

      const tiposUnicos = new Set((fotos ?? []).map((row) => row.tipo));
      setCompletadas(Math.min(tiposUnicos.size, TOTAL_FOTOS_CHECKLIST));
      setPendingFile(null);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Error al subir la foto"
      );
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await uploadWithGeo(file);
  }

  async function handleRetryGeo() {
    if (!pendingFile) {
      setStatus("idle");
      return;
    }
    await uploadWithGeo(pendingFile);
  }

  if (status === "success") {
    return <ConfirmacionPaso />;
  }

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
          onClick={handleRetryGeo}
          className="w-full rounded-xl bg-emerald-600 px-4 py-4 text-lg font-semibold text-white active:bg-emerald-700"
        >
          Reintentar con ubicación
        </button>
        <button
          type="button"
          onClick={() => {
            setPendingFile(null);
            setStatus("idle");
          }}
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
        Ya completaste {completadas} de {TOTAL_FOTOS_CHECKLIST}
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
          {status === "uploading" ? "Subiendo foto…" : "Tocá para sacar la foto"}
        </span>
        <span className="mt-2 text-center text-sm text-gray-500">
          Se abre la cámara trasera. No uses fotos de la galería.
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
        <p className="text-center text-base text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
