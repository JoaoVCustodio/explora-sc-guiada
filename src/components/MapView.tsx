import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Local {
  nome: string;
  descricao: string;
  latitude: number;
  longitude: number;
}

interface MapViewProps {
  locais: Local[];
}

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export const MapView = ({ locais }: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || locais.length === 0) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView(
        [locais[0].latitude, locais[0].longitude],
        10
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Clear existing markers and polylines
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // Add markers
    const latLngs: L.LatLngExpression[] = [];
    locais.forEach((local, index) => {
      const marker = L.marker([local.latitude, local.longitude])
        .addTo(map)
        .bindPopup(`<strong>${index + 1}. ${local.nome}</strong><br/>${local.descricao}`);
      
      latLngs.push([local.latitude, local.longitude]);
    });

    // Draw route
    if (latLngs.length > 1) {
      L.polyline(latLngs, {
        color: "hsl(200, 80%, 45%)",
        weight: 3,
        opacity: 0.7,
        dashArray: "10, 10",
      }).addTo(map);
    }

    // Fit bounds to show all markers
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [locais]);

  return (
    <div className="w-full h-[600px] rounded-2xl overflow-hidden shadow-xl animate-fade-in border border-border/50 hover:shadow-2xl transition-smooth">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};
