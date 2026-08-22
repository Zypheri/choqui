"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import "leaflet/dist/leaflet.css";

interface UbicacionMapaProps {
  siniestroId: string;
}

type Status = "loading" | "ready" | "saving" | "success" | "error";

export function UbicacionMapa({ siniestroId }: UbicacionMapaProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const L = (await import("leaflet")).default;

        const defaultCenter = { lat: -32.9442, lng: -60.6505 };

        const position = await new Promise<GeolocationPosition | null>(
          (resolve) => {
            if (!navigator.geolocation) {
              resolve(null);
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve(pos),
              () => resolve(null),
              { enableHighAccuracy: true, timeout: 8000 }
            );
          }
        );

        if (cancelled || !mapRef.current) return;

        const center = position
          ? { lat: position.coords.latitude, lng: position.coords.longitude }
          : defaultCenter;

        const map = L.map(mapRef.current).setView([center.lat, center.lng], 16);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
          maxZoom: 19,
        }).addTo(map);

        const icon = L.icon({
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          iconRetinaUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          shadowUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        });

        const marker = L.marker([center.lat, center.lng], {
          draggable: true,
          icon,
        }).addTo(map);

        marker.on("dragend", () => {
          const ll = marker.getLatLng();
          setCoords({ lat: ll.lat, lng: ll.lng });
        });

        map.on("click", (e) => {
          marker.setLatLng(e.latlng);
          setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
        setCoords(center);
        setStatus("ready");
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(
            err instanceof Error ? err.message : "No se pudo cargar el mapa"
          );
        }
      }
    }

    void init();

    return () => {
      cancelled = true;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  async function handleConfirm() {
    if (!coords) return;
    setStatus("saving");
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("siniestros")
        .update({
          ubicacion_reportada_lat: coords.lat,
          ubicacion_reportada_lng: coords.lng,
          ubicacion_reportada_at: new Date().toISOString(),
        })
        .eq("id", siniestroId);

      if (error) throw new Error(error.message);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "No se pudo guardar la ubicación"
      );
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-md bg-green-50 p-4 text-center">
        <p className="font-medium text-green-800">Ubicación guardada</p>
        <p className="mt-1 text-sm text-green-600">
          Ya podés volver a WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        ref={mapRef}
        className="h-72 w-full overflow-hidden rounded-lg border border-gray-200"
      />
      {coords && (
        <p className="text-center text-xs text-gray-500">
          {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} — tocá el mapa o
          arrastrá el pin
        </p>
      )}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={!coords || status === "loading" || status === "saving"}
        className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {status === "saving" ? "Guardando…" : "Confirmar ubicación"}
      </button>
      {status === "error" && errorMessage && (
        <p className="text-center text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
