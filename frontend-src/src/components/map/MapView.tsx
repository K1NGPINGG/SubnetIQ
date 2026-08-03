import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useThemeStore } from "@/shared/lib/theme-store";
import { useMapData } from "@/hooks/api";
import type { MapLocation } from "@/types/api";

const darkTileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const lightTileUrl = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createPulseIcon(dark: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 16px; height: 16px;
      background: ${dark ? "#3b82f6" : "#2563eb"};
      border: 2px solid ${dark ? "#60a5fa" : "#3b82f6"};
      border-radius: 50%;
      box-shadow: 0 0 10px ${dark ? "rgba(59,130,246,0.7)" : "rgba(37,99,235,0.5)"};
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function TileSwitcher({ dark }: { dark: boolean }) {
  const map = useMap();
  useEffect(() => {
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });
    const url = dark ? darkTileUrl : lightTileUrl;
    L.tileLayer(url, { attribution: tileAttribution, maxZoom: 19 }).addTo(map);
  }, [dark, map]);
  return null;
}

function FitBounds({ locations }: { locations: MapLocation[] }) {
  const map = useMap();
  useEffect(() => {
    if (locations.length === 0) return;
    if (locations.length === 1) {
      map.setView([locations[0].latitude, locations[0].longitude], 10);
      return;
    }
    const bounds = L.latLngBounds(
      locations.map((loc) => [loc.latitude, loc.longitude] as [number, number])
    );
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [locations, map]);
  return null;
}

function MapHeightControl({ height }: { height: number }) {
  const map = useMap();
  useEffect(() => {
    // react-leaflet v5 captures the MapContainer `style` prop on mount and never
    // updates it, so resize by mutating the container's height directly.
    const el = map.getContainer();
    el.style.height = `${height}px`;
    map.invalidateSize({ animate: false });
  }, [height, map]);
  return null;
}

function SiteMarker({
  location,
  dark,
  icon,
}: {
  location: MapLocation;
  dark: boolean;
  icon: L.DivIcon;
}) {
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Keep the map from zooming while the user scrolls inside the tooltip.
  // The native listener runs before the event reaches Leaflet's wheel handler
  // on the map container.
  useEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;
    const stopWheel = (e: WheelEvent) => e.stopPropagation();
    el.addEventListener("wheel", stopWheel, { passive: false });
    return () => el.removeEventListener("wheel", stopWheel);
  }, []);

  const tooltipHtml = `
    <div style="padding:10px;min-width:220px;max-width:320px;max-height:280px;overflow-y:auto;background:${dark ? "#1f2937" : "#ffffff"};color:${dark ? "#e5e7eb" : "#111827"};border-radius:8px;border:1px solid ${dark ? "#374151" : "#e5e7eb"};box-shadow:0 4px 16px rgba(0,0,0,${dark ? "0.5" : "0.15"})">
      <div style="font-weight:700;font-size:13px;margin-bottom:8px;color:${dark ? "#f3f4f6" : "#111827"}">${escapeHtml(location.site_name)}</div>
      ${location.networks.length === 0
        ? `<div style="font-size:12px;color:${dark ? "#9ca3af" : "#6b7280"}">No subnets configured</div>`
        : location.networks.map((net) => `
          <div style="margin-bottom:6px;padding:6px 8px;border-radius:6px;background:${dark ? "rgba(55,65,81,0.5)" : "rgba(243,244,246,0.8)"}">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:12px;font-weight:600;color:${dark ? "#d1d5db" : "#374151"}">${escapeHtml(net.subnet_name)}</span>
              ${net.vlan_tag !== null ? `<span style="padding:1px 6px;border-radius:4px;font-size:10px;font-weight:500;background:${dark ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.1)"};color:${dark ? "#60a5fa" : "#2563eb"}">VLAN ${escapeHtml(String(net.vlan_tag))}</span>` : ""}
            </div>
            <div style="margin-top:2px;font-family:monospace;font-size:11px;color:${dark ? "#9ca3af" : "#6b7280"}">${escapeHtml(net.cidr)}</div>
            <div style="margin-top:2px;font-size:10px;color:${dark ? "#9ca3af" : "#6b7280"}">${escapeHtml(String(net.allocated_ips))}/${escapeHtml(String(net.total_ips))} IPs allocated</div>
          </div>
        `).join("")
      }
    </div>
  `;

  return (
    <Marker
      position={[location.latitude, location.longitude]}
      icon={icon}
    >
      <Tooltip
        direction="top"
        offset={[0, -10]}
        opacity={1}
        permanent={false}
        interactive
        className={`map-tooltip ${dark ? "map-tooltip-dark" : "map-tooltip-light"}`}
      >
        <div ref={tooltipRef} dangerouslySetInnerHTML={{ __html: tooltipHtml }} />
      </Tooltip>
    </Marker>
  );
}

export default function MapView() {
  const dark = useThemeStore((s) => s.dark);
  const { data: locations = [], isLoading } = useMapData();
  const icon = createPulseIcon(dark);

  const [mapHeight, setMapHeight] = useState(350);

  const onResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startHeight = mapHeight;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* some browsers throw if the pointer is no longer active */
    }

    const onMove = (ev: PointerEvent) => {
      const next = Math.min(600, Math.max(200, startHeight + (ev.clientY - startY)));
      setMapHeight(next);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (isLoading) {
    return (
      <div
        className={`flex h-[350px] items-center justify-center rounded-lg border ${
          dark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
        }`}
      >
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-lg border shadow-sm ${
        dark ? "border-gray-700" : "border-gray-200"
      }`}
    >
      <style>{`
        .map-tooltip .leaflet-tooltip-content {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .map-tooltip .leaflet-tooltip-content > div {
          max-height: 280px;
          overflow-y: auto;
        }
        .map-tooltip .leaflet-tooltip-content > div::-webkit-scrollbar {
          width: 6px;
        }
        .map-tooltip .leaflet-tooltip-content > div::-webkit-scrollbar-thumb {
          background: ${dark ? "#4b5563" : "#d1d5db"};
          border-radius: 3px;
        }
        .map-tooltip .leaflet-tooltip-tip {
          display: none !important;
        }
        .map-tooltip-dark .leaflet-tooltip-content {
          color: #e5e7eb !important;
        }
        .map-tooltip-light .leaflet-tooltip-content {
          color: #111827 !important;
        }
        .map-resize-handle {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 10px;
          cursor: ns-resize;
          user-select: none;
          touch-action: none;
        }
        .map-resize-handle .map-resize-grip {
          width: 36px;
          height: 4px;
          border-radius: 9999px;
          background: ${dark ? "#4b5563" : "#d1d5db"};
          transition: background 0.15s;
        }
        .map-resize-handle:hover .map-resize-grip {
          background: #3b82f6;
        }
      `}</style>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: "350px", width: "100%" }}
        zoomControl={true}
        scrollWheelZoom={true}
        attributionControl={false}
      >
        <TileSwitcher dark={dark} />
        <FitBounds locations={locations} />
        <MapHeightControl height={mapHeight} />
        {locations.map((loc) => (
          <SiteMarker key={loc.site_id} location={loc} dark={dark} icon={icon} />
        ))}
      </MapContainer>
      <div
        className="map-resize-handle"
        onPointerDown={onResizeStart}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize map"
        title="Drag to resize map"
      >
        <div className="map-resize-grip" />
      </div>
    </div>
  );
}
