import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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
    L.tileLayer(url, { attribution: tileAttribution, maxZoom: 19, noWrap: true }).addTo(map);
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
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Keep the map from zooming while the user scrolls inside the popup content.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const stopWheel = (e: WheelEvent) => e.stopPropagation();
    el.addEventListener("wheel", stopWheel, { passive: false });
    return () => el.removeEventListener("wheel", stopWheel);
  }, []);

  return (
    <Marker position={[location.latitude, location.longitude]} icon={icon}>
      <Popup
        minWidth={280}
        maxWidth={320}
        maxHeight={280}
        className="map-popup"
        autoPanPadding={[20, 20]}
      >
        <div ref={contentRef} className="map-popup-content">
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 8,
              color: "#f1f5f9",
            }}
          >
            {escapeHtml(location.site_name)}
          </div>
          {location.networks.length === 0 ? (
            <div style={{ fontSize: 12, color: "#94a3b8" }}>No subnets configured</div>
          ) : (
            location.networks.map((net) => (
              <div
                key={`${net.subnet_name}-${net.cidr}`}
                style={{
                  marginBottom: 6,
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: "rgba(51,65,85,0.5)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>
                    {escapeHtml(net.subnet_name)}
                  </span>
                  {net.vlan_tag !== null ? (
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 500,
                        background: "rgba(59,130,246,0.2)",
                        color: "#60a5fa",
                      }}
                    >
                      VLAN {escapeHtml(String(net.vlan_tag))}
                    </span>
                  ) : null}
                </div>
                <div
                  style={{
                    marginTop: 2,
                    fontFamily: "monospace",
                    fontSize: 11,
                    color: "#94a3b8",
                  }}
                >
                  {escapeHtml(net.cidr)}
                </div>
                <div style={{ marginTop: 2, fontSize: 10, color: "#94a3b8" }}>
                  {escapeHtml(String(net.allocated_ips))}/{escapeHtml(String(net.total_ips))} IPs allocated
                </div>
              </div>
            ))
          )}
        </div>
      </Popup>
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
        .leaflet-container {
          background-color: #0f172a;
        }
        .leaflet-popup-content-wrapper {
          background-color: #1e293b;
          border: 1px solid #334155;
          color: #e2e8f0;
          border-radius: 10px;
        }
        .leaflet-popup-tip {
          background-color: #1e293b;
          border: 1px solid #334155;
        }
        .leaflet-container a.leaflet-popup-close-button {
          color: #94a3b8;
        }
        .leaflet-container a.leaflet-popup-close-button:hover {
          color: #e2e8f0;
        }
        .map-popup-content {
          max-height: 280px;
          overflow-y: auto;
          padding: 2px;
          min-width: 240px;
        }
        .map-popup-content::-webkit-scrollbar {
          width: 6px;
        }
        .map-popup-content::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 3px;
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
        minZoom={2}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
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
