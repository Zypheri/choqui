"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { ConfirmacionPaso } from "@/components/confirmacion-paso";
import { createClient } from "@/lib/supabase/client";
import "leaflet/dist/leaflet.css";

interface UbicacionMapaProps {
  siniestroId: string;
}

type Status = "locating" | "ready" | "saving" | "success" | "error";

interface LatLng {
  lat: number;
  lng: number;
}

const DEFAULT_CENTER: LatLng = { lat: -34.6037, lng: -58.3816 };

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function DraggableMarker({
  position,
  onChange,
}: {
  position: LatLng;
  onChange: (next: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return (
    <Marker
      position={[position.lat, position.lng]}
      draggable
      icon={markerIcon}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target as L.Marker;
          const ll = marker.getLatLng();
          onChange({ lat: ll.lat, lng: ll.lng });
        },
      }}
    />
  );
}

export function UbicacionMapa({ siniestroId }: UbicacionMapaProps) {
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<Status>("locating");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [geoDenied, setGeoDenied] = useState(false);

  const applyCenter = useCallback((next: LatLng, denied: boolean) => {
    setCoords(next);
    setMapCenter(next);
    setGeoDenied(denied);
    setStatus("ready");
  }, []);

  const requestLocation = useCallback(() => {
    setStatus("locating");
    setGeoDenied(false);
    setErrorMessage(null);
    setMapCenter(null);
    setCoords(null);

    if (!navigator.geolocation) {
      applyCenter(DEFAULT_CENTER, false);
      setErrorMessage(
        "No hay geolocalización en este dispositivo. Ajustá el pin a mano."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyCenter(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          false
        );
      },
      () => {
        applyCenter(DEFAULT_CENTER, true);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, [applyCenter]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

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
    return <ConfirmacionPaso />;
  }

  if (status === "locating" || !coords || !mapCenter) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-lg text-gray-700">Buscando tu ubicación…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold leading-tight text-gray-900">
          ¿Dónde ocurrió el accidente?
        </h1>
        <p className="mt-2 text-lg leading-relaxed text-gray-600">
          Arrastrá el pin hasta el punto exacto del choque.
        </p>
      </div>

      {geoDenied && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-base text-amber-900">
          No pudimos obtener tu ubicación. Ajustá el pin a mano o{" "}
          <button
            type="button"
            onClick={requestLocation}
            className="font-semibold underline"
          >
            reintentá el permiso
          </button>
          .
        </div>
      )}

      <div className="h-72 w-full overflow-hidden rounded-2xl border border-gray-200">
        <MapContainer
          center={[mapCenter.lat, mapCenter.lng]}
          zoom={16}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <DraggableMarker position={coords} onChange={setCoords} />
        </MapContainer>
      </div>

      <p className="text-center text-sm text-gray-500">
        {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
      </p>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={status === "saving"}
        className="w-full rounded-xl bg-emerald-600 px-4 py-4 text-lg font-semibold text-white disabled:opacity-50 active:bg-emerald-700"
      >
        {status === "saving" ? "Guardando…" : "Confirmar esta ubicación"}
      </button>

      {status === "error" && errorMessage && (
        <p className="text-center text-base text-red-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
