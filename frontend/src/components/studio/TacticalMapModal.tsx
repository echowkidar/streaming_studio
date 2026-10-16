"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Globe,
  Search,
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  X,
  Crosshair,
  Navigation,
  Sparkles,
  Upload,
  Check,
  MapPin,
  Layers,
  Edit2,
} from "lucide-react";
import {
  MediaFileItem,
  TacticalMapConfig,
  TacticalMapPoint,
  TacticalMapRoute,
  TacticalRouteAssetType,
  useStudioStore,
} from "@/stores/studio.store";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// BUILT-IN OFFLINE GLOBAL & INDIAN STRATEGIC GAZETTEER (75+ Hotspots & Cities)
// Ensures 0ms instant search & fallback even if Nominatim is offline!
// ─────────────────────────────────────────────────────────────────────────────
export const STRATEGIC_LOCATIONS_GAZETTEER: TacticalMapPoint[] = [
  // India
  { name: "New Delhi, India", lat: 28.6139, lon: 77.209 },
  { name: "Mumbai, India", lat: 19.076, lon: 72.8777 },
  { name: "Aligarh, UP, India", lat: 27.8974, lon: 78.088 },
  { name: "Lucknow, UP, India", lat: 26.8467, lon: 80.9462 },
  { name: "Srinagar, J&K, India", lat: 34.0837, lon: 74.7973 },
  { name: "Leh / Ladakh, India", lat: 34.1526, lon: 77.5771 },
  { name: "Bengaluru, India", lat: 12.9716, lon: 77.5946 },
  { name: "Kolkata, India", lat: 22.5726, lon: 88.3639 },
  { name: "Chennai, India", lat: 13.0827, lon: 80.2707 },
  { name: "Hyderabad, India", lat: 17.385, lon: 78.4867 },
  { name: "Jaisalmer / Pokhran, India", lat: 26.9157, lon: 70.9083 },
  { name: "Ambala Airbase, India", lat: 30.3782, lon: 76.7767 },
  { name: "Visakhapatnam Naval Base, India", lat: 17.6868, lon: 83.2185 },
  // South Asia & Neighbors
  { name: "Islamabad, Pakistan", lat: 33.6844, lon: 73.0479 },
  { name: "Karachi, Pakistan", lat: 24.8607, lon: 67.0011 },
  { name: "Lahore, Pakistan", lat: 31.5204, lon: 74.3587 },
  { name: "Rawalpindi, Pakistan", lat: 33.5651, lon: 73.0169 },
  { name: "Kabul, Afghanistan", lat: 34.5553, lon: 69.2075 },
  { name: "Dhaka, Bangladesh", lat: 23.8103, lon: 90.4125 },
  { name: "Colombo, Sri Lanka", lat: 6.9271, lon: 79.8612 },
  { name: "Kathmandu, Nepal", lat: 27.7172, lon: 85.324 },
  // Middle East / West Asia
  { name: "Tel Aviv, Israel", lat: 32.0853, lon: 34.7818 },
  { name: "Jerusalem", lat: 31.7683, lon: 35.2137 },
  { name: "Gaza Strip", lat: 31.5017, lon: 34.4668 },
  { name: "Haifa, Israel", lat: 32.794, lon: 34.9896 },
  { name: "Tehran, Iran", lat: 35.6892, lon: 51.389 },
  { name: "Isfahan, Iran", lat: 32.6539, lon: 51.666 },
  { name: "Natanz, Iran", lat: 33.5114, lon: 51.9164 },
  { name: "Bandar Abbas / Strait of Hormuz", lat: 27.1832, lon: 56.2666 },
  { name: "Beirut, Lebanon", lat: 33.8938, lon: 35.5018 },
  { name: "Damascus, Syria", lat: 33.5138, lon: 36.2765 },
  { name: "Baghdad, Iraq", lat: 33.3152, lon: 44.3661 },
  { name: "Sanaa, Yemen", lat: 15.3694, lon: 44.191 },
  { name: "Red Sea / Bab el-Mandeb", lat: 12.5858, lon: 43.3333 },
  { name: "Riyadh, Saudi Arabia", lat: 24.7136, lon: 46.6753 },
  { name: "Dubai, UAE", lat: 25.2048, lon: 55.2708 },
  { name: "Doha, Qatar", lat: 25.2854, lon: 51.531 },
  { name: "Ankara, Turkey", lat: 39.9334, lon: 32.8597 },
  { name: "Istanbul, Turkey", lat: 41.0082, lon: 28.9784 },
  { name: "Cairo / Suez Canal, Egypt", lat: 30.0444, lon: 31.2357 },
  // Europe / Russia / Ukraine
  { name: "Kyiv, Ukraine", lat: 50.4501, lon: 30.5234 },
  { name: "Kharkiv, Ukraine", lat: 49.9935, lon: 36.2304 },
  { name: "Odesa, Ukraine", lat: 46.4825, lon: 30.7233 },
  { name: "Crimea / Sevastopol", lat: 44.6166, lon: 33.5254 },
  { name: "Moscow, Russia", lat: 55.7558, lon: 37.6173 },
  { name: "St. Petersburg, Russia", lat: 59.9311, lon: 30.3609 },
  { name: "London, UK", lat: 51.5074, lon: -0.1278 },
  { name: "Paris, France", lat: 48.8566, lon: 2.3522 },
  { name: "Berlin, Germany", lat: 52.52, lon: 13.405 },
  { name: "Brussels / NATO HQ", lat: 50.8503, lon: 4.3517 },
  // East Asia & Indo-Pacific
  { name: "Beijing, China", lat: 39.9042, lon: 116.4074 },
  { name: "Shanghai, China", lat: 31.2304, lon: 121.4737 },
  { name: "Taipei, Taiwan", lat: 25.033, lon: 121.5654 },
  { name: "Taiwan Strait", lat: 24.4798, lon: 119.5 },
  { name: "South China Sea", lat: 14.5995, lon: 114.5 },
  { name: "Pyongyang, North Korea", lat: 39.0392, lon: 125.7625 },
  { name: "Seoul, South Korea", lat: 37.5665, lon: 126.978 },
  { name: "Tokyo, Japan", lat: 35.6762, lon: 139.6503 },
  { name: "Manila, Philippines", lat: 14.5995, lon: 120.9842 },
  { name: "Singapore", lat: 1.3521, lon: 103.8198 },
  { name: "Sydney, Australia", lat: -33.8688, lon: 151.2093 },
  // Americas
  { name: "Washington D.C. / Pentagon, USA", lat: 38.9072, lon: -77.0369 },
  { name: "New York City, USA", lat: 40.7128, lon: -74.006 },
  { name: "Los Angeles, USA", lat: 34.0522, lon: -118.2437 },
  { name: "Ottawa, Canada", lat: 45.4215, lon: -75.6972 },
];

// Haversine distance in kilometers between two Lat/Lon points
export function computeGreatCircleDistanceKm(a: TacticalMapPoint, b: TacticalMapPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}

// Web Mercator projection helpers (matches standard slippy map tiles 256x256)
function lonToTileX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function latToTileY(lat: number, zoom: number): number {
  const clampedLat = Math.max(-85, Math.min(85, lat));
  const rad = (clampedLat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

function tileXToLon(tileX: number, zoom: number): number {
  return (tileX / Math.pow(2, zoom)) * 360 - 180;
}

function tileYToLat(tileY: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * tileY) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export function latLonToCanvasXY(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number,
  zoom: number,
  width: number,
  height: number
): { x: number; y: number } {
  const centerTileX = lonToTileX(centerLon, zoom);
  const centerTileY = latToTileY(centerLat, zoom);
  const ptTileX = lonToTileX(lon, zoom);
  const ptTileY = latToTileY(lat, zoom);
  return {
    x: width / 2 + (ptTileX - centerTileX) * 256,
    y: height / 2 + (ptTileY - centerTileY) * 256,
  };
}

export function canvasXYToLatLon(
  x: number,
  y: number,
  centerLat: number,
  centerLon: number,
  zoom: number,
  width: number,
  height: number
): { lat: number; lon: number } {
  const centerTileX = lonToTileX(centerLon, zoom);
  const centerTileY = latToTileY(centerLat, zoom);
  const ptTileX = centerTileX + (x - width / 2) / 256;
  const ptTileY = centerTileY + (y - height / 2) / 256;
  return {
    lat: Number(Math.max(-82, Math.min(82, tileYToLat(ptTileY, zoom))).toFixed(4)),
    lon: Number(Math.max(-180, Math.min(180, tileXToLon(ptTileX, zoom))).toFixed(4)),
  };
}

// Shared tile cache so switching scenes or frames never re-fetches map tiles
const globalTileCache = new Map<string, HTMLImageElement>();
const customIconCache = new Map<string, HTMLImageElement>();

function getTileUrl(style: TacticalMapConfig["mapStyle"], z: number, x: number, y: number): string | null {
  const maxTile = Math.pow(2, z);
  const wrappedX = ((x % maxTile) + maxTile) % maxTile;
  if (y < 0 || y >= maxTile) return null;
  if (style === "vector-grid") return null;
  if (style === "satellite") {
    return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${wrappedX}`;
  }
  if (style === "political") {
    return `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${wrappedX}/${y}.png`;
  }
  // Default: "dark-radar"
  return `https://a.basemaps.cartocdn.com/dark_all/${z}/${wrappedX}/${y}.png`;
}

// Draw procedural vector vehicle/projectile along tangent angle `theta`
function drawTacticalAssetIcon(
  ctx: CanvasRenderingContext2D,
  assetType: TacticalRouteAssetType,
  x: number,
  y: number,
  theta: number,
  color: string,
  now: number,
  customIconUrl?: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(theta);

  if (assetType === "custom-image" && customIconUrl) {
    let img = customIconCache.get(customIconUrl);
    if (!img) {
      img = new Image();
      img.crossOrigin = "anonymous";
      img.src = customIconUrl;
      customIconCache.set(customIconUrl, img);
    }
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -26, -26, 52, 52);
      ctx.restore();
      return;
    }
  }

  if (assetType === "missile" || assetType === "salvo") {
    // Flickering Plasma / Rocket Exhaust Plume behind missile (-X direction)
    const flameLen = 22 + Math.sin(now / 35) * 8;
    const grad = ctx.createLinearGradient(-14, 0, -14 - flameLen, 0);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.35, "#fbbf24");
    grad.addColorStop(0.75, "#ef4444");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-14, -5);
    ctx.lineTo(-14 - flameLen, 0);
    ctx.lineTo(-14, 5);
    ctx.closePath();
    ctx.fill();

    // Missile Body & Nose Cone (+X direction)
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.moveTo(22, 0); // Sharp warhead tip
    ctx.quadraticCurveTo(12, -5.5, -14, -5.5);
    ctx.lineTo(-14, 5.5);
    ctx.quadraticCurveTo(12, 5.5, 22, 0);
    ctx.closePath();
    ctx.fill();

    // Warhead nose band
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(10, -4.2);
    ctx.lineTo(10, 4.2);
    ctx.closePath();
    ctx.fill();

    // Tail Fins
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(-8, -5);
    ctx.lineTo(-17, -12);
    ctx.lineTo(-14, -5);
    ctx.moveTo(-8, 5);
    ctx.lineTo(-17, 12);
    ctx.lineTo(-14, 5);
    ctx.fill();
  } else if (assetType === "fighter-jet") {
    // Supersonic Afterburner Glow
    const burner = 16 + Math.sin(now / 30) * 5;
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.moveTo(-16, -3);
    ctx.lineTo(-16 - burner, 0);
    ctx.lineTo(-16, 3);
    ctx.closePath();
    ctx.fill();

    // Stealth Fighter Jet Delta Silhouette (Rafale / F-35 style)
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(24, 0); // Nose
    ctx.lineTo(8, -4);
    ctx.lineTo(-6, -19); // Left wingtip
    ctx.lineTo(-13, -19);
    ctx.lineTo(-10, -5);
    ctx.lineTo(-18, -9); // Left tailplane
    ctx.lineTo(-18, 9); // Right tailplane
    ctx.lineTo(-10, 5);
    ctx.lineTo(-13, 19);
    ctx.lineTo(-6, 19); // Right wingtip
    ctx.lineTo(8, 4);
    ctx.closePath();
    ctx.fill();

    // Canopy
    ctx.fillStyle = "#0284c7";
    ctx.beginPath();
    ctx.ellipse(7, 0, 6, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (assetType === "airliner") {
    // Commercial / VIP Swept-Wing Airliner
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(8, -3.5);
    ctx.lineTo(-4, -22);
    ctx.lineTo(-9, -22);
    ctx.lineTo(-4, -3.5);
    ctx.lineTo(-15, -3);
    ctx.lineTo(-20, -10);
    ctx.lineTo(-22, -10);
    ctx.lineTo(-19, 0);
    ctx.lineTo(-22, 10);
    ctx.lineTo(-20, 10);
    ctx.lineTo(-15, 3);
    ctx.lineTo(-4, 3.5);
    ctx.lineTo(-9, 22);
    ctx.lineTo(-4, 22);
    ctx.lineTo(8, 3.5);
    ctx.closePath();
    ctx.fill();
  } else if (assetType === "drone") {
    // Combat UAV / Predator Drone Silhouette
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(4, -2.5);
    ctx.lineTo(0, -22);
    ctx.lineTo(-4, -22);
    ctx.lineTo(-2, -2.5);
    ctx.lineTo(-14, -2);
    ctx.lineTo(-18, -8);
    ctx.lineTo(-16, 0);
    ctx.lineTo(-18, 8);
    ctx.lineTo(-14, 2);
    ctx.lineTo(-2, 2.5);
    ctx.lineTo(-4, 22);
    ctx.lineTo(0, 22);
    ctx.lineTo(4, 2.5);
    ctx.closePath();
    ctx.fill();
  } else if (assetType === "helicopter") {
    // Attack Helicopter Body + Spinning Main Rotor
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.ellipse(2, 0, 13, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-18, -1.8, 14, 3.6);

    // Spinning Rotor Blades
    ctx.save();
    ctx.rotate((now / 28) % (Math.PI * 2));
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(18, 0);
    ctx.moveTo(0, -18);
    ctx.lineTo(0, 18);
    ctx.stroke();
    ctx.restore();
  } else if (assetType === "warship") {
    // Naval Destroyer / Carrier Hull
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#94a3b8";
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(8, -6);
    ctx.lineTo(-18, -6);
    ctx.lineTo(-21, 0);
    ctx.lineTo(-18, 6);
    ctx.lineTo(8, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(-6, -3, 12, 6);
  }

  ctx.restore();
}

export interface TacticalMapStageCanvasProps {
  config: TacticalMapConfig;
  isInteractive?: boolean;
  onMapClickLatLon?: (lat: number, lon: number) => void;
  onOpenEditorModal?: () => void;
}

export const TacticalMapStageCanvas: React.FC<TacticalMapStageCanvasProps> = ({
  config,
  isInteractive = true,
  onMapClickLatLon,
  onOpenEditorModal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [localStyle, setLocalStyle] = useState<TacticalMapConfig["mapStyle"]>(
    config.mapStyle || "dark-radar"
  );
  const progressRef = useRef(0); // 0.0 to 1.25 (1.0 = impact, 1.0..1.25 = impact shockwave hold)
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    setLocalStyle(config.mapStyle || "dark-radar");
    progressRef.current = 0;
    setIsPlaying(true);
  }, [config]);

  const handleReplay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    progressRef.current = 0;
    setIsPlaying(true);
  };

  useEffect(() => {
    let animId: number;
    const W = 1280;
    const H = 720;

    const renderLoop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // 1. Base Background Fill
          ctx.fillStyle = localStyle === "political" ? "#cad2d3" : "#050b14";
          ctx.fillRect(0, 0, W, H);

          const zoom = Math.max(2, Math.min(11, Math.round(config.zoom || 4)));
          const cTileX = lonToTileX(config.centerLon, zoom);
          const cTileY = latToTileY(config.centerLat, zoom);

          const startTileX = Math.floor(cTileX - W / 512) - 1;
          const endTileX = Math.ceil(cTileX + W / 512) + 1;
          const startTileY = Math.floor(cTileY - H / 512) - 1;
          const endTileY = Math.ceil(cTileY + H / 512) + 1;

          // 2. Draw Web Mercator Slippy Map Tiles (CORS anonymous)
          if (localStyle !== "vector-grid") {
            for (let tx = startTileX; tx <= endTileX; tx++) {
              for (let ty = startTileY; ty <= endTileY; ty++) {
                const url = getTileUrl(localStyle, zoom, tx, ty);
                if (!url) continue;
                let tileImg = globalTileCache.get(url);
                if (!tileImg) {
                  tileImg = new Image();
                  tileImg.crossOrigin = "anonymous";
                  tileImg.src = url;
                  globalTileCache.set(url, tileImg);
                }
                if (tileImg.complete && tileImg.naturalWidth > 0) {
                  const drawX = Math.round(W / 2 + (tx - cTileX) * 256);
                  const drawY = Math.round(H / 2 + (ty - cTileY) * 256);
                  try {
                    ctx.drawImage(tileImg, drawX, drawY, 256, 256);
                  } catch {}
                }
              }
            }
          }

          // Darken satellite/political slightly for crisp broadcast HUD contrast
          if (localStyle === "satellite") {
            ctx.fillStyle = "rgba(4, 10, 22, 0.25)";
            ctx.fillRect(0, 0, W, H);
          }

          // 3. Tactical Lat/Lon Grid Overlay
          if (config.showGridLines !== false || localStyle === "vector-grid") {
            ctx.save();
            ctx.strokeStyle =
              localStyle === "political"
                ? "rgba(15, 23, 42, 0.08)"
                : "rgba(6, 182, 212, 0.14)";
            ctx.lineWidth = 1;
            const step = 80;
            for (let gx = 0; gx < W; gx += step) {
              ctx.beginPath();
              ctx.moveTo(gx, 0);
              ctx.lineTo(gx, H);
              ctx.stroke();
            }
            for (let gy = 0; gy < H; gy += step) {
              ctx.beginPath();
              ctx.moveTo(0, gy);
              ctx.lineTo(W, gy);
              ctx.stroke();
            }
            ctx.restore();
          }

          // 4. Optional Rotating Tactical Radar Sweep
          if (config.showRadarSweep) {
            ctx.save();
            const sweepAngle = (now / 1600) % (Math.PI * 2);
            const rCx = W / 2;
            const rCy = H / 2;
            const rRadius = Math.min(W, H) * 0.42;
            ctx.strokeStyle = "rgba(16, 185, 129, 0.22)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(rCx, rCy, rRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(rCx, rCy, rRadius * 0.6, 0, Math.PI * 2);
            ctx.stroke();

            const coneGrad = ctx.createRadialGradient(rCx, rCy, 10, rCx, rCy, rRadius);
            coneGrad.addColorStop(0, "rgba(16, 185, 129, 0.18)");
            coneGrad.addColorStop(1, "rgba(16, 185, 129, 0.0)");
            ctx.fillStyle = coneGrad;
            ctx.beginPath();
            ctx.moveTo(rCx, rCy);
            ctx.arc(rCx, rCy, rRadius, sweepAngle - 0.45, sweepAngle);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          // 5. Advance Animation Progress
          const baseRouteSpeed = config.routes?.[0]?.speed || 1;
          if (isPlaying) {
            progressRef.current += dt * 0.28 * baseRouteSpeed * speedMultiplier;
            if (progressRef.current > 1.28) {
              if (config.loopAnimation !== false) {
                progressRef.current = 0;
              } else {
                progressRef.current = 1.28;
                setIsPlaying(false);
              }
            }
          }
          const rawP = progressRef.current;
          const flightT = Math.max(0, Math.min(1, rawP));

          // 6. Render All Tactical Flight / Missile Routes
          (config.routes || []).forEach((route) => {
            const p1 = latLonToCanvasXY(
              route.from.lat,
              route.from.lon,
              config.centerLat,
              config.centerLon,
              zoom,
              W,
              H
            );
            const p2 = latLonToCanvasXY(
              route.to.lat,
              route.to.lon,
              config.centerLat,
              config.centerLon,
              zoom,
              W,
              H
            );

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const distPx = Math.hypot(dx, dy);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            // Perpendicular ballistic arc control point (always curves upward on screen)
            const arcOffset = distPx * (route.arcHeight ?? 0.32);
            const ctrlX = midX;
            const ctrlY = midY - arcOffset;

            const getQuadraticPoint = (t: number) => {
              const u = 1 - t;
              return {
                x: u * u * p1.x + 2 * u * t * ctrlX + t * t * p2.x,
                y: u * u * p1.y + 2 * u * t * ctrlY + t * t * p2.y,
              };
            };

            const getQuadraticAngle = (t: number) => {
              const tx = 2 * (1 - t) * (ctrlX - p1.x) + 2 * t * (p2.x - ctrlX);
              const ty = 2 * (1 - t) * (ctrlY - p1.y) + 2 * t * (p2.y - ctrlY);
              return Math.atan2(ty, tx);
            };

            // 6A. Dashed Forecast Path
            ctx.save();
            ctx.strokeStyle = `${route.color || "#ef4444"}55`;
            ctx.lineWidth = 2.5;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.quadraticCurveTo(ctrlX, ctrlY, p2.x, p2.y);
            ctx.stroke();
            ctx.restore();

            // 6B. Active Glowing Trajectory Trail up to current `flightT`
            if (flightT > 0.01) {
              ctx.save();
              ctx.strokeStyle = route.color || "#ef4444";
              ctx.shadowColor = route.color || "#ef4444";
              ctx.shadowBlur = 14;
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              const steps = 40;
              const maxStep = Math.max(1, Math.floor(flightT * steps));
              for (let s = 1; s <= maxStep; s++) {
                const pt = getQuadraticPoint(s / steps);
                ctx.lineTo(pt.x, pt.y);
              }
              const tipPt = getQuadraticPoint(flightT);
              ctx.lineTo(tipPt.x, tipPt.y);
              ctx.stroke();
              ctx.restore();
            }

            // 6C. Origin & Target Markers + Location Labels
            [
              { pt: p1, info: route.from, isTarget: false },
              { pt: p2, info: route.to, isTarget: true },
            ].forEach(({ pt, info, isTarget }) => {
              ctx.save();
              const pulseR = 10 + ((now / 45) % 18);
              ctx.strokeStyle = isTarget ? "#ef4444" : "#38bdf8";
              ctx.lineWidth = 2;
              ctx.globalAlpha = Math.max(0.15, 1 - pulseR / 28);
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, pulseR, 0, Math.PI * 2);
              ctx.stroke();
              ctx.globalAlpha = 1;

              ctx.fillStyle = isTarget ? "#ef4444" : "#38bdf8";
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 2;
              ctx.stroke();

              // Location Name Pill
              const labelTxt = info.name.split(",")[0].toUpperCase();
              ctx.font = "bold 14px Inter, system-ui, sans-serif";
              const lw = ctx.measureText(labelTxt).width + 20;
              const lx = pt.x - lw / 2;
              const ly = pt.y + 14;
              ctx.fillStyle = "rgba(9, 10, 20, 0.9)";
              ctx.beginPath();
              ctx.roundRect(lx, ly, lw, 26, 6);
              ctx.fill();
              ctx.strokeStyle = isTarget ? "#ef4444" : "#38bdf8";
              ctx.lineWidth = 1.5;
              ctx.stroke();

              ctx.fillStyle = "#ffffff";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(labelTxt, pt.x, ly + 13);
              ctx.restore();
            });

            // 6D. Distance Badge in KM at apex of curve
            if (route.showDistanceKm !== false) {
              const apexPt = getQuadraticPoint(0.5);
              const totalKm = computeGreatCircleDistanceKm(route.from, route.to);
              const coveredKm = Math.round(totalKm * flightT);
              const distLabel = `${coveredKm} / ${totalKm} KM`;
              ctx.save();
              ctx.font = "bold 12px monospace";
              const dw = ctx.measureText(distLabel).width + 18;
              ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
              ctx.beginPath();
              ctx.roundRect(apexPt.x - dw / 2, apexPt.y - 30, dw, 22, 6);
              ctx.fill();
              ctx.strokeStyle = `${route.color || "#ef4444"}88`;
              ctx.lineWidth = 1;
              ctx.stroke();
              ctx.fillStyle = "#facc15";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(distLabel, apexPt.x, apexPt.y - 19);
              ctx.restore();
            }

            // 6E. Draw Flying Vehicle(s) / Missile(s)
            if (route.assetType === "salvo") {
              // 3-Missile Salvo in staggered formation
              [0, -0.08, -0.16].forEach((offset, sIdx) => {
                const st = Math.max(0, Math.min(1, rawP + offset));
                if (st > 0 && st < 1) {
                  const pos = getQuadraticPoint(st);
                  const ang = getQuadraticAngle(st);
                  drawTacticalAssetIcon(
                    ctx,
                    "missile",
                    pos.x,
                    pos.y + (sIdx - 1) * 8,
                    ang,
                    route.color || "#ef4444",
                    now
                  );
                }
              });
            } else if (flightT < 1) {
              const curPos = getQuadraticPoint(flightT);
              const curAngle = getQuadraticAngle(flightT);
              drawTacticalAssetIcon(
                ctx,
                route.assetType,
                curPos.x,
                curPos.y,
                curAngle,
                route.color || "#ef4444",
                now,
                route.customIconUrl
              );
            }

            // 6F. Target Impact Explosion & Shockwave Ring when missile reaches target (rawP >= 0.98)
            if (route.showImpactShockwave !== false && rawP >= 0.96) {
              const impactPhase = Math.min(1, (rawP - 0.96) / 0.3);
              ctx.save();
              const r1 = 12 + impactPhase * 68;
              const r2 = 6 + impactPhase * 38;
              const alpha = Math.max(0, 1 - impactPhase);

              const blastGrad = ctx.createRadialGradient(p2.x, p2.y, 2, p2.x, p2.y, r1);
              blastGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
              blastGrad.addColorStop(0.35, `rgba(251, 191, 36, ${alpha * 0.9})`);
              blastGrad.addColorStop(0.7, `rgba(239, 68, 68, ${alpha * 0.7})`);
              blastGrad.addColorStop(1, "rgba(239, 68, 68, 0)");

              ctx.fillStyle = blastGrad;
              ctx.beginPath();
              ctx.arc(p2.x, p2.y, r1, 0, Math.PI * 2);
              ctx.fill();

              ctx.strokeStyle = `rgba(251, 191, 36, ${alpha})`;
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(p2.x, p2.y, r2, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }
          });

          // 7. Broadcast News Top-Left Breaking Map Header Banner
          if (config.title) {
            ctx.save();
            ctx.font = "bold 20px Inter, system-ui, sans-serif";
            const tw = ctx.measureText(config.title.toUpperCase()).width;
            const boxW = Math.max(260, tw + 115);
            const boxH = config.subtitle ? 62 : 42;
            ctx.fillStyle = "rgba(9, 10, 20, 0.9)";
            ctx.beginPath();
            ctx.roundRect(24, 22, boxW, boxH, 10);
            ctx.fill();
            ctx.strokeStyle = "rgba(239, 68, 68, 0.65)";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Red "LIVE MAP" badge
            ctx.fillStyle = "#e11d48";
            ctx.beginPath();
            ctx.roundRect(34, 30, 74, 24, 5);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 11px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("LIVE MAP", 71, 42);

            // Title & Subtitle
            ctx.textAlign = "left";
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 18px Inter, system-ui, sans-serif";
            ctx.fillText(config.title.toUpperCase(), 118, 43);
            if (config.subtitle) {
              ctx.fillStyle = "#38bdf8";
              ctx.font = "600 13px Inter, system-ui, sans-serif";
              ctx.fillText(config.subtitle, 36, 70);
            }
            ctx.restore();
          }
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [config, isPlaying, speedMultiplier, localStyle]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#050b14] group/map select-none">
      <canvas
        ref={canvasRef}
        id="livestudio-tactical-map-canvas"
        width={1280}
        height={720}
        onClick={(e) => {
          if (!onMapClickLatLon || !canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          const scaleX = 1280 / Math.max(1, rect.width);
          const scaleY = 720 / Math.max(1, rect.height);
          const cx = (e.clientX - rect.left) * scaleX;
          const cy = (e.clientY - rect.top) * scaleY;
          const coords = canvasXYToLatLon(
            cx,
            cy,
            config.centerLat,
            config.centerLon,
            Math.max(2, Math.min(11, Math.round(config.zoom || 4))),
            1280,
            720
          );
          onMapClickLatLon(coords.lat, coords.lon);
        }}
        className={cn(
          "w-full h-full object-contain",
          onMapClickLatLon ? "cursor-crosshair" : "cursor-default"
        )}
      />

      {/* On-Stage Broadcast Tactical Map Transport Bar */}
      {isInteractive && (
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-30 bg-[#090a14]/95 backdrop-blur-md border border-cyan-500/40 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-2xl opacity-0 group-hover/map:opacity-100 transition-opacity pointer-events-auto"
        >
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1 shadow"
          >
            {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isPlaying ? "Pause" : "Fly"}</span>
          </button>

          <button
            type="button"
            onClick={handleReplay}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-1 shadow"
            title="Restart Missile / Flight Animation from Origin"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Launch Again</span>
          </button>

          {/* Speed Selector */}
          <select
            value={String(speedMultiplier)}
            onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
            className="bg-slate-900 border border-white/15 rounded px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 focus:outline-none"
            title="Flight Animation Speed"
          >
            <option value="0.5">0.5x Slow</option>
            <option value="1">1.0x Normal</option>
            <option value="1.5">1.5x Fast</option>
            <option value="2.5">2.5x Supersonic</option>
          </select>

          {/* Map Theme Switcher */}
          <select
            value={localStyle}
            onChange={(e) => setLocalStyle(e.target.value as TacticalMapConfig["mapStyle"])}
            className="bg-slate-900 border border-white/15 rounded px-1.5 py-0.5 text-[10px] text-slate-200 focus:outline-none"
            title="Switch Broadcast Map Theme"
          >
            <option value="dark-radar">🌑 Dark Radar</option>
            <option value="satellite">🛰️ Satellite</option>
            <option value="political">🗺️ Political</option>
            <option value="vector-grid">🎯 Grid Only</option>
          </select>

          {onOpenEditorModal && (
            <button
              type="button"
              onClick={onOpenEditorModal}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-semibold flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit Map / Points</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface TacticalMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSceneId?: string | null;
  initialItem?: MediaFileItem | null;
  onSaveMapItem?: (item: MediaFileItem) => void;
}

export const TacticalMapModal: React.FC<TacticalMapModalProps> = ({
  isOpen,
  onClose,
  targetSceneId,
  initialItem,
  onSaveMapItem,
}) => {
  const {
    mediaLibrary,
    addMediaLibraryItem,
    updateMediaLibraryItem,
    removeMediaLibraryItem,
    setActiveMedia,
    activeMedia,
    scenes,
    activeSceneId,
    updateScene,
  } = useStudioStore();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const defaultConfig: TacticalMapConfig = {
    title: "BREAKING: MISSILE & AIRSTRIKE TRAJECTORY",
    subtitle: "Live Tactical Radar & Distance Analysis",
    mapStyle: "dark-radar",
    centerLat: 32.8,
    centerLon: 44.0,
    zoom: 5,
    loopAnimation: true,
    showRadarSweep: true,
    showGridLines: true,
    routes: [
      {
        id: "route-1",
        from: { name: "Tehran, Iran", lat: 35.6892, lon: 51.389 },
        to: { name: "Tel Aviv, Israel", lat: 32.0853, lon: 34.7818 },
        assetType: "missile",
        color: "#ef4444",
        arcHeight: 0.32,
        speed: 1.0,
        showImpactShockwave: true,
        showDistanceKm: true,
      },
    ],
  };

  const [mapConfig, setMapConfig] = useState<TacticalMapConfig>(
    initialItem?.mapConfig || defaultConfig
  );
  const [activeRouteIdx, setActiveRouteIdx] = useState(0);
  const [clickPlacementMode, setClickPlacementMode] = useState<"from" | "to" | null>(null);
  const [fromSearchQuery, setFromSearchQuery] = useState("");
  const [toSearchQuery, setToSearchQuery] = useState("");
  const [fromResults, setFromResults] = useState<TacticalMapPoint[]>([]);
  const [toResults, setToResults] = useState<TacticalMapPoint[]>([]);
  const [isSearchingFrom, setIsSearchingFrom] = useState(false);
  const [isSearchingTo, setIsSearchingTo] = useState(false);
  const [editingMapId, setEditingMapId] = useState<string | null>(initialItem?.id || null);
  const customIconInputRef = useRef<HTMLInputElement | null>(null);

  const effectiveSceneId = targetSceneId || activeSceneId;
  const targetScene = scenes.find((s) => s.id === effectiveSceneId);
  const savedMaps = React.useMemo(
    () => mediaLibrary.filter((m) => m.type === "map" || Boolean(m.mapConfig)),
    [mediaLibrary]
  );

  const activeRoute = mapConfig.routes[activeRouteIdx] || mapConfig.routes[0];

  // Search helper combining Built-in Gazetteer (0ms) + OpenStreetMap Nominatim (Zero API Key)
  const searchLocations = useCallback(async (query: string, side: "from" | "to") => {
    const q = query.trim().toLowerCase();
    if (!q) {
      if (side === "from") setFromResults([]);
      else setToResults([]);
      return;
    }

    const localMatches = STRATEGIC_LOCATIONS_GAZETTEER.filter((loc) =>
      loc.name.toLowerCase().includes(q)
    ).slice(0, 6);

    if (side === "from") {
      setFromResults(localMatches);
      setIsSearchingFrom(true);
    } else {
      setToResults(localMatches);
      setIsSearchingTo(true);
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`
      );
      if (res.ok) {
        const data: any[] = await res.json();
        const remotePoints: TacticalMapPoint[] = data.map((d) => ({
          name: String(d.display_name || query).split(",").slice(0, 2).join(", "),
          lat: Number(parseFloat(d.lat).toFixed(4)),
          lon: Number(parseFloat(d.lon).toFixed(4)),
        }));
        const combined = [...localMatches];
        remotePoints.forEach((rp) => {
          if (!combined.some((c) => Math.abs(c.lat - rp.lat) < 0.1 && Math.abs(c.lon - rp.lon) < 0.1)) {
            combined.push(rp);
          }
        });
        if (side === "from") setFromResults(combined.slice(0, 8));
        else setToResults(combined.slice(0, 8));
      }
    } catch {
      // Offline gazetteer matches remain displayed
    } finally {
      if (side === "from") setIsSearchingFrom(false);
      else setIsSearchingTo(false);
    }
  }, []);

  if (!isOpen || !isMounted) return null;

  const updateActiveRoute = (updates: Partial<TacticalMapRoute>) => {
    setMapConfig((prev) => {
      const nextRoutes = prev.routes.map((r, idx) =>
        idx === activeRouteIdx ? { ...r, ...updates } : r
      );
      return { ...prev, routes: nextRoutes };
    });
  };

  // Auto-center map between Origin & Target when a new location is selected
  const handleSelectPoint = (side: "from" | "to", pt: TacticalMapPoint) => {
    const otherPt = side === "from" ? activeRoute.to : activeRoute.from;
    const nextFrom = side === "from" ? pt : activeRoute.from;
    const nextTo = side === "to" ? pt : activeRoute.to;

    const midLat = Number(((nextFrom.lat + nextTo.lat) / 2).toFixed(4));
    const midLon = Number(((nextFrom.lon + nextTo.lon) / 2).toFixed(4));
    const distKm = computeGreatCircleDistanceKm(nextFrom, nextTo);
    const autoZoom =
      distKm > 6000 ? 3 : distKm > 2800 ? 4 : distKm > 1100 ? 5 : distKm > 450 ? 6 : 7;

    setMapConfig((prev) => ({
      ...prev,
      centerLat: midLat,
      centerLon: midLon,
      zoom: autoZoom,
      routes: prev.routes.map((r, idx) =>
        idx === activeRouteIdx ? { ...r, [side]: pt } : r
      ),
    }));

    if (side === "from") {
      setFromSearchQuery("");
      setFromResults([]);
    } else {
      setToSearchQuery("");
      setToResults([]);
    }
  };

  const handleAddRoute = () => {
    const newRoute: TacticalMapRoute = {
      id: `route-${Date.now()}`,
      from: { name: "New Delhi, India", lat: 28.6139, lon: 77.209 },
      to: { name: "Karachi, Pakistan", lat: 24.8607, lon: 67.0011 },
      assetType: "fighter-jet",
      color: "#38bdf8",
      arcHeight: 0.25,
      speed: 1.0,
      showImpactShockwave: true,
      showDistanceKm: true,
    };
    const nextRoutes = [...mapConfig.routes, newRoute];
    setMapConfig((prev) => ({ ...prev, routes: nextRoutes }));
    setActiveRouteIdx(nextRoutes.length - 1);
  };

  const handleDeleteRoute = (idx: number) => {
    if (mapConfig.routes.length <= 1) return;
    const nextRoutes = mapConfig.routes.filter((_, i) => i !== idx);
    setMapConfig((prev) => ({ ...prev, routes: nextRoutes }));
    setActiveRouteIdx(Math.max(0, Math.min(nextRoutes.length - 1, activeRouteIdx)));
  };

  const handleCustomIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        updateActiveRoute({ assetType: "custom-image", customIconUrl: dataUrl });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSaveTacticalMap = (attachAndPresentNow: boolean) => {
    const firstRoute = mapConfig.routes[0];
    const routeSummary = firstRoute
      ? `${firstRoute.from.name.split(",")[0]} ➔ ${firstRoute.to.name.split(",")[0]}`
      : "Tactical Map";

    const cleanName = mapConfig.title.trim() || `Map: ${routeSummary}`;

    if (editingMapId) {
      const updates: Partial<MediaFileItem> = {
        name: cleanName,
        type: "map",
        url: `map://${editingMapId}`,
        duration: routeSummary,
        mapConfig,
        loop: mapConfig.loopAnimation,
        isUploaded: true,
      };
      updateMediaLibraryItem(editingMapId, updates);
      const existing = mediaLibrary.find((m) => m.id === editingMapId);
      if (attachAndPresentNow && existing) {
        const merged = { ...existing, ...updates };
        if (effectiveSceneId) updateScene(effectiveSceneId, { activeMedia: merged });
        if (!targetSceneId || targetSceneId === activeSceneId) setActiveMedia(merged);
        onSaveMapItem?.(merged);
        onClose();
      } else {
        setEditingMapId(null);
      }
      return;
    }

    const newItemId = `tactical-map-${Date.now()}`;
    const newItem: MediaFileItem = {
      id: newItemId,
      name: cleanName,
      type: "map",
      url: `map://${newItemId}`,
      duration: routeSummary,
      mapConfig,
      loop: mapConfig.loopAnimation,
      isUploaded: true,
    };

    addMediaLibraryItem(newItem);

    if (attachAndPresentNow) {
      if (effectiveSceneId) {
        updateScene(effectiveSceneId, { activeMedia: newItem });
      }
      if (!targetSceneId || targetSceneId === activeSceneId) {
        setActiveMedia(newItem);
      }
      onSaveMapItem?.(newItem);
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl bg-[#0b0d18] border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 bg-[#111426] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Broadcast News Tactical Map & Missile / Flight Animator</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  Zero Google API • 60FPS Live Stream & Record Ready
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Search any city/country or click on the map to animate missiles, fighter jets, drones & custom icons between points
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/10 min-h-0">
          {/* Left Column: Map Search, Points & Vehicle Controls (5 cols) */}
          <div className="lg:col-span-5 p-4 space-y-3.5 overflow-y-auto custom-scrollbar">
            {/* Map Headline & Subtitle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  News Map Headline Banner
                </label>
                <input
                  type="text"
                  value={mapConfig.title}
                  onChange={(e) => setMapConfig({ ...mapConfig, title: e.target.value })}
                  placeholder="e.g. BREAKING: MISSILE STRIKE PATH"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-xs text-white font-semibold focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Subtitle / Telemetry Note
                </label>
                <input
                  type="text"
                  value={mapConfig.subtitle || ""}
                  onChange={(e) => setMapConfig({ ...mapConfig, subtitle: e.target.value })}
                  placeholder="e.g. Live Radar Trajectory Analysis"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/15 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Multi-Route Tabs */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                {mapConfig.routes.map((rt, idx) => (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => setActiveRouteIdx(idx)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all shrink-0",
                      idx === activeRouteIdx
                        ? "bg-cyan-600 text-white border-cyan-400"
                        : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
                    )}
                  >
                    Path {idx + 1}: {rt.from.name.split(",")[0]} ➔ {rt.to.name.split(",")[0]}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleAddRoute}
                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1"
                  title="Add another simultaneous flight/missile path"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Path</span>
                </button>
                {mapConfig.routes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteRoute(activeRouteIdx)}
                    className="p-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Origin (Point A) & Target (Point B) Location Search */}
            {activeRoute && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-indigo-950/25 border border-indigo-500/30">
                {/* Point A: Origin */}
                <div className="space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-cyan-300 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      <span>1. Launch / Origin Point</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setClickPlacementMode(clickPlacementMode === "from" ? null : "from")
                      }
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-bold border",
                        clickPlacementMode === "from"
                          ? "bg-cyan-500 text-slate-950 border-cyan-300 animate-pulse"
                          : "bg-white/5 text-slate-300 border-white/15"
                      )}
                      title="Click anywhere on the preview map to set Origin"
                    >
                      {clickPlacementMode === "from" ? "Click Map..." : "🎯 Pick on Map"}
                    </button>
                  </div>

                  <div className="text-xs font-bold text-white bg-black/50 px-2.5 py-1 rounded-lg border border-cyan-500/30 truncate">
                    {activeRoute.from.name}{" "}
                    <span className="text-[9px] font-mono text-slate-400">
                      ({activeRoute.from.lat}, {activeRoute.from.lon})
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={fromSearchQuery}
                      onChange={(e) => {
                        setFromSearchQuery(e.target.value);
                        searchLocations(e.target.value, "from");
                      }}
                      placeholder="Search Origin City/Country..."
                      className="w-full pl-7 pr-2 py-1 rounded-lg bg-black/70 border border-white/15 text-[11px] text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {fromResults.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-[#0e1020] border border-cyan-500/50 rounded-xl shadow-2xl max-h-40 overflow-y-auto divide-y divide-white/5">
                      {fromResults.map((loc, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectPoint("from", loc)}
                          className="w-full px-2.5 py-1.5 text-left text-[11px] text-slate-200 hover:bg-cyan-600/30 hover:text-white flex items-center justify-between"
                        >
                          <span className="truncate">{loc.name}</span>
                          <span className="text-[9px] font-mono text-cyan-300 shrink-0 ml-1">
                            {loc.lat.toFixed(1)},{loc.lon.toFixed(1)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Point B: Target */}
                <div className="space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-rose-300 flex items-center gap-1">
                      <Crosshair className="w-3 h-3 text-rose-400" />
                      <span>2. Target / Destination</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setClickPlacementMode(clickPlacementMode === "to" ? null : "to")
                      }
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-bold border",
                        clickPlacementMode === "to"
                          ? "bg-rose-500 text-white border-rose-300 animate-pulse"
                          : "bg-white/5 text-slate-300 border-white/15"
                      )}
                      title="Click anywhere on the preview map to set Target"
                    >
                      {clickPlacementMode === "to" ? "Click Map..." : "🎯 Pick on Map"}
                    </button>
                  </div>

                  <div className="text-xs font-bold text-white bg-black/50 px-2.5 py-1 rounded-lg border border-rose-500/30 truncate">
                    {activeRoute.to.name}{" "}
                    <span className="text-[9px] font-mono text-slate-400">
                      ({activeRoute.to.lat}, {activeRoute.to.lon})
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={toSearchQuery}
                      onChange={(e) => {
                        setToSearchQuery(e.target.value);
                        searchLocations(e.target.value, "to");
                      }}
                      placeholder="Search Target City/Country..."
                      className="w-full pl-7 pr-2 py-1 rounded-lg bg-black/70 border border-white/15 text-[11px] text-white focus:outline-none focus:border-rose-400"
                    />
                  </div>

                  {toResults.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-[#0e1020] border border-rose-500/50 rounded-xl shadow-2xl max-h-40 overflow-y-auto divide-y divide-white/5">
                      {toResults.map((loc, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectPoint("to", loc)}
                          className="w-full px-2.5 py-1.5 text-left text-[11px] text-slate-200 hover:bg-rose-600/30 hover:text-white flex items-center justify-between"
                        >
                          <span className="truncate">{loc.name}</span>
                          <span className="text-[9px] font-mono text-rose-300 shrink-0 ml-1">
                            {loc.lat.toFixed(1)},{loc.lon.toFixed(1)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Animated Vehicle / Projectile Selector */}
            {activeRoute && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase text-slate-400">
                    Select Animated Vehicle / Projectile on Path
                  </label>
                  <input
                    ref={customIconInputRef}
                    type="file"
                    accept="image/png,image/gif,image/svg+xml,image/webp,image/jpeg"
                    className="hidden"
                    onChange={handleCustomIconUpload}
                  />
                  <button
                    type="button"
                    onClick={() => customIconInputRef.current?.click()}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Custom Icon PNG/GIF</span>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: "missile", label: "🚀 Missile" },
                    { id: "salvo", label: "🚀🚀 3x Salvo" },
                    { id: "fighter-jet", label: "✈️ Fighter Jet" },
                    { id: "airliner", label: "🛫 Airliner" },
                    { id: "drone", label: "🛸 Drone UAV" },
                    { id: "helicopter", label: "🚁 Helicopter" },
                    { id: "warship", label: "🚢 Warship" },
                    { id: "custom-image", label: "🖼️ Custom PNG" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.id === "custom-image" && !activeRoute.customIconUrl) {
                          customIconInputRef.current?.click();
                        } else {
                          updateActiveRoute({ assetType: item.id as TacticalRouteAssetType });
                        }
                      }}
                      className={cn(
                        "py-1.5 px-1.5 rounded-lg text-[10px] font-semibold border text-center transition-all truncate",
                        activeRoute.assetType === item.id
                          ? "bg-rose-600/35 border-rose-400 text-white font-bold shadow"
                          : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Map Camera Zoom, Arc Height, Speed & Color */}
            {activeRoute && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-black/40 border border-white/10">
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-400">Map Zoom Level</span>
                    <span className="font-mono text-cyan-300">{mapConfig.zoom}x</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={9}
                    step={1}
                    value={mapConfig.zoom}
                    onChange={(e) => setMapConfig({ ...mapConfig, zoom: Number(e.target.value) })}
                    className="w-full h-1.5 accent-cyan-400 bg-white/15 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-400">Flight Arc Height</span>
                    <span className="font-mono text-amber-300">
                      {Math.round((activeRoute.arcHeight ?? 0.32) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.6}
                    step={0.04}
                    value={activeRoute.arcHeight ?? 0.32}
                    onChange={(e) => updateActiveRoute({ arcHeight: Number(e.target.value) })}
                    className="w-full h-1.5 accent-amber-400 bg-white/15 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-400">Map Theme</span>
                  </div>
                  <select
                    value={mapConfig.mapStyle}
                    onChange={(e) =>
                      setMapConfig({
                        ...mapConfig,
                        mapStyle: e.target.value as TacticalMapConfig["mapStyle"],
                      })
                    }
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-2 py-1 text-[11px] text-white"
                  >
                    <option value="dark-radar">🌑 Dark Tactical Radar</option>
                    <option value="satellite">🛰️ Satellite Imagery</option>
                    <option value="political">🗺️ Clean Political Map</option>
                    <option value="vector-grid">🎯 Tactical Grid Only</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-400">Trajectory Color</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {["#ef4444", "#38bdf8", "#facc15", "#10b981", "#a855f7"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => updateActiveRoute({ color: c })}
                        style={{ backgroundColor: c }}
                        className={cn(
                          "w-5 h-5 rounded-full border",
                          activeRoute.color === c ? "ring-2 ring-white scale-110" : "border-white/20"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Saved Tactical Maps Library */}
            {savedMaps.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-white/10">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Saved Tactical Maps Library (Click to Attach to Scene)
                </span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                  {savedMaps.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        if (effectiveSceneId) updateScene(effectiveSceneId, { activeMedia: m });
                        if (!targetSceneId || targetSceneId === activeSceneId) setActiveMedia(m);
                        onSaveMapItem?.(m);
                        onClose();
                      }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-cyan-950/30 border border-white/10 hover:border-cyan-500/40 flex items-center justify-between cursor-pointer text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">🗺️ {m.name}</div>
                        <div className="text-[10px] text-cyan-300 font-mono">{m.duration}</div>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            if (m.mapConfig) {
                              setMapConfig(m.mapConfig);
                              setEditingMapId(m.id);
                            }
                          }}
                          className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-200"
                          title="Load into Editor"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeMediaLibraryItem(m.id)}
                          className="p-1 rounded bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Interactive 1280x720 Tactical Map Canvas Preview (7 cols) */}
          <div className="lg:col-span-7 p-4 bg-[#070912] flex flex-col justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Live 60FPS Broadcast Map Preview (Click Map to Pan or Place Points)</span>
                </span>
                {clickPlacementMode && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500 text-white font-bold animate-pulse">
                    Click anywhere on map to set {clickPlacementMode === "from" ? "Origin (Point A)" : "Target (Point B)"}
                  </span>
                )}
              </div>

              <div className="w-full aspect-video rounded-2xl overflow-hidden border border-cyan-500/40 shadow-2xl relative bg-black">
                <TacticalMapStageCanvas
                  config={mapConfig}
                  isInteractive={true}
                  onMapClickLatLon={(lat, lon) => {
                    if (clickPlacementMode === "from") {
                      handleSelectPoint("from", {
                        name: `Point (${lat.toFixed(1)}°, ${lon.toFixed(1)}°)`,
                        lat,
                        lon,
                      });
                      setClickPlacementMode(null);
                    } else if (clickPlacementMode === "to") {
                      handleSelectPoint("to", {
                        name: `Target (${lat.toFixed(1)}°, ${lon.toFixed(1)}°)`,
                        lat,
                        lon,
                      });
                      setClickPlacementMode(null);
                    } else {
                      // Re-center map on clicked coordinates
                      setMapConfig((prev) => ({ ...prev, centerLat: lat, centerLon: lon }));
                    }
                  }}
                />
              </div>
            </div>

            {/* Footer Save & Attach Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
              <span className="text-[10.5px] text-slate-400">
                💡 Switching to a Scene with this map automatically launches the animation on Live Stream & Recording!
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveTacticalMap(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Save to Map Library</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveTacticalMap(true)}
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-600/25"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {targetScene ? `Save & Attach to "${targetScene.name}"` : "Save & Present Map on Stage"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
