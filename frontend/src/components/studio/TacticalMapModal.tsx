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
  Shield,
  Anchor,
} from "lucide-react";
import {
  MediaFileItem,
  TacticalMapConfig,
  TacticalMapPoint,
  TacticalMapRoute,
  TacticalRouteAssetType,
  TacticalTargetEffect,
  TacticalTargetMarkerType,
  useStudioStore,
} from "@/stores/studio.store";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// BUILT-IN OFFLINE GLOBAL, MARITIME & INDIAN STRATEGIC GAZETTEER (85+ Hotspots)
// Ensures 0ms instant search & fallback even if Nominatim is offline!
// ─────────────────────────────────────────────────────────────────────────────
export const STRATEGIC_LOCATIONS_GAZETTEER: TacticalMapPoint[] = [
  // India & Indian Ocean Naval Bases
  { name: "New Delhi, India", lat: 28.6139, lon: 77.209 },
  { name: "Mumbai / Western Naval Command, India", lat: 19.076, lon: 72.8777 },
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
  { name: "Karwar Naval Base (INS Kadamba), India", lat: 14.8185, lon: 74.124 },
  { name: "Kochi Southern Naval Command, India", lat: 9.9312, lon: 76.2673 },
  { name: "Andaman & Nicobar Command, India", lat: 11.6234, lon: 92.7265 },
  // Maritime Seas & Chokepoints
  { name: "Arabian Sea (Central)", lat: 16.5, lon: 64.5 },
  { name: "Bay of Bengal (Central)", lat: 14.0, lon: 87.5 },
  { name: "Indian Ocean (Central)", lat: -2.0, lon: 76.0 },
  { name: "Strait of Hormuz / Persian Gulf", lat: 26.566, lon: 56.25 },
  { name: "Gulf of Oman", lat: 24.5, lon: 58.5 },
  { name: "Red Sea / Bab el-Mandeb", lat: 14.5, lon: 41.8 },
  { name: "Gulf of Aden", lat: 12.5, lon: 47.5 },
  { name: "Suez Canal / Eastern Mediterranean", lat: 31.265, lon: 32.301 },
  { name: "Black Sea (Central)", lat: 43.3, lon: 34.0 },
  { name: "Taiwan Strait", lat: 24.4798, lon: 119.5 },
  { name: "South China Sea", lat: 14.5995, lon: 114.5 },
  { name: "Strait of Malacca", lat: 2.5, lon: 101.8 },
  // South Asia & Neighbors
  { name: "Islamabad, Pakistan", lat: 33.6844, lon: 73.0479 },
  { name: "Karachi Naval Port, Pakistan", lat: 24.8607, lon: 67.0011 },
  { name: "Gwadar Port, Pakistan", lat: 25.1264, lon: 62.3225 },
  { name: "Lahore, Pakistan", lat: 31.5204, lon: 74.3587 },
  { name: "Rawalpindi, Pakistan", lat: 33.5651, lon: 73.0169 },
  { name: "Kabul, Afghanistan", lat: 34.5553, lon: 69.2075 },
  { name: "Dhaka, Bangladesh", lat: 23.8103, lon: 90.4125 },
  { name: "Chittagong Port, Bangladesh", lat: 22.3569, lon: 91.7832 },
  { name: "Colombo / Hambantota, Sri Lanka", lat: 6.9271, lon: 79.8612 },
  { name: "Kathmandu, Nepal", lat: 27.7172, lon: 85.324 },
  // Middle East / West Asia
  { name: "Tel Aviv, Israel", lat: 32.0853, lon: 34.7818 },
  { name: "Jerusalem", lat: 31.7683, lon: 35.2137 },
  { name: "Gaza Strip", lat: 31.5017, lon: 34.4668 },
  { name: "Haifa Port, Israel", lat: 32.794, lon: 34.9896 },
  { name: "Eilat Port, Israel", lat: 29.5577, lon: 34.9519 },
  { name: "Tehran, Iran", lat: 35.6892, lon: 51.389 },
  { name: "Isfahan, Iran", lat: 32.6539, lon: 51.666 },
  { name: "Natanz, Iran", lat: 33.5114, lon: 51.9164 },
  { name: "Bandar Abbas Naval Base, Iran", lat: 27.1832, lon: 56.2666 },
  { name: "Kharg Island, Iran", lat: 29.2333, lon: 50.3167 },
  { name: "Beirut, Lebanon", lat: 33.8938, lon: 35.5018 },
  { name: "Damascus, Syria", lat: 33.5138, lon: 36.2765 },
  { name: "Baghdad, Iraq", lat: 33.3152, lon: 44.3661 },
  { name: "Sanaa / Hodeidah, Yemen", lat: 15.3694, lon: 44.191 },
  { name: "Riyadh, Saudi Arabia", lat: 24.7136, lon: 46.6753 },
  { name: "Jeddah Port, Saudi Arabia", lat: 21.4858, lon: 39.1925 },
  { name: "Dubai, UAE", lat: 25.2048, lon: 55.2708 },
  { name: "Doha, Qatar", lat: 25.2854, lon: 51.531 },
  { name: "Ankara, Turkey", lat: 39.9334, lon: 32.8597 },
  { name: "Istanbul, Turkey", lat: 41.0082, lon: 28.9784 },
  // Europe / Russia / Ukraine
  { name: "Kyiv, Ukraine", lat: 50.4501, lon: 30.5234 },
  { name: "Kharkiv, Ukraine", lat: 49.9935, lon: 36.2304 },
  { name: "Odesa Port, Ukraine", lat: 46.4825, lon: 30.7233 },
  { name: "Crimea / Sevastopol Naval Base", lat: 44.6166, lon: 33.5254 },
  { name: "Moscow, Russia", lat: 55.7558, lon: 37.6173 },
  { name: "London, UK", lat: 51.5074, lon: -0.1278 },
  { name: "Paris, France", lat: 48.8566, lon: 2.3522 },
  { name: "Berlin, Germany", lat: 52.52, lon: 13.405 },
  // East Asia & Americas
  { name: "Beijing, China", lat: 39.9042, lon: 116.4074 },
  { name: "Taipei, Taiwan", lat: 25.033, lon: 121.5654 },
  { name: "Pyongyang, North Korea", lat: 39.0392, lon: 125.7625 },
  { name: "Seoul, South Korea", lat: 37.5665, lon: 126.978 },
  { name: "Tokyo, Japan", lat: 35.6762, lon: 139.6503 },
  { name: "Singapore Port", lat: 1.3521, lon: 103.8198 },
  { name: "Washington D.C. / Pentagon, USA", lat: 38.9072, lon: -77.0369 },
  { name: "New York City, USA", lat: 40.7128, lon: -74.006 },
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

/**
 * 100% Free, Zero-API-Key, Zero-Watermark Esri ArcGIS World MapServer Tile URLs!
 * Replaces basemaps.cartocdn.com which showed "API KEY REQUIRED" on custom domains.
 */
function getTileUrl(style: TacticalMapConfig["mapStyle"], z: number, x: number, y: number): string | null {
  const maxTile = Math.pow(2, z);
  const wrappedX = ((x % maxTile) + maxTile) % maxTile;
  if (y < 0 || y >= maxTile) return null;
  if (style === "vector-grid") return null;
  if (style === "political") {
    return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${wrappedX}`;
  }
  if (style === "ocean") {
    return `https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/${z}/${y}/${wrappedX}`;
  }
  // Both "satellite" and "dark-radar" use Esri World_Imagery (with night-vision radar filter applied on canvas for dark-radar!)
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${wrappedX}`;
}

function getBoundariesOverlayTileUrl(style: TacticalMapConfig["mapStyle"], z: number, x: number, y: number): string | null {
  const maxTile = Math.pow(2, z);
  const wrappedX = ((x % maxTile) + maxTile) % maxTile;
  if (y < 0 || y >= maxTile) return null;
  if (style === "satellite" || style === "dark-radar" || style === "ocean") {
    return `https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${z}/${y}/${wrappedX}`;
  }
  return null;
}

// Draw static target marker at Point B (e.g., Enemy Warship in sea, Cargo Tanker, Airbase, Radar/SAM site)
function drawDestinationTargetObject(
  ctx: CanvasRenderingContext2D,
  markerType: TacticalTargetMarkerType | undefined,
  x: number,
  y: number,
  now: number
) {
  if (!markerType || markerType === "default") return;
  ctx.save();
  ctx.translate(x, y);

  if (markerType === "warship" || markerType === "cargo-ship") {
    // Subtle ocean ripple rings around target ship
    const waveR = 14 + ((now / 60) % 18);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, waveR * 1.4, waveR * 0.65, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Ship Hull at Point B
    ctx.fillStyle = markerType === "warship" ? "#94a3b8" : "#f59e0b";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(10, -7);
    ctx.lineTo(-20, -7);
    ctx.lineTo(-24, 0);
    ctx.lineTo(-20, 7);
    ctx.lineTo(10, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Superstructure / Containers
    ctx.fillStyle = markerType === "warship" ? "#e2e8f0" : "#ef4444";
    ctx.fillRect(-10, -4, 14, 8);
  } else if (markerType === "airbase") {
    // Runway strip icon
    ctx.fillStyle = "#1e293b";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-22, -7, 44, 14, 3);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(16, 0);
    ctx.stroke();
  } else if (markerType === "radar-site") {
    // SAM / Radar Dome + Rotating Dish
    ctx.fillStyle = "#0f172a";
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const ang = (now / 300) % (Math.PI * 2);
    ctx.strokeStyle = "#34d399";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(ang) * 12, Math.sin(ang) * 12);
    ctx.stroke();
  }

  ctx.restore();
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
  customIconUrl?: string,
  scaleFactor: number = 1
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(theta);
  if (scaleFactor !== 1) {
    ctx.scale(scaleFactor, scaleFactor);
  }

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

    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.quadraticCurveTo(12, -5.5, -14, -5.5);
    ctx.lineTo(-14, 5.5);
    ctx.quadraticCurveTo(12, 5.5, 22, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(10, -4.2);
    ctx.lineTo(10, 4.2);
    ctx.closePath();
    ctx.fill();

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
    const burner = 16 + Math.sin(now / 30) * 5;
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.moveTo(-16, -3);
    ctx.lineTo(-16 - burner, 0);
    ctx.lineTo(-16, 3);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(8, -4);
    ctx.lineTo(-6, -19);
    ctx.lineTo(-13, -19);
    ctx.lineTo(-10, -5);
    ctx.lineTo(-18, -9);
    ctx.lineTo(-18, 9);
    ctx.lineTo(-10, 5);
    ctx.lineTo(-13, 19);
    ctx.lineTo(-6, 19);
    ctx.lineTo(8, 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#0284c7";
    ctx.beginPath();
    ctx.ellipse(7, 0, 6, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (assetType === "airliner") {
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
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.ellipse(2, 0, 13, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-18, -1.8, 14, 3.6);

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
  } else if (assetType === "warship" || assetType === "cargo-ship") {
    // Animated White V-Shaped Sea Water Wake Waves Behind Ship!
    const wakeWave = (now / 40) % 14;
    ctx.strokeStyle = "rgba(224, 242, 254, 0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, -3);
    ctx.lineTo(-34 - wakeWave, -12 - wakeWave * 0.3);
    ctx.moveTo(-18, 3);
    ctx.lineTo(-34 - wakeWave, 12 + wakeWave * 0.3);
    ctx.stroke();

    // Naval Destroyer / Cargo Ship Hull
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = assetType === "cargo-ship" ? "#f59e0b" : "#94a3b8";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(9, -7);
    ctx.lineTo(-19, -7);
    ctx.lineTo(-23, 0);
    ctx.lineTo(-19, 7);
    ctx.lineTo(9, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bridge / Deck Turret
    ctx.fillStyle = assetType === "cargo-ship" ? "#ef4444" : "#f8fafc";
    ctx.fillRect(-8, -4, 14, 8);
  } else if (assetType === "tank") {
    // Armored Tank / Ground Convoy
    ctx.fillStyle = "#4d7c0f";
    ctx.strokeStyle = "#ecfccb";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-16, -9, 32, 18, 4);
    ctx.fill();
    ctx.stroke();
    // Turret & Main Gun Barrel
    ctx.fillStyle = "#365314";
    ctx.beginPath();
    ctx.arc(-2, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(22, 0);
    ctx.stroke();
  }

  ctx.restore();
}

// Helper to draw fiery explosion & shockwave at any (x, y) coordinate
function drawExplosionShockwave(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  impactPhase: number, // 0.0 to 1.0
  isMidAirIntercept: boolean = false
) {
  ctx.save();
  const r1 = 14 + impactPhase * 72;
  const r2 = 8 + impactPhase * 42;
  const alpha = Math.max(0, 1 - impactPhase);

  const blastGrad = ctx.createRadialGradient(x, y, 2, x, y, r1);
  if (isMidAirIntercept) {
    blastGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    blastGrad.addColorStop(0.35, `rgba(56, 189, 248, ${alpha * 0.95})`);
    blastGrad.addColorStop(0.7, `rgba(250, 204, 21, ${alpha * 0.75})`);
    blastGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
  } else {
    blastGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    blastGrad.addColorStop(0.35, `rgba(251, 191, 36, ${alpha * 0.92})`);
    blastGrad.addColorStop(0.7, `rgba(239, 68, 68, ${alpha * 0.75})`);
    blastGrad.addColorStop(1, "rgba(239, 68, 68, 0)");
  }

  ctx.fillStyle = blastGrad;
  ctx.beginPath();
  ctx.arc(x, y, r1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = isMidAirIntercept
    ? `rgba(56, 189, 248, ${alpha})`
    : `rgba(251, 191, 36, ${alpha})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// Helper to draw status callout badge near target
function drawStatusPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  borderColor: string,
  textColor: string = "#ffffff"
) {
  ctx.save();
  ctx.font = "bold 12px Inter, system-ui, sans-serif";
  const w = ctx.measureText(text).width + 20;
  ctx.fillStyle = "rgba(9, 12, 24, 0.92)";
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y, w, 24, 6);
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + 12);
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
  const progressRef = useRef(0); // 0.0 to 1.32
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
          ctx.fillStyle = localStyle === "political" ? "#cbd5e1" : "#040a14";
          ctx.fillRect(0, 0, W, H);

          const zoom = Math.max(2, Math.min(11, Math.round(config.zoom || 4)));
          const cTileX = lonToTileX(config.centerLon, zoom);
          const cTileY = latToTileY(config.centerLat, zoom);

          const startTileX = Math.floor(cTileX - W / 512) - 1;
          const endTileX = Math.ceil(cTileX + W / 512) + 1;
          const startTileY = Math.floor(cTileY - H / 512) - 1;
          const endTileY = Math.ceil(cTileY + H / 512) + 1;

          // 2. Draw Esri ArcGIS Slippy Map Tiles (100% Free, Zero API Key, Zero Watermarks!)
          if (localStyle !== "vector-grid") {
            ctx.save();
            // For "dark-radar", apply tactical dark night-vision filter over Esri World Imagery!
            if (localStyle === "dark-radar") {
              ctx.filter = "brightness(0.46) contrast(1.32) saturate(0.35) hue-rotate(175deg)";
            }
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
            ctx.restore();

            // 2B. Draw Country Borders & City Names Reference Layer on top of Satellite, Dark-Radar, and Ocean maps!
            for (let tx = startTileX; tx <= endTileX; tx++) {
              for (let ty = startTileY; ty <= endTileY; ty++) {
                const refUrl = getBoundariesOverlayTileUrl(localStyle, zoom, tx, ty);
                if (!refUrl) continue;
                let refImg = globalTileCache.get(refUrl);
                if (!refImg) {
                  refImg = new Image();
                  refImg.crossOrigin = "anonymous";
                  refImg.src = refUrl;
                  globalTileCache.set(refUrl, refImg);
                }
                if (refImg.complete && refImg.naturalWidth > 0) {
                  const drawX = Math.round(W / 2 + (tx - cTileX) * 256);
                  const drawY = Math.round(H / 2 + (ty - cTileY) * 256);
                  try {
                    ctx.save();
                    ctx.globalAlpha = localStyle === "dark-radar" ? 0.78 : 0.92;
                    ctx.drawImage(refImg, drawX, drawY, 256, 256);
                    ctx.restore();
                  } catch {}
                }
              }
            }
          }

          if (localStyle === "satellite") {
            ctx.fillStyle = "rgba(4, 10, 22, 0.18)";
            ctx.fillRect(0, 0, W, H);
          }

          // 3. Tactical Lat/Lon Grid Overlay
          if (config.showGridLines !== false || localStyle === "vector-grid") {
            ctx.save();
            ctx.strokeStyle =
              localStyle === "political"
                ? "rgba(15, 23, 42, 0.08)"
                : "rgba(6, 182, 212, 0.15)";
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
            progressRef.current += dt * 0.26 * baseRouteSpeed * speedMultiplier;
            if (progressRef.current > 1.35) {
              if (config.loopAnimation !== false) {
                progressRef.current = 0;
              } else {
                progressRef.current = 1.35;
                setIsPlaying(false);
              }
            }
          }
          const rawP = progressRef.current;
          const flightT = Math.max(0, Math.min(1, rawP));

          // 6. Render All Tactical Flight / Naval / Missile Routes & Target Scenarios
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

            // Resolve effective Target Effect (with smart fallback if legacy route)
            const effect: TacticalTargetEffect =
              route.targetEffect ||
              (route.assetType === "airliner"
                ? "landing"
                : route.assetType === "warship" || route.assetType === "cargo-ship"
                ? "naval-cruise"
                : route.showImpactShockwave === false
                ? "none"
                : "explosion");

            const isSeaRoute =
              effect === "naval-cruise" ||
              route.assetType === "warship" ||
              route.assetType === "cargo-ship";

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const distPx = Math.hypot(dx, dy);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            // Curve Direction: "straight" (0 arc), "down" (+arc), or default "up" (-arc)
            const curveDir = route.curveDirection || (isSeaRoute && (route.arcHeight ?? 0) === 0 ? "straight" : "up");
            const rawArc = curveDir === "straight" ? 0 : (route.arcHeight ?? (isSeaRoute ? 0 : 0.32));
            const signedArcOffset = distPx * rawArc * (curveDir === "down" ? 1 : -1);
            const ctrlX = midX;
            const ctrlY = midY + signedArcOffset;

            const getQuadraticPoint = (t: number, customCtrlX = ctrlX, customCtrlY = ctrlY, startPt = p1, endPt = p2) => {
              const u = 1 - t;
              return {
                x: u * u * startPt.x + 2 * u * t * customCtrlX + t * t * endPt.x,
                y: u * u * startPt.y + 2 * u * t * customCtrlY + t * t * endPt.y,
              };
            };

            const getQuadraticAngle = (t: number, customCtrlX = ctrlX, customCtrlY = ctrlY, startPt = p1, endPt = p2) => {
              const tx = 2 * (1 - t) * (customCtrlX - startPt.x) + 2 * t * (endPt.x - customCtrlX);
              const ty = 2 * (1 - t) * (customCtrlY - startPt.y) + 2 * t * (endPt.y - customCtrlY);
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

            // 6B. Draw Static Target Object at Point B if configured (e.g. Target Ship in sea for Ship-to-Ship strike!)
            const effectiveTargetMarker: TacticalTargetMarkerType =
              route.targetMarkerType ||
              (effect === "ship-launch-missile" ? "warship" : "default");
            drawDestinationTargetObject(ctx, effectiveTargetMarker, p2.x, p2.y, now);

            // 6C. Origin & Target Markers + Location Labels
            [
              { pt: p1, info: route.from, isTarget: false },
              { pt: p2, info: route.to, isTarget: true },
            ].forEach(({ pt, info, isTarget }) => {
              const isPeacefulTarget =
                isTarget && (effect === "landing" || effect === "naval-cruise" || effect === "hover-patrol" || effect === "airdrop" || effect === "none");
              const markerColor = !isTarget
                ? "#38bdf8"
                : isPeacefulTarget
                ? "#10b981"
                : "#ef4444";

              ctx.save();
              const pulseR = 10 + ((now / 45) % 18);
              ctx.strokeStyle = markerColor;
              ctx.lineWidth = 2;
              ctx.globalAlpha = Math.max(0.15, 1 - pulseR / 28);
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, pulseR, 0, Math.PI * 2);
              ctx.stroke();
              ctx.globalAlpha = 1;

              ctx.fillStyle = markerColor;
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 2;
              ctx.stroke();

              const labelTxt = info.name.split(",")[0].toUpperCase();
              ctx.font = "bold 14px Inter, system-ui, sans-serif";
              const lw = ctx.measureText(labelTxt).width + 20;
              const lx = pt.x - lw / 2;
              const ly = pt.y + 14;
              ctx.fillStyle = "rgba(9, 10, 20, 0.9)";
              ctx.beginPath();
              ctx.roundRect(lx, ly, lw, 26, 6);
              ctx.fill();
              ctx.strokeStyle = markerColor;
              ctx.lineWidth = 1.5;
              ctx.stroke();

              ctx.fillStyle = "#ffffff";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(labelTxt, pt.x, ly + 13);
              ctx.restore();
            });

            // 6D. Distance Badge in KM
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

            // ─────────────────────────────────────────────────────────────────
            // 6E. SCENARIO-SPECIFIC TRAJECTORY & VEHICLE / PROJECTILE ANIMATION
            // ─────────────────────────────────────────────────────────────────

            if (effect === "ship-launch-missile" || effect === "jet-airstrike") {
              // TWO-STAGE STAND-OFF ATTACK:
              // Stage 1 (rawP 0.0 -> 0.42): Carrier Vehicle (Ship on sea or Fighter Jet/Heli in air) moves from Point A to Launch Point (t = 0.38).
              // Stage 2 (rawP 0.42 -> 1.00): Carrier holds station at Launch Point & fires a high-speed Missile that arcs into Point B!
              const launchSplitP = 0.40;
              const carrierStopT = 0.36;
              const carrierT = rawP < launchSplitP ? (rawP / launchSplitP) * carrierStopT : carrierStopT;
              const carrierPos = getQuadraticPoint(carrierT);
              const carrierAng = getQuadraticAngle(carrierT);

              // Draw carrier's trail from p1 to carrierPos
              ctx.save();
              ctx.strokeStyle = "#38bdf8";
              ctx.lineWidth = 3.5;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              const cSteps = 20;
              for (let s = 1; s <= cSteps; s++) {
                const pt = getQuadraticPoint((s / cSteps) * carrierT);
                ctx.lineTo(pt.x, pt.y);
              }
              ctx.stroke();
              ctx.restore();

              // Draw the launching Ship / Jet / Helicopter
              const carrierAsset: TacticalRouteAssetType =
                effect === "ship-launch-missile"
                  ? route.assetType === "cargo-ship"
                    ? "cargo-ship"
                    : "warship"
                  : route.assetType === "helicopter"
                  ? "helicopter"
                  : "fighter-jet";

              drawTacticalAssetIcon(
                ctx,
                carrierAsset,
                carrierPos.x,
                carrierPos.y,
                carrierAng,
                "#38bdf8",
                now,
                route.customIconUrl
              );

              // Stage 2: Launch Missile from carrierPos to p2!
              if (rawP >= launchSplitP) {
                const missileT = Math.min(1, (rawP - launchSplitP) / (1 - launchSplitP));
                const mMidX = (carrierPos.x + p2.x) / 2;
                const mMidY = (carrierPos.y + p2.y) / 2 - Math.hypot(p2.x - carrierPos.x, p2.y - carrierPos.y) * 0.34;

                // Launch flash ring around ship/jet when missile fires
                if (missileT < 0.35) {
                  ctx.save();
                  ctx.strokeStyle = "rgba(251, 191, 36, 0.85)";
                  ctx.lineWidth = 2.5;
                  ctx.beginPath();
                  ctx.arc(carrierPos.x, carrierPos.y, 12 + missileT * 45, 0, Math.PI * 2);
                  ctx.stroke();
                  ctx.restore();
                }

                // Glowing red missile trail from ship/jet to target
                ctx.save();
                ctx.strokeStyle = "#ef4444";
                ctx.shadowColor = "#ef4444";
                ctx.shadowBlur = 14;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(carrierPos.x, carrierPos.y);
                const mSteps = 30;
                const maxMStep = Math.max(1, Math.floor(missileT * mSteps));
                for (let s = 1; s <= maxMStep; s++) {
                  const pt = getQuadraticPoint(s / mSteps, mMidX, mMidY, carrierPos, p2);
                  ctx.lineTo(pt.x, pt.y);
                }
                ctx.stroke();
                ctx.restore();

                if (missileT < 1) {
                  const mPos = getQuadraticPoint(missileT, mMidX, mMidY, carrierPos, p2);
                  const mAng = getQuadraticAngle(missileT, mMidX, mMidY, carrierPos, p2);
                  drawTacticalAssetIcon(ctx, "missile", mPos.x, mPos.y, mAng, "#ef4444", now);
                }

                if (rawP >= 0.96) {
                  const impactPhase = Math.min(1, (rawP - 0.96) / 0.35);
                  drawExplosionShockwave(ctx, p2.x, p2.y, impactPhase, false);
                  drawStatusPill(
                    ctx,
                    p2.x,
                    p2.y - 42,
                    effect === "ship-launch-missile" ? "💥 TARGET SHIP / SITE HIT" : "💥 AIRSTRIKE IMPACT",
                    "#ef4444",
                    "#fecaca"
                  );
                }
              }
            } else if (effect === "intercept") {
              // AIR DEFENSE MID-AIR INTERCEPT (Iron Dome / S-400):
              // Incoming threat flies from p1 up to t = 0.65; Interceptor launches from p2 and destroys it at t = 0.65!
              const interceptT = 0.64;
              const threatT = Math.min(interceptT, flightT);
              const interceptPoint = getQuadraticPoint(interceptT);

              // Threat trail from p1 to threatT
              ctx.save();
              ctx.strokeStyle = "#ef4444";
              ctx.shadowColor = "#ef4444";
              ctx.shadowBlur = 12;
              ctx.lineWidth = 3.5;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              for (let s = 1; s <= 25; s++) {
                const pt = getQuadraticPoint((s / 25) * threatT);
                ctx.lineTo(pt.x, pt.y);
              }
              ctx.stroke();
              ctx.restore();

              // Interceptor missile from p2 to interceptPoint (starts at flightT = 0.15, reaches at 0.64)
              if (flightT > 0.15) {
                const defT = Math.min(1, (flightT - 0.15) / (interceptT - 0.15));
                const defX = p2.x + (interceptPoint.x - p2.x) * defT;
                const defY = p2.y + (interceptPoint.y - p2.y) * defT;
                const defAng = Math.atan2(interceptPoint.y - p2.y, interceptPoint.x - p2.x);

                ctx.save();
                ctx.strokeStyle = "#38bdf8";
                ctx.shadowColor = "#38bdf8";
                ctx.shadowBlur = 12;
                ctx.lineWidth = 3;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(p2.x, p2.y);
                ctx.lineTo(defX, defY);
                ctx.stroke();
                ctx.restore();

                if (flightT < interceptT) {
                  drawTacticalAssetIcon(ctx, "missile", defX, defY, defAng, "#38bdf8", now, undefined, 0.85);
                }
              }

              if (flightT < interceptT) {
                const tPos = getQuadraticPoint(threatT);
                const tAng = getQuadraticAngle(threatT);
                drawTacticalAssetIcon(ctx, route.assetType, tPos.x, tPos.y, tAng, "#ef4444", now, route.customIconUrl);
              } else {
                const blastP = Math.min(1, (rawP - interceptT) / 0.45);
                drawExplosionShockwave(ctx, interceptPoint.x, interceptPoint.y, blastP, true);
                drawStatusPill(
                  ctx,
                  interceptPoint.x,
                  interceptPoint.y - 38,
                  "🛡️ INTERCEPTED IN MID-AIR",
                  "#38bdf8",
                  "#bae6fd"
                );
              }
            } else {
              // STANDARD PATH (Explosion, Safe Landing, Naval Cruise, Hover Patrol, Airdrop, None)
              // Smooth ease-out when landing or docking at port
              const effectiveT =
                effect === "landing" || effect === "naval-cruise"
                  ? 1 - Math.pow(1 - flightT, 1.65)
                  : flightT;

              // Active Trajectory Trail
              if (effectiveT > 0.01) {
                ctx.save();
                ctx.strokeStyle = route.color || "#ef4444";
                ctx.shadowColor = route.color || "#ef4444";
                ctx.shadowBlur = 14;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                const steps = 40;
                const maxStep = Math.max(1, Math.floor(effectiveT * steps));
                for (let s = 1; s <= maxStep; s++) {
                  const pt = getQuadraticPoint(s / steps);
                  ctx.lineTo(pt.x, pt.y);
                }
                const tipPt = getQuadraticPoint(effectiveT);
                ctx.lineTo(tipPt.x, tipPt.y);
                ctx.stroke();
                ctx.restore();
              }

              // Draw Vehicle(s)
              if (route.assetType === "salvo") {
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
              } else if (effect === "hover-patrol" && rawP >= 0.85) {
                // Orbit in a circle around Point B with scanning radar cone!
                const orbitAngle = ((rawP - 0.85) * 9) % (Math.PI * 2);
                const orbitRadius = 26;
                const ox = p2.x + Math.cos(orbitAngle) * orbitRadius;
                const oy = p2.y + Math.sin(orbitAngle) * orbitRadius;
                const tangentAngle = orbitAngle + Math.PI / 2;

                ctx.save();
                ctx.strokeStyle = "rgba(16, 185, 129, 0.45)";
                ctx.setLineDash([4, 4]);
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(p2.x, p2.y, orbitRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();

                drawTacticalAssetIcon(
                  ctx,
                  route.assetType,
                  ox,
                  oy,
                  tangentAngle,
                  route.color || "#10b981",
                  now,
                  route.customIconUrl
                );
                drawStatusPill(ctx, p2.x, p2.y - 42, "🔄 ON PATROL / LOITERING", "#10b981", "#a7f3d0");
              } else if (flightT < 1 || effect === "landing" || effect === "naval-cruise") {
                const curPos = getQuadraticPoint(effectiveT);
                const curAngle = getQuadraticAngle( Math.min(0.99, effectiveT) );
                // Scale down slightly on final touchdown for realistic landing perspective
                const landingScale =
                  effect === "landing" && effectiveT > 0.85
                    ? Math.max(0.78, 1 - (effectiveT - 0.85) * 1.2)
                    : 1;
                drawTacticalAssetIcon(
                  ctx,
                  route.assetType,
                  curPos.x,
                  curPos.y,
                  curAngle,
                  route.color || "#ef4444",
                  now,
                  route.customIconUrl,
                  landingScale
                );
              }

              // Target Arrival Effects at Point B (rawP >= 0.94)
              if (rawP >= 0.94) {
                const phase = Math.min(1, (rawP - 0.94) / 0.38);
                if (effect === "explosion") {
                  drawExplosionShockwave(ctx, p2.x, p2.y, phase, false);
                } else if (effect === "landing") {
                  // Green Safe Touchdown Beacon Ring + Badge
                  ctx.save();
                  ctx.strokeStyle = `rgba(16, 185, 129, ${1 - phase * 0.6})`;
                  ctx.lineWidth = 3;
                  ctx.beginPath();
                  ctx.arc(p2.x, p2.y, 14 + phase * 28, 0, Math.PI * 2);
                  ctx.stroke();
                  ctx.restore();
                  drawStatusPill(ctx, p2.x, p2.y - 42, "🛬 SAFE LANDING • ARRIVED", "#10b981", "#a7f3d0");
                } else if (effect === "naval-cruise") {
                  // Cyan Naval Port / Patrol Sonar Ring + Badge
                  ctx.save();
                  ctx.strokeStyle = `rgba(6, 182, 212, ${1 - phase * 0.5})`;
                  ctx.lineWidth = 2.5;
                  ctx.beginPath();
                  ctx.arc(p2.x, p2.y, 16 + phase * 32, 0, Math.PI * 2);
                  ctx.stroke();
                  ctx.restore();
                  drawStatusPill(ctx, p2.x, p2.y - 42, "⚓ NAVAL PATROL / DOCKED", "#06b6d4", "#a5f3fc");
                } else if (effect === "airdrop") {
                  // 3 Animated Parachutes Floating Down onto Point B!
                  [-18, 0, 18].forEach((offsetX, pIdx) => {
                    const dropY = p2.y - 38 + phase * 36 + pIdx * 4;
                    const dropX = p2.x + offsetX + Math.sin(now / 180 + pIdx) * 4;
                    ctx.save();
                    // Parachute Canopy
                    ctx.fillStyle = "#38bdf8";
                    ctx.beginPath();
                    ctx.arc(dropX, dropY, 9, Math.PI, 0, false);
                    ctx.fill();
                    // Suspension lines & payload box
                    ctx.strokeStyle = "#e2e8f0";
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(dropX - 7, dropY);
                    ctx.lineTo(dropX, dropY + 10);
                    ctx.moveTo(dropX + 7, dropY);
                    ctx.lineTo(dropX, dropY + 10);
                    ctx.stroke();
                    ctx.fillStyle = "#facc15";
                    ctx.fillRect(dropX - 3.5, dropY + 10, 7, 6);
                    ctx.restore();
                  });
                  drawStatusPill(ctx, p2.x, p2.y - 54, "🪂 AIRDROP DELIVERED", "#38bdf8", "#bae6fd");
                }
              }
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

            ctx.fillStyle = "#e11d48";
            ctx.beginPath();
            ctx.roundRect(34, 30, 74, 24, 5);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 11px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("LIVE MAP", 71, 42);

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
            <span>{isPlaying ? "Pause" : "Animate"}</span>
          </button>

          <button
            type="button"
            onClick={handleReplay}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold flex items-center gap-1 shadow"
            title="Restart Animation from Origin"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Replay</span>
          </button>

          {/* Speed Selector */}
          <select
            value={String(speedMultiplier)}
            onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
            className="bg-slate-900 border border-white/15 rounded px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 focus:outline-none"
            title="Animation Speed"
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
            title="Switch Broadcast Map Theme (All 100% Free, Zero API Key)"
          >
            <option value="dark-radar">🌑 Dark Radar</option>
            <option value="satellite">🛰️ Satellite + Borders</option>
            <option value="political">🗺️ Political Street</option>
            <option value="ocean">🌊 Maritime / Sea</option>
            <option value="vector-grid">🎯 Grid Only</option>
          </select>

          {onOpenEditorModal && (
            <button
              type="button"
              onClick={onOpenEditorModal}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-semibold flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit Map / Scenario</span>
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
    mapStyle: "satellite",
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
        targetEffect: "explosion",
        targetMarkerType: "default",
        curveDirection: "up",
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
  const [editingMapId, setEditingMapId] = useState<string | null>(initialItem?.id || null);
  const customIconInputRef = useRef<HTMLInputElement | null>(null);

  const effectiveSceneId = targetSceneId || activeSceneId;
  const targetScene = scenes.find((s) => s.id === effectiveSceneId);
  const savedMaps = React.useMemo(
    () => mediaLibrary.filter((m) => m.type === "map" || Boolean(m.mapConfig)),
    [mediaLibrary]
  );

  const activeRoute = mapConfig.routes[activeRouteIdx] || mapConfig.routes[0];

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

    if (side === "from") setFromResults(localMatches);
    else setToResults(localMatches);

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
    } catch {}
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

  // Smart Auto-Configuration when user selects a Vehicle Type
  const handleSelectAssetType = (assetType: TacticalRouteAssetType) => {
    if (assetType === "custom-image" && !activeRoute.customIconUrl) {
      customIconInputRef.current?.click();
      return;
    }
    if (assetType === "airliner") {
      // Passenger Airliner -> Safe Landing by default, gentle flight curve, cyan color
      updateActiveRoute({
        assetType,
        targetEffect: "landing",
        showImpactShockwave: false,
        arcHeight: 0.18,
        curveDirection: "up",
        color: "#38bdf8",
      });
    } else if (assetType === "helicopter") {
      // Helicopter -> Safe Landing by default (can also choose Hover Patrol / Airdrop / Strike)
      updateActiveRoute({
        assetType,
        targetEffect: "landing",
        showImpactShockwave: false,
        arcHeight: 0.15,
        curveDirection: "up",
        color: "#10b981",
      });
    } else if (assetType === "warship" || assetType === "cargo-ship") {
      // Ship -> Flat Sea Route (arcHeight = 0) + Naval Cruise (no explosion unless Ship Fires Missile is chosen!)
      updateActiveRoute({
        assetType,
        targetEffect: "naval-cruise",
        showImpactShockwave: false,
        arcHeight: 0,
        curveDirection: "straight",
        color: "#06b6d4",
      });
    } else if (assetType === "tank") {
      updateActiveRoute({
        assetType,
        targetEffect: "none",
        showImpactShockwave: false,
        arcHeight: 0,
        curveDirection: "straight",
        color: "#facc15",
      });
    } else if (assetType === "fighter-jet") {
      updateActiveRoute({
        assetType,
        targetEffect: "jet-airstrike",
        showImpactShockwave: true,
        arcHeight: 0.24,
        curveDirection: "up",
        color: "#ef4444",
      });
    } else {
      // Missile / Salvo / Drone
      updateActiveRoute({
        assetType,
        targetEffect: "explosion",
        showImpactShockwave: true,
        arcHeight: 0.34,
        curveDirection: "up",
        color: "#ef4444",
      });
    }
  };

  const handleSelectPoint = (side: "from" | "to", pt: TacticalMapPoint) => {
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
      from: { name: "Mumbai / Western Naval Command, India", lat: 19.076, lon: 72.8777 },
      to: { name: "Arabian Sea (Central)", lat: 16.5, lon: 64.5 },
      assetType: "warship",
      targetEffect: "ship-launch-missile",
      targetMarkerType: "warship",
      curveDirection: "straight",
      color: "#06b6d4",
      arcHeight: 0,
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

  const currentTargetEffect: TacticalTargetEffect =
    activeRoute?.targetEffect ||
    (activeRoute?.assetType === "airliner"
      ? "landing"
      : activeRoute?.assetType === "warship" || activeRoute?.assetType === "cargo-ship"
      ? "naval-cruise"
      : "explosion");

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
        <div className="px-5 py-3 border-b border-white/10 bg-[#111426] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Broadcast News Tactical Map — Air, Land & Naval Animator</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  100% Free Esri ArcGIS • Zero API Key • Air, Sea & Missile Scenarios
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Animate Passenger Flights (Safe Landing), Naval Ships (Sea Cruise or Ship-to-Ship Missile Strike), Fighter Jets & Air Defense Intercepts
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
          {/* Left Column: Map Search, Points, Vehicle & Target Scenario Controls (5 cols) */}
          <div className="lg:col-span-5 p-4 space-y-3 overflow-y-auto custom-scrollbar">
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
                  placeholder="e.g. BREAKING: NAVAL & FLIGHT TRACKER"
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
                  placeholder="e.g. Live Radar & Distance Analysis"
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
                  title="Add another simultaneous flight/ship/missile path"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 rounded-xl bg-indigo-950/25 border border-indigo-500/30">
                {/* Point A: Origin */}
                <div className="space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-cyan-300 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      <span>1. Origin / Launch</span>
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
                    >
                      {clickPlacementMode === "from" ? "Click Map..." : "🎯 Pick on Map"}
                    </button>
                  </div>

                  <div className="text-xs font-bold text-white bg-black/50 px-2.5 py-1 rounded-lg border border-cyan-500/30 truncate">
                    {activeRoute.from.name}
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
                      placeholder="Search City / Sea / Port..."
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
                      <span>2. Destination / Target</span>
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
                    >
                      {clickPlacementMode === "to" ? "Click Map..." : "🎯 Pick on Map"}
                    </button>
                  </div>

                  <div className="text-xs font-bold text-white bg-black/50 px-2.5 py-1 rounded-lg border border-rose-500/30 truncate">
                    {activeRoute.to.name}
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
                      placeholder="Search Destination / Sea..."
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
                    3. Select Vehicle / Vessel / Projectile
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
                    <span>Upload Custom PNG/GIF</span>
                  </button>
                </div>

                <div className="grid grid-cols-5 gap-1">
                  {[
                    { id: "missile", label: "🚀 Missile" },
                    { id: "salvo", label: "🚀🚀 3x Salvo" },
                    { id: "fighter-jet", label: "✈️ Fighter Jet" },
                    { id: "airliner", label: "🛫 Airliner" },
                    { id: "helicopter", label: "🚁 Helicopter" },
                    { id: "warship", label: "🚢 Warship" },
                    { id: "cargo-ship", label: "⛴️ Cargo Ship" },
                    { id: "drone", label: "🛸 Drone UAV" },
                    { id: "tank", label: "🛡️ Tank/Convoy" },
                    { id: "custom-image", label: "🖼️ Custom" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectAssetType(item.id as TacticalRouteAssetType)}
                      className={cn(
                        "py-1.5 px-1 rounded-lg text-[9.5px] font-semibold border text-center transition-all truncate",
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

            {/* NEW: Target Arrival / Mission Scenario Selector (Landing, Sea Cruise, Ship Fires Missile, Jet Airstrike, Intercept, etc.) */}
            {activeRoute && (
              <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/35 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-emerald-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>4. Target Arrival & Mission Action (What happens at destination?)</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: "landing", label: "🛬 Safe Landing", desc: "Plane/Heli lands safely" },
                    { id: "naval-cruise", label: "⚓ Sea Cruise/Dock", desc: "Ship sails & docks (no hit)" },
                    { id: "ship-launch-missile", label: "🚢🚀 Ship Fires Missile", desc: "Ship launches missile at target!" },
                    { id: "jet-airstrike", label: "✈️🚀 Jet Fires Missile", desc: "Jet/Heli fires stand-off missile!" },
                    { id: "explosion", label: "💥 Direct Hit Blast", desc: "Missile/Bomb explosion at target" },
                    { id: "intercept", label: "🛡️ Mid-Air Intercept", desc: "Air defense destroys threat in sky" },
                    { id: "hover-patrol", label: "🔄 Orbit / Patrol", desc: "Circles over target with radar" },
                    { id: "airdrop", label: "🪂 Relief Airdrop", desc: "Drops parachutes over target" },
                  ].map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => {
                        const eff = sc.id as TacticalTargetEffect;
                        updateActiveRoute({
                          targetEffect: eff,
                          showImpactShockwave: eff === "explosion" || eff === "ship-launch-missile" || eff === "jet-airstrike",
                          ...(eff === "naval-cruise" || eff === "ship-launch-missile"
                            ? { arcHeight: 0, curveDirection: "straight" }
                            : {}),
                          ...(eff === "ship-launch-missile" && (!activeRoute.targetMarkerType || activeRoute.targetMarkerType === "default")
                            ? { targetMarkerType: "warship" }
                            : {}),
                        });
                      }}
                      title={sc.desc}
                      className={cn(
                        "p-1.5 rounded-lg border text-left transition-all",
                        currentTargetEffect === sc.id
                          ? "bg-emerald-600/35 border-emerald-400 text-white font-bold shadow"
                          : "bg-black/40 border-white/10 text-slate-300 hover:text-white"
                      )}
                    >
                      <div className="text-[9.5px] font-bold truncate">{sc.label}</div>
                      <div className="text-[8px] text-slate-400 truncate">{sc.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Target Marker Object at Point B + Curve Direction */}
                <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-white/10">
                  <div>
                    <label className="text-[9.5px] text-slate-300 block mb-0.5">
                      Target Object Shown at Point B:
                    </label>
                    <select
                      value={activeRoute.targetMarkerType || "default"}
                      onChange={(e) =>
                        updateActiveRoute({
                          targetMarkerType: e.target.value as TacticalTargetMarkerType,
                        })
                      }
                      className="w-full bg-slate-900 border border-white/15 rounded-lg px-2 py-1 text-[10px] text-white"
                    >
                      <option value="default">📍 Standard Target Pin</option>
                      <option value="warship">🚢 Enemy Warship in Sea</option>
                      <option value="cargo-ship">⛴️ Cargo / Oil Tanker Ship</option>
                      <option value="airbase">🛫 Military Airbase / Runway</option>
                      <option value="radar-site">📡 Radar / SAM Battery</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9.5px] text-slate-300 block mb-0.5">
                      Path Curve Direction:
                    </label>
                    <select
                      value={activeRoute.curveDirection || (activeRoute.arcHeight === 0 ? "straight" : "up")}
                      onChange={(e) => {
                        const dir = e.target.value as "up" | "straight" | "down";
                        updateActiveRoute({
                          curveDirection: dir,
                          arcHeight: dir === "straight" ? 0 : Math.max(0.18, activeRoute.arcHeight || 0.28),
                        });
                      }}
                      className="w-full bg-slate-900 border border-white/15 rounded-lg px-2 py-1 text-[10px] text-white"
                    >
                      <option value="up">⤴️ Curve Up (Ballistic / Air)</option>
                      <option value="straight">➡️ Straight Line (Sea / Direct)</option>
                      <option value="down">⤵️ Curve Down (Coastal Route)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Map Camera Zoom, Arc Height, Theme & Color */}
            {activeRoute && (
              <div className="grid grid-cols-2 gap-2.5 p-2.5 rounded-xl bg-black/40 border border-white/10">
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
                    <span className="text-slate-400">Arc Curvature</span>
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
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateActiveRoute({
                        arcHeight: val,
                        curveDirection: val === 0 ? "straight" : activeRoute.curveDirection === "straight" ? "up" : activeRoute.curveDirection,
                      });
                    }}
                    className="w-full h-1.5 accent-amber-400 bg-white/15 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-slate-400">Map Theme (Zero API Key)</span>
                  </div>
                  <select
                    value={mapConfig.mapStyle}
                    onChange={(e) =>
                      setMapConfig({
                        ...mapConfig,
                        mapStyle: e.target.value as TacticalMapConfig["mapStyle"],
                      })
                    }
                    className="w-full bg-slate-900 border border-white/15 rounded-lg px-2 py-1 text-[10.5px] text-white"
                  >
                    <option value="satellite">🛰️ Satellite + Country Borders</option>
                    <option value="dark-radar">🌑 Dark Tactical Night-Vision</option>
                    <option value="political">🗺️ Clean Political / Street Map</option>
                    <option value="ocean">🌊 Maritime / Naval Ocean Map</option>
                    <option value="vector-grid">🎯 Tactical Radar Grid Only</option>
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
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1 custom-scrollbar">
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
                          <Trash2 className="w-3.5 h-3.5" />
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
                      setMapConfig((prev) => ({ ...prev, centerLat: lat, centerLon: lon }));
                    }
                  }}
                />
              </div>
            </div>

            {/* Footer Save & Attach Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
              <span className="text-[10.5px] text-slate-400">
                💡 All 5 Map Themes use 100% Free Esri ArcGIS tiles (zero API key watermarks) & record at 60FPS!
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
