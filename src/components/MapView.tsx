import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AlertTriangle, MapPinned } from "lucide-react";
import { getMappableLocations } from "@/features/itinerary/map-utils";
import type { ItineraryLocation } from "@/features/itinerary/types";

interface MapViewProps {
  locations: ItineraryLocation[];
  activeLocationIndex: number | null;
  onMarkerSelect: (index: number) => void;
}

const SANTA_CATARINA_CENTER: L.LatLngExpression = [-27.3, -50.2];

const createPopupContent = (position: number, location: ItineraryLocation) => {
  const container = document.createElement("div");
  container.className = "map-popup";

  const title = document.createElement("strong");
  title.textContent = `${position}. ${location.name}`;
  const description = document.createElement("p");
  description.textContent = location.description;

  container.append(title, description);
  return container;
};

const createNumberedIcon = (position: number) =>
  L.divIcon({
    className: "explorasc-marker-shell",
    html: `<span class="explorasc-marker" aria-hidden="true"><span>${position}</span></span>`,
    iconAnchor: [22, 48],
    iconSize: [44, 48],
    popupAnchor: [0, -42],
  });

export const MapView = ({ locations, activeLocationIndex, onMarkerSelect }: MapViewProps) => {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef(new Map<number, L.Marker>());
  const onMarkerSelectRef = useRef(onMarkerSelect);
  const tileErrorCountRef = useRef(0);
  const [hasTileError, setHasTileError] = useState(false);
  const mappableLocations = useMemo(() => getMappableLocations(locations), [locations]);
  const missingCoordinatesCount = locations.length - mappableLocations.length;

  useEffect(() => {
    onMarkerSelectRef.current = onMarkerSelect;
  }, [onMarkerSelect]);

  useEffect(() => {
    const mapElement = mapElementRef.current;
    if (!mapElement) return;
    const markers = markersRef.current;

    const map = L.map(mapElement, {
      attributionControl: true,
      keyboard: true,
      scrollWheelZoom: false,
      zoomControl: true,
    }).setView(SANTA_CATARINA_CENTER, 7);
    const markerLayer = L.layerGroup().addTo(map);
    const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const handleTileError = () => {
      tileErrorCountRef.current += 1;
      if (tileErrorCountRef.current >= 3) setHasTileError(true);
    };
    tileLayer.on("tileerror", handleTileError);

    mapRef.current = map;
    markerLayerRef.current = markerLayer;

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => map.invalidateSize({ pan: false }));
    resizeObserver?.observe(mapElement);

    return () => {
      resizeObserver?.disconnect();
      tileLayer.off("tileerror", handleTileError);
      markers.clear();
      markerLayerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();
    markersRef.current.clear();

    const coordinates: L.LatLngExpression[] = [];
    mappableLocations.forEach(({ coordinates: locationCoordinates, index, location }) => {
      const marker = L.marker(locationCoordinates, {
        icon: createNumberedIcon(index + 1),
        keyboard: true,
        title: `${index + 1}. ${location.name}`,
      })
        .bindPopup(createPopupContent(index + 1, location), { maxWidth: 300 })
        .on("click", () => onMarkerSelectRef.current(index))
        .addTo(markerLayer);

      markersRef.current.set(index, marker);
      coordinates.push(locationCoordinates);
    });

    if (coordinates.length > 1) {
      L.polyline(coordinates, {
        className: "itinerary-sequence-line",
        color: "#147d78",
        dashArray: "7 9",
        interactive: false,
        opacity: 0.72,
        weight: 3,
      }).addTo(markerLayer);
    }

    const animationFrame = requestAnimationFrame(() => {
      map.invalidateSize({ pan: false });

      if (coordinates.length === 1) {
        map.setView(coordinates[0], 14, { animate: false });
      } else if (coordinates.length > 1) {
        map.fitBounds(L.latLngBounds(coordinates), {
          animate: false,
          maxZoom: 14,
          padding: [36, 36],
        });
      } else {
        map.setView(SANTA_CATARINA_CENTER, 7, { animate: false });
      }
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [mappableLocations]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker, index) => {
      marker.getElement()?.classList.toggle("is-active", index === activeLocationIndex);
    });

    if (activeLocationIndex === null) {
      map.closePopup();
      return;
    }

    const activeMarker = markersRef.current.get(activeLocationIndex);
    if (activeMarker) {
      activeMarker.openPopup();
      map.panTo(activeMarker.getLatLng(), { animate: true, duration: 0.35 });
    }
  }, [activeLocationIndex, mappableLocations]);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-md" aria-labelledby="map-title">
      <div className="border-b border-border px-4 py-4 sm:flex sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 id="map-title" className="flex items-center gap-2 text-lg font-bold">
            <MapPinned className="h-5 w-5 text-primary" aria-hidden="true" /> Mapa do roteiro
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Os números seguem a ordem dos locais; a linha indica sequência, não trajeto viário.</p>
        </div>
        <p className="mt-2 text-sm font-medium text-primary sm:mt-0">{mappableLocations.length} de {locations.length} no mapa</p>
      </div>

      <div ref={mapElementRef} className="h-[380px] w-full sm:h-[480px] lg:h-[560px]" role="region" aria-label="Mapa interativo com os locais do roteiro" tabIndex={0} />

      {mappableLocations.length === 0 && (
        <div className="pointer-events-none absolute inset-x-4 top-1/2 z-[500] -translate-y-1/2 rounded-xl border border-border bg-card/95 p-5 text-center shadow-lg backdrop-blur-sm">
          <MapPinned className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 font-semibold">Nenhum local possui coordenadas válidas.</p>
          <p className="mt-1 text-sm text-muted-foreground">O roteiro continua disponível nos cartões acima.</p>
        </div>
      )}

      {(missingCoordinatesCount > 0 || hasTileError) && (
        <div className="flex items-start gap-2 border-t border-border bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {hasTileError
              ? "O mapa base não carregou por completo. Verifique sua conexão e tente recarregar a página."
              : `${missingCoordinatesCount} ${missingCoordinatesCount === 1 ? "local não aparece" : "locais não aparecem"} no mapa por falta de coordenadas válidas.`}
          </span>
        </div>
      )}
    </section>
  );
};
