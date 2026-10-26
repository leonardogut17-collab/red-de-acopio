import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { Center } from "@/types";

const BOGOTA: [number, number] = [4.65, -74.1];

/** Pin propio (los íconos por defecto de Leaflet se rompen al empaquetar con Vite) */
const pin = (variant: "normal" | "urgent" | "selected" | "picker") =>
  L.divIcon({
    className: "",
    html: `<span class="map-pin map-pin--${variant}"><span></span></span>`,
    iconSize: [30, 40],
    iconAnchor: [15, 38],
    popupAnchor: [0, -34],
  });

const ICONS = {
  normal: pin("normal"),
  urgent: pin("urgent"),
  selected: pin("selected"),
  picker: pin("picker"),
};

function FitBounds({ centers }: { centers: Center[] }) {
  const map = useMap();
  useEffect(() => {
    if (centers.length === 0) return;
    if (centers.length === 1) {
      map.setView([centers[0].latitude, centers[0].longitude], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(centers.map((c) => [c.latitude, c.longitude])), { padding: [48, 48], maxZoom: 14 });
  }, [centers, map]);
  return null;
}

function FlyTo({ center }: { center?: Center | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo([center.latitude, center.longitude], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [center, map]);
  return null;
}

interface CentersMapProps {
  centers: Center[];
  selectedId?: number | null;
  onSelect?: (c: Center) => void;
  renderPopup?: (c: Center) => React.ReactNode;
  className?: string;
}

export function CentersMap({ centers, selectedId, onSelect, renderPopup, className }: CentersMapProps) {
  const selected = centers.find((c) => c.id === selectedId) ?? null;
  return (
    <MapContainer center={BOGOTA} zoom={11} className={className ?? "leaflet-box"} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds centers={centers} />
      <FlyTo center={selected} />
      {centers.map((c) => (
        <Marker
          key={c.id}
          position={[c.latitude, c.longitude]}
          icon={c.id === selectedId ? ICONS.selected : c.urgent_needs > 0 ? ICONS.urgent : ICONS.normal}
          eventHandlers={{ click: () => onSelect?.(c) }}
        >
          {renderPopup && <Popup>{renderPopup(c)}</Popup>}
        </Marker>
      ))}
    </MapContainer>
  );
}

function ClickToPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Mapa pequeño para elegir la ubicación de un centro haciendo clic */
export function LocationPicker({
  value, onChange,
}: { value: { lat: number; lng: number } | null; onChange: (lat: number, lng: number) => void }) {
  return (
    <MapContainer center={value ? [value.lat, value.lng] : BOGOTA} zoom={value ? 15 : 11} className="leaflet-picker">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickToPick onPick={(lat, lng) => onChange(Number(lat.toFixed(6)), Number(lng.toFixed(6)))} />
      {value && <Marker position={[value.lat, value.lng]} icon={ICONS.picker} />}
    </MapContainer>
  );
}
