import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import type { GeoJSONSource, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
import { Compass, Expand, LocateFixed, Minus, Plus, Route, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DayRouteLinks } from "@/components/DayRouteLinks";
import { googleMapsAttractionUrl, wazeAttractionUrl } from "@/features/itinerary/navigation-urls";
import { geolocationPermissionState, locationErrorMessage, watchUserPosition } from "@/features/itinerary/user-location";
import type { ItineraryDay } from "@/features/itinerary/types";
import { formatDistance, formatTravelTime, pathTotals, isCoordinate, ESTIMATED_SPEED_KMH } from "@/features/routes/model";

import { useRoadRoutes } from "@/features/routes/useRoadRoutes";

// MapLibre 6 requires a bundled worker URL; ?url alone loses its sibling imports.
maplibregl.setWorkerUrl(mapLibreWorkerUrl);

interface MapViewProps {
  days: ItineraryDay[];
  activeLocationIndex: number | null;
  selectionRevision: number;
  onMarkerSelect: (index: number) => void;
}
const blankStyle: StyleSpecification = { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#e7efec" } }] };
const motionDuration = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650;

export const MapView = ({ days, activeLocationIndex, selectionRevision, onMarkerSelect }: MapViewProps) => {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<number, maplibregl.Marker>());
  const selectRef = useRef(onMarkerSelect);
  const styleReady = useRef(false);
  const selectedDayRef = useRef<number | null>(null);
  const pendingFocus = useRef<[number, number] | null>(null);
  const userMarker = useRef<maplibregl.Marker | null>(null);
  const stopLocationWatch = useRef<(() => void) | null>(null);
  const locationRequest = useRef(0);
  const firstLocationFix = useRef(true);
  const lastLocation = useRef<[number, number] | null>(null);
  const manualLocationControl = useRef(false);
  const [ready, setReady] = useState(0);
  const [baseError, setBaseError] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [fitRevision, setFitRevision] = useState(0);
  const [locationStatus, setLocationStatus] = useState<"idle" | "locating" | "active">("idle");
  const [locationError, setLocationError] = useState<string | null>(null);
  const paths = useRoadRoutes(days);
  const shownPaths = paths.filter(p => selectedDay === null || p.day === selectedDay);
  const approximate = shownPaths.some(p => !p.road && (p.segmentCount > 0 || p.omittedSegments > 0));
  const loading = shownPaths.some(p => p.loading);
  const points = useMemo(() => days.flatMap((day) => day.locations.map((local) => ({ ...local, day: day.day, index: local.order - 1 }))), [days]);
  const visible = points.filter((p) => selectedDay === null || p.day === selectedDay);
  const selectedRouteDay = days.find((day) => day.day === selectedDay);
  const mappedCount = visible.filter((p) => isCoordinate([p.longitude, p.latitude])).length;
  const totals = useMemo(() => pathTotals(paths, selectedDay), [paths, selectedDay]);
  const hasEstimate = totals.segmentCount > 0 || totals.omittedSegments === 0;

  useEffect(() => { selectRef.current = onMarkerSelect; }, [onMarkerSelect]);
  useEffect(() => { selectedDayRef.current = selectedDay; }, [selectedDay]);

  const stopLocation = useCallback(() => {
    locationRequest.current++;
    stopLocationWatch.current?.();
    stopLocationWatch.current = null;
    userMarker.current?.remove();
    userMarker.current = null;
    lastLocation.current = null;
    setLocationStatus("idle");
  }, []);

  const startLocation = useCallback((automatic = false) => {
    if (stopLocationWatch.current || !mapRef.current) return;
    if (!("geolocation" in navigator)) {
      setLocationError("Este navegador não oferece suporte à localização.");
      return;
    }
    setLocationError(null);
    setLocationStatus("locating");
    firstLocationFix.current = true;
    const request = ++locationRequest.current;
    try {
      stopLocationWatch.current = watchUserPosition(navigator.geolocation,
        ({ coords }) => {
          if (locationRequest.current !== request) return;
          const coordinate: [number, number] = [coords.longitude, coords.latitude];
          const map = mapRef.current;
          if (!map) return;
          if (!isCoordinate(coordinate)) {
            stopLocation();
            setLocationError("Sua localização está indisponível no momento. Tente novamente.");
            return;
          }
          if (!userMarker.current) {
            const element = document.createElement("div");
            element.className = "user-location-marker";
            element.setAttribute("role", "img");
            element.setAttribute("aria-label", "Você está aqui");
            const dot = document.createElement("span");
            dot.className = "user-location-dot";
            dot.setAttribute("aria-hidden", "true");
            const label = document.createElement("span");
            label.className = "user-location-label";
            label.textContent = "Você está aqui";
            element.append(dot, label);
            userMarker.current = new maplibregl.Marker({ element, anchor: "center" }).setLngLat(coordinate).addTo(map);
          } else userMarker.current.setLngLat(coordinate);
          lastLocation.current = coordinate;
          setLocationStatus("active");
          if (firstLocationFix.current) {
            map.flyTo({ center: coordinate, zoom: 14, duration: motionDuration() });
            firstLocationFix.current = false;
          }
        },
        (error) => {
          if (locationRequest.current !== request) return;
          if (automatic && error.code === 1) {
            void geolocationPermissionState(navigator.permissions).then((state) => {
              if (locationRequest.current !== request) return;
              stopLocation();
              setLocationError(state === "prompt"
                ? "Toque em Minha localização para permitir o acesso neste navegador."
                : locationErrorMessage(error));
            });
            return;
          }
          stopLocation();
          setLocationError(locationErrorMessage(error));
        },
      );
    } catch {
      stopLocation();
      setLocationError("Não foi possível iniciar a localização. Tente novamente.");
    }
  }, [stopLocation]);

  const handleLocationButton = () => {
    manualLocationControl.current = true;
    if (locationStatus === "active" && lastLocation.current) {
      mapRef.current?.flyTo({ center: lastLocation.current, zoom: 14, duration: motionDuration() });
    } else if (locationStatus === "locating") stopLocation();
    else startLocation();
  };

  useEffect(() => {
    if (!container.current) return;
    const requestRef = locationRequest;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({ container: container.current, style: blankStyle, center: [-50.2, -27.3], zoom: 6.5, attributionControl: false, cooperativeGestures: true });
    } catch { setWebglError(true); return; }
    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: false }), "bottom-right");
    map.on("style.load", () => { styleReady.current = true; setReady((value) => value + 1); });
    map.on("error", () => setBaseError(true));
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 12_000);
    const mapKey = import.meta.env.VITE_MAPTILER_KEY?.trim();
    if (mapKey) {
      void fetch(`https://api.maptiler.com/maps/streets-v4/style.json?key=${encodeURIComponent(mapKey)}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("Map unavailable");
          const style = await response.json() as StyleSpecification;
          if (!controller.signal.aborted) { styleReady.current = false; map.setStyle(style); }
        }).catch(() => { if (mapRef.current === map) setBaseError(true); })
        .finally(() => window.clearTimeout(timer));
    } else { setBaseError(true); window.clearTimeout(timer); }
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container.current);
    return () => {
      requestRef.current++;
      stopLocationWatch.current?.();
      stopLocationWatch.current = null;
      userMarker.current?.remove();
      userMarker.current = null;
      window.clearTimeout(timer);
      controller.abort();
      observer.disconnect();
      mapRef.current = null;
      styleReady.current = false;
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !("geolocation" in navigator)) return;
    let cancelled = false;
    void geolocationPermissionState(navigator.permissions).then((state) => {
      if (cancelled || manualLocationControl.current || !mapRef.current) return;
      if (state === "granted" || state === "prompt") startLocation(true);
      else if (state === "denied") setLocationError("Permissão de localização negada. Ative-a nas configurações do navegador para tentar novamente.");
    });
    return () => { cancelled = true; };
  }, [startLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const collection = markers.current;
    for (const marker of collection.values()) marker.remove();
    collection.clear();
    for (const point of points) {
      const coordinate = [point.longitude, point.latitude];
      if (!isCoordinate(coordinate)) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "route-marker";
      button.textContent = String(point.order);
      button.setAttribute("aria-label", `${point.order}. ${point.name}, Dia ${point.day}`);
      button.addEventListener("click", (event) => {
        // Use the same selection effect as "Ver no mapa". Bubbling to MapLibre
        // would also toggle/close this popup during the very same click.
        event.stopPropagation();
        selectRef.current(point.index);
      });
      const content = document.createElement("div");
      content.className = "route-popup";
      const eyebrow = document.createElement("span");
      eyebrow.textContent = `DIA ${point.day} · ${point.period === "manha" ? "MANHÃ" : point.period.toLocaleUpperCase("pt-BR")}`;
      const title = document.createElement("strong");
      title.textContent = `${point.order}. ${point.name}`;
      const duration = document.createElement("p");
      duration.textContent = `${point.estimatedDuration} na atração`;
      content.append(eyebrow, title, duration);
      const navigation = document.createElement("details");
      navigation.className = "route-popup-navigation";
      const summary = document.createElement("summary");
      summary.textContent = "Navegar até aqui";
      const links = document.createElement("div");
      for (const [label, url] of [["Google Maps", googleMapsAttractionUrl(point)], ["Waze", wazeAttractionUrl(point)]]) {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = label;
        link.setAttribute("aria-label", `Navegar até ${point.name} com ${label} (nova aba)`);
        links.append(link);
      }
      navigation.append(summary, links);
      content.append(navigation);
      const marker = new maplibregl.Marker({ element: button, anchor: "bottom" }).setLngLat(coordinate)
        .setPopup(new maplibregl.Popup({ offset: 48, maxWidth: "240px", closeButton: false, focusAfterOpen: false }).setDOMContent(content)).addTo(map);
      collection.set(point.index, marker);
    }
    return () => { for (const marker of collection.values()) marker.remove(); collection.clear(); };
  }, [points]);

  // A new card selection reveals its day; choosing a day filter alone never selects a point.
  useEffect(() => {
    if (!selectionRevision) return;
    const point = points.find((p) => p.index === activeLocationIndex);
    if (!point) return;
    const coordinate = [point.longitude, point.latitude];
    if (selectedDayRef.current !== null && selectedDayRef.current !== point.day) {
      pendingFocus.current = isCoordinate(coordinate) ? coordinate : null;
      setSelectedDay(point.day);
    } else if (isCoordinate(coordinate)) mapRef.current?.flyTo({ center: coordinate, zoom: 13.5, duration: motionDuration() });
  }, [activeLocationIndex, selectionRevision, points]);

  useEffect(() => {
    for (const point of points) {
      const marker = markers.current.get(point.index);
      if (!marker) continue;
      const shown = selectedDay === null || point.day === selectedDay;
      const active = shown && point.index === activeLocationIndex;
      const element = marker.getElement();
      element.style.display = shown ? "" : "none";
      element.classList.toggle("is-selected", active);
      element.style.zIndex = active ? "2" : "1";
      element.setAttribute("aria-pressed", String(active));
      const popup = marker.getPopup();
      if (active && selectionRevision > 0 && !popup.isOpen()) marker.togglePopup();
      else if (!active && popup.isOpen()) popup.remove();
    }
  }, [selectedDay, activeLocationIndex, points, selectionRevision]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !styleReady.current) return;
    const data: GeoJSON.FeatureCollection<GeoJSON.MultiLineString> = {
      type: "FeatureCollection", features: paths.flatMap((day) => day.geometry ? [{ type: "Feature" as const, properties: { day: day.day, road: day.road }, geometry: day.geometry }] : []),
    };
    const source = map.getSource("itinerary-routes") as GeoJSONSource | undefined;
    if (source) source.setData(data);
    else {
      map.addSource("itinerary-routes", { type: "geojson", data });
      map.addLayer({ id: "route-outline", type: "line", source: "itinerary-routes", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": 9, "line-opacity": 0.9 } });
      map.addLayer({ id: "route-line", type: "line", source: "itinerary-routes", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#147d78", "line-width": 4 } });
      map.addLayer({ id: "route-approximate", type: "line", source: "itinerary-routes", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#147d78", "line-width": 4, "line-dasharray": [2, 2] } });
    }
    const activeDay = selectedDay ?? points.find((point) => point.index === activeLocationIndex)?.day ?? -1;
    map.setFilter("route-outline", selectedDay === null ? null : ["==", ["get", "day"], selectedDay]);
    for (const [layer, road] of [["route-line", true], ["route-approximate", false]] as const) {
      map.setFilter(layer, ["all", ["==", ["get", "road"], road], selectedDay === null ? true : ["==", ["get", "day"], selectedDay]]);
      map.setPaintProperty(layer, "line-opacity", ["case", ["==", ["get", "day"], activeDay], 1, 0.65]);
    }
    map.setPaintProperty("route-line", "line-opacity", ["case", ["==", ["get", "day"], activeDay], 1, 0.65]);
    map.setPaintProperty("route-outline", "line-opacity", 0.7);
  }, [paths, selectedDay, ready, points, activeLocationIndex]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pendingFocus.current) {
      map.flyTo({ center: pendingFocus.current, zoom: 13.5, duration: motionDuration() });
      pendingFocus.current = null;
      return;
    }
    const coordinates = points.filter((p) => selectedDay === null || p.day === selectedDay).map((p) => [p.longitude, p.latitude]).filter(isCoordinate);
    if (coordinates.length) {
      const bounds = new maplibregl.LngLatBounds();
      coordinates.forEach((point) => bounds.extend(point));
      map.fitBounds(bounds, { padding: { top: 70, bottom: 60, left: 55, right: 55 }, maxZoom: 13.5, duration: motionDuration() });
    } else map.flyTo({ center: [-50.2, -27.3], zoom: 6.5, duration: motionDuration() });
  }, [selectedDay, points, fitRevision]);

  return (
    <section className="route-map overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-primary/5" aria-labelledby="map-title">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 pb-4 pt-6 sm:px-7">
        <div><p className="eyebrow">Explore o caminho</p><h2 id="map-title" className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight"><Compass className="h-6 w-6 text-primary" aria-hidden="true" /> Sua viagem no mapa</h2></div>
        <span className="rounded-full border border-primary/15 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">{approximate ? "Inclui trajetos aproximados" : "Trajetos viários"} · ordem do roteiro</span>
      </div>
      <div className="flex max-w-full gap-2 overflow-x-auto px-5 pb-5 sm:px-7" role="group" aria-label="Filtrar mapa por dia">
        {[null, ...days.map((day) => day.day)].map((day) => <Button key={day ?? "all"} type="button" variant={selectedDay === day ? "default" : "outline"} className="min-h-11 shrink-0 rounded-full px-5" aria-pressed={selectedDay === day} onClick={() => { setSelectedDay(day); setFitRevision((value) => value + 1); }}>{day === null ? "Todos" : `Dia ${day}`}</Button>)}
      </div>
      <div className="relative isolate border-y border-border">
        <div ref={container} className="h-[420px] w-full sm:h-[520px] lg:h-[620px]" role="region" aria-label="Mapa interativo do roteiro" />
        {selectedRouteDay && <div className="absolute left-3 top-3 z-10 max-w-[calc(100%-5rem)] sm:left-5 sm:top-5"><DayRouteLinks day={selectedRouteDay} /></div>}
        <div className="absolute right-3 top-3 flex flex-col gap-2 sm:right-5 sm:top-5">
          <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl bg-card shadow-md" aria-label={locationStatus === "active" ? "Recentrar em minha localização" : locationStatus === "locating" ? "Cancelar busca da minha localização" : "Minha localização"} aria-pressed={locationStatus !== "idle"} title={locationStatus === "active" ? "Recentrar em minha localização" : "Minha localização"} onClick={handleLocationButton} disabled={webglError}><LocateFixed className="h-4 w-4" aria-hidden="true" /></Button>
          {locationStatus === "active" && <Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl bg-card shadow-md" aria-label="Desativar minha localização" title="Desativar minha localização" onClick={() => { manualLocationControl.current = true; stopLocation(); }}><X className="h-4 w-4" aria-hidden="true" /></Button>}
          {[{ label: "Aproximar", icon: Plus, action: () => mapRef.current?.zoomIn({ duration: motionDuration() }) }, { label: "Afastar", icon: Minus, action: () => mapRef.current?.zoomOut({ duration: motionDuration() }) }, { label: "Enquadrar locais", icon: Expand, action: () => setFitRevision((value) => value + 1) }].map(({ label, icon: Icon, action }) => <Button key={label} type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl bg-card shadow-md" aria-label={label} onClick={action} disabled={webglError}><Icon className="h-4 w-4" aria-hidden="true" /></Button>)}
        </div>
        {(webglError || mappedCount === 0) && <div className="pointer-events-none absolute inset-x-5 top-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card/95 p-5 text-center shadow-lg"><p className="font-semibold">{webglError ? "O mapa não está disponível neste dispositivo." : "Sem coordenadas válidas para este dia."}</p><p className="mt-1 text-sm text-muted-foreground">Todos os detalhes continuam nos cards do roteiro.</p></div>}
      </div>
      {(locationStatus !== "idle" || locationError) && <p className="px-5 pt-3 text-sm text-muted-foreground sm:px-7" role={locationError ? "alert" : "status"}>{locationError ?? (locationStatus === "locating" ? "Buscando sua localização…" : "Localização ativa · você está aqui")}</p>}
      <div className="px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div><p className="text-sm font-bold">{selectedDay === null ? `${days.length} dias de viagem` : `Dia ${selectedDay}`}</p><p className="text-sm text-muted-foreground">{visible.length} paradas · {mappedCount} no mapa</p></div>
          <div className="flex items-center gap-3"><Route className="h-5 w-5 text-primary" aria-hidden="true" /><div className="min-w-28 tabular-nums"><p className="text-lg font-bold">{hasEstimate ? formatDistance(totals.distanceMeters, approximate) : "— km"}</p><p className="text-xs text-muted-foreground">{approximate ? "Distância com aproximações" : "Distância viária"}</p></div></div>
          <div className="min-w-32 tabular-nums"><p className="text-lg font-bold">{hasEstimate ? formatTravelTime(totals.durationSeconds, approximate) : "—"}</p><p className="text-xs text-muted-foreground">Deslocamento estimado</p></div>
        </div>
        <div className="mt-4 min-h-12 text-sm text-muted-foreground" role="status">
          {loading ? "Calculando trajetos viários…" : approximate ? `Não foi possível obter todos os trajetos viários. Linhas tracejadas são aproximações a ${ESTIMATED_SPEED_KMH} km/h.` : "Linhas contínuas seguem as vias. Tempo estimado de deslocamento, sem trânsito em tempo real e sem incluir visitas."}
          <span className="block text-xs">Rotas: OSRM · dados © OpenStreetMap. A ordem dos locais é preservada.</span>
        </div>
        {mappedCount < visible.length && <p className="mt-2 text-xs text-muted-foreground">Locais sem coordenadas válidas não aparecem no mapa. Somente os trechos entre pontos consecutivos válidos entram nas linhas e nos totais; não são criados atalhos sobre as lacunas.</p>}
        {baseError && <p className="mt-2 text-xs text-muted-foreground">Mapa base indisponível. Os pontos e trajetos calculados continuam disponíveis sobre um fundo neutro.</p>}
      </div>
    </section>
  );
};
