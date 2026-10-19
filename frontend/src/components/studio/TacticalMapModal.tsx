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
  Sparkles,
  Upload,
  Check,
  MapPin,
  Edit2,
  Box,
  Gamepad2,
  Flame,
  ZoomIn,
  ZoomOut,
  Move,
  Maximize2,
  Radio,
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
// ─────────────────────────────────────────────────────────────────────────────
export const STRATEGIC_LOCATIONS_GAZETTEER: TacticalMapPoint[] = [
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
  { name: "Kyiv, Ukraine", lat: 50.4501, lon: 30.5234 },
  { name: "Kharkiv, Ukraine", lat: 49.9935, lon: 36.2304 },
  { name: "Odesa Port, Ukraine", lat: 46.4825, lon: 30.7233 },
  { name: "Crimea / Sevastopol Naval Base", lat: 44.6166, lon: 33.5254 },
  { name: "Moscow, Russia", lat: 55.7558, lon: 37.6173 },
  { name: "London, UK", lat: 51.5074, lon: -0.1278 },
  { name: "Paris, France", lat: 48.8566, lon: 2.3522 },
  { name: "Berlin, Germany", lat: 52.52, lon: 13.405 },
  { name: "Beijing, China", lat: 39.9042, lon: 116.4074 },
  { name: "Taipei, Taiwan", lat: 25.033, lon: 121.5654 },
  { name: "Pyongyang, North Korea", lat: 39.0392, lon: 125.7625 },
  { name: "Seoul, South Korea", lat: 37.5665, lon: 126.978 },
  { name: "Tokyo, Japan", lat: 35.6762, lon: 139.6503 },
  { name: "Singapore Port", lat: 1.3521, lon: 103.8198 },
  { name: "Washington D.C. / Pentagon, USA", lat: 38.9072, lon: -77.0369 },
  { name: "New York City, USA", lat: 40.7128, lon: -74.006 },
];

// Deterministic Starfield for 3D Globe Space & High-Altitude 3D Sky
const SPACE_STARFIELD = Array.from({ length: 150 }, (_, idx) => ({
  xPct: ((idx * 73 + 19) % 1000) / 1000,
  yPct: ((idx * 137 + 43) % 1000) / 1000,
  r: 0.7 + (idx % 4) * 0.45,
  phase: (idx * 0.7) % (Math.PI * 2),
  tint: idx % 5 === 0 ? "#bae6fd" : idx % 7 === 0 ? "#fef08a" : "#ffffff",
}));

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

/**
 * Projects a 2D map coordinate (x, y) + altitude (zPx) through a 3D Tilted Camera Matrix (pitchDeg + yawDeg)
 */
function projectPoint3D(
  mapX: number,
  mapY: number,
  altitudePx: number,
  W: number,
  H: number,
  pitchDeg: number,
  yawDeg: number
): { x: number; y: number; scale: number } {
  if (pitchDeg <= 1 && Math.abs(yawDeg) <= 1 && altitudePx === 0) {
    return { x: mapX, y: mapY, scale: 1 };
  }
  const cx = W / 2;
  const cy = H * 0.56;
  const dx = mapX - cx;
  const dy = mapY - cy;

  const yawRad = (yawDeg * Math.PI) / 180;
  const cosY = Math.cos(yawRad);
  const sinY = Math.sin(yawRad);
  const rx = dx * cosY - dy * sinY;
  const ry = dx * sinY + dy * cosY;

  const pitchRad = (Math.max(0, Math.min(64, pitchDeg)) * Math.PI) / 180;
  const cosP = Math.cos(pitchRad);
  const sinP = Math.sin(pitchRad);

  const fov = 1100;
  const depthZ = ry * sinP;
  const perspectiveFactor = fov / Math.max(280, fov - depthZ * 0.55);

  const screenX = cx + rx * perspectiveFactor;
  const screenY =
    cy +
    ry * cosP * perspectiveFactor -
    altitudePx * (0.72 + sinP * 0.55) * perspectiveFactor;
  return {
    x: screenX,
    y: screenY,
    scale: Math.max(0.55, Math.min(1.65, perspectiveFactor)),
  };
}

/**
 * Inverse projection from clicked 3D screen coordinate back to 2D Map plane coordinate
 */
function unprojectScreenToMapXY(
  screenX: number,
  screenY: number,
  W: number,
  H: number,
  pitchDeg: number,
  yawDeg: number
): { x: number; y: number } {
  if (pitchDeg <= 1 && Math.abs(yawDeg) <= 1) {
    return { x: screenX, y: screenY };
  }
  const cx = W / 2;
  const cy = H * 0.56;
  const pitchRad = (Math.max(0, Math.min(64, pitchDeg)) * Math.PI) / 180;
  const cosP = Math.max(0.35, Math.cos(pitchRad));
  const sinP = Math.sin(pitchRad);

  const ryApprox = (screenY - cy) / cosP;
  const fov = 1100;
  const perspectiveFactor = fov / Math.max(280, fov - ryApprox * sinP * 0.55);
  const rxApprox = (screenX - cx) / Math.max(0.5, perspectiveFactor);
  const ryCorrected = (screenY - cy) / (cosP * Math.max(0.5, perspectiveFactor));

  const yawRad = (-yawDeg * Math.PI) / 180;
  const cosY = Math.cos(yawRad);
  const sinY = Math.sin(yawRad);
  const dx = rxApprox * cosY - ryCorrected * sinY;
  const dy = rxApprox * sinY + ryCorrected * cosY;

  return { x: cx + dx, y: cy + dy };
}

/**
 * Projects Lat/Lon onto a 3D Orthographic Spherical Globe
 */
function latLonToGlobe3D(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number,
  radius: number,
  cx: number,
  cy: number,
  altitudePx: number = 0
): { x: number; y: number; visible: boolean; z: number } {
  const phi = (lat * Math.PI) / 180;
  const lambda = (lon * Math.PI) / 180;
  const phi0 = (centerLat * Math.PI) / 180;
  const lambda0 = (centerLon * Math.PI) / 180;
  const dLambda = lambda - lambda0;

  const cosC =
    Math.sin(phi0) * Math.sin(phi) +
    Math.cos(phi0) * Math.cos(phi) * Math.cos(dLambda);

  const rEff = radius + altitudePx;
  const x = cx + rEff * Math.cos(phi) * Math.sin(dLambda);
  const y =
    cy -
    rEff *
    (Math.cos(phi0) * Math.sin(phi) -
      Math.sin(phi0) * Math.cos(phi) * Math.cos(dLambda));

  return { x, y, visible: cosC >= -0.15, z: cosC };
}

/**
 * Inverse Orthographic Projection: Converts clicked (x, y) on 3D Globe back to (lat, lon)
 */
function globeXYToLatLon(
  screenX: number,
  screenY: number,
  centerLat: number,
  centerLon: number,
  radius: number,
  cx: number,
  cy: number
): { lat: number; lon: number } | null {
  const dx = screenX - cx;
  const dy = cy - screenY;
  const rho = Math.hypot(dx, dy);
  if (rho < 1e-4) {
    return { lat: centerLat, lon: centerLon };
  }
  const clampedRho = Math.min(radius * 0.995, rho);
  const c = Math.asin(clampedRho / radius);
  const sinC = Math.sin(c);
  const cosC = Math.cos(c);
  const phi0 = (centerLat * Math.PI) / 180;
  const lambda0 = (centerLon * Math.PI) / 180;

  const phi = Math.asin(
    cosC * Math.sin(phi0) + (dy * sinC * Math.cos(phi0)) / clampedRho
  );
  const lambda =
    lambda0 +
    Math.atan2(
      dx * sinC,
      clampedRho * Math.cos(phi0) * cosC - dy * Math.sin(phi0) * sinC
    );

  let lonDeg = (lambda * 180) / Math.PI;
  while (lonDeg > 180) lonDeg -= 360;
  while (lonDeg < -180) lonDeg += 360;

  return {
    lat: Number(Math.max(-82, Math.min(82, (phi * 180) / Math.PI)).toFixed(4)),
    lon: Number(lonDeg.toFixed(4)),
  };
}

const globalTileCache = new Map<string, HTMLImageElement>();
const customIconCache = new Map<string, HTMLImageElement>();

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
    const waveR = 14 + ((now / 60) % 18);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, waveR * 1.4, waveR * 0.65, 0, 0, Math.PI * 2);
    ctx.stroke();

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

    ctx.fillStyle = markerType === "warship" ? "#e2e8f0" : "#ef4444";
    ctx.fillRect(-10, -4, 14, 8);
  } else if (markerType === "airbase") {
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
    const wakeWave = (now / 40) % 14;
    ctx.strokeStyle = "rgba(224, 242, 254, 0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, -3);
    ctx.lineTo(-34 - wakeWave, -12 - wakeWave * 0.3);
    ctx.moveTo(-18, 3);
    ctx.lineTo(-34 - wakeWave, 12 + wakeWave * 0.3);
    ctx.stroke();

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

    ctx.fillStyle = assetType === "cargo-ship" ? "#ef4444" : "#f8fafc";
    ctx.fillRect(-8, -4, 14, 8);
  } else if (assetType === "tank") {
    ctx.fillStyle = "#4d7c0f";
    ctx.strokeStyle = "#ecfccb";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-16, -9, 32, 18, 4);
    ctx.fill();
    ctx.stroke();
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

function drawExplosionShockwave(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  impactPhase: number,
  isMidAirIntercept: boolean = false
) {
  ctx.save();
  const r1 = 14 + impactPhase * 76;
  const r2 = 8 + impactPhase * 46;
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

export type SimulatorCommandTool =
  | "launch-missile"
  | "air-defense-intercept"
  | "fighter-airstrike"
  | "naval-strike"
  | "airliner-flight";

export interface TacticalMapStageCanvasProps {
  config: TacticalMapConfig;
  fitMode?: "contain" | "cover";
  isInteractive?: boolean;
  simToolOverride?: SimulatorCommandTool;
  onSimToolChange?: (tool: SimulatorCommandTool) => void;
  onMapClickLatLon?: (lat: number, lon: number) => void;
  onConfigChange?: (updates: Partial<TacticalMapConfig>) => void;
  onOpenEditorModal?: () => void;
}

export const TacticalMapStageCanvas: React.FC<TacticalMapStageCanvasProps> = ({
  config,
  fitMode = "cover",
  isInteractive = true,
  simToolOverride,
  onSimToolChange,
  onMapClickLatLon,
  onConfigChange,
  onOpenEditorModal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenMapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotatedMapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [localStyle, setLocalStyle] = useState<TacticalMapConfig["mapStyle"]>(
    config.mapStyle || "satellite"
  );
  const [viewMode, setViewMode] = useState<"2d" | "3d-perspective" | "3d-globe">(
    config.viewMode || "3d-perspective"
  );
  const [pitchDeg, setPitchDeg] = useState<number>(config.pitchDeg ?? 42);
  const [yawDeg, setYawDeg] = useState<number>(config.yawDeg ?? 0);
  const [centerLat, setCenterLat] = useState<number>(config.centerLat || 32.8);
  const [centerLon, setCenterLon] = useState<number>(config.centerLon || 44.0);
  const [zoom, setZoom] = useState<number>(config.zoom || 5);
  const [globeScale, setGlobeScale] = useState<number>(config.globeScale ?? 1.18);
  const [showRadarSweep, setShowRadarSweep] = useState<boolean>(
    config.showRadarSweep !== false
  );

  // Interactive 3D Mouse Mode ("pan" vs "orbit") & Auto-Orbit 3D
  const [mouseControlMode, setMouseControlMode] = useState<"pan" | "orbit">("orbit");
  const [autoOrbit3D, setAutoOrbit3D] = useState<boolean>(false);

  // Interactive Simulator State (Works live on Stage & inside Editor!)
  const [simulatorActive, setSimulatorActive] = useState<boolean>(
    config.simulatorEnabled ?? false
  );
  const [simTool, setSimTool] = useState<SimulatorCommandTool>(
    simToolOverride || "launch-missile"
  );
  const [simRoutes, setSimRoutes] = useState<
    Array<TacticalMapRoute & { spawnedAt: number; simProgress: number }>
  >(() =>
    (config.simRoutes || []).map((r) => ({
      ...r,
      spawnedAt: performance.now(),
      simProgress: 0,
    }))
  );

  useEffect(() => {
    if (simToolOverride) {
      setSimTool(simToolOverride);
    }
  }, [simToolOverride]);

  const updateSimTool = (nextTool: SimulatorCommandTool) => {
    setSimTool(nextTool);
    onSimToolChange?.(nextTool);
  };

  // Mouse Drag Pan / 3D Orbit State
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const dragModeRef = useRef<"pan" | "orbit">("orbit");
  const dragStartRef = useRef({
    clientX: 0,
    clientY: 0,
    startLat: 0,
    startLon: 0,
    startPitch: 42,
    startYaw: 0,
    movedPx: 0,
  });

  const progressRef = useRef(0);
  const lastTimeRef = useRef<number>(performance.now());
  const simRoutesRef = useRef<
    Array<TacticalMapRoute & { spawnedAt: number; simProgress: number }>
  >(simRoutes);

  useEffect(() => {
    simRoutesRef.current = simRoutes;
  }, [simRoutes]);

  useEffect(() => {
    setLocalStyle(config.mapStyle || "satellite");
    if (config.viewMode) setViewMode(config.viewMode);
    if (typeof config.pitchDeg === "number") setPitchDeg(config.pitchDeg);
    if (typeof config.yawDeg === "number") setYawDeg(config.yawDeg);
    if (typeof config.centerLat === "number") setCenterLat(config.centerLat);
    if (typeof config.centerLon === "number") setCenterLon(config.centerLon);
    if (typeof config.zoom === "number") setZoom(config.zoom);
    if (typeof config.globeScale === "number") setGlobeScale(config.globeScale);
    if (typeof config.showRadarSweep === "boolean") setShowRadarSweep(config.showRadarSweep);
    if (typeof config.simulatorEnabled === "boolean") setSimulatorActive(config.simulatorEnabled);
    if (Array.isArray(config.simRoutes)) {
      if (config.simRoutes.length === 0 && simRoutesRef.current.length > 0) {
        simRoutesRef.current = [];
        setSimRoutes([]);
      } else if (config.simRoutes.length > simRoutesRef.current.length) {
        const synced = config.simRoutes.map((r, i) => ({
          ...r,
          spawnedAt: performance.now(),
          simProgress: simRoutesRef.current[i]?.simProgress ?? 0,
        }));
        simRoutesRef.current = synced;
        setSimRoutes(synced);
      }
    }
  }, [
    config.mapStyle,
    config.viewMode,
    config.pitchDeg,
    config.yawDeg,
    config.centerLat,
    config.centerLon,
    config.zoom,
    config.globeScale,
    config.showRadarSweep,
    config.simulatorEnabled,
    config.simRoutes,
  ]);

  const syncCameraToParent = useCallback(
    (updates: Partial<TacticalMapConfig>) => {
      onConfigChange?.(updates);
    },
    [onConfigChange]
  );

  const handleReplay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    progressRef.current = 0;
    simRoutesRef.current = simRoutesRef.current.map((sr) => ({ ...sr, simProgress: 0 }));
    setSimRoutes([...simRoutesRef.current]);
    setIsPlaying(true);
  };

  // Trigger a 5x Multi-Target Salvo Barrage in Simulator!
  const handleTriggerSalvoBarrage = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      const baseRoute = config.routes?.[0];
      const origin: TacticalMapPoint = baseRoute?.from || {
        name: "Command Launch Site",
        lat: Number((centerLat + 2.5).toFixed(3)),
        lon: Number((centerLon + 3.5).toFixed(3)),
      };
      const baseTarget: TacticalMapPoint = baseRoute?.to || {
        name: "Strategic Target Zone",
        lat: Number((centerLat - 2.0).toFixed(3)),
        lon: Number((centerLon - 3.5).toFixed(3)),
      };

      const offsets = [
        { dLat: 0, dLon: 0, label: "Salvo Alpha" },
        { dLat: 0.95, dLon: -0.75, label: "Salvo Bravo" },
        { dLat: -0.85, dLon: 0.9, label: "Salvo Charlie" },
        { dLat: 1.45, dLon: 0.65, label: "Salvo Delta" },
        { dLat: -1.25, dLon: -1.0, label: "Salvo Echo" },
      ];

      const now = performance.now();
      const barrageRoutes = offsets.map((off, idx) => ({
        id: `sim-salvo-${Date.now()}-${idx}`,
        from: origin,
        to: {
          name: `${baseTarget.name.split(",")[0]} (${off.label})`,
          lat: Number((baseTarget.lat + off.dLat).toFixed(3)),
          lon: Number((baseTarget.lon + off.dLon).toFixed(3)),
        },
        assetType: "missile" as TacticalRouteAssetType,
        targetEffect: "explosion" as TacticalTargetEffect,
        targetMarkerType: "radar-site" as TacticalTargetMarkerType,
        curveDirection: "up" as const,
        color: idx % 2 === 0 ? "#ef4444" : "#f97316",
        arcHeight: 0.32 + idx * 0.04,
        speed: 1.15 + idx * 0.08,
        showImpactShockwave: true,
        showDistanceKm: idx === 0,
        spawnedAt: now,
        simProgress: -idx * 0.09,
      }));

      const next = [...simRoutesRef.current, ...barrageRoutes];
      simRoutesRef.current = next;
      setSimRoutes(next);
      setIsPlaying(true);
      syncCameraToParent({ simRoutes: next });
    },
    [config.routes, centerLat, centerLon, syncCameraToParent]
  );

  // Spawn a dynamic Simulator Route when clicking on the map in Simulator Mode
  const spawnSimulatorActionAtLatLon = useCallback(
    (targetLat: number, targetLon: number, toolOverride?: SimulatorCommandTool) => {
      const activeTool = toolOverride || simTool;
      const baseOrigin: TacticalMapPoint = config.routes?.[0]?.from || {
        name: "Launch Command",
        lat: Number((centerLat + 2.2).toFixed(3)),
        lon: Number((centerLon + 3.2).toFixed(3)),
      };

      const clickedTarget: TacticalMapPoint = {
        name: `Target (${targetLat.toFixed(1)}°N, ${targetLon.toFixed(1)}°E)`,
        lat: targetLat,
        lon: targetLon,
      };

      let assetType: TacticalRouteAssetType = "missile";
      let targetEffect: TacticalTargetEffect = "explosion";
      let targetMarkerType: TacticalTargetMarkerType = "default";
      let color = "#ef4444";
      let arcHeight = 0.35;

      if (activeTool === "air-defense-intercept") {
        assetType = "missile";
        targetEffect = "intercept";
        targetMarkerType = "radar-site";
        color = "#38bdf8";
        arcHeight = 0.36;
      } else if (activeTool === "fighter-airstrike") {
        assetType = "fighter-jet";
        targetEffect = "jet-airstrike";
        targetMarkerType = "airbase";
        color = "#f97316";
        arcHeight = 0.26;
      } else if (activeTool === "naval-strike") {
        assetType = "warship";
        targetEffect = "ship-launch-missile";
        targetMarkerType = "warship";
        color = "#06b6d4";
        arcHeight = 0.0;
      } else if (activeTool === "airliner-flight") {
        assetType = "airliner";
        targetEffect = "landing";
        targetMarkerType = "airbase";
        color = "#10b981";
        arcHeight = 0.2;
      }

      const newSimRoute: TacticalMapRoute & { spawnedAt: number; simProgress: number } = {
        id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        from: baseOrigin,
        to: clickedTarget,
        assetType,
        targetEffect,
        targetMarkerType,
        curveDirection: arcHeight === 0 ? "straight" : "up",
        color,
        arcHeight,
        speed: 1.25,
        showImpactShockwave: true,
        showDistanceKm: true,
        spawnedAt: performance.now(),
        simProgress: 0,
      };

      const next = [...simRoutesRef.current, newSimRoute];
      simRoutesRef.current = next;
      setSimRoutes(next);
      setIsPlaying(true);
      syncCameraToParent({ simRoutes: next });
    },
    [config.routes, centerLat, centerLon, simTool, syncCameraToParent]
  );

  // Mouse Handlers for Real-Time Stage Pan, 3D Tilt/Orbit & Simulator Clicks
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    const isRightOrShift = e.button === 2 || e.shiftKey;
    dragModeRef.current =
      isRightOrShift || (viewMode === "3d-perspective" && mouseControlMode === "orbit")
        ? "orbit"
        : "pan";
    setIsDraggingMap(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startLat: centerLat,
      startLon: centerLon,
      startPitch: pitchDeg,
      startYaw: yawDeg,
      movedPx: 0,
    };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingMap || !canvasRef.current) return;
    e.stopPropagation();
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    dragStartRef.current.movedPx = Math.hypot(dx, dy);

    if (viewMode === "3d-globe") {
      const nextLon = ((dragStartRef.current.startLon - dx * 0.28 + 540) % 360) - 180;
      const nextLat = Math.max(-75, Math.min(75, dragStartRef.current.startLat + dy * 0.24));
      setCenterLat(Number(nextLat.toFixed(3)));
      setCenterLon(Number(nextLon.toFixed(3)));
    } else if (dragModeRef.current === "orbit") {
      const nextPitch = Math.max(0, Math.min(62, Math.round(dragStartRef.current.startPitch - dy * 0.28)));
      const nextYaw = Math.max(-180, Math.min(180, Math.round(dragStartRef.current.startYaw + dx * 0.42)));
      setPitchDeg(nextPitch);
      setYawDeg(nextYaw);
      if (viewMode === "2d" && nextPitch > 8) {
        setViewMode("3d-perspective");
      }
    } else {
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = 1280 / Math.max(1, rect.width);
      const scaleY = 720 / Math.max(1, rect.height);
      const degPerPx = 360 / (Math.pow(2, zoom) * 256);
      const nextLon = Math.max(-180, Math.min(180, Number((dragStartRef.current.startLon - dx * scaleX * degPerPx).toFixed(4))));
      const nextLat = Math.max(-78, Math.min(78, Number((dragStartRef.current.startLat + dy * scaleY * degPerPx * 0.85).toFixed(4))));
      setCenterLat(nextLat);
      setCenterLon(nextLon);
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingMap) return;
    setIsDraggingMap(false);
    if (dragStartRef.current.movedPx > 6) {
      syncCameraToParent({
        centerLat,
        centerLon,
        pitchDeg,
        yawDeg,
        viewMode,
      });
      return;
    }

    // Clean click (< 6px drag) -> resolve clicked Lat/Lon in 2D, 3D Tilt, or 3D Globe!
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = 1280 / Math.max(1, rect.width);
    const scaleY = 720 / Math.max(1, rect.height);
    const rawCx = (e.clientX - rect.left) * scaleX;
    const rawCy = (e.clientY - rect.top) * scaleY;

    let coords: { lat: number; lon: number } | null = null;
    if (viewMode === "3d-globe") {
      const globeRadius = Math.min(1280, 720) * 0.42 * globeScale;
      coords = globeXYToLatLon(rawCx, rawCy, centerLat, centerLon, globeRadius, 640, 720 * 0.52);
    } else {
      const effectivePitch = viewMode === "3d-perspective" ? pitchDeg : 0;
      const effectiveYaw = viewMode === "3d-perspective" ? yawDeg : 0;
      const unproj = unprojectScreenToMapXY(rawCx, rawCy, 1280, 720, effectivePitch, effectiveYaw);
      coords = canvasXYToLatLon(
        unproj.x,
        unproj.y,
        centerLat,
        centerLon,
        Math.max(2, Math.min(10, Math.round(zoom || 4))),
        1280,
        720
      );
    }

    if (!coords) return;

    if (simulatorActive) {
      spawnSimulatorActionAtLatLon(coords.lat, coords.lon);
    } else if (onMapClickLatLon) {
      onMapClickLatLon(coords.lat, coords.lon);
    }
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    if (viewMode === "3d-globe") {
      const step = e.deltaY < 0 ? 0.1 : -0.1;
      const nextScale = Number(Math.max(0.7, Math.min(1.85, globeScale + step)).toFixed(2));
      setGlobeScale(nextScale);
      syncCameraToParent({ globeScale: nextScale });
      return;
    }
    const delta = e.deltaY < 0 ? 1 : -1;
    const nextZ = Math.max(2, Math.min(10, zoom + delta));
    if (nextZ !== zoom) {
      setZoom(nextZ);
      syncCameraToParent({ zoom: nextZ });
    }
  };

  useEffect(() => {
    let animId: number;
    const W = 1280;
    const H = 720;

    if (!offscreenMapCanvasRef.current && typeof document !== "undefined") {
      const off = document.createElement("canvas");
      off.width = W;
      off.height = H;
      offscreenMapCanvasRef.current = off;
    }
    if (!rotatedMapCanvasRef.current && typeof document !== "undefined") {
      const rot = document.createElement("canvas");
      rot.width = W;
      rot.height = H;
      rotatedMapCanvasRef.current = rot;
    }

    const renderLoop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      if (autoOrbit3D && !isDraggingMap) {
        if (viewMode === "3d-globe") {
          setCenterLon((prev) => Number((((prev + dt * 14 + 540) % 360) - 180).toFixed(3)));
        } else {
          setYawDeg((prev) => {
            const next = prev + dt * 18;
            return next > 180 ? next - 360 : Number(next.toFixed(1));
          });
        }
      }

      const canvas = canvasRef.current;
      const offCanvas = offscreenMapCanvasRef.current;
      const rotCanvas = rotatedMapCanvasRef.current;
      if (canvas && offCanvas && rotCanvas) {
        const ctx = canvas.getContext("2d");
        const offCtx = offCanvas.getContext("2d");
        const rotCtx = rotCanvas.getContext("2d");
        if (ctx && offCtx && rotCtx) {
          const zInt = Math.max(2, Math.min(10, Math.round(zoom || 4)));
          const cTileX = lonToTileX(centerLon, zInt);
          const cTileY = latToTileY(centerLat, zInt);

          // ─────────────────────────────────────────────────────────────────
          // STEP 1: RENDER SLIPPY MAP TILES & BORDERS TO OFFSCREEN SURFACE
          // ─────────────────────────────────────────────────────────────────
          offCtx.fillStyle = localStyle === "political" ? "#cbd5e1" : "#06182c";
          offCtx.fillRect(0, 0, W, H);

          const startTileX = Math.floor(cTileX - W / 512) - 2;
          const endTileX = Math.ceil(cTileX + W / 512) + 2;
          const startTileY = Math.floor(cTileY - H / 512) - 2;
          const endTileY = Math.ceil(cTileY + H / 512) + 2;

          if (localStyle !== "vector-grid") {
            offCtx.save();
            if (localStyle === "dark-radar") {
              offCtx.filter = "brightness(0.46) contrast(1.32) saturate(0.35) hue-rotate(175deg)";
            }
            for (let tx = startTileX; tx <= endTileX; tx++) {
              for (let ty = startTileY; ty <= endTileY; ty++) {
                const url = getTileUrl(localStyle, zInt, tx, ty);
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
                    offCtx.drawImage(tileImg, drawX, drawY, 256, 256);
                  } catch { }
                }
              }
            }
            offCtx.restore();

            for (let tx = startTileX; tx <= endTileX; tx++) {
              for (let ty = startTileY; ty <= endTileY; ty++) {
                const refUrl = getBoundariesOverlayTileUrl(localStyle, zInt, tx, ty);
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
                    offCtx.save();
                    offCtx.globalAlpha = localStyle === "dark-radar" ? 0.78 : 0.92;
                    offCtx.drawImage(refImg, drawX, drawY, 256, 256);
                    offCtx.restore();
                  } catch { }
                }
              }
            }
          }

          // Tactical Grid on surface
          if (config.showGridLines !== false || localStyle === "vector-grid") {
            offCtx.save();
            offCtx.strokeStyle =
              localStyle === "political"
                ? "rgba(15, 23, 42, 0.1)"
                : "rgba(6, 182, 212, 0.18)";
            offCtx.lineWidth = 1;
            const step = 80;
            for (let gx = 0; gx < W; gx += step) {
              offCtx.beginPath();
              offCtx.moveTo(gx, 0);
              offCtx.lineTo(gx, H);
              offCtx.stroke();
            }
            for (let gy = 0; gy < H; gy += step) {
              offCtx.beginPath();
              offCtx.moveTo(0, gy);
              offCtx.lineTo(W, gy);
              offCtx.stroke();
            }
            offCtx.restore();
          }

          // ─────────────────────────────────────────────────────────────────
          // STEP 2: COMPOSITE 3D SKY HORIZON / 3D GLOBE STARFIELD / 2D MAP
          // ─────────────────────────────────────────────────────────────────
          const is3DPersp = viewMode === "3d-perspective" && pitchDeg > 2;
          const is3DGlobe = viewMode === "3d-globe";
          const effPitch = is3DPersp ? pitchDeg : 0;
          const effYaw = is3DPersp ? yawDeg : 0;
          const altScale = config.altitudeScale ?? 1.25;

          if (is3DGlobe) {
            // ── 3D INTERACTIVE SPHERICAL EARTH GLOBE WITH DEEP SPACE STARFIELD ──
            const spaceGrad = ctx.createRadialGradient(W * 0.5, H * 0.5, 40, W * 0.5, H * 0.5, W * 0.85);
            spaceGrad.addColorStop(0, "#0b1d3a");
            spaceGrad.addColorStop(0.45, "#061024");
            spaceGrad.addColorStop(1, "#020612");
            ctx.fillStyle = spaceGrad;
            ctx.fillRect(0, 0, W, H);

            // Subtle cosmic Milky Way / Nebula atmospheric band
            const nebulaGrad = ctx.createLinearGradient(0, H * 0.1, W, H * 0.9);
            nebulaGrad.addColorStop(0, "rgba(14, 165, 233, 0.0)");
            nebulaGrad.addColorStop(0.35, "rgba(56, 189, 248, 0.08)");
            nebulaGrad.addColorStop(0.65, "rgba(99, 102, 241, 0.09)");
            nebulaGrad.addColorStop(1, "rgba(14, 165, 233, 0.0)");
            ctx.fillStyle = nebulaGrad;
            ctx.fillRect(0, 0, W, H);

            // Twinkling Deep-Space Stars
            ctx.save();
            SPACE_STARFIELD.forEach((st) => {
              const twinkle = 0.45 + 0.55 * Math.sin(now / 520 + st.phase);
              ctx.globalAlpha = twinkle;
              ctx.fillStyle = st.tint;
              ctx.beginPath();
              ctx.arc(st.xPct * W, st.yPct * H, st.r, 0, Math.PI * 2);
              ctx.fill();
            });
            ctx.restore();

            const globeRadius = Math.min(W, H) * 0.42 * globeScale;
            const gCx = W / 2;
            const gCy = H * 0.52;

            // Outer atmospheric blue sky corona halo
            const haloGrad = ctx.createRadialGradient(
              gCx,
              gCy,
              globeRadius * 0.86,
              gCx,
              gCy,
              globeRadius * 1.28
            );
            haloGrad.addColorStop(0, "rgba(56, 189, 248, 0.42)");
            haloGrad.addColorStop(0.45, "rgba(14, 165, 233, 0.18)");
            haloGrad.addColorStop(1, "rgba(2, 6, 18, 0)");
            ctx.fillStyle = haloGrad;
            ctx.beginPath();
            ctx.arc(gCx, gCy, globeRadius * 1.28, 0, Math.PI * 2);
            ctx.fill();

            // Clip to 3D Sphere and draw spherical strips
            ctx.save();
            ctx.beginPath();
            ctx.arc(gCx, gCy, globeRadius, 0, Math.PI * 2);
            ctx.clip();

            const oceanBase = ctx.createRadialGradient(
              gCx - globeRadius * 0.25,
              gCy - globeRadius * 0.25,
              globeRadius * 0.1,
              gCx,
              gCy,
              globeRadius
            );
            oceanBase.addColorStop(0, "#0c4a6e");
            oceanBase.addColorStop(1, "#082f49");
            ctx.fillStyle = oceanBase;
            ctx.fillRect(gCx - globeRadius, gCy - globeRadius, globeRadius * 2, globeRadius * 2);

            const latStrips = 36;
            for (let s = 0; s < latStrips; s++) {
              const t0 = s / latStrips;
              const t1 = (s + 1) / latStrips;
              const yNorm = -1 + (s + 0.5) * (2 / latStrips);
              const chordFactor = Math.sqrt(Math.max(0.08, 1 - yNorm * yNorm));
              const sy = t0 * H;
              const sh = H / latStrips;
              const dy = gCy - globeRadius + t0 * (globeRadius * 2);
              const dh = (t1 - t0) * (globeRadius * 2) + 1.2;
              const dw = globeRadius * 2 * chordFactor * 1.18;
              const dx = gCx - dw / 2;
              try {
                ctx.drawImage(offCanvas, 0, sy, W, sh, dx, dy, dw, dh);
              } catch { }
            }

            // 3D Spherical Latitude/Longitude Graticule
            ctx.strokeStyle = "rgba(56, 189, 248, 0.24)";
            ctx.lineWidth = 1;
            for (let latLine = -60; latLine <= 60; latLine += 20) {
              ctx.beginPath();
              let started = false;
              for (let lonStep = -180; lonStep <= 180; lonStep += 6) {
                const gp = latLonToGlobe3D(latLine, lonStep, centerLat, centerLon, globeRadius, gCx, gCy);
                if (gp.visible) {
                  if (!started) {
                    ctx.moveTo(gp.x, gp.y);
                    started = true;
                  } else {
                    ctx.lineTo(gp.x, gp.y);
                  }
                } else {
                  started = false;
                }
              }
              ctx.stroke();
            }
            for (let lonLine = -180; lonLine < 180; lonLine += 20) {
              ctx.beginPath();
              let started = false;
              for (let latStep = -80; latStep <= 80; latStep += 5) {
                const gp = latLonToGlobe3D(latStep, lonLine, centerLat, centerLon, globeRadius, gCx, gCy);
                if (gp.visible) {
                  if (!started) {
                    ctx.moveTo(gp.x, gp.y);
                    started = true;
                  } else {
                    ctx.lineTo(gp.x, gp.y);
                  }
                } else {
                  started = false;
                }
              }
              ctx.stroke();
            }

            // 3D Sphere Specular Sunlight & Atmosphere Rim Shading
            const sphereShade = ctx.createRadialGradient(
              gCx - globeRadius * 0.3,
              gCy - globeRadius * 0.3,
              globeRadius * 0.1,
              gCx,
              gCy,
              globeRadius
            );
            sphereShade.addColorStop(0, "rgba(255, 255, 255, 0.12)");
            sphereShade.addColorStop(0.68, "rgba(14, 165, 233, 0.08)");
            sphereShade.addColorStop(1, "rgba(2, 8, 23, 0.72)");
            ctx.fillStyle = sphereShade;
            ctx.fillRect(gCx - globeRadius, gCy - globeRadius, globeRadius * 2, globeRadius * 2);
            ctx.restore();

            ctx.strokeStyle = "rgba(125, 211, 252, 0.78)";
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(gCx, gCy, globeRadius, 0, Math.PI * 2);
            ctx.stroke();
          } else if (is3DPersp) {
            // ── 3D PERSPECTIVE TILTED TERRAIN VIEW WITH FULL REALISTIC SKY BACKDROP ──
            const pitchRad = (effPitch * Math.PI) / 180;
            const cosP = Math.cos(pitchRad);
            const sinP = Math.sin(pitchRad);
            const horizonY = Math.max(85, Math.round(H * 0.56 - H * 0.52 * cosP));

            // 1. Full-Canvas Realistic Atmospheric Sky Backdrop (Replaces all black background!)
            const fullSkyGrad = ctx.createLinearGradient(0, 0, 0, H);
            fullSkyGrad.addColorStop(0, "#041028");
            fullSkyGrad.addColorStop(Math.min(0.45, horizonY / H), "#0ea5e9");
            fullSkyGrad.addColorStop(Math.min(0.58, (horizonY + 48) / H), "#7dd3fc");
            fullSkyGrad.addColorStop(Math.min(0.75, (horizonY + 140) / H), "#0c4a6e");
            fullSkyGrad.addColorStop(1, "#082f49");
            ctx.fillStyle = fullSkyGrad;
            ctx.fillRect(0, 0, W, H);

            // High-altitude stars in upper stratosphere above the horizon
            ctx.save();
            SPACE_STARFIELD.slice(0, 75).forEach((st) => {
              const sy = st.yPct * (horizonY * 0.85);
              const alpha = (1 - sy / Math.max(1, horizonY)) * (0.4 + 0.4 * Math.sin(now / 600 + st.phase));
              if (alpha > 0.05) {
                ctx.globalAlpha = alpha;
                ctx.fillStyle = "#e0f2fe";
                ctx.beginPath();
                ctx.arc(st.xPct * W, sy, st.r * 0.85, 0, Math.PI * 2);
                ctx.fill();
              }
            });
            ctx.restore();

            // Soft atmospheric cloud wisps near horizon
            ctx.save();
            for (let c = 0; c < 6; c++) {
              const cloudX = ((c * 260 + now * 0.012) % (W + 320)) - 160;
              const cloudY = horizonY * (0.42 + (c % 3) * 0.16);
              const cGrad = ctx.createRadialGradient(cloudX, cloudY, 10, cloudX, cloudY, 150);
              cGrad.addColorStop(0, "rgba(224, 242, 254, 0.18)");
              cGrad.addColorStop(1, "rgba(224, 242, 254, 0)");
              ctx.fillStyle = cGrad;
              ctx.beginPath();
              ctx.ellipse(cloudX, cloudY, 150, 26, 0, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();

            // 2. Rotate offscreen map plane by yawDeg before perspective slicing
            rotCtx.save();
            rotCtx.fillStyle = localStyle === "political" ? "#cbd5e1" : "#072138";
            rotCtx.fillRect(0, 0, W, H);
            rotCtx.translate(W / 2, H * 0.56);
            rotCtx.rotate((effYaw * Math.PI) / 180);
            rotCtx.scale(1.22, 1.22);
            rotCtx.translate(-W / 2, -H * 0.56);
            rotCtx.drawImage(offCanvas, 0, 0);
            rotCtx.restore();

            // 3. Render Tilted 3D Map Plane with wide perspective overscan so NO black triangles appear on left/right!
            const strips = 56;
            const stripSrcH = H / strips;
            ctx.save();
            for (let s = 0; s < strips; s++) {
              const sy = s * stripSrcH;
              const normY = (sy + stripSrcH / 2 - H * 0.56) / H; // -0.56 to +0.44
              const depthScale = Math.max(0.96, 1.16 + normY * sinP * 0.78);
              const destY = H * 0.56 + (sy - H * 0.56) * cosP;
              const nextDestY = H * 0.56 + (sy + stripSrcH - H * 0.56) * cosP;
              const destH = Math.max(2, nextDestY - destY + 1.6);
              const destW = W * depthScale;
              const destX = (W - destW) / 2;

              ctx.drawImage(
                rotCanvas,
                0,
                sy,
                W,
                stripSrcH,
                destX,
                destY,
                destW,
                destH
              );
            }
            ctx.restore();

            // 4. Atmospheric Horizon Mist Blend where tilted map meets the sky
            const topEdgeY = H * 0.56 - H * 0.56 * cosP;
            const hGlow = ctx.createLinearGradient(0, topEdgeY - 28, 0, topEdgeY + 42);
            hGlow.addColorStop(0, "rgba(56, 189, 248, 0)");
            hGlow.addColorStop(0.45, "rgba(125, 211, 252, 0.68)");
            hGlow.addColorStop(1, "rgba(14, 165, 233, 0)");
            ctx.fillStyle = hGlow;
            ctx.fillRect(0, Math.max(0, topEdgeY - 28), W, 70);
          } else {
            // ── 2D FLAT MAP VIEW ──
            ctx.drawImage(offCanvas, 0, 0);
          }

          // ─────────────────────────────────────────────────────────────────
          // STEP 3: ROTATING TACTICAL RADAR SWEEP (Controlled by Radar ON/OFF)
          // ─────────────────────────────────────────────────────────────────
          if (showRadarSweep) {
            ctx.save();
            const sweepAngle = (now / 1600) % (Math.PI * 2);
            const rCx = W / 2;
            const rCy = is3DPersp ? H * 0.56 : is3DGlobe ? H * 0.52 : H / 2;
            const rRadiusX = is3DGlobe
              ? Math.min(W, H) * 0.42 * globeScale
              : Math.min(W, H) * 0.42;
            const rRadiusY = is3DPersp
              ? rRadiusX * Math.max(0.45, Math.cos((effPitch * Math.PI) / 180))
              : rRadiusX;

            ctx.translate(rCx, rCy);
            ctx.scale(1, rRadiusY / rRadiusX);
            ctx.strokeStyle = "rgba(16, 185, 129, 0.28)";
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(0, 0, rRadiusX, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, rRadiusX * 0.6, 0, Math.PI * 2);
            ctx.stroke();

            const coneGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, rRadiusX);
            coneGrad.addColorStop(0, "rgba(16, 185, 129, 0.24)");
            coneGrad.addColorStop(1, "rgba(16, 185, 129, 0.0)");
            ctx.fillStyle = coneGrad;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, rRadiusX, sweepAngle - 0.45, sweepAngle);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          // ─────────────────────────────────────────────────────────────────
          // STEP 4: ADVANCE ANIMATION TIMELINE (Primary Routes + Simulator)
          // ─────────────────────────────────────────────────────────────────
          const baseRouteSpeed = config.routes?.[0]?.speed || 1;
          if (isPlaying) {
            progressRef.current += dt * 0.26 * baseRouteSpeed * speedMultiplier;
            if (progressRef.current > 1.35) {
              if (config.loopAnimation !== false) {
                progressRef.current = 0;
              } else {
                progressRef.current = 1.35;
              }
            }

            if (simRoutesRef.current.length > 0) {
              simRoutesRef.current = simRoutesRef.current
                .map((sr) => ({
                  ...sr,
                  simProgress: sr.simProgress + dt * 0.32 * (sr.speed || 1.2) * speedMultiplier,
                }))
                .filter((sr) => sr.simProgress <= 1.45);
            }
          }

          const allRoutesToRender: Array<{ route: TacticalMapRoute; rawP: number }> = [
            ...(config.routes || []).map((r) => ({ route: r, rawP: progressRef.current })),
            ...simRoutesRef.current
              .filter((sr) => sr.simProgress >= 0)
              .map((sr) => ({ route: sr, rawP: sr.simProgress })),
          ];

          const projectGeoPoint = (lat: number, lon: number, altitudePx: number = 0) => {
            if (is3DGlobe) {
              const globeRadius = Math.min(W, H) * 0.42 * globeScale;
              const gp = latLonToGlobe3D(
                lat,
                lon,
                centerLat,
                centerLon,
                globeRadius,
                W / 2,
                H * 0.52,
                altitudePx * 0.55
              );
              return { x: gp.x, y: gp.y, scale: 1 };
            }
            const raw2D = latLonToCanvasXY(lat, lon, centerLat, centerLon, zInt, W, H);
            return projectPoint3D(raw2D.x, raw2D.y, altitudePx, W, H, effPitch, effYaw);
          };

          // ─────────────────────────────────────────────────────────────────
          // STEP 5: RENDER ALL ROUTES IN 3D / 2D SPACE WITH ALTITUDE PILLARS
          // ─────────────────────────────────────────────────────────────────
          allRoutesToRender.forEach(({ route, rawP }) => {
            const flightT = Math.max(0, Math.min(1, rawP));
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

            const p1Ground = projectGeoPoint(route.from.lat, route.from.lon, 0);
            const p2Ground = projectGeoPoint(route.to.lat, route.to.lon, 0);
            const rawDistPx = Math.hypot(p2Ground.x - p1Ground.x, p2Ground.y - p1Ground.y);
            const totalKm = computeGreatCircleDistanceKm(route.from, route.to);

            const curveDir =
              route.curveDirection ||
              (isSeaRoute && (route.arcHeight ?? 0) === 0 ? "straight" : "up");
            const rawArc =
              curveDir === "straight" ? 0 : route.arcHeight ?? (isSeaRoute ? 0 : 0.34);

            const getRoutePoint3D = (
              t: number,
              customStart?: TacticalMapPoint,
              customEnd?: TacticalMapPoint,
              customArc?: number
            ) => {
              const sPt = customStart || route.from;
              const ePt = customEnd || route.to;
              const lat = sPt.lat + (ePt.lat - sPt.lat) * t;
              const lon = sPt.lon + (ePt.lon - sPt.lon) * t;
              const arcVal = customArc !== undefined ? customArc : rawArc;

              const maxAltPx = isSeaRoute
                ? 0
                : Math.min(260, Math.max(45, rawDistPx * arcVal * altScale));
              const altPx = Math.sin(t * Math.PI) * maxAltPx;

              const groundPt = projectGeoPoint(lat, lon, 0);
              if (is3DPersp || is3DGlobe) {
                const airPt = projectGeoPoint(lat, lon, altPx);
                return {
                  x: airPt.x,
                  y: airPt.y,
                  groundX: groundPt.x,
                  groundY: groundPt.y,
                  altPx,
                };
              } else {
                const signedArc =
                  rawDistPx * arcVal * (curveDir === "down" ? 1 : -1) * Math.sin(t * Math.PI);
                return {
                  x: groundPt.x,
                  y: groundPt.y + signedArc,
                  groundX: groundPt.x,
                  groundY: groundPt.y,
                  altPx: Math.abs(signedArc),
                };
              }
            };

            const getRouteAngle3D = (
              t: number,
              customStart?: TacticalMapPoint,
              customEnd?: TacticalMapPoint,
              customArc?: number
            ) => {
              const dtStep = 0.02;
              const tA = Math.max(0, t - dtStep);
              const tB = Math.min(1, t + dtStep);
              const ptA = getRoutePoint3D(tA, customStart, customEnd, customArc);
              const ptB = getRoutePoint3D(tB, customStart, customEnd, customArc);
              return Math.atan2(ptB.y - ptA.y, ptB.x - ptA.x);
            };

            if ((is3DPersp || is3DGlobe) && !isSeaRoute) {
              ctx.save();
              ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
              ctx.lineWidth = 3;
              ctx.setLineDash([6, 6]);
              ctx.beginPath();
              ctx.moveTo(p1Ground.x, p1Ground.y);
              for (let s = 1; s <= 24; s++) {
                const gpt = getRoutePoint3D(s / 24);
                ctx.lineTo(gpt.groundX, gpt.groundY);
              }
              ctx.stroke();
              ctx.restore();
            }

            ctx.save();
            ctx.strokeStyle = `${route.color || "#ef4444"}55`;
            ctx.lineWidth = 2.2;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            const start3D = getRoutePoint3D(0);
            ctx.moveTo(start3D.x, start3D.y);
            for (let s = 1; s <= 32; s++) {
              const pt = getRoutePoint3D(s / 32);
              ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();
            ctx.restore();

            const effectiveTargetMarker: TacticalTargetMarkerType =
              route.targetMarkerType ||
              (effect === "ship-launch-missile" ? "warship" : "default");
            drawDestinationTargetObject(ctx, effectiveTargetMarker, p2Ground.x, p2Ground.y, now);

            [
              { pt: p1Ground, info: route.from, isTarget: false },
              { pt: p2Ground, info: route.to, isTarget: true },
            ].forEach(({ pt, info, isTarget }) => {
              const isPeacefulTarget =
                isTarget &&
                (effect === "landing" ||
                  effect === "naval-cruise" ||
                  effect === "hover-patrol" ||
                  effect === "airdrop" ||
                  effect === "none");
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
              ctx.font = "bold 13px Inter, system-ui, sans-serif";
              const lw = ctx.measureText(labelTxt).width + 18;
              const lx = pt.x - lw / 2;
              const ly = pt.y + 13;
              ctx.fillStyle = "rgba(9, 10, 20, 0.9)";
              ctx.beginPath();
              ctx.roundRect(lx, ly, lw, 24, 6);
              ctx.fill();
              ctx.strokeStyle = markerColor;
              ctx.lineWidth = 1.5;
              ctx.stroke();

              ctx.fillStyle = "#ffffff";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(labelTxt, pt.x, ly + 12);
              ctx.restore();
            });

            if (route.showDistanceKm !== false) {
              const apexPt = getRoutePoint3D(0.5);
              const coveredKm = Math.round(totalKm * flightT);
              const currentAltKm = isSeaRoute
                ? 0
                : Math.round(
                  Math.sin(flightT * Math.PI) * Math.min(480, Math.max(12, totalKm * 0.14))
                );
              const distLabel =
                currentAltKm > 0 && (is3DPersp || is3DGlobe)
                  ? `${coveredKm}/${totalKm} KM • ALT ${currentAltKm} KM`
                  : `${coveredKm} / ${totalKm} KM`;

              ctx.save();
              ctx.font = "bold 12px monospace";
              const dw = ctx.measureText(distLabel).width + 18;
              ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
              ctx.beginPath();
              ctx.roundRect(apexPt.x - dw / 2, apexPt.y - 32, dw, 22, 6);
              ctx.fill();
              ctx.strokeStyle = `${route.color || "#ef4444"}99`;
              ctx.lineWidth = 1.2;
              ctx.stroke();
              ctx.fillStyle = "#facc15";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(distLabel, apexPt.x, apexPt.y - 21);
              ctx.restore();
            }

            const draw3DAltitudeDropLine = (
              pt: { x: number; y: number; groundX: number; groundY: number; altPx: number },
              color: string
            ) => {
              if ((!is3DPersp && !is3DGlobe) || pt.altPx < 6) return;
              ctx.save();
              ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
              ctx.beginPath();
              ctx.ellipse(pt.groundX, pt.groundY, 10, 4.5, 0, 0, Math.PI * 2);
              ctx.fill();

              ctx.strokeStyle = `${color}88`;
              ctx.lineWidth = 1.5;
              ctx.setLineDash([3, 3]);
              ctx.beginPath();
              ctx.moveTo(pt.x, pt.y);
              ctx.lineTo(pt.groundX, pt.groundY);
              ctx.stroke();
              ctx.restore();
            };

            if (effect === "ship-launch-missile" || effect === "jet-airstrike") {
              const launchSplitP = 0.4;
              const carrierStopT = 0.36;
              const carrierT =
                rawP < launchSplitP ? (rawP / launchSplitP) * carrierStopT : carrierStopT;
              const carrierArc = effect === "ship-launch-missile" ? 0 : 0.16;
              const carrierPos = getRoutePoint3D(carrierT, route.from, route.to, carrierArc);
              const carrierAng = getRouteAngle3D(carrierT, route.from, route.to, carrierArc);

              ctx.save();
              ctx.strokeStyle = "#38bdf8";
              ctx.lineWidth = 3.5;
              ctx.beginPath();
              const cStart = getRoutePoint3D(0, route.from, route.to, carrierArc);
              ctx.moveTo(cStart.x, cStart.y);
              for (let s = 1; s <= 18; s++) {
                const pt = getRoutePoint3D((s / 18) * carrierT, route.from, route.to, carrierArc);
                ctx.lineTo(pt.x, pt.y);
              }
              ctx.stroke();
              ctx.restore();

              draw3DAltitudeDropLine(carrierPos, "#38bdf8");
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

              if (rawP >= launchSplitP) {
                const missileT = Math.min(1, (rawP - launchSplitP) / (1 - launchSplitP));
                const launchGeo: TacticalMapPoint = {
                  name: "Launch Point",
                  lat: route.from.lat + (route.to.lat - route.from.lat) * carrierStopT,
                  lon: route.from.lon + (route.to.lon - route.from.lon) * carrierStopT,
                };

                if (missileT < 0.35) {
                  ctx.save();
                  ctx.strokeStyle = "rgba(251, 191, 36, 0.85)";
                  ctx.lineWidth = 2.5;
                  ctx.beginPath();
                  ctx.arc(carrierPos.x, carrierPos.y, 12 + missileT * 45, 0, Math.PI * 2);
                  ctx.stroke();
                  ctx.restore();
                }

                ctx.save();
                ctx.strokeStyle = "#ef4444";
                ctx.shadowColor = "#ef4444";
                ctx.shadowBlur = 14;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(carrierPos.x, carrierPos.y);
                const mSteps = 28;
                const maxMStep = Math.max(1, Math.floor(missileT * mSteps));
                for (let s = 1; s <= maxMStep; s++) {
                  const pt = getRoutePoint3D(s / mSteps, launchGeo, route.to, 0.36);
                  ctx.lineTo(pt.x, pt.y);
                }
                ctx.stroke();
                ctx.restore();

                if (missileT < 1) {
                  const mPos = getRoutePoint3D(missileT, launchGeo, route.to, 0.36);
                  const mAng = getRouteAngle3D(missileT, launchGeo, route.to, 0.36);
                  draw3DAltitudeDropLine(mPos, "#ef4444");
                  drawTacticalAssetIcon(ctx, "missile", mPos.x, mPos.y, mAng, "#ef4444", now);
                }

                if (rawP >= 0.96) {
                  const impactPhase = Math.min(1, (rawP - 0.96) / 0.35);
                  drawExplosionShockwave(ctx, p2Ground.x, p2Ground.y, impactPhase, false);
                  drawStatusPill(
                    ctx,
                    p2Ground.x,
                    p2Ground.y - 42,
                    effect === "ship-launch-missile"
                      ? "💥 TARGET SHIP / SITE HIT"
                      : "💥 AIRSTRIKE IMPACT",
                    "#ef4444",
                    "#fecaca"
                  );
                }
              }
            } else if (effect === "intercept") {
              const interceptT = 0.64;
              const threatT = Math.min(interceptT, flightT);
              const interceptPoint = getRoutePoint3D(interceptT);

              ctx.save();
              ctx.strokeStyle = "#ef4444";
              ctx.shadowColor = "#ef4444";
              ctx.shadowBlur = 12;
              ctx.lineWidth = 3.5;
              ctx.beginPath();
              const pStart = getRoutePoint3D(0);
              ctx.moveTo(pStart.x, pStart.y);
              for (let s = 1; s <= 24; s++) {
                const pt = getRoutePoint3D((s / 24) * threatT);
                ctx.lineTo(pt.x, pt.y);
              }
              ctx.stroke();
              ctx.restore();

              if (flightT > 0.15) {
                const defT = Math.min(1, (flightT - 0.15) / (interceptT - 0.15));
                const defX = p2Ground.x + (interceptPoint.x - p2Ground.x) * defT;
                const defY = p2Ground.y + (interceptPoint.y - p2Ground.y) * defT;
                const defAng = Math.atan2(
                  interceptPoint.y - p2Ground.y,
                  interceptPoint.x - p2Ground.x
                );

                ctx.save();
                ctx.strokeStyle = "#38bdf8";
                ctx.shadowColor = "#38bdf8";
                ctx.shadowBlur = 12;
                ctx.lineWidth = 3;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(p2Ground.x, p2Ground.y);
                ctx.lineTo(defX, defY);
                ctx.stroke();
                ctx.restore();

                if (flightT < interceptT) {
                  drawTacticalAssetIcon(
                    ctx,
                    "missile",
                    defX,
                    defY,
                    defAng,
                    "#38bdf8",
                    now,
                    undefined,
                    0.85
                  );
                }
              }

              if (flightT < interceptT) {
                const tPos = getRoutePoint3D(threatT);
                const tAng = getRouteAngle3D(threatT);
                draw3DAltitudeDropLine(tPos, "#ef4444");
                drawTacticalAssetIcon(
                  ctx,
                  route.assetType,
                  tPos.x,
                  tPos.y,
                  tAng,
                  "#ef4444",
                  now,
                  route.customIconUrl
                );
              } else {
                const blastP = Math.min(1, (rawP - interceptT) / 0.45);
                drawExplosionShockwave(ctx, interceptPoint.x, interceptPoint.y, blastP, true);
                drawStatusPill(
                  ctx,
                  interceptPoint.x,
                  interceptPoint.y - 38,
                  "🛡️ INTERCEPTED IN 3D AIRSPACE",
                  "#38bdf8",
                  "#bae6fd"
                );
              }
            } else {
              const effectiveT =
                effect === "landing" || effect === "naval-cruise"
                  ? 1 - Math.pow(1 - flightT, 1.65)
                  : flightT;

              if (effectiveT > 0.01) {
                ctx.save();
                ctx.strokeStyle = route.color || "#ef4444";
                ctx.shadowColor = route.color || "#ef4444";
                ctx.shadowBlur = 14;
                ctx.lineWidth = 4;
                ctx.beginPath();
                const s0 = getRoutePoint3D(0);
                ctx.moveTo(s0.x, s0.y);
                const steps = 36;
                const maxStep = Math.max(1, Math.floor(effectiveT * steps));
                for (let s = 1; s <= maxStep; s++) {
                  const pt = getRoutePoint3D(s / steps);
                  ctx.lineTo(pt.x, pt.y);
                }
                const tipPt = getRoutePoint3D(effectiveT);
                ctx.lineTo(tipPt.x, tipPt.y);
                ctx.stroke();
                ctx.restore();
              }

              if (route.assetType === "salvo") {
                [0, -0.08, -0.16].forEach((offset, sIdx) => {
                  const st = Math.max(0, Math.min(1, rawP + offset));
                  if (st > 0 && st < 1) {
                    const pos = getRoutePoint3D(st);
                    const ang = getRouteAngle3D(st);
                    draw3DAltitudeDropLine(pos, route.color || "#ef4444");
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
                const orbitAngle = ((rawP - 0.85) * 9) % (Math.PI * 2);
                const orbitRadius = 28;
                const ox = p2Ground.x + Math.cos(orbitAngle) * orbitRadius;
                const oy =
                  p2Ground.y - (is3DPersp ? 28 : 0) + Math.sin(orbitAngle) * orbitRadius * 0.7;
                const tangentAngle = orbitAngle + Math.PI / 2;

                ctx.save();
                ctx.strokeStyle = "rgba(16, 185, 129, 0.45)";
                ctx.setLineDash([4, 4]);
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.ellipse(
                  p2Ground.x,
                  p2Ground.y - (is3DPersp ? 28 : 0),
                  orbitRadius,
                  orbitRadius * 0.7,
                  0,
                  0,
                  Math.PI * 2
                );
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
                drawStatusPill(
                  ctx,
                  p2Ground.x,
                  p2Ground.y - 46,
                  "🔄 ON PATROL / LOITERING",
                  "#10b981",
                  "#a7f3d0"
                );
              } else if (flightT < 1 || effect === "landing" || effect === "naval-cruise") {
                const curPos = getRoutePoint3D(effectiveT);
                const curAngle = getRouteAngle3D(Math.min(0.99, effectiveT));
                const landingScale =
                  effect === "landing" && effectiveT > 0.85
                    ? Math.max(0.78, 1 - (effectiveT - 0.85) * 1.2)
                    : 1;
                draw3DAltitudeDropLine(curPos, route.color || "#ef4444");
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

              if (rawP >= 0.94) {
                const phase = Math.min(1, (rawP - 0.94) / 0.38);
                if (effect === "explosion") {
                  drawExplosionShockwave(ctx, p2Ground.x, p2Ground.y, phase, false);
                } else if (effect === "landing") {
                  ctx.save();
                  ctx.strokeStyle = `rgba(16, 185, 129, ${1 - phase * 0.6})`;
                  ctx.lineWidth = 3;
                  ctx.beginPath();
                  ctx.arc(p2Ground.x, p2Ground.y, 14 + phase * 28, 0, Math.PI * 2);
                  ctx.stroke();
                  ctx.restore();
                  drawStatusPill(
                    ctx,
                    p2Ground.x,
                    p2Ground.y - 42,
                    "🛬 SAFE LANDING • ARRIVED",
                    "#10b981",
                    "#a7f3d0"
                  );
                } else if (effect === "naval-cruise") {
                  ctx.save();
                  ctx.strokeStyle = `rgba(6, 182, 212, ${1 - phase * 0.5})`;
                  ctx.lineWidth = 2.5;
                  ctx.beginPath();
                  ctx.arc(p2Ground.x, p2Ground.y, 16 + phase * 32, 0, Math.PI * 2);
                  ctx.stroke();
                  ctx.restore();
                  drawStatusPill(
                    ctx,
                    p2Ground.x,
                    p2Ground.y - 42,
                    "⚓ NAVAL PATROL / DOCKED",
                    "#06b6d4",
                    "#a5f3fc"
                  );
                } else if (effect === "airdrop") {
                  [-18, 0, 18].forEach((offsetX, pIdx) => {
                    const dropY = p2Ground.y - 38 + phase * 36 + pIdx * 4;
                    const dropX = p2Ground.x + offsetX + Math.sin(now / 180 + pIdx) * 4;
                    ctx.save();
                    ctx.fillStyle = "#38bdf8";
                    ctx.beginPath();
                    ctx.arc(dropX, dropY, 9, Math.PI, 0, false);
                    ctx.fill();
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
                  drawStatusPill(
                    ctx,
                    p2Ground.x,
                    p2Ground.y - 54,
                    "🪂 AIRDROP DELIVERED",
                    "#38bdf8",
                    "#bae6fd"
                  );
                }
              }
            }
          });

          // ─────────────────────────────────────────────────────────────────
          // STEP 6: TOP-LEFT BREAKING NEWS BANNER & TOP-RIGHT TELEMETRY HUD
          // ─────────────────────────────────────────────────────────────────
          if (config.title) {
            ctx.save();
            ctx.font = "bold 20px Inter, system-ui, sans-serif";
            const tw = ctx.measureText(config.title.toUpperCase()).width;
            const boxW = Math.max(260, tw + 125);
            const boxH = config.subtitle ? 64 : 44;
            ctx.fillStyle = "rgba(9, 10, 20, 0.92)";
            ctx.beginPath();
            ctx.roundRect(22, 20, boxW, boxH, 10);
            ctx.fill();
            ctx.strokeStyle = "rgba(239, 68, 68, 0.7)";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = "#e11d48";
            ctx.beginPath();
            ctx.roundRect(32, 28, 82, 24, 5);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 11px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(viewMode === "2d" ? "LIVE MAP" : "3D RADAR", 73, 40);

            ctx.textAlign = "left";
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 18px Inter, system-ui, sans-serif";
            ctx.fillText(config.title.toUpperCase(), 124, 41);
            if (config.subtitle) {
              ctx.fillStyle = "#38bdf8";
              ctx.font = "600 13px Inter, system-ui, sans-serif";
              ctx.fillText(config.subtitle, 34, 68);
            }
            ctx.restore();
          }

          if (config.showTelemetryHud !== false) {
            ctx.save();
            const hudW = 258;
            const hudH = simulatorActive ? 88 : 68;
            const hudX = W - hudW - 22;
            const hudY = 20;
            ctx.fillStyle = "rgba(6, 10, 22, 0.88)";
            ctx.beginPath();
            ctx.roundRect(hudX, hudY, hudW, hudH, 10);
            ctx.fill();
            ctx.strokeStyle = simulatorActive
              ? "rgba(16, 185, 129, 0.65)"
              : "rgba(56, 189, 248, 0.45)";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.font = "bold 11px monospace";
            ctx.fillStyle = simulatorActive ? "#34d399" : "#38bdf8";
            ctx.textAlign = "left";
            ctx.fillText(
              simulatorActive
                ? `🎮 LIVE SIMULATOR • ${allRoutesToRender.length} TRACKS`
                : `🛰️ ${viewMode.toUpperCase()} • PITCH ${effPitch}° • RADAR ${showRadarSweep ? "ON" : "OFF"}`,
              hudX + 12,
              hudY + 20
            );

            ctx.font = "11px monospace";
            ctx.fillStyle = "#e2e8f0";
            ctx.fillText(
              `LAT ${centerLat.toFixed(2)}°N  LON ${centerLon.toFixed(2)}°E  Z:${zInt}x`,
              hudX + 12,
              hudY + 40
            );
            ctx.fillStyle = "#facc15";
            ctx.fillText(
              `SPEED: ${(speedMultiplier * 3.2).toFixed(1)} MACH • YAW: ${Math.round(effYaw)}°`,
              hudX + 12,
              hudY + 58
            );
            if (simulatorActive) {
              ctx.fillStyle = "#fda4af";
              ctx.fillText(
                `CLICK MAP TO FIRE: ${simTool.toUpperCase()}`,
                hudX + 12,
                hudY + 76
              );
            }
            ctx.restore();
          }
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [
    config,
    isPlaying,
    speedMultiplier,
    localStyle,
    viewMode,
    pitchDeg,
    yawDeg,
    centerLat,
    centerLon,
    zoom,
    globeScale,
    showRadarSweep,
    autoOrbit3D,
    isDraggingMap,
    simulatorActive,
    simTool,
  ]);

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-full h-full flex items-center justify-center bg-[#030712] group/map select-none overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        id="livestudio-tactical-map-canvas"
        width={1280}
        height={720}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={() => setIsDraggingMap(false)}
        onWheel={handleCanvasWheel}
        className={cn(
          "w-full h-full",
          fitMode === "cover" ? "object-cover" : "object-contain",
          simulatorActive
            ? "cursor-crosshair"
            : isDraggingMap
              ? "cursor-grabbing"
              : "cursor-grab"
        )}
      />

      {/* Interactive Live Simulator Floating Command Bar (Top-Center when Simulator is ON) */}
      {isInteractive && simulatorActive && (
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-[#070b18]/95 backdrop-blur-md border border-emerald-500/60 rounded-xl px-3 py-1.5 flex flex-wrap items-center gap-1.5 shadow-2xl pointer-events-auto max-w-[95%]"
        >
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 flex items-center gap-1 pr-1 border-r border-white/15">
            <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Click Map to Spawn:</span>
          </span>

          {[
            { id: "launch-missile", label: "🚀 Missile Strike" },
            { id: "air-defense-intercept", label: "🛡️ Air Defense" },
            { id: "fighter-airstrike", label: "✈️ Fighter Jet" },
            { id: "naval-strike", label: "🚢 Warship Strike" },
            { id: "airliner-flight", label: "🛫 Safe Flight" },
          ].map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => updateSimTool(tool.id as SimulatorCommandTool)}
              className={cn(
                "px-2 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer",
                simTool === tool.id
                  ? "bg-emerald-600 text-white border-emerald-300 shadow"
                  : "bg-white/5 text-slate-300 border-white/10 hover:text-white"
              )}
            >
              {tool.label}
            </button>
          ))}

          <button
            type="button"
            onClick={handleTriggerSalvoBarrage}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10.5px] font-extrabold flex items-center gap-1 shadow-lg animate-pulse cursor-pointer"
            title="Launch 5x Simultaneous Multi-Target Missile Barrage!"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>5x Salvo Barrage!</span>
          </button>

          {simRoutes.length > 0 && (
            <button
              type="button"
              onClick={() => {
                simRoutesRef.current = [];
                setSimRoutes([]);
                syncCameraToParent({ simRoutes: [] });
              }}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-rose-500/30 text-slate-200 hover:text-rose-200 text-[10px] font-semibold cursor-pointer"
              title="Clear Simulator Units"
            >
              Clear ({simRoutes.length})
            </button>
          )}
        </div>
      )}

      {/* On-Stage Broadcast 3D / 2D / Globe / Radar / Simulator Control Dock (Bottom) */}
      {isInteractive && (
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-30 bg-[#080a16]/95 backdrop-blur-md border border-cyan-500/45 rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-center gap-1.5 shadow-2xl opacity-95 group-hover/map:opacity-100 transition-opacity pointer-events-auto max-w-[98%]"
        >
          {/* Play / Pause */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10.5px] font-bold flex items-center gap-1 shadow cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )}
            <span>{isPlaying ? "Pause" : "Animate"}</span>
          </button>

          {/* Replay */}
          <button
            type="button"
            onClick={handleReplay}
            className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10.5px] font-bold flex items-center gap-1 shadow cursor-pointer"
            title="Restart Animation from Origin"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Replay</span>
          </button>

          {/* 2D / 3D Terrain / 3D Globe Mode Switcher */}
          <div className="flex items-center bg-black/60 rounded-lg p-0.5 border border-white/15">
            {(
              [
                { id: "2d", label: "2D Map" },
                { id: "3d-perspective", label: "🏔️ 3D Tilt" },
                { id: "3d-globe", label: "🌍 3D Globe" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setViewMode(m.id);
                  if (m.id === "3d-perspective" && pitchDeg < 15) {
                    setPitchDeg(45);
                    syncCameraToParent({ viewMode: m.id, pitchDeg: 45 });
                  } else {
                    syncCameraToParent({ viewMode: m.id });
                  }
                }}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer",
                  viewMode === m.id
                    ? "bg-cyan-600 text-white shadow"
                    : "text-slate-300 hover:text-white"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* 3D Rotate & Tilt vs Pan Mode + Auto-Orbit Toggle */}
          {viewMode !== "2d" && (
            <>
              {viewMode === "3d-perspective" && (
                <button
                  type="button"
                  onClick={() =>
                    setMouseControlMode((m) => (m === "orbit" ? "pan" : "orbit"))
                  }
                  className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer",
                    mouseControlMode === "orbit"
                      ? "bg-amber-500/25 text-amber-200 border-amber-400/50"
                      : "bg-white/5 text-slate-300 border-white/15 hover:text-white"
                  )}
                  title="Switch Left-Click Drag between 3D Rotate/Tilt and 2D Map Pan"
                >
                  {mouseControlMode === "orbit" ? "🔄 3D Rotate & Tilt" : "✋ Pan Map"}
                </button>
              )}

              <button
                type="button"
                onClick={() => setAutoOrbit3D((v) => !v)}
                className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer",
                  autoOrbit3D
                    ? "bg-cyan-500/30 text-cyan-200 border-cyan-400"
                    : "bg-white/5 text-slate-300 border-white/15 hover:text-white"
                )}
                title="Automatically orbit the 3D camera or spin the 3D Globe live"
              >
                🔄 Auto-Orbit {autoOrbit3D ? "ON" : "OFF"}
              </button>
            </>
          )}

          {/* 3D Pitch Slider (Visible when in 3D Tilt mode) */}
          {viewMode === "3d-perspective" && (
            <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
              <span className="text-[9.5px] text-cyan-300 font-semibold">3D Tilt:</span>
              <input
                type="range"
                min={0}
                max={62}
                step={2}
                value={pitchDeg}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPitchDeg(val);
                  syncCameraToParent({ pitchDeg: val });
                }}
                className="w-14 h-1.5 accent-cyan-400 bg-white/20 rounded cursor-pointer"
                title="Adjust 3D Camera Tilt Angle"
              />
              <span className="text-[9.5px] font-mono text-white min-w-[24px]">{pitchDeg}°</span>
            </div>
          )}

          {/* 3D Globe Size & Fullscreen Control (Visible when in 3D Globe mode) */}
          {viewMode === "3d-globe" && (
            <div className="flex items-center gap-1.5 bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-400/40">
              <span className="text-[9.5px] text-indigo-200 font-bold">Globe Size:</span>
              <input
                type="range"
                min={70}
                max={185}
                step={5}
                value={Math.round(globeScale * 100)}
                onChange={(e) => {
                  const nextS = Number((Number(e.target.value) / 100).toFixed(2));
                  setGlobeScale(nextS);
                  syncCameraToParent({ globeScale: nextS });
                }}
                className="w-16 h-1.5 accent-indigo-400 bg-white/20 rounded cursor-pointer"
                title="Resize 3D Globe from Compact (70%) up to Fullscreen (185%)"
              />
              <span className="text-[9.5px] font-mono text-indigo-200 min-w-[32px]">
                {Math.round(globeScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => {
                  const nextS = globeScale >= 1.55 ? 1.15 : 1.72;
                  setGlobeScale(nextS);
                  syncCameraToParent({ globeScale: nextS });
                }}
                className="px-1.5 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-bold flex items-center gap-0.5 cursor-pointer"
                title="Toggle Fullscreen 3D Globe"
              >
                <Maximize2 className="w-2.5 h-2.5" />
                <span>{globeScale >= 1.55 ? "Fit" : "Full"}</span>
              </button>
            </div>
          )}

          {/* Explicit RADAR ON / OFF Toggle Button */}
          <button
            type="button"
            onClick={() => {
              const nextR = !showRadarSweep;
              setShowRadarSweep(nextR);
              syncCameraToParent({ showRadarSweep: nextR });
            }}
            className={cn(
              "px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer",
              showRadarSweep
                ? "bg-emerald-500/25 text-emerald-200 border-emerald-400/60 shadow-sm"
                : "bg-white/5 text-slate-400 border-white/15 hover:text-white"
            )}
            title="Toggle Tactical Radar Sweep Circle ON or OFF"
          >
            <Radio className="w-3 h-3 text-emerald-400" />
            <span>Radar {showRadarSweep ? "ON" : "OFF"}</span>
          </button>

          {/* Zoom In / Out Buttons */}
          <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => {
                if (viewMode === "3d-globe") {
                  const nextS = Number(Math.max(0.7, globeScale - 0.15).toFixed(2));
                  setGlobeScale(nextS);
                  syncCameraToParent({ globeScale: nextS });
                } else {
                  const nz = Math.max(2, zoom - 1);
                  setZoom(nz);
                  syncCameraToParent({ zoom: nz });
                }
              }}
              className="p-0.5 text-slate-300 hover:text-white cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-amber-300 px-1">{zoom}x</span>
            <button
              type="button"
              onClick={() => {
                if (viewMode === "3d-globe") {
                  const nextS = Number(Math.min(1.85, globeScale + 0.15).toFixed(2));
                  setGlobeScale(nextS);
                  syncCameraToParent({ globeScale: nextS });
                } else {
                  const nz = Math.min(10, zoom + 1);
                  setZoom(nz);
                  syncCameraToParent({ zoom: nz });
                }
              }}
              className="p-0.5 text-slate-300 hover:text-white cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Live Simulator Toggle Button */}
          <button
            type="button"
            onClick={() => {
              const nextSim = !simulatorActive;
              setSimulatorActive(nextSim);
              syncCameraToParent({ simulatorEnabled: nextSim });
            }}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer",
              simulatorActive
                ? "bg-emerald-600 text-white border-emerald-300 shadow-lg shadow-emerald-600/30"
                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25"
            )}
            title="Toggle Live Interactive Tactical Simulator (Click on map to fire missiles, interceptors & jets live on stage!)"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Simulator {simulatorActive ? "ON" : "OFF"}</span>
          </button>

          {/* Speed Selector */}
          <select
            value={String(speedMultiplier)}
            onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
            className="bg-slate-900 border border-white/15 rounded-lg px-2 py-1 text-[10px] font-mono text-cyan-300 focus:outline-none"
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
            onChange={(e) => {
              const st = e.target.value as TacticalMapConfig["mapStyle"];
              setLocalStyle(st);
              syncCameraToParent({ mapStyle: st });
            }}
            className="bg-slate-900 border border-white/15 rounded-lg px-2 py-1 text-[10px] text-slate-200 focus:outline-none"
            title="Switch Broadcast Map Theme (100% Free Esri ArcGIS)"
          >
            <option value="satellite">🛰️ Satellite</option>
            <option value="dark-radar">🌑 Dark Radar</option>
            <option value="political">🗺️ Political</option>
            <option value="ocean">🌊 Maritime</option>
            <option value="vector-grid">🎯 Grid Only</option>
          </select>

          {onOpenEditorModal && (
            <button
              type="button"
              onClick={onOpenEditorModal}
              className="px-2 py-1 rounded-lg bg-cyan-500/25 hover:bg-cyan-500/40 text-cyan-200 border border-cyan-400/50 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit Map</span>
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
    switchScene,
  } = useStudioStore();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const defaultConfig: TacticalMapConfig = {
    title: "BREAKING: MISSILE & AIRSTRIKE TRAJECTORY",
    subtitle: "Live 3D Tactical Radar, Altitude & Distance Analysis",
    mapStyle: "satellite",
    viewMode: "3d-perspective",
    pitchDeg: 45,
    yawDeg: 0,
    globeScale: 1.18,
    simulatorEnabled: false,
    showTelemetryHud: true,
    altitudeScale: 1.25,
    centerLat: 32.8,
    centerLon: 44.0,
    zoom: 5,
    loopAnimation: true,
    showRadarSweep: true,
    showGridLines: true,
    simRoutes: [],
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
        arcHeight: 0.34,
        speed: 1.0,
        showImpactShockwave: true,
        showDistanceKm: true,
      },
    ],
  };

  const [mapConfig, setMapConfig] = useState<TacticalMapConfig>(
    initialItem?.mapConfig || defaultConfig
  );
  const [activeModalTab, setActiveModalTab] = useState<"builder" | "simulator" | "library">(
    "builder"
  );
  const [modalSimTool, setModalSimTool] = useState<SimulatorCommandTool>("launch-missile");
  const [activeRouteIdx, setActiveRouteIdx] = useState(0);
  const [clickPlacementMode, setClickPlacementMode] = useState<"from" | "to" | null>(null);
  const [fromSearchQuery, setFromSearchQuery] = useState("");
  const [toSearchQuery, setToSearchQuery] = useState("");
  const [fromResults, setFromResults] = useState<TacticalMapPoint[]>([]);
  const [toResults, setToResults] = useState<TacticalMapPoint[]>([]);
  const [editingMapId, setEditingMapId] = useState<string | null>(initialItem?.id || null);
  const customIconInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialItem?.mapConfig) {
      setMapConfig({
        ...defaultConfig,
        ...initialItem.mapConfig,
      });
      setEditingMapId(initialItem.id);
    }
  }, [initialItem]);

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
          if (
            !combined.some(
              (c) => Math.abs(c.lat - rp.lat) < 0.1 && Math.abs(c.lon - rp.lon) < 0.1
            )
          ) {
            combined.push(rp);
          }
        });
        if (side === "from") setFromResults(combined.slice(0, 8));
        else setToResults(combined.slice(0, 8));
      }
    } catch { }
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

  const handleSelectAssetType = (assetType: TacticalRouteAssetType) => {
    if (assetType === "custom-image" && !activeRoute.customIconUrl) {
      customIconInputRef.current?.click();
      return;
    }
    if (assetType === "airliner") {
      updateActiveRoute({
        assetType,
        targetEffect: "landing",
        showImpactShockwave: false,
        arcHeight: 0.2,
        curveDirection: "up",
        color: "#38bdf8",
      });
    } else if (assetType === "helicopter") {
      updateActiveRoute({
        assetType,
        targetEffect: "landing",
        showImpactShockwave: false,
        arcHeight: 0.16,
        curveDirection: "up",
        color: "#10b981",
      });
    } else if (assetType === "warship" || assetType === "cargo-ship") {
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
        arcHeight: 0.26,
        curveDirection: "up",
        color: "#ef4444",
      });
    } else {
      updateActiveRoute({
        assetType,
        targetEffect: "explosion",
        showImpactShockwave: true,
        arcHeight: 0.35,
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

  // Launch a 1-click Live Simulator Mission Preset directly from the Simulator Command Center
  const handleLaunchSimulatorPreset = (preset: {
    title: string;
    from: TacticalMapPoint;
    to: TacticalMapPoint;
    assetType: TacticalRouteAssetType;
    targetEffect: TacticalTargetEffect;
    targetMarkerType: TacticalTargetMarkerType;
    color: string;
    arcHeight: number;
  }) => {
    const newRoute: TacticalMapRoute = {
      id: `sim-preset-${Date.now()}`,
      from: preset.from,
      to: preset.to,
      assetType: preset.assetType,
      targetEffect: preset.targetEffect,
      targetMarkerType: preset.targetMarkerType,
      curveDirection: preset.arcHeight === 0 ? "straight" : "up",
      color: preset.color,
      arcHeight: preset.arcHeight,
      speed: 1.25,
      showImpactShockwave: true,
      showDistanceKm: true,
    };
    const midLat = Number(((preset.from.lat + preset.to.lat) / 2).toFixed(4));
    const midLon = Number(((preset.from.lon + preset.to.lon) / 2).toFixed(4));
    const distKm = computeGreatCircleDistanceKm(preset.from, preset.to);
    const autoZoom =
      distKm > 6000 ? 3 : distKm > 2800 ? 4 : distKm > 1100 ? 5 : distKm > 450 ? 6 : 7;

    setMapConfig((prev) => ({
      ...prev,
      title: preset.title,
      centerLat: midLat,
      centerLon: midLon,
      zoom: autoZoom,
      simulatorEnabled: true,
      routes: [newRoute, ...prev.routes.slice(1)],
    }));
    setActiveRouteIdx(0);
  };

  const handleSaveTacticalMap = (attachAndPresentNow: boolean) => {
    const firstRoute = mapConfig.routes[0];
    const routeSummary = firstRoute
      ? `${firstRoute.from.name.split(",")[0]} ➔ ${firstRoute.to.name.split(",")[0]}`
      : "Tactical Map";

    const cleanName = mapConfig.title.trim() || `Map: ${routeSummary}`;

    const existingIdToUpdate =
      editingMapId ||
      savedMaps.find(
        (m) =>
          m.name.trim().toLowerCase() === cleanName.toLowerCase() &&
          m.duration === routeSummary
      )?.id ||
      null;

    if (existingIdToUpdate) {
      const updates: Partial<MediaFileItem> = {
        name: cleanName,
        type: "map",
        url: `map://${existingIdToUpdate}`,
        duration: routeSummary,
        mapConfig,
        loop: mapConfig.loopAnimation,
        isUploaded: true,
      };
      updateMediaLibraryItem(existingIdToUpdate, updates);
      const existing = mediaLibrary.find((m) => m.id === existingIdToUpdate);
      if (attachAndPresentNow && existing) {
        const merged = { ...existing, ...updates };
        if (effectiveSceneId) {
          updateScene(effectiveSceneId, { activeMedia: merged });
          if (effectiveSceneId !== activeSceneId) switchScene(effectiveSceneId);
        }
        setActiveMedia(merged);
        onSaveMapItem?.(merged);
        onClose();
      } else {
        setEditingMapId(existingIdToUpdate);
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
        if (effectiveSceneId !== activeSceneId) switchScene(effectiveSceneId);
      }
      setActiveMedia(newItem);
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
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-[96vw] max-w-[1440px] h-[92vh] bg-[#0b0d18] border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header with Large Readable Title & Navigation Tabs */}
        <div className="px-6 py-3.5 border-b border-white/10 bg-[#111426] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-lg">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2.5 flex-wrap">
                <span>Broadcast News Tactical Map — 3D/2D Air, Land & Naval Simulator</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                  3D Sky Horizon • Fullscreen 3D Globe • Radar ON/OFF • Live Simulator
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Drag map with mouse to pan/rotate, scroll to zoom, toggle Radar ON/OFF, or enable Simulator Mode to launch live missiles on stage
              </p>
            </div>
          </div>

          {/* Navigation Tabs inside Tactical Map Studio */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-black/50 p-1 rounded-xl border border-white/15">
              {[
                { id: "builder" as const, label: "🛠️ Route & 3D Builder" },
                { id: "simulator" as const, label: "🎮 Live War/Flight Simulator" },
                { id: "library" as const, label: `📁 Saved Maps (${savedMaps.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveModalTab(tab.id);
                    if (tab.id === "simulator") {
                      setMapConfig((prev) => ({ ...prev, simulatorEnabled: true }));
                    }
                  }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    activeModalTab === tab.id
                      ? "bg-cyan-600 text-white shadow-md"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
              title="Close Window"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body (12-Column Responsive Split) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/10 min-h-0">
          {/* Left Column (5 Cols): Builder / Simulator Command Center / Library Controls */}
          <div className="lg:col-span-5 p-5 space-y-4 overflow-y-auto custom-scrollbar">
            {activeModalTab === "library" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-cyan-300">
                    Saved Tactical Maps ({savedMaps.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMapId(null);
                      setMapConfig(defaultConfig);
                      setActiveModalTab("builder");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Map</span>
                  </button>
                </div>

                {savedMaps.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-white/15 text-center space-y-2 text-slate-400">
                    <Globe className="w-10 h-10 text-cyan-400/50 mx-auto" />
                    <p className="text-sm font-bold text-white">No Saved Tactical Maps Yet</p>
                    <p className="text-xs text-slate-400">
                      Configure a route in the Builder tab and click &ldquo;Save to Map Library&rdquo;.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {savedMaps.map((m) => {
                      const isAttached = targetScene?.activeMedia?.id === m.id;
                      const isLive = activeMedia?.id === m.id;
                      return (
                        <div
                          key={m.id}
                          className={cn(
                            "p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all",
                            isAttached || isLive
                              ? "bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400/30"
                              : "bg-white/[0.04] border-white/10 hover:border-cyan-500/40"
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                              <span>🗺️ {m.name}</span>
                              {isAttached && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                  In Scene ✓
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-cyan-300 font-mono mt-1">
                              {m.duration} • {m.mapConfig?.viewMode || "3d-perspective"}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (effectiveSceneId) {
                                  updateScene(effectiveSceneId, { activeMedia: m });
                                  if (effectiveSceneId !== activeSceneId) switchScene(effectiveSceneId);
                                }
                                setActiveMedia(m);
                                onSaveMapItem?.(m);
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow"
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (m.mapConfig) {
                                  setMapConfig(m.mapConfig);
                                  setEditingMapId(m.id);
                                  setActiveModalTab("builder");
                                }
                              }}
                              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200"
                              title="Edit Map"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeMediaLibraryItem(m.id)}
                              className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white"
                              title="Delete Map from Library"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : activeModalTab === "simulator" ? (
              /* ─── DEDICATED LIVE WAR & FLIGHT SIMULATOR COMMAND CENTER ─── */
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/45 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                      <Gamepad2 className="w-4 h-4 text-emerald-400" />
                      <span>Live War & Flight Simulator Command Center</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setMapConfig((prev) => ({
                          ...prev,
                          simulatorEnabled: !prev.simulatorEnabled,
                        }))
                      }
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-extrabold border transition-all cursor-pointer",
                        mapConfig.simulatorEnabled
                          ? "bg-emerald-600 text-white border-emerald-300 shadow"
                          : "bg-white/10 text-slate-300 border-white/15"
                      )}
                    >
                      {mapConfig.simulatorEnabled ? "🎮 SIMULATOR ACTIVE" : "Enable Simulator"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Select any weapon or aircraft below and <strong>click anywhere on the map on the right</strong> (in 2D, 3D Tilt, or 3D Globe mode) to launch live strikes & flights from your Origin Base!
                  </p>
                </div>

                {/* 1. Active Click-to-Spawn Weapon / Aircraft Tool */}
                <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/35 space-y-2.5">
                  <span className="text-xs font-bold uppercase text-cyan-300 block">
                    1. Select Active Click-to-Spawn Weapon / Aircraft:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      {
                        id: "launch-missile" as const,
                        title: "🚀 Ballistic Missile",
                        desc: "High-arc strike + blast",
                      },
                      {
                        id: "air-defense-intercept" as const,
                        title: "🛡️ Air Defense Intercept",
                        desc: "Mid-air SAM counter-hit",
                      },
                      {
                        id: "fighter-airstrike" as const,
                        title: "✈️ Fighter Jet Strike",
                        desc: "Jet launches standoff missile",
                      },
                      {
                        id: "naval-strike" as const,
                        title: "🚢 Warship Sea Strike",
                        desc: "Naval cruiser fires missile",
                      },
                      {
                        id: "airliner-flight" as const,
                        title: "🛫 Safe Flight / VIP",
                        desc: "Peaceful flight & landing",
                      },
                    ].map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          setModalSimTool(w.id);
                          setMapConfig((prev) => ({ ...prev, simulatorEnabled: true }));
                        }}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                          modalSimTool === w.id
                            ? "bg-emerald-600/35 border-emerald-400 text-white shadow-md"
                            : "bg-black/40 border-white/10 text-slate-300 hover:text-white"
                        )}
                      >
                        <div className="text-xs font-bold">{w.title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{w.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Quick 1-Click Live Conflict & Flight Theater Presets */}
                <div className="p-3.5 rounded-xl bg-indigo-950/25 border border-indigo-500/35 space-y-2.5">
                  <span className="text-xs font-bold uppercase text-indigo-300 block">
                    2. 1-Click Live Broadcast Theater Scenarios:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      {
                        title: "BREAKING: TEHRAN ➔ TEL AVIV BALLISTIC SALVO",
                        label: "🚀 Iran ➔ Israel Ballistic Strike",
                        from: { name: "Tehran, Iran", lat: 35.6892, lon: 51.389 },
                        to: { name: "Tel Aviv, Israel", lat: 32.0853, lon: 34.7818 },
                        assetType: "salvo" as TacticalRouteAssetType,
                        targetEffect: "explosion" as TacticalTargetEffect,
                        targetMarkerType: "radar-site" as TacticalTargetMarkerType,
                        color: "#ef4444",
                        arcHeight: 0.36,
                      },
                      {
                        title: "AIR DEFENSE: IRON DOME / S-400 MID-AIR INTERCEPT",
                        label: "🛡️ Air Defense Mid-Air Intercept",
                        from: { name: "Sanaa / Hodeidah, Yemen", lat: 15.3694, lon: 44.191 },
                        to: { name: "Eilat Port, Israel", lat: 29.5577, lon: 34.9519 },
                        assetType: "missile" as TacticalRouteAssetType,
                        targetEffect: "intercept" as TacticalTargetEffect,
                        targetMarkerType: "radar-site" as TacticalTargetMarkerType,
                        color: "#38bdf8",
                        arcHeight: 0.35,
                      },
                      {
                        title: "INDIAN NAVY: ARABIAN SEA WARSHIP MISSILE STRIKE",
                        label: "🚢 Mumbai Navy ➔ Arabian Sea Strike",
                        from: {
                          name: "Mumbai / Western Naval Command, India",
                          lat: 19.076,
                          lon: 72.8777,
                        },
                        to: { name: "Arabian Sea (Central)", lat: 16.5, lon: 64.5 },
                        assetType: "warship" as TacticalRouteAssetType,
                        targetEffect: "ship-launch-missile" as TacticalTargetEffect,
                        targetMarkerType: "warship" as TacticalTargetMarkerType,
                        color: "#06b6d4",
                        arcHeight: 0,
                      },
                      {
                        title: "IAF SORTIE: AMBALA AIRBASE ➔ LADAKH PATROL",
                        label: "✈️ Ambala Airbase ➔ Ladakh Jet Sortie",
                        from: { name: "Ambala Airbase, India", lat: 30.3782, lon: 76.7767 },
                        to: { name: "Leh / Ladakh, India", lat: 34.1526, lon: 77.5771 },
                        assetType: "fighter-jet" as TacticalRouteAssetType,
                        targetEffect: "hover-patrol" as TacticalTargetEffect,
                        targetMarkerType: "airbase" as TacticalTargetMarkerType,
                        color: "#f97316",
                        arcHeight: 0.24,
                      },
                      {
                        title: "VIP FLIGHT TRACKER: NEW DELHI ➔ LONDON",
                        label: "🛫 New Delhi ➔ London Safe Flight",
                        from: { name: "New Delhi, India", lat: 28.6139, lon: 77.209 },
                        to: { name: "London, UK", lat: 51.5074, lon: -0.1278 },
                        assetType: "airliner" as TacticalRouteAssetType,
                        targetEffect: "landing" as TacticalTargetEffect,
                        targetMarkerType: "airbase" as TacticalTargetMarkerType,
                        color: "#10b981",
                        arcHeight: 0.22,
                      },
                      {
                        title: "RED SEA MARITIME ALERT: BAB EL-MANDEB DRONE STRIKE",
                        label: "🛸 Red Sea / Houthi Drone Strike",
                        from: { name: "Sanaa / Hodeidah, Yemen", lat: 15.3694, lon: 44.191 },
                        to: { name: "Red Sea / Bab el-Mandeb", lat: 14.5, lon: 41.8 },
                        assetType: "drone" as TacticalRouteAssetType,
                        targetEffect: "explosion" as TacticalTargetEffect,
                        targetMarkerType: "cargo-ship" as TacticalTargetMarkerType,
                        color: "#eab308",
                        arcHeight: 0.25,
                      },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleLaunchSimulatorPreset(preset)}
                        className="p-2.5 rounded-xl bg-black/50 hover:bg-indigo-600/30 border border-white/10 hover:border-indigo-400 text-left text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. View Mode, Globe Scale & Radar Quick Controls inside Simulator Tab */}
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-slate-300">
                      3. 3D View Mode, Globe Size & Radar Sweep
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setMapConfig((prev) => ({
                          ...prev,
                          showRadarSweep: !(prev.showRadarSweep !== false),
                        }))
                      }
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 cursor-pointer",
                        mapConfig.showRadarSweep !== false
                          ? "bg-emerald-500/25 text-emerald-300 border-emerald-400/50"
                          : "bg-white/5 text-slate-400 border-white/15"
                      )}
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Radar Sweep: {mapConfig.showRadarSweep !== false ? "ON" : "OFF"}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "3d-perspective" as const, label: "🏔️ 3D Terrain Tilt" },
                      { id: "3d-globe" as const, label: "🌍 3D Earth Globe" },
                      { id: "2d" as const, label: "🗺️ 2D Flat Map" },
                    ].map((vm) => (
                      <button
                        key={vm.id}
                        type="button"
                        onClick={() =>
                          setMapConfig((prev) => ({
                            ...prev,
                            viewMode: vm.id,
                          }))
                        }
                        className={cn(
                          "py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                          mapConfig.viewMode === vm.id
                            ? "bg-cyan-600 text-white border-cyan-400"
                            : "bg-white/5 text-slate-300 border-white/10"
                        )}
                      >
                        {vm.label}
                      </button>
                    ))}
                  </div>

                  {mapConfig.viewMode === "3d-globe" && (
                    <div className="pt-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-indigo-200 font-bold">
                          🌍 3D Globe Size (Compact to Fullscreen)
                        </span>
                        <span className="font-mono text-indigo-300 font-bold">
                          {Math.round((mapConfig.globeScale ?? 1.18) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.7}
                        max={1.85}
                        step={0.05}
                        value={mapConfig.globeScale ?? 1.18}
                        onChange={(e) =>
                          setMapConfig((prev) => ({
                            ...prev,
                            globeScale: Number(e.target.value),
                          }))
                        }
                        className="w-full h-1.5 accent-indigo-400 bg-white/15 rounded-lg cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* 3D / 2D Camera, Globe Size, Radar & Perspective Control Card */}
                <div className="p-3.5 rounded-xl bg-cyan-950/25 border border-cyan-500/35 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                      <Box className="w-4 h-4 text-cyan-400" />
                      <span>3D View Mode, Camera Tilt, Globe Size & Radar</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setMapConfig((prev) => ({
                          ...prev,
                          pitchDeg: 45,
                          yawDeg: 0,
                          globeScale: 1.18,
                          viewMode: "3d-perspective",
                        }))
                      }
                      className="text-[11px] text-cyan-300 hover:underline font-semibold"
                    >
                      Reset 3D Angle
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        id: "3d-perspective" as const,
                        label: "🏔️ 3D Terrain Tilt",
                        sub: "Sky Horizon + 3D Arcs",
                      },
                      {
                        id: "3d-globe" as const,
                        label: "🌍 3D Earth Globe",
                        sub: "Starry Space + Orbit",
                      },
                      {
                        id: "2d" as const,
                        label: "🗺️ 2D Flat Map",
                        sub: "Classic Top-Down",
                      },
                    ].map((vm) => (
                      <button
                        key={vm.id}
                        type="button"
                        onClick={() =>
                          setMapConfig((prev) => ({
                            ...prev,
                            viewMode: vm.id,
                            pitchDeg:
                              vm.id === "3d-perspective"
                                ? Math.max(35, prev.pitchDeg || 45)
                                : prev.pitchDeg,
                          }))
                        }
                        className={cn(
                          "p-2 rounded-xl border text-left transition-all cursor-pointer",
                          (mapConfig.viewMode || "3d-perspective") === vm.id
                            ? "bg-cyan-600/35 border-cyan-400 text-white shadow"
                            : "bg-black/40 border-white/10 text-slate-300 hover:text-white"
                        )}
                      >
                        <div className="text-xs font-bold">{vm.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{vm.sub}</div>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-300 font-medium">3D Tilt Pitch</span>
                        <span className="font-mono text-cyan-300 font-bold">
                          {mapConfig.pitchDeg ?? 45}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={62}
                        step={2}
                        value={mapConfig.pitchDeg ?? 45}
                        onChange={(e) =>
                          setMapConfig({
                            ...mapConfig,
                            pitchDeg: Number(e.target.value),
                            viewMode: "3d-perspective",
                          })
                        }
                        className="w-full h-1.5 accent-cyan-400 bg-white/15 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-300 font-medium">3D Compass Yaw</span>
                        <span className="font-mono text-amber-300 font-bold">
                          {mapConfig.yawDeg ?? 0}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={5}
                        value={mapConfig.yawDeg ?? 0}
                        onChange={(e) =>
                          setMapConfig({ ...mapConfig, yawDeg: Number(e.target.value) })
                        }
                        className="w-full h-1.5 accent-amber-400 bg-white/15 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-300 font-medium">3D Altitude Height</span>
                        <span className="font-mono text-emerald-300 font-bold">
                          {Math.round((mapConfig.altitudeScale ?? 1.25) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={2.2}
                        step={0.1}
                        value={mapConfig.altitudeScale ?? 1.25}
                        onChange={(e) =>
                          setMapConfig({ ...mapConfig, altitudeScale: Number(e.target.value) })
                        }
                        className="w-full h-1.5 accent-emerald-400 bg-white/15 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* 3D Globe Size Slider & Fullscreen Button */}
                  {mapConfig.viewMode === "3d-globe" && (
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-indigo-200 font-bold">
                            🌍 3D Globe Size (Starry Space Background)
                          </span>
                          <span className="font-mono text-indigo-300 font-bold">
                            {Math.round((mapConfig.globeScale ?? 1.18) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.7}
                          max={1.85}
                          step={0.05}
                          value={mapConfig.globeScale ?? 1.18}
                          onChange={(e) =>
                            setMapConfig({ ...mapConfig, globeScale: Number(e.target.value) })
                          }
                          className="w-full h-1.5 accent-indigo-400 bg-white/15 rounded-lg cursor-pointer"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setMapConfig((prev) => ({
                            ...prev,
                            globeScale: (prev.globeScale ?? 1.18) >= 1.55 ? 1.15 : 1.72,
                          }))
                        }
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 cursor-pointer"
                      >
                        {(mapConfig.globeScale ?? 1.18) >= 1.55
                          ? "Standard Globe"
                          : "Full Screen Globe"}
                      </button>
                    </div>
                  )}

                  {/* Radar Sweep ON/OFF & Simulator Toggle Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() =>
                        setMapConfig((prev) => ({
                          ...prev,
                          showRadarSweep: !(prev.showRadarSweep !== false),
                        }))
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer",
                        mapConfig.showRadarSweep !== false
                          ? "bg-emerald-500/25 text-emerald-200 border-emerald-400/60"
                          : "bg-white/10 text-slate-300 border-white/15"
                      )}
                    >
                      <Radio className="w-4 h-4 text-emerald-400" />
                      <span>Radar Sweep: {mapConfig.showRadarSweep !== false ? "ON" : "OFF"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setMapConfig((prev) => ({
                          ...prev,
                          simulatorEnabled: !prev.simulatorEnabled,
                        }))
                      }
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0 cursor-pointer",
                        mapConfig.simulatorEnabled
                          ? "bg-emerald-600 text-white border-emerald-300 shadow-lg"
                          : "bg-white/10 text-slate-300 border-white/15 hover:text-white"
                      )}
                    >
                      {mapConfig.simulatorEnabled ? "🎮 Simulator ON" : "Enable Simulator"}
                    </button>
                  </div>
                </div>

                {/* Map Headline & Subtitle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-300 block mb-1">
                      News Map Headline Banner
                    </label>
                    <input
                      type="text"
                      value={mapConfig.title}
                      onChange={(e) => setMapConfig({ ...mapConfig, title: e.target.value })}
                      placeholder="e.g. BREAKING: MISSILE & AIRSTRIKE TRAJECTORY"
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white font-semibold focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-300 block mb-1">
                      Subtitle / Telemetry Note
                    </label>
                    <input
                      type="text"
                      value={mapConfig.subtitle || ""}
                      onChange={(e) => setMapConfig({ ...mapConfig, subtitle: e.target.value })}
                      placeholder="e.g. Live 3D Radar & Distance Analysis"
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-cyan-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* Multi-Route Tabs */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {mapConfig.routes.map((rt, idx) => (
                      <button
                        key={rt.id}
                        type="button"
                        onClick={() => setActiveRouteIdx(idx)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0",
                          idx === activeRouteIdx
                            ? "bg-cyan-600 text-white border-cyan-400 shadow"
                            : "bg-white/5 text-slate-300 border-white/10 hover:text-white"
                        )}
                      >
                        Path {idx + 1}: {rt.from.name.split(",")[0]} ➔ {rt.to.name.split(",")[0]}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleAddRoute}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Path</span>
                    </button>
                    {mapConfig.routes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRoute(activeRouteIdx)}
                        className="p-1.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-600 hover:text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Origin (Point A) & Target (Point B) Search */}
                {activeRoute && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-indigo-950/25 border border-indigo-500/30">
                    {/* Point A */}
                    <div className="space-y-1.5 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-cyan-300 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                          <span>1. Origin / Launch</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setMapConfig((prev) => ({ ...prev, simulatorEnabled: false }));
                            setClickPlacementMode(clickPlacementMode === "from" ? null : "from");
                          }}
                          className={cn(
                            "px-2 py-0.5 rounded-lg text-[10.5px] font-bold border",
                            clickPlacementMode === "from"
                              ? "bg-cyan-500 text-slate-950 border-cyan-300 animate-pulse"
                              : "bg-white/10 text-slate-200 border-white/15"
                          )}
                        >
                          {clickPlacementMode === "from" ? "Click Map..." : "🎯 Pick on Map"}
                        </button>
                      </div>

                      <div className="text-xs font-bold text-white bg-black/50 px-3 py-1.5 rounded-lg border border-cyan-500/30 truncate">
                        {activeRoute.from.name}
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={fromSearchQuery}
                          onChange={(e) => {
                            setFromSearchQuery(e.target.value);
                            searchLocations(e.target.value, "from");
                          }}
                          placeholder="Search City / Sea / Airbase..."
                          className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-black/70 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      {fromResults.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-[#0e1020] border border-cyan-500/50 rounded-xl shadow-2xl max-h-44 overflow-y-auto divide-y divide-white/5">
                          {fromResults.map((loc, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleSelectPoint("from", loc)}
                              className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-cyan-600/30 hover:text-white flex items-center justify-between"
                            >
                              <span className="truncate">{loc.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Point B */}
                    <div className="space-y-1.5 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-rose-300 flex items-center gap-1">
                          <Crosshair className="w-3.5 h-3.5 text-rose-400" />
                          <span>2. Destination / Target</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setMapConfig((prev) => ({ ...prev, simulatorEnabled: false }));
                            setClickPlacementMode(clickPlacementMode === "to" ? null : "to");
                          }}
                          className={cn(
                            "px-2 py-0.5 rounded-lg text-[10.5px] font-bold border",
                            clickPlacementMode === "to"
                              ? "bg-rose-500 text-white border-rose-300 animate-pulse"
                              : "bg-white/10 text-slate-200 border-white/15"
                          )}
                        >
                          {clickPlacementMode === "to" ? "Click Map..." : "🎯 Pick on Map"}
                        </button>
                      </div>

                      <div className="text-xs font-bold text-white bg-black/50 px-3 py-1.5 rounded-lg border border-rose-500/30 truncate">
                        {activeRoute.to.name}
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={toSearchQuery}
                          onChange={(e) => {
                            setToSearchQuery(e.target.value);
                            searchLocations(e.target.value, "to");
                          }}
                          placeholder="Search Target City / Sea..."
                          className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-black/70 border border-white/15 text-xs text-white focus:outline-none focus:border-rose-400"
                        />
                      </div>

                      {toResults.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-[#0e1020] border border-rose-500/50 rounded-xl shadow-2xl max-h-44 overflow-y-auto divide-y divide-white/5">
                          {toResults.map((loc, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleSelectPoint("to", loc)}
                              className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-rose-600/30 hover:text-white flex items-center justify-between"
                            >
                              <span className="truncate">{loc.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Vehicle / Projectile Selector */}
                {activeRoute && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase text-slate-300">
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
                        className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Custom PNG/GIF</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5">
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
                            "py-2 px-1.5 rounded-xl text-[11px] font-bold border text-center transition-all truncate",
                            activeRoute.assetType === item.id
                              ? "bg-rose-600/35 border-rose-400 text-white shadow"
                              : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Target Arrival & Mission Scenario Selector */}
                {activeRoute && (
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/35 space-y-2.5">
                    <span className="text-xs font-bold uppercase text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>4. Target Arrival & Mission Scenario</span>
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { id: "landing", label: "🛬 Safe Landing", desc: "Plane/Heli lands safely" },
                        { id: "naval-cruise", label: "⚓ Sea Cruise", desc: "Ship sails & docks" },
                        {
                          id: "ship-launch-missile",
                          label: "🚢🚀 Ship Strike",
                          desc: "Ship fires missile!",
                        },
                        {
                          id: "jet-airstrike",
                          label: "✈️🚀 Jet Strike",
                          desc: "Jet fires missile!",
                        },
                        { id: "explosion", label: "💥 Direct Hit", desc: "Blast shockwave" },
                        { id: "intercept", label: "🛡️ Intercept", desc: "Mid-air defense hit" },
                        { id: "hover-patrol", label: "🔄 Orbit Patrol", desc: "Circles over target" },
                        { id: "airdrop", label: "🪂 Airdrop", desc: "Drops parachutes" },
                      ].map((sc) => (
                        <button
                          key={sc.id}
                          type="button"
                          onClick={() => {
                            const eff = sc.id as TacticalTargetEffect;
                            updateActiveRoute({
                              targetEffect: eff,
                              showImpactShockwave:
                                eff === "explosion" ||
                                eff === "ship-launch-missile" ||
                                eff === "jet-airstrike",
                              ...(eff === "naval-cruise" || eff === "ship-launch-missile"
                                ? { arcHeight: 0, curveDirection: "straight" }
                                : {}),
                              ...(eff === "ship-launch-missile" &&
                                (!activeRoute.targetMarkerType ||
                                  activeRoute.targetMarkerType === "default")
                                ? { targetMarkerType: "warship" }
                                : {}),
                            });
                          }}
                          className={cn(
                            "p-2 rounded-xl border text-left transition-all",
                            currentTargetEffect === sc.id
                              ? "bg-emerald-600/35 border-emerald-400 text-white shadow"
                              : "bg-black/40 border-white/10 text-slate-300 hover:text-white"
                          )}
                        >
                          <div className="text-[11px] font-bold truncate">{sc.label}</div>
                          <div className="text-[9.5px] text-slate-400 truncate">{sc.desc}</div>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/10">
                      <div>
                        <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                          Target Object at Point B:
                        </label>
                        <select
                          value={activeRoute.targetMarkerType || "default"}
                          onChange={(e) =>
                            updateActiveRoute({
                              targetMarkerType: e.target.value as TacticalTargetMarkerType,
                            })
                          }
                          className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="default">📍 Standard Target Pin</option>
                          <option value="warship">🚢 Enemy Warship in Sea</option>
                          <option value="cargo-ship">⛴️ Cargo / Oil Tanker Ship</option>
                          <option value="airbase">🛫 Military Airbase / Runway</option>
                          <option value="radar-site">📡 Radar / SAM Battery</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                          Map Theme (Zero API Key):
                        </label>
                        <select
                          value={mapConfig.mapStyle}
                          onChange={(e) =>
                            setMapConfig({
                              ...mapConfig,
                              mapStyle: e.target.value as TacticalMapConfig["mapStyle"],
                            })
                          }
                          className="w-full bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="satellite">🛰️ Satellite + Country Borders</option>
                          <option value="dark-radar">🌑 Dark Tactical Night-Vision</option>
                          <option value="political">🗺️ Clean Political / Street Map</option>
                          <option value="ocean">🌊 Maritime / Naval Ocean Map</option>
                          <option value="vector-grid">🎯 Tactical Radar Grid Only</option>
                        </select>
                      </div>
                    </div>

                    {/* Missile Flight Trajectory Arc & Height Control */}
                    <div className="pt-2.5 border-t border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-slate-200 font-bold flex items-center gap-1.5">
                          <span>🚀 Missile / Trajectory Flight Arc & Height:</span>
                        </label>
                        <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
                          {Math.round((activeRoute.arcHeight ?? 0.32) * 100)}% ({activeRoute.arcHeight === 0 || activeRoute.curveDirection === "straight" ? "Flat / Sea" : activeRoute.arcHeight && activeRoute.arcHeight > 0.45 ? "High Ballistic" : "Elevated Arc"})
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">0% (Flat)</span>
                        <input
                          type="range"
                          min={0}
                          max={0.8}
                          step={0.02}
                          value={activeRoute.arcHeight ?? 0.32}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateActiveRoute({
                              arcHeight: val,
                              curveDirection: val === 0 ? "straight" : (activeRoute.curveDirection === "straight" ? "up" : activeRoute.curveDirection || "up"),
                            });
                          }}
                          className="flex-1 h-2 accent-amber-400 bg-white/20 rounded-lg cursor-pointer"
                          title="Adjust Missile Flight Arc Height (from direct flat flight to high-altitude ballistic trajectory)"
                        />
                        <span className="text-[10px] text-amber-300 font-mono shrink-0">80% (High Ballistic)</span>
                      </div>

                      {/* Quick Presets for Trajectory Height */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-semibold mr-1">Height Presets:</span>
                        {[
                          { label: "Direct Flat (0%)", arc: 0, dir: "straight" as const },
                          { label: "Low Cruise (18%)", arc: 0.18, dir: "up" as const },
                          { label: "Standard Arc (35%)", arc: 0.35, dir: "up" as const },
                          { label: "High Ballistic (60%)", arc: 0.6, dir: "up" as const },
                        ].map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => updateActiveRoute({ arcHeight: p.arc, curveDirection: p.dir })}
                            className={cn(
                              "px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer",
                              Math.abs((activeRoute.arcHeight ?? 0.32) - p.arc) < 0.05
                                ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow"
                                : "bg-black/40 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
                            )}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>

                      {/* 3D Perspective Altitude / Camera Elevation Scale */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-[10.5px] font-bold text-emerald-300 block">3D Altitude Scale:</span>
                          <span className="text-[9.5px] text-slate-400">Controls 3D terrain arc elevation in 3D perspective mode</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="range"
                            min={0.5}
                            max={2.5}
                            step={0.1}
                            value={mapConfig.altitudeScale ?? 1.25}
                            onChange={(e) => setMapConfig({ ...mapConfig, altitudeScale: Number(e.target.value) })}
                            className="w-24 h-1.5 accent-emerald-400 bg-white/20 rounded cursor-pointer"
                            title="3D Altitude Elevation Scale"
                          />
                          <span className="text-[10px] font-mono text-emerald-300 font-bold min-w-[32px] text-right">
                            {(mapConfig.altitudeScale ?? 1.25).toFixed(1)}x
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Column (7 Cols): Huge Interactive 3D/2D Broadcast Map Canvas */}
          <div className="lg:col-span-7 p-5 bg-[#060811] flex flex-col justify-between gap-3 min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Move className="w-4 h-4 text-cyan-400" />
                  <span>
                    Interactive 60FPS 3D/2D Stage Preview (Drag to Rotate/Pan • Wheel: Zoom • Click in Simulator to Fire)
                  </span>
                </span>
              </div>
              {clickPlacementMode && (
                <span className="text-xs px-3 py-1 rounded-lg bg-rose-500 text-white font-bold animate-pulse">
                  Click anywhere on map to set{" "}
                  {clickPlacementMode === "from" ? "Origin (Point A)" : "Target (Point B)"}
                </span>
              )}
            </div>

            <div className="flex-1 w-full rounded-2xl overflow-hidden border border-cyan-500/40 shadow-2xl relative bg-black flex items-center justify-center min-h-[360px]">
              <TacticalMapStageCanvas
                config={mapConfig}
                isInteractive={true}
                simToolOverride={modalSimTool}
                onSimToolChange={setModalSimTool}
                onConfigChange={(updates) =>
                  setMapConfig((prev) => ({ ...prev, ...updates }))
                }
                onMapClickLatLon={(lat, lon) => {
                  if (clickPlacementMode === "from") {
                    handleSelectPoint("from", {
                      name: `Origin (${lat.toFixed(1)}°N, ${lon.toFixed(1)}°E)`,
                      lat,
                      lon,
                    });
                    setClickPlacementMode(null);
                  } else if (clickPlacementMode === "to") {
                    handleSelectPoint("to", {
                      name: `Target (${lat.toFixed(1)}°N, ${lon.toFixed(1)}°E)`,
                      lat,
                      lon,
                    });
                    setClickPlacementMode(null);
                  }
                }}
              />
            </div>

            {/* Footer Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10 shrink-0">
              <div className="text-xs text-slate-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  <strong>Real-Time Viewer Sync:</strong> Everything you pan, zoom, tilt in 3D, or fire in Simulator Mode on Stage is broadcast live to viewers!
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSaveTacticalMap(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-cyan-400" />
                  <span>{editingMapId ? "Update in Map Library" : "Save to Map Library"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveTacticalMap(true)}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {targetScene
                      ? `Save & Attach to "${targetScene.name}"`
                      : "Save & Present 3D Map on Stage"}
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
