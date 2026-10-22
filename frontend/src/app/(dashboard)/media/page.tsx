"use client";

import { appendFileOrChunked } from "@/lib/chunkedUpload";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  FolderOpen,
  Upload,
  Video,
  Image as ImageIcon,
  Music,
  FileText,
  Search,
  Play,
  Trash2,
  Sparkles,
  Youtube,
  Globe,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import {
  useStudioStore,
  MediaFileItem,
  isDummyOrBrokenMediaItem,
  sanitizeAndDeduplicateMediaList,
} from "@/stores/studio.store";

export default function MediaLibraryPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    mediaLibrary,
    addMediaLibraryItem,
    removeMediaLibraryItem,
    cleanupMediaLibrary,
  } = useStudioStore();

  const [mediaFiles, setMediaFiles] = useState<MediaFileItem[]>(() => {
    return sanitizeAndDeduplicateMediaList(mediaLibrary || [], true);
  });

  // Sync with store
  useEffect(() => {
    setMediaFiles(sanitizeAndDeduplicateMediaList(mediaLibrary || [], true));
  }, [mediaLibrary]);

  // Fetch from backend
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("livestudio_token") : null;
    fetch("/api/media", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) {
          const serverItems: MediaFileItem[] = json.data
            .map((item: any) => {
              const metaSec = Number(item.metadata?.duration || 0);
              return {
                id: item.id,
                name: item.name,
                type: item.assetType.toLowerCase() as any,
                durationSeconds: metaSec,
                duration:
                  metaSec > 0
                    ? `${Math.floor(metaSec / 60)}:${(metaSec % 60).toString().padStart(2, "0")}`
                    : item.fileSize
                    ? `${(item.fileSize / (1024 * 1024)).toFixed(1)} MB`
                    : "Ready",
                url: item.url,
                isUploaded: true,
              };
            })
            .filter((item: MediaFileItem) => !isDummyOrBrokenMediaItem(item));

          if (serverItems.length > 0) {
            setMediaFiles((prev) => sanitizeAndDeduplicateMediaList([...prev, ...serverItems], true));
            serverItems.forEach((si) => addMediaLibraryItem(si));
          }
        }
      })
      .catch(() => {});
  }, [addMediaLibraryItem]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let type: "video" | "audio" | "image" | "pdf" = "video";
    if (file.type.startsWith("audio/")) type = "audio";
    else if (file.type.startsWith("image/")) type = "image";
    else if (file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf")) type = "pdf";

    const fileUrl = URL.createObjectURL(file);
    const durationLabel = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    const newItem: MediaFileItem = {
      id: `media-${Date.now()}`,
      name: file.name,
      type,
      duration: durationLabel,
      url: fileUrl,
      isUploaded: true,
    };

    setMediaFiles((prev) => [newItem, ...prev]);
    addMediaLibraryItem(newItem);

    setIsUploading(true);
    try {
      const formData = new FormData();
      await appendFileOrChunked(formData, "file", file);
      formData.append("name", file.name);
      formData.append("assetType", type.toUpperCase());
      formData.append("isPersistent", "true");

      const token = typeof window !== "undefined" ? localStorage.getItem("livestudio_token") : null;
      const res = await fetch("/api/media/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.url) {
          const perm: MediaFileItem = { ...newItem, id: json.data.id || newItem.id, url: json.data.url };
          setMediaFiles((prev) => prev.map((m) => (m.id === newItem.id ? perm : m)));
          addMediaLibraryItem(perm);
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.error || "Upload failed due to quota restrictions.");
        setMediaFiles((prev) => prev.filter((m) => m.id !== newItem.id));
        removeMediaLibraryItem(newItem.id);
      }
    } catch {
      // Local preview remains
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = (id: string) => {
    setMediaFiles((prev) => prev.filter((m) => m.id !== id));
    removeMediaLibraryItem(id);
  };

  const handleCleanup = () => {
    const count = cleanupMediaLibrary();
    setMediaFiles(sanitizeAndDeduplicateMediaList(mediaLibrary || [], true));
    alert(count > 0 ? `Cleaned ${count} dummy/duplicate item(s)!` : "Media Library is already clean!");
  };

  const counts = useMemo(() => {
    return {
      all: mediaFiles.length,
      video: mediaFiles.filter((m) => m.type === "video").length,
      youtube: mediaFiles.filter((m) => m.type === "youtube" || m.youtubeId).length,
      map: mediaFiles.filter((m) => m.type === "map" || m.mapConfig).length,
      pdf: mediaFiles.filter((m) => m.type === "pdf").length,
      website: mediaFiles.filter((m) => m.type === "website" || m.websiteConfig).length,
      audio: mediaFiles.filter((m) => m.type === "audio").length,
      image: mediaFiles.filter((m) => m.type === "image").length,
    };
  }, [mediaFiles]);

  const filteredMedia = useMemo(() => {
    return mediaFiles.filter((m) => {
      if (activeTab !== "all") {
        if (activeTab === "youtube" && !(m.type === "youtube" || m.youtubeId)) return false;
        if (activeTab === "map" && !(m.type === "map" || m.mapConfig)) return false;
        if (activeTab === "website" && !(m.type === "website" || m.websiteConfig)) return false;
        if (["video", "audio", "pdf", "image"].includes(activeTab) && m.type !== activeTab) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          (m.duration || "").toLowerCase().includes(q) ||
          m.type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [mediaFiles, activeTab, search]);

  const getIcon = (item: MediaFileItem) => {
    if (item.type === "youtube" || item.youtubeId) return <Youtube className="w-5 h-5 text-rose-400" />;
    if (item.type === "map" || item.mapConfig) return <Globe className="w-5 h-5 text-emerald-400" />;
    if (item.type === "website" || item.websiteConfig) return <Globe className="w-5 h-5 text-cyan-400" />;
    if (item.type === "video") return <Video className="w-5 h-5 text-indigo-400" />;
    if (item.type === "audio") return <Music className="w-5 h-5 text-emerald-400" />;
    if (item.type === "image") return <ImageIcon className="w-5 h-5 text-cyan-400" />;
    return <FileText className="w-5 h-5 text-amber-400" />;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Media Library</h1>
          <p className="text-sm text-slate-400 mt-1">
            Store video clips, YouTube streams, 3D tactical maps, slides, websites, and audio to share live on stage.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleCleanup}
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
          >
            <Sparkles className="w-4 h-4 mr-2 text-emerald-400" />
            Clean Dummy Files
          </Button>
          <Button
            variant="primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload Media"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,audio/*,image/*,.pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs
          tabs={[
            { id: "all", label: "All Media", count: counts.all },
            { id: "video", label: "Videos", count: counts.video },
            { id: "youtube", label: "YouTube", count: counts.youtube },
            { id: "map", label: "3D Map", count: counts.map },
            { id: "pdf", label: "Slides & PDF", count: counts.pdf },
            { id: "website", label: "Websites", count: counts.website },
            { id: "audio", label: "Audio", count: counts.audio },
            { id: "image", label: "Images", count: counts.image },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
        <div className="w-full sm:w-64">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder={`Search ${activeTab === "all" ? "all media" : activeTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredMedia.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-white/10 text-center space-y-3 text-slate-400">
          <FolderOpen className="w-12 h-12 text-indigo-400/50 mx-auto" />
          <h3 className="text-base font-bold text-white">No media items found</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Upload files or add YouTube clips, 3D maps, websites, and slides from inside the Studio.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredMedia.map((m) => (
            <Card key={m.id} hoverEffect className="group overflow-hidden p-0 flex flex-col justify-between bg-[#121320] border-white/10">
              <div className="aspect-video bg-[#0a0a10] relative flex items-center justify-center border-b border-white/5">
                {m.thumbnail ? (
                  <img src={m.thumbnail} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                    {getIcon(m)}
                  </div>
                )}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    className="p-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white shadow"
                    title="Delete Media"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-2">
                <h4 className="text-xs font-semibold text-white truncate" title={m.name}>
                  {m.name}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300">
                    {m.type}
                  </span>
                  <span>{m.duration || "Ready"}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
