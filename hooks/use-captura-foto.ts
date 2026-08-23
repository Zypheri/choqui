"use client";

import { ChangeEvent, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sha256Hex } from "@/lib/sha256";
import type { FotoInsert } from "@/types/foto";

export type CapturaFotoStatus =
  | "idle"
  | "geo_denied"
  | "uploading"
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

interface UseCapturaFotoResult {
  status: CapturaFotoStatus;
  errorMessage: string | null;
  subirFoto: (file: File) => Promise<boolean>;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  retryGeo: () => Promise<boolean>;
  cancelGeo: () => void;
  reset: () => void;
}

export function useCapturaFoto(
  siniestroId: string,
  tipo: string
): UseCapturaFotoResult {
  const [status, setStatus] = useState<CapturaFotoStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
    setPendingFile(null);
  }, []);

  const uploadWithGeo = useCallback(
    async (file: File): Promise<boolean> => {
      setStatus("uploading");
      setErrorMessage(null);

      try {
        let position: GeolocationPosition;
        try {
          position = await getGeolocation();
        } catch {
          setPendingFile(file);
          setStatus("geo_denied");
          return false;
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

        setPendingFile(null);
        setStatus("idle");
        return true;
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Error al subir la foto"
        );
        return false;
      }
    },
    [siniestroId, tipo]
  );

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      await uploadWithGeo(file);
    },
    [uploadWithGeo]
  );

  const retryGeo = useCallback(async (): Promise<boolean> => {
    if (!pendingFile) {
      setStatus("idle");
      return false;
    }
    return uploadWithGeo(pendingFile);
  }, [pendingFile, uploadWithGeo]);

  const cancelGeo = useCallback(() => {
    setPendingFile(null);
    setStatus("idle");
  }, []);

  return {
    status,
    errorMessage,
    subirFoto: uploadWithGeo,
    handleFileChange,
    retryGeo,
    cancelGeo,
    reset,
  };
}
