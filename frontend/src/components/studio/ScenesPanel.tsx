"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useStudioStore, StudioScene, StudioLayout, persistStudioLayout } from "@/stores/studio.store";
import { cn } from "@/lib/utils";
import {
  Plus,
  HelpCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Check,
  Trash2,
  Copy,
  Edit2,
  Camera,
  Play,
  User,
  Users,
  MonitorUp,
  Clapperboard,
  Sparkles,
  Upload,
  X,
  FileText,
  Video,
  Music,
  Layers,
} from "lucide-react";

export const LAYOUT_LABELS: Record<string, string> = {
  "solo": "Solo",
  "side-by-side": "Fit 16:9",
  "fit": "Fit 16:9",
  "cropped": "Cropped",
  "podcast": "Cropped",
  "speaker-large": "Speaker + Grid",
  "three-equal": "3 People",
  "four-grid": "2x2 Grid",
  "six-grid": "6-Tile Grid",
  "five-grid": "5-Tile Grid",
  "nine-grid": "9-Tile Grid",
  "presentation": "Presentation",
  "screen-speaker": "Screen + Speaker",
  "pip": "PiP",
  "cinema": "Fullscreen",
  "screen-full": "Fullscreen",
  "stacked": "Stacked",
  "interview": "Interview",
  "custom": "Custom",
};

interface LayoutPresetOption {
  id: StudioLayout;
  title: string;
  desc: string;
  renderPreview: () => React.ReactNode;
}

const LAYOUT_PRESETS: LayoutPresetOption[] = [
  {
    id: "solo",
    title: "Solo Speaker",
    desc: "1 main person filling canvas",
    renderPreview: () => (
      <div className="w-full h-8 rounded bg-black/60 border border-white/20 p-0.5 flex items-center justify-center">
        <div className="w-full h-full bg-indigo-500/40 rounded-xs flex items-center justify-center">
          <User className="w-3 h-3 text-indigo-300" />
        </div>
      </div>
    ),
  },
  {
    id: "side-by-side",
    title: "2-Person Fit (16:9)",
    desc: "Widescreen boxes with background",
    renderPreview: () => (
      <div className="w-full h-8 rounded bg-black/60 border border-white/20 p-0.5 flex items-center justify-center gap-1">
        <div className="w-[45%] h-[80%] bg-indigo-500/40 rounded-xs flex items-center justify-center">
          <User className="w-2.5 h-2.5 text-indigo-300" />
        </div>
        <div className="w-[45%] h-[80%] bg-indigo-500/40 rounded-xs flex items-center justify-center">
          <User className="w-2.5 h-2.5 text-indigo-300" />
        </div>
      </div>
    ),
  },
  {
    id: "cropped",
    title: "2-Person Full-Bleed",
    desc: "Edge-to-edge full height split",
    renderPreview: () => (
      <div className="w-full h-8 rounded bg-black/60 border border-white/20 flex divide-x divide-white/20 overflow-hidden">
        <div className="flex-1 h-full bg-indigo-500/40 flex items-center justify-center">
          <User className="w-2.5 h-2.5 text-indigo-300" />
        </div>
        <div className="flex-1 h-full bg-indigo-500/40 flex items-center justify-center">
          <User className="w-2.5 h-2.5 text-indigo-300" />
        </div>
      </div>
    ),
  },
  {
    id: "speaker-large",
    title: "Spotlight / News",
    desc: "Hero left (68%) + right guest stack",
    renderPreview: () => (
      <div className="w-full h-8 rounded bg-black/60 border border-white/20 p-0.5 flex gap-1">
        <div className="flex-[3] h-full bg-indigo-500/40 rounded-xs flex items-center justify-center">
          <User className="w-3 h-3 text-indigo-300" />
        </div>
        <div className="flex-1 h-full flex flex-col gap-0.5">
          <div className="w-full flex-1 bg-indigo-500/30 rounded-xs" />
          <div className="w-full flex-1 bg-indigo-500/30 rounded-xs" />
        </div>
      </div>
    ),
  },
  {
    id: "presentation",
    title: "Presentation Deck",
    desc: "Slide focus + bottom speaker row",
    renderPreview: () => (
      <div className="w-full h-8 rounded bg-black/60 border border-white/20 p-0.5 flex flex-col gap-0.5">
        <div className="w-full flex-[2] bg-cyan-500/40 rounded-xs flex items-center justify-center">
          <MonitorUp className="w-3 h-3 text-cyan-300" />
        </div>
        <div className="w-full flex-1 flex gap-0.5">
          <div className="flex-1 bg-indigo-500/30 rounded-xs" />
          <div className="flex-1 bg-indigo-500/30 rounded-xs" />
        </div>
      </div>
    ),
  },
  {
    id: "pip",
    title: "Picture in Picture",
    desc: "Full canvas with corner floating box",
    renderPreview: () => (
      <div className="w-full h-8 rounded bg-black/60 border border-white/20 p-0.5 relative">
        <div className="w-full h-full bg-cyan-500/30 rounded-xs" />
        <div className="absolute bottom-1 right-1 w-4 h-3 bg-indigo-500/80 rounded-xs flex items-center justify-center">
          <User className="w-2 h-2 text-white" />
        </div>
      </div>
    ),
  },
  {
    id: "cinema",
    title: "Cinema Fullscreen",
    desc: "100% video or slide presentation",
    renderPreview: () => (
      <div className="w-full h-8 rounded bg-black/60 border border-white/20 p-0.5 flex items-center justify-center">
        <div className="w-full h-full bg-indigo-600/50 rounded-xs flex items-center justify-center">
          <Play className="w-3 h-3 fill-white text-white ml-0.5" />
        </div>
      </div>
    ),
  },
  {
    id: "three-equal",
    title: "3-Column Trio",
    desc: "Three equal vertical columns",
    renderPreview: () => (
      <div className="w-full h-8 rounded bg-black/60 border border-white/20 p-0.5 flex gap-0.5">
        <div className="flex-1 h-full bg-indigo-500/30 rounded-xs" />
        <div className="flex-1 h-full bg-indigo-500/30 rounded-xs" />
        <div className="flex-1 h-full bg-indigo-500/30 rounded-xs" />
      </div>
    ),
  },
  {
    id: "four-grid",
    title: "2x2 Quad Grid",
    desc: "Four equal participant tiles",
    renderPreview: () => (
      <div className="w-full h-8 rounded bg-black/60 border border-white/20 p-0.5 grid grid-cols-2 grid-rows-2 gap-0.5">
        <div className="bg-indigo-500/30 rounded-xs" />
        <div className="bg-indigo-500/30 rounded-xs" />
        <div className="bg-indigo-500/30 rounded-xs" />
        <div className="bg-indigo-500/30 rounded-xs" />
      </div>
    ),
  },
  {
    id: "six-grid",
    title: "6-Tile Grid",
    desc: "Six equal participant tiles",
    renderPreview: () => (
      <div className="w-full h-8 rounded bg-black/60 border border-white/20 p-0.5 grid grid-cols-3 grid-rows-2 gap-0.5">
        <div className="bg-indigo-500/30 rounded-xs" />
        <div className="bg-indigo-500/30 rounded-xs" />
        <div className="bg-indigo-500/30 rounded-xs" />
        <div className="bg-indigo-500/30 rounded-xs" />
        <div className="bg-indigo-500/30 rounded-xs" />
        <div className="bg-indigo-500/30 rounded-xs" />
      </div>
    ),
  },
  {
    id: "screen-speaker",
    title: "Screen + Speaker",
    desc: "Host on left (35%) + screen on right (65%)",
    renderPreview: () => (
      <div className="w-full h-8 rounded bg-black/60 border border-white/20 p-0.5 flex gap-1">
        <div className="flex-1 h-full bg-indigo-500/40 rounded-xs flex items-center justify-center">
          <User className="w-2.5 h-2.5 text-indigo-300" />
        </div>
        <div className="flex-[2] h-full bg-cyan-500/40 rounded-xs flex items-center justify-center">
          <MonitorUp className="w-3 h-3 text-cyan-300" />
        </div>
      </div>
    ),
  },
  {
    id: "stacked",
    title: "Stacked Vertical",
    desc: "Top & bottom horizontal split",
    renderPreview: () => (
      <div className="w-full h-8 rounded bg-black/60 border border-white/20 p-0.5 flex flex-col gap-0.5">
        <div className="w-full flex-1 bg-indigo-500/40 rounded-xs flex items-center justify-center">
          <User className="w-2 h-2 text-indigo-300" />
        </div>
        <div className="w-full flex-1 bg-indigo-500/40 rounded-xs flex items-center justify-center">
          <User className="w-2 h-2 text-indigo-300" />
        </div>
      </div>
    ),
  },
  {
    id: "custom",
    title: "Custom Layout",
    desc: "Design custom composition & gaps",
    renderPreview: () => (
      <div className="w-full h-8 rounded bg-black/60 border border-indigo-500/40 p-0.5 flex items-center justify-center">
        <div className="w-full h-full bg-indigo-500/25 rounded-xs flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-300" />
          <span className="text-[7px] font-mono text-cyan-200 uppercase font-bold tracking-wider">Custom</span>
        </div>
      </div>
    ),
  },
];

interface ScenesPanelProps {
  className?: string;
}

export const ScenesPanel: React.FC<ScenesPanelProps> = ({ className }) => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    scenes,
    activeSceneId,
    isScenesPanelOpen,
    toggleScenesPanel,
    addScene,
    updateScene,
    deleteScene,
    duplicateScene,
    switchScene,
    saveCurrentStageToScene,
    reorderScenes,
    setActiveMedia,
    setLayout,
    mediaLibrary,
    addMediaLibraryItem,
    removeMediaLibraryItem,
    preAddGuestSlotToScene,
    removeGuestSlotFromScene,
    setAutoAddGuestsToStage,
  } = useStudioStore();

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [mediaPickerSceneId, setMediaPickerSceneId] = useState<string | null>(null);
  const [layoutPickerSceneId, setLayoutPickerSceneId] = useState<string | null>(null);
  const mediaFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleSelectSceneLayout = (sceneId: string, layout: StudioLayout) => {
    const defaultSplit =
      layout === "three-equal"
        ? 33
        : layout === "speaker-large" || layout === "presentation"
        ? 65
        : 50;
    updateScene(sceneId, { layout, splitRatio: defaultSplit });
    if (activeSceneId === sceneId) {
      setLayout(layout);
    }
    setLayoutPickerSceneId(null);
  };

  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  // StreamYard New Scene Creation Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSceneName, setNewSceneName] = useState("");
  const [newSceneLayout, setNewSceneLayout] = useState<StudioLayout>("side-by-side");
  const [newSceneMode, setNewSceneMode] = useState<"blank" | "snapshot">("blank");
  const [newSceneMedia, setNewSceneMedia] = useState<any | null>(null);

  const handleOpenAddSceneModal = () => {
    setNewSceneName(`Scene ${scenes.length + 1}`);
    setNewSceneLayout("side-by-side");
    setNewSceneMode("blank");
    setNewSceneMedia(null);
    setIsAddModalOpen(true);
  };

  const handleCreateScene = () => {
    const finalName = newSceneName.trim() || `Scene ${scenes.length + 1}`;
    if (newSceneMode === "snapshot") {
      addScene({ name: finalName });
    } else {
      addScene({
        name: finalName,
        layout: newSceneLayout,
        activeMedia: newSceneMedia,
        splitRatio: newSceneLayout === "speaker-large" || newSceneLayout === "presentation" ? 68 : 50,
      });
    }
    setIsAddModalOpen(false);
  };

  const handleAttachMedia = (sceneId: string, mediaItem: any | null) => {
    const targetScene = scenes.find((s) => s.id === sceneId);
    const updates: Partial<StudioScene> = {
      activeMedia: mediaItem,
    };
    if (mediaItem && targetScene && targetScene.layout === "solo") {
      updates.layout = mediaItem.type === "video" ? "cinema" : "presentation";
    }
    updateScene(sceneId, updates);

    if (activeSceneId === sceneId) {
      setActiveMedia(mediaItem);
      if (updates.layout) {
        setLayout(updates.layout);
      }
    }
    setMediaPickerSceneId(null);
    setActiveMenuId(null);
  };

  const handleCustomFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, sceneId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingUpload(true);
    let type: "video" | "audio" | "image" | "pdf" = "video";
    if (file.type.startsWith("audio/")) type = "audio";
    else if (file.type.startsWith("image/")) type = "image";
    else if (file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf")) type = "pdf";

    const itemId = `media-upload-${Date.now()}`;

    // Process image into an optimized Data URL so it is 100% persistent across browser refresh (F5)
    if (type === "image") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawDataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          // Downscale to max 1920x1080 to maintain broadcast crispness while ensuring instant localStorage loading
          const maxW = 1920;
          const maxH = 1080;
          let w = img.width;
          let h = img.height;
          if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW / w, maxH / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          let finalDataUrl = rawDataUrl;
          let thumbUrl = rawDataUrl;
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            finalDataUrl = canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.9);

            const thumbCanvas = document.createElement("canvas");
            thumbCanvas.width = 160;
            thumbCanvas.height = Math.round(160 * (h / w));
            const thumbCtx = thumbCanvas.getContext("2d");
            if (thumbCtx) {
              thumbCtx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
              thumbUrl = thumbCanvas.toDataURL("image/jpeg", 0.7);
            }
          }

          const customItem = {
            id: itemId,
            name: file.name,
            type: "image" as const,
            url: finalDataUrl,
            thumbnail: thumbUrl,
            duration: "Image",
            isUploaded: true,
            loop: true,
          };

          addMediaLibraryItem(customItem);
          handleAttachMedia(sceneId, customItem);
          setIsProcessingUpload(false);
          uploadToServer(file, customItem, sceneId);
        };
        img.onerror = () => {
          fallbackUpload(file, itemId, type, sceneId, rawDataUrl);
        };
        img.src = rawDataUrl;
      };
      reader.onerror = () => {
        fallbackUpload(file, itemId, type, sceneId);
      };
      reader.readAsDataURL(file);
      return;
    }

    if (type === "pdf") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const customItem = {
          id: itemId,
          name: file.name,
          type: "pdf" as const,
          url: dataUrl,
          duration: "Document",
          isUploaded: true,
          loop: true,
        };
        addMediaLibraryItem(customItem);
        handleAttachMedia(sceneId, customItem);
        setIsProcessingUpload(false);
        uploadToServer(file, customItem, sceneId);
      };
      reader.onerror = () => {
        fallbackUpload(file, itemId, type, sceneId);
      };
      reader.readAsDataURL(file);
      return;
    }

    // Video / Audio: use objectUrl for immediate playback + background upload
    const objectUrl = URL.createObjectURL(file);
    const customItem = {
      id: itemId,
      name: file.name,
      type,
      url: objectUrl,
      duration: type === "video" ? "Video Clip" : "Audio Track",
      isUploaded: true,
      loop: true,
    };
    addMediaLibraryItem(customItem);
    handleAttachMedia(sceneId, customItem);
    setIsProcessingUpload(false);
    uploadToServer(file, customItem, sceneId);
  };

  const fallbackUpload = (
    file: File,
    itemId: string,
    type: "video" | "audio" | "image" | "pdf",
    sceneId: string,
    fallbackUrl?: string
  ) => {
    const url = fallbackUrl || URL.createObjectURL(file);
    const item = {
      id: itemId,
      name: file.name,
      type,
      url,
      duration: "Media",
      isUploaded: true,
      loop: true,
    };
    addMediaLibraryItem(item);
    handleAttachMedia(sceneId, item);
    setIsProcessingUpload(false);
    uploadToServer(file, item, sceneId);
  };

  const uploadToServer = async (file: File, item: any, sceneId: string) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);
      formData.append("assetType", item.type.toUpperCase());
      const currentStudioId = useStudioStore.getState().currentStudioId || "";
      if (currentStudioId) {
        formData.append("studioId", currentStudioId);
      }
      formData.append("isPersistent", "true");
      const token = typeof window !== "undefined" ? localStorage.getItem("livestudio_token") : null;

      const res = await fetch("/api/media/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.success && json.data?.url) {
          const serverUrl = json.data.url;
          const serverId = json.data.id || item.id;
          const updatedItem = { ...item, url: serverUrl, id: serverId };

          // 1. Update media library in store
          addMediaLibraryItem(updatedItem);

          // 2. Update all scenes in store containing this media or targeted scene
          const currentStore = useStudioStore.getState();
          const nextScenes = currentStore.scenes.map((s) =>
            s.id === sceneId || s.activeMedia?.id === item.id || s.activeMedia?.name === item.name
              ? { ...s, activeMedia: updatedItem }
              : s
          );

          // 3. Update activeMedia if matching or if active scene
          const shouldUpdateActive =
            currentStore.activeMedia?.id === item.id ||
            currentStore.activeMedia?.name === item.name ||
            currentStore.activeSceneId === sceneId;

          // 4. Persist immediately to localStorage and cloud!
          persistStudioLayout({
            scenes: nextScenes,
            ...(shouldUpdateActive ? { activeMedia: updatedItem } : {}),
          });

          useStudioStore.setState({
            scenes: nextScenes,
            ...(shouldUpdateActive ? { activeMedia: updatedItem } : {}),
          });
        }
      }
    } catch {
      // Backend upload skipped or offline; local data URL continues working smoothly
    } finally {
      if (mediaFileInputRef.current) mediaFileInputRef.current.value = "";
    }
  };

  const handleStartRename = (scene: StudioScene) => {
    setEditingId(scene.id);
    setEditName(scene.name);
    setActiveMenuId(null);
  };

  const handleSaveRename = (id: string) => {
    if (editName.trim()) {
      updateScene(id, { name: editName.trim() });
    }
    setEditingId(null);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIdx(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== targetIndex) {
      reorderScenes(draggedIdx, targetIndex);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  // Render visual thumbnail representation based on layout
  const renderThumbnailContent = (scene: StudioScene) => {
    const layout = scene.layout;
    const hasMedia = Boolean(scene.activeMedia);

    // Helpers for rendering individual boxes in thumbnail
    const renderMediaTile = (customClass = "") => (
      <div
        className={cn(
          "relative w-full h-full overflow-hidden bg-black/85 rounded border border-cyan-500/60 shadow-xs flex items-center justify-center",
          customClass
        )}
      >
        {scene.activeMedia?.type === "video" ? (
          <video
            src={scene.activeMedia.url}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
        ) : scene.activeMedia?.thumbnail || scene.activeMedia?.url ? (
          <img
            src={scene.activeMedia.thumbnail || scene.activeMedia.url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <MonitorUp className="w-3 h-3 text-cyan-300" />
        )}
        <div className="absolute bottom-0.5 left-0.5 px-1 py-0.2 rounded bg-black/90 text-[6px] text-cyan-300 font-mono flex items-center gap-0.5 shadow-sm pointer-events-none">
          <Clapperboard className="w-1.5 h-1.5" />
        </div>
      </div>
    );

    const renderCameraTile = (label?: string, customClass = "") => (
      <div
        className={cn(
          "w-full h-full bg-black/80 border border-white/25 rounded shadow-xs flex flex-col items-center justify-center gap-0.5",
          customClass
        )}
      >
        <User className="w-2.5 h-2.5 text-indigo-300" />
        {label && <span className="text-[6px] text-indigo-200/90 leading-none">{label}</span>}
      </div>
    );

    // 1. Solo Speaker
    if (layout === "solo") {
      return (
        <div className="absolute inset-0 p-1 flex items-center justify-center">
          <div className="w-[88%] h-[88%]">
            {hasMedia ? renderMediaTile() : renderCameraTile()}
          </div>
        </div>
      );
    }

    // 2. 2-Person Fit (16:9 widescreen boxes)
    if (layout === "side-by-side" || layout === "fit") {
      return (
        <div className="absolute inset-0 p-1 flex items-center justify-center gap-1">
          <div className="w-[46%] h-[80%]">
            {hasMedia ? renderMediaTile() : renderCameraTile()}
          </div>
          <div className="w-[46%] h-[80%]">
            {renderCameraTile()}
          </div>
        </div>
      );
    }

    // 3. 2-Person Cropped / Full-Bleed
    if (layout === "cropped" || layout === "podcast") {
      return (
        <div className="absolute inset-0 p-1 flex items-center justify-center">
          <div className="w-full h-full flex divide-x divide-white/25 border border-white/25 rounded overflow-hidden shadow-xs">
            <div className="flex-1 h-full">
              {hasMedia
                ? renderMediaTile("rounded-none border-0")
                : renderCameraTile(undefined, "rounded-none border-0 bg-black/80")}
            </div>
            <div className="flex-1 h-full">
              {renderCameraTile(undefined, "rounded-none border-0 bg-black/80")}
            </div>
          </div>
        </div>
      );
    }

    // 4. 3-Column Trio / 3 People
    if (layout === "three-equal") {
      return (
        <div className="absolute inset-0 p-1 flex items-center justify-center">
          <div className="w-full h-full flex gap-0.5">
            <div className="flex-1 h-full">
              {hasMedia ? renderMediaTile() : renderCameraTile()}
            </div>
            <div className="flex-1 h-full">
              {renderCameraTile()}
            </div>
            <div className="flex-1 h-full">
              {renderCameraTile()}
            </div>
          </div>
        </div>
      );
    }

    // 5. 2x2 Quad Grid
    if (layout === "four-grid") {
      return (
        <div className="absolute inset-0 p-1 flex items-center justify-center">
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5">
            <div className="w-full h-full">
              {hasMedia ? renderMediaTile() : renderCameraTile()}
            </div>
            <div className="w-full h-full">{renderCameraTile()}</div>
            <div className="w-full h-full">{renderCameraTile()}</div>
            <div className="w-full h-full">{renderCameraTile()}</div>
          </div>
        </div>
      );
    }

    // 6. 6-Tile Grid (3x2)
    if (layout === "six-grid") {
      return (
        <div className="absolute inset-0 p-1 flex items-center justify-center">
          <div className="w-full h-full grid grid-cols-3 grid-rows-2 gap-0.5">
            <div className="w-full h-full">
              {hasMedia ? renderMediaTile() : renderCameraTile()}
            </div>
            <div className="w-full h-full">{renderCameraTile()}</div>
            <div className="w-full h-full">{renderCameraTile()}</div>
            <div className="w-full h-full">{renderCameraTile()}</div>
            <div className="w-full h-full">{renderCameraTile()}</div>
            <div className="w-full h-full">{renderCameraTile()}</div>
          </div>
        </div>
      );
    }

    // 7. 5-Grid or 9-Grid
    if (layout === "five-grid" || layout === "nine-grid") {
      const count = layout === "nine-grid" ? 9 : 5;
      return (
        <div className="absolute inset-0 p-1 flex items-center justify-center">
          <div className="w-full h-full grid grid-cols-3 gap-0.5">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="w-full h-full">
                {i === 0 && hasMedia ? renderMediaTile() : renderCameraTile()}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 8. Speaker + Grid / Spotlight (Hero Left + Right Column)
    if (layout === "speaker-large") {
      const split = Math.max(40, Math.min(80, scene.splitRatio || 65));
      return (
        <div className="absolute inset-0 p-1 flex items-center justify-center">
          <div className="w-full h-full flex gap-1">
            <div style={{ flex: split }} className="h-full">
              {hasMedia ? renderMediaTile() : renderCameraTile("Host")}
            </div>
            <div style={{ flex: 100 - split }} className="h-full flex flex-col gap-0.5">
              <div className="w-full flex-1">{renderCameraTile()}</div>
              <div className="w-full flex-1">{renderCameraTile()}</div>
            </div>
          </div>
        </div>
      );
    }

    // 9. Presentation Deck (Slide focus + speaker strip)
    if (layout === "presentation") {
      const split = Math.max(40, Math.min(80, scene.splitRatio || 68));
      return (
        <div className="absolute inset-0 p-1 flex items-center justify-center">
          <div className="w-full h-full flex gap-1">
            <div style={{ flex: split }} className="h-full">
              {hasMedia ? (
                renderMediaTile()
              ) : (
                <div className="w-full h-full bg-black/85 rounded border border-cyan-500/60 flex items-center justify-center shadow-xs">
                  <MonitorUp className="w-3.5 h-3.5 text-cyan-300" />
                </div>
              )}
            </div>
            <div style={{ flex: 100 - split }} className="h-full flex flex-col gap-0.5">
              <div className="w-full flex-1">{renderCameraTile("Host")}</div>
              <div className="w-full flex-1">{renderCameraTile()}</div>
            </div>
          </div>
        </div>
      );
    }

    // 10. Screen + Speaker (Host on Left, Screen on Right)
    if (layout === "screen-speaker") {
      return (
        <div className="absolute inset-0 p-1 flex items-center justify-center">
          <div className="w-full h-full flex gap-1">
            <div className="flex-1 h-full">
              {renderCameraTile("Host")}
            </div>
            <div className="flex-[2] h-full">
              {hasMedia ? (
                renderMediaTile()
              ) : (
                <div className="w-full h-full bg-black/85 rounded border border-cyan-500/60 flex items-center justify-center shadow-xs">
                  <MonitorUp className="w-3.5 h-3.5 text-cyan-300" />
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 11. Picture in Picture (PiP)
    if (layout === "pip") {
      return (
        <div className="absolute inset-0 p-1 flex items-center justify-center">
          <div className="relative w-full h-full rounded overflow-hidden">
            <div className="w-full h-full">
              {hasMedia ? (
                renderMediaTile()
              ) : (
                <div className="w-full h-full bg-black/80 border border-white/20 rounded flex items-center justify-center">
                  <User className="w-4 h-4 text-indigo-300/70" />
                </div>
              )}
            </div>
            <div className="absolute bottom-1 right-1 w-[32%] h-[34%] bg-[#0e0f1a] border border-cyan-400/90 rounded shadow-md flex items-center justify-center z-10">
              <User className="w-2 h-2 text-cyan-300" />
            </div>
          </div>
        </div>
      );
    }

    // 12. Cinema Fullscreen
    if (layout === "cinema" || layout === "screen-full") {
      return (
        <div className="absolute inset-0 p-1 flex items-center justify-center">
          <div className="w-full h-full relative rounded overflow-hidden bg-black/90 border border-indigo-500/50 shadow-xs flex items-center justify-center">
            {hasMedia ? (
              <>
                {scene.activeMedia?.type === "video" ? (
                  <video
                    src={scene.activeMedia.url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={scene.activeMedia?.thumbnail || scene.activeMedia?.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg">
                    <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 text-indigo-300">
                <Play className="w-4 h-4 fill-indigo-400/30 text-indigo-400" />
                <span className="text-[6px] tracking-widest uppercase font-mono text-indigo-200/80">Fullscreen</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    // 13. Stacked Vertical (Top & Bottom)
    if (layout === "stacked") {
      return (
        <div className="absolute inset-0 p-1 flex items-center justify-center">
          <div className="w-full h-full flex flex-col gap-0.5">
            <div className="w-full flex-1">
              {hasMedia ? renderMediaTile() : renderCameraTile()}
            </div>
            <div className="w-full flex-1">
              {renderCameraTile()}
            </div>
          </div>
        </div>
      );
    }

    // 14. Interview Split
    if (layout === "interview") {
      return (
        <div className="absolute inset-0 p-1 flex items-center justify-center gap-1">
          <div className="flex-1 h-[82%]">
            {hasMedia ? renderMediaTile() : renderCameraTile("Host")}
          </div>
          <div className="flex-1 h-[82%]">
            {renderCameraTile("Guest")}
          </div>
        </div>
      );
    }

    // 15. Custom or Fallback
    return (
      <div className="absolute inset-0 p-1 flex items-center justify-center">
        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5">
          <div className="w-full h-full">
            {hasMedia ? renderMediaTile() : renderCameraTile()}
          </div>
          <div className="w-full h-full">{renderCameraTile()}</div>
          <div className="w-full h-full">{renderCameraTile()}</div>
          <div className="w-full h-full">{renderCameraTile()}</div>
        </div>
      </div>
    );
  };

  if (!isScenesPanelOpen) {
    // Collapsed slim sidebar trigger
    return (
      <div className="relative shrink-0 z-30 select-none flex items-center">
        <button
          type="button"
          onClick={toggleScenesPanel}
          className="h-28 w-4 sm:w-5 bg-[#0e0f18] hover:bg-[#161726] border-y border-r border-white/15 rounded-r-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-white transition-all shadow-xl group"
          title="Expand Scenes Panel (StreamYard Scenes)"
        >
          <ChevronRight className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 [writing-mode:vertical-lr] rotate-180">
            Scenes
          </span>
        </button>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "relative w-44 sm:w-52 h-full bg-[#0a0a12] border-r border-white/10 flex flex-col z-30 select-none shrink-0",
        className
      )}
    >
      {/* ─── Header: Scenes (BETA) ────────────────────────── */}
      <div className="p-3 border-b border-white/10 bg-[#0c0c16] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <h2 className="text-xs font-bold text-white tracking-wider">Scenes</h2>
          <div className="group/help relative">
            <HelpCircle className="w-3 h-3 text-slate-400 cursor-pointer hover:text-white" />
            <div className="absolute left-0 top-full mt-1.5 w-48 bg-[#141525] border border-white/15 p-2 rounded-lg text-[10px] text-slate-300 shadow-2xl opacity-0 group-hover/help:opacity-100 pointer-events-none transition-opacity z-50">
              Scenes allow you to prepare stage layouts, speakers, and media in advance. All additions, deletions, reorders, and layout adjustments auto-save instantly.
            </div>
          </div>
          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
            BETA
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div
            className="flex items-center gap-1 text-[9px] text-emerald-400/90 font-medium bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded select-none"
            title="All scene changes are automatically saved to this studio"
          >
            <Check className="w-2.5 h-2.5 text-emerald-400" />
            <span>Auto-Saved</span>
          </div>

          {/* Collapse Button */}
          <button
            type="button"
            onClick={toggleScenesPanel}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Collapse Scenes Panel"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── "+ New scene" Button ──────────────────────────── */}
      <div className="p-2.5 pb-2 shrink-0">
        <button
          type="button"
          onClick={handleOpenAddSceneModal}
          className="w-full py-2 px-3 rounded-lg border border-white/15 hover:border-indigo-500/50 bg-white/5 hover:bg-indigo-600/20 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm group active:scale-95"
          title="Save current stage layout or create a new scene"
        >
          <Plus className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span>New scene</span>
        </button>
      </div>

      {/* ─── Scene Cards Stack ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-2.5 custom-scrollbar">
        {scenes.map((scene, index) => {
          const isActive = activeSceneId === scene.id;
          const isDragTarget = dragOverIdx === index;

          return (
            <div
              key={scene.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onClick={() => switchScene(scene.id)}
              className={cn(
                "group relative rounded-xl border transition-all duration-150 cursor-pointer bg-[#11121d] shadow-md",
                activeMenuId === scene.id ? "overflow-visible z-30" : "overflow-hidden",
                isActive
                  ? "border-indigo-500 ring-1 ring-indigo-500/50 shadow-indigo-500/20"
                  : "border-white/10 hover:border-white/25",
                isDragTarget && "border-cyan-400 scale-[1.02]"
              )}
            >
              {/* Drag Handle (Left edge) */}
              <div
                className="absolute left-1 top-2.5 z-20 opacity-0 group-hover:opacity-60 hover:opacity-100 cursor-grab active:cursor-grabbing text-slate-400"
                title="Drag to reorder"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="w-3 h-3" />
              </div>

              {/* 16:9 Thumbnail Preview (overflow-hidden strictly for inner canvas/badges) */}
              <div
                className="relative w-full aspect-video bg-[#07070e] rounded-t-xl overflow-hidden"
                style={{
                  backgroundImage: scene.backgroundUrl ? `url(${scene.backgroundUrl})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {/* Visual Layout Representation */}
                {renderThumbnailContent(scene)}

                {/* Layout Badge (Top Left) */}
                <div className="absolute top-1 left-1 z-10 flex items-center gap-1">
                  <div className="px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-xs text-[7.5px] font-semibold text-slate-200 border border-white/20 pointer-events-none shadow-sm flex items-center gap-1">
                    <span>{LAYOUT_LABELS[scene.layout] || scene.layout}</span>
                  </div>
                  {(scene.expectedGuestSlots || 0) > 0 && (
                    <div
                      className="px-1 py-0.5 rounded bg-indigo-950/90 backdrop-blur-xs text-[7px] font-bold text-indigo-300 border border-indigo-500/40 pointer-events-none shadow-sm flex items-center gap-0.5"
                      title={`${scene.expectedGuestSlots} Pre-Booked Guest Slot${(scene.expectedGuestSlots || 0) > 1 ? "s" : ""}`}
                    >
                      <User className="w-2 h-2 text-indigo-400" />
                      <span>{scene.expectedGuestSlots}G</span>
                    </div>
                  )}
                </div>

                {/* Media Label Badge on thumbnail with 1-click Change Media */}
                {scene.activeMedia && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMediaPickerSceneId(scene.id);
                    }}
                    className="absolute bottom-1 left-1 z-20 flex items-center gap-1 bg-black/85 hover:bg-black backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-semibold text-cyan-300 hover:text-cyan-200 border border-cyan-500/40 hover:border-cyan-400 shadow-md cursor-pointer pointer-events-auto transition-all group/badge"
                    title="Click to Change Media / Deck"
                  >
                    {scene.activeMedia.type === "pdf" ? (
                      <FileText className="w-2.5 h-2.5 text-cyan-300" />
                    ) : (
                      <Clapperboard className="w-2.5 h-2.5 text-indigo-300" />
                    )}
                    <span className="truncate max-w-[80px]">{scene.activeMedia.name}</span>
                    <Edit2 className="w-2 h-2 opacity-60 group-hover/badge:opacity-100 text-cyan-400 ml-0.5" />
                  </button>
                )}
              </div>

              {/* Action Buttons (Top Right) */}
              <div className="absolute top-1 right-1 z-20 flex items-center gap-1 pointer-events-auto">
                {/* Clapperboard if media attached */}
                {scene.activeMedia && (
                  <span className="p-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                    <Clapperboard className="w-2.5 h-2.5" />
                  </span>
                )}

                {/* Quick Duplicate Button on hover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateScene(scene.id);
                  }}
                  className="p-1 rounded bg-black/75 hover:bg-black text-slate-300 hover:text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Duplicate scene"
                >
                  <Copy className="w-3 h-3" />
                </button>

                {/* Quick Delete Button on hover (if > 1 scene) */}
                {scenes.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteScene(scene.id);
                    }}
                    className="p-1 rounded bg-black/75 hover:bg-black text-slate-300 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete scene"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}

                {/* 3-dots Context Menu Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(activeMenuId === scene.id ? null : scene.id);
                  }}
                  className={cn(
                    "p-1 rounded transition-colors",
                    activeMenuId === scene.id
                      ? "bg-indigo-600 text-white"
                      : "bg-black/75 hover:bg-black text-slate-300 hover:text-white"
                  )}
                  title="Scene options"
                >
                  <MoreVertical className="w-3 h-3" />
                </button>
              </div>

              {/* Context Menu Dropdown (Rendered outside thumbnail overflow-hidden container) */}
              {activeMenuId === scene.id && (
                <>
                  {/* Backdrop to dismiss menu on outside click */}
                  <div
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(null);
                    }}
                  />
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "absolute right-1 z-50 w-52 bg-[#151628] border border-white/20 rounded-xl shadow-2xl p-1.5 text-xs animate-in fade-in zoom-in-95 max-h-[min(460px,70vh)] overflow-y-auto scrollbar-thin",
                      index >= scenes.length - 2 && scenes.length > 2
                        ? "bottom-2"
                        : "top-2"
                    )}
                  >
                    {/* Primary Action 1: Change / Attach Media */}
                    <button
                      type="button"
                      onClick={() => {
                        setMediaPickerSceneId(scene.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-200 hover:bg-emerald-500/20 flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <MonitorUp className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span className="font-semibold text-emerald-300">
                          {scene.activeMedia ? "Change Media / Deck" : "Attach Media / Deck"}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400/80 font-bold uppercase">
                        {scene.activeMedia ? scene.activeMedia.type : "Add"}
                      </span>
                    </button>

                    {/* Primary Action 2: Remove Media (if attached) */}
                    {scene.activeMedia && (
                      <button
                        type="button"
                        onClick={() => {
                          handleAttachMedia(scene.id, null);
                          setActiveMenuId(null);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg text-left text-rose-300 hover:bg-rose-500/20 flex items-center gap-2 transition-colors"
                      >
                        <X className="w-3.5 h-3.5 text-rose-400" />
                        <span>Remove Media</span>
                      </button>
                    )}

                    {/* Primary Action 3: Change Layout */}
                    <button
                      type="button"
                      onClick={() => {
                        setLayoutPickerSceneId(scene.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-200 hover:bg-white/10 flex items-center gap-2 transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Change Layout</span>
                    </button>

                    {/* Primary Action 4: Update with stage */}
                    <button
                      type="button"
                      onClick={() => {
                        saveCurrentStageToScene(scene.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-200 hover:bg-white/10 flex items-center gap-2 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Update with stage</span>
                    </button>

                    <div className="my-1 border-t border-white/10" />

                    {/* Pre-Booked Guest Slots (StreamYard parity) */}
                    <div className="px-2.5 py-1.5 flex items-center justify-between text-slate-300 bg-white/[0.03] rounded-lg my-0.5">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Guest Slots:</span>
                        <span className="font-bold text-white px-1 py-0.2 rounded bg-indigo-500/20 border border-indigo-500/40">{scene.expectedGuestSlots ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => removeGuestSlotFromScene(scene.id)}
                          disabled={(scene.expectedGuestSlots ?? 0) <= 0}
                          className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white flex items-center justify-center text-xs font-bold transition-colors"
                          title="Decrease guest slot count"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => preAddGuestSlotToScene(scene.id)}
                          className="w-5 h-5 rounded bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center text-xs font-bold transition-colors shadow-sm"
                          title="Add pre-booked guest slot to scene"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAutoAddGuestsToStage(!scene.autoAddGuestsToStage, scene.id)}
                      className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-200 hover:bg-white/10 flex items-center justify-between text-[11px]"
                      title="Automatically promote connecting guests directly to stage"
                    >
                      <span>Auto-Stage Guests</span>
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded text-[9px] font-bold",
                          scene.autoAddGuestsToStage
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-white/10 text-slate-400"
                        )}
                      >
                        {scene.autoAddGuestsToStage ? "ON" : "OFF"}
                      </span>
                    </button>

                    {/* Transition Effect (StreamYard Paid Plan) */}
                    <button
                      type="button"
                      onClick={() => {
                        const nextTrans = scene.transitionType === "fade" ? "cut" : "fade";
                        updateScene(scene.id, { transitionType: nextTrans });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-200 hover:bg-white/10 flex items-center justify-between text-[11px]"
                      title="Scene switch transition effect (Cut or Smooth Fade)"
                    >
                      <span>Transition Effect</span>
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded text-[9px] font-bold uppercase",
                          scene.transitionType === "fade"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "bg-white/10 text-slate-400"
                        )}
                      >
                        {scene.transitionType || "cut"}
                      </span>
                    </button>

                    {/* Auto-Advance Video Scenes (StreamYard Paid Plan) */}
                    {scene.activeMedia?.type === "video" && (
                      <div className="px-2.5 py-1.5 text-slate-300 bg-white/[0.03] rounded-lg my-0.5">
                        <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                          <span>Auto-Advance on Video End:</span>
                          {scene.nextSceneIdOnMediaEnd && (
                            <button
                              type="button"
                              onClick={() => updateScene(scene.id, { nextSceneIdOnMediaEnd: undefined })}
                              className="text-[9px] text-rose-400 hover:underline"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <select
                          value={scene.nextSceneIdOnMediaEnd || ""}
                          onChange={(e) => updateScene(scene.id, { nextSceneIdOnMediaEnd: e.target.value || undefined })}
                          className="w-full bg-slate-900 border border-white/20 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">None (Loop or stay)</option>
                          {scenes
                            .filter((s) => s.id !== scene.id)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                → {s.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {/* Scene Text / Title Card Toggle & Quick Edit (StreamYard Paid Plan) */}
                    <div className="px-2.5 py-1.5 text-slate-300 bg-white/[0.03] rounded-lg my-0.5">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="flex items-center gap-1.5 font-medium">
                          <FileText className="w-3.5 h-3.5 text-amber-400" />
                          <span>Title Card:</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const currentCard = scene.textCard;
                            if (currentCard && currentCard.enabled) {
                              updateScene(scene.id, { textCard: { ...currentCard, enabled: false } });
                            } else {
                              updateScene(scene.id, {
                                textCard: {
                                  enabled: true,
                                  heading: currentCard?.heading || "Welcome to the Broadcast",
                                  subheading: currentCard?.subheading || "StreamYard Pro Live Production",
                                  position: "center",
                                  bgColor: "rgba(15, 23, 42, 0.90)",
                                  textColor: "#ffffff",
                                  bgOpacity: 85,
                                  fontSize: "large",
                                },
                              });
                            }
                          }}
                          className={cn(
                            "px-1.5 py-0.2 rounded text-[9px] font-bold uppercase",
                            scene.textCard?.enabled
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-white/10 text-slate-400"
                          )}
                        >
                          {scene.textCard?.enabled ? "ON" : "OFF"}
                        </button>
                      </div>
                      {scene.textCard?.enabled && (
                        <div className="space-y-1 mt-1.5">
                          <input
                            type="text"
                            placeholder="Heading Title..."
                            value={scene.textCard.heading || ""}
                            onChange={(e) => {
                              const base = scene.textCard || {
                                enabled: true,
                                heading: "",
                                subheading: "",
                              };
                              updateScene(scene.id, {
                                textCard: {
                                  ...base,
                                  enabled: true,
                                  heading: e.target.value,
                                },
                              });
                            }}
                            className="w-full bg-slate-900 border border-white/20 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-amber-400"
                          />
                          <input
                            type="text"
                            placeholder="Subheading / Speaker name..."
                            value={scene.textCard.subheading || ""}
                            onChange={(e) => {
                              const base = scene.textCard || {
                                enabled: true,
                                heading: "Welcome to Broadcast",
                                subheading: "",
                              };
                              updateScene(scene.id, {
                                textCard: {
                                  ...base,
                                  enabled: true,
                                  subheading: e.target.value,
                                },
                              });
                            }}
                            className="w-full bg-slate-900 border border-white/20 rounded px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      )}
                    </div>

                    {/* Extra Camera Scene Binding (StreamYard Paid Plan) */}
                    <div className="px-2.5 py-1.5 text-slate-300 bg-white/[0.03] rounded-lg my-0.5">
                      <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Camera className="w-3 h-3 text-cyan-400" />
                          <span>Extra / Overhead Camera:</span>
                        </span>
                        {scene.extraCameraDeviceId && (
                          <button
                            type="button"
                            onClick={() => updateScene(scene.id, { extraCameraDeviceId: null })}
                            className="text-[9px] text-rose-400 hover:underline"
                          >
                            Unbind
                          </button>
                        )}
                      </div>
                      <select
                        value={scene.extraCameraDeviceId || ""}
                        onChange={(e) => updateScene(scene.id, { extraCameraDeviceId: e.target.value || null })}
                        className="w-full bg-slate-900 border border-white/20 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-cyan-400"
                      >
                        <option value="">Default Host Camera</option>
                        <option value="extra-cam-topdown">Top-Down Document Camera</option>
                        <option value="extra-cam-demo">Secondary Product Demo Cam</option>
                        <option value="extra-cam-wide">Wide Studio Angle Cam</option>
                      </select>
                    </div>

                    <div className="my-1 border-t border-white/10" />

                    <button
                      type="button"
                      onClick={() => {
                        duplicateScene(scene.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-200 hover:bg-white/10 flex items-center gap-2 font-medium"
                    >
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Duplicate scene</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleStartRename(scene);
                        setActiveMenuId(null);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-200 hover:bg-white/10 flex items-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Rename scene</span>
                    </button>

                    {scenes.length > 1 && (
                      <>
                        <div className="my-1 border-t border-white/10" />
                        <button
                          type="button"
                          onClick={() => {
                            deleteScene(scene.id);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg text-left text-rose-300 hover:bg-rose-500/20 flex items-center gap-2 font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>Delete scene</span>
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Bottom Scene Title Pill Bar */}
              <div
                className={cn(
                  "px-2.5 py-1 flex items-center justify-between text-xs transition-colors",
                  isActive
                    ? "bg-indigo-600 text-white font-semibold"
                    : "bg-[#141522] text-slate-300 group-hover:text-white"
                )}
              >
                {editingId === scene.id ? (
                  <div
                    className="flex items-center gap-1 w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename(scene.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="w-full bg-black/60 text-white px-1.5 py-0.5 rounded border border-indigo-400 text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveRename(scene.id)}
                      className="p-1 text-emerald-400 hover:text-emerald-300"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <span className="truncate">{scene.name}</span>
                      <span
                        className={cn(
                          "text-[8.5px] font-normal px-1 py-0.2 rounded shrink-0",
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-white/5 text-slate-400"
                        )}
                      >
                        {LAYOUT_LABELS[scene.layout] || scene.layout}
                      </span>
                    </div>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse shrink-0" />
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Change Scene Layout Modal ─────────────────────────────────── */}
      {isMounted && layoutPickerSceneId && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setLayoutPickerSceneId(null)}
        >
          <div
            className="w-full max-w-lg bg-[#0e0f1a] border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white animate-in zoom-in-95 duration-150 max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10 bg-[#121322] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Change Scene Layout
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {scenes.find((s) => s.id === layoutPickerSceneId)?.name || "Select layout"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLayoutPickerSceneId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-3 gap-2">
                {LAYOUT_PRESETS.map((preset) => {
                  const targetScene = scenes.find((s) => s.id === layoutPickerSceneId);
                  const isSelected = targetScene?.layout === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectSceneLayout(layoutPickerSceneId, preset.id)}
                      className={cn(
                        "relative p-2 rounded-xl border cursor-pointer transition-all flex flex-col items-center gap-1.5 text-center group",
                        isSelected
                          ? "bg-indigo-950/70 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-500/10"
                          : "bg-[#141525] border-white/10 hover:border-white/25 hover:bg-[#1a1c30]"
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                      <div className="w-full">{preset.renderPreview()}</div>
                      <div>
                        <div
                          className={cn(
                            "text-[11px] font-semibold tracking-tight",
                            isSelected ? "text-indigo-200" : "text-white"
                          )}
                        >
                          {preset.title}
                        </div>
                        <div className="text-[9px] text-slate-400 leading-tight line-clamp-1">
                          {preset.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── Media / Presentation Attachment Modal ───────────────────────── */}
      {isMounted && mediaPickerSceneId && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setMediaPickerSceneId(null)}
        >
          <div 
            className="w-full max-w-sm bg-[#121320] border border-white/20 rounded-2xl shadow-2xl overflow-hidden p-4 text-white animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MonitorUp className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold">Attach Media / Presentation</h3>
              </div>
              <button 
                type="button"
                onClick={() => setMediaPickerSceneId(null)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 my-2.5 leading-relaxed">
              Select a video, slides (PDF), or media from your computer. Video plays directly from your PC with 0s wait time and streams live when switching to this scene.
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar my-2 pr-1">
              {/* Option to clear media */}
              <button
                type="button"
                onClick={() => handleAttachMedia(mediaPickerSceneId, null)}
                className="w-full p-2 rounded-xl text-left border border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 flex items-center gap-2.5 transition-all text-xs"
              >
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-300">Camera Only (No Media)</div>
                  <div className="text-[10px] text-slate-500">Only show hosts and guests on stage</div>
                </div>
              </button>

              {/* ─── Uploaded Presentations & Media (Persistent & Selectable) ─── */}
              {mediaLibrary.filter((m) => m.isUploaded || m.id.startsWith("media-upload")).length > 0 && (
                <div className="pt-1">
                  <div className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Your Uploaded Presentations & Media</span>
                  </div>
                  <div className="space-y-1.5">
                    {mediaLibrary
                      .filter((m) => m.isUploaded || m.id.startsWith("media-upload"))
                      .map((opt) => {
                        const targetScene = scenes.find((s) => s.id === mediaPickerSceneId);
                        const isAttached = targetScene?.activeMedia?.id === opt.id;
                        return (
                          <div
                            key={opt.id}
                            className={cn(
                              "w-full p-2 rounded-xl border flex items-center gap-2.5 transition-all text-xs group",
                              isAttached
                                ? "bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                                : "border-white/10 hover:border-cyan-500/40 bg-white/5 hover:bg-white/10"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => handleAttachMedia(mediaPickerSceneId, opt)}
                              className="flex-1 flex items-center gap-2.5 min-w-0 text-left"
                            >
                              <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/60 border border-cyan-500/30 flex items-center justify-center shrink-0">
                                {opt.type === "image" || opt.thumbnail ? (
                                  <img
                                    src={opt.thumbnail || opt.url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : opt.type === "pdf" ? (
                                  <FileText className="w-4 h-4 text-cyan-300" />
                                ) : opt.type === "video" ? (
                                  <Video className="w-4 h-4 text-indigo-300" />
                                ) : (
                                  <Music className="w-4 h-4 text-amber-300" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-200 group-hover:text-white truncate">
                                  {opt.name}
                                </div>
                                <div className="text-[10px] text-cyan-300/80 flex items-center gap-1.5">
                                  <span className="capitalize">{opt.type}</span>
                                  {opt.duration && <span>• {opt.duration}</span>}
                                  {isAttached && (
                                    <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[9px] border border-emerald-500/30">
                                      Attached
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeMediaLibraryItem(opt.id);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete from Media Library"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* ─── Sample Media & Templates ─── */}
              <div className="pt-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
                  Sample Presentations & Clips
                </div>
                <div className="space-y-1.5">
                  {mediaLibrary
                    .filter((m) => !m.isUploaded && !m.id.startsWith("media-upload"))
                    .map((opt) => {
                      const targetScene = scenes.find((s) => s.id === mediaPickerSceneId);
                      const isAttached = targetScene?.activeMedia?.id === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleAttachMedia(mediaPickerSceneId, opt)}
                          className={cn(
                            "w-full p-2 rounded-xl text-left border flex items-center gap-2.5 transition-all text-xs group",
                            isAttached
                              ? "bg-cyan-950/40 border-cyan-500/60"
                              : "border-white/10 hover:border-cyan-500/50 bg-white/5 hover:bg-cyan-950/20"
                          )}
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center shrink-0">
                            {opt.thumbnail ? (
                              <img src={opt.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : opt.type === "pdf" ? (
                              <FileText className="w-4 h-4 text-cyan-300" />
                            ) : opt.type === "video" ? (
                              <Video className="w-4 h-4 text-indigo-300" />
                            ) : (
                              <Music className="w-4 h-4 text-amber-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-200 group-hover:text-white truncate">
                              {opt.name}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                              <span>{opt.desc || opt.type}</span>
                              {isAttached && (
                                <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[9px] border border-emerald-500/30">
                                  Attached
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Upload from Computer */}
            <input
              ref={mediaFileInputRef}
              type="file"
              accept="video/*,image/*,.pdf,audio/*"
              className="hidden"
              onChange={(e) => handleCustomFileUpload(e, mediaPickerSceneId)}
            />
            <button
              type="button"
              disabled={isProcessingUpload}
              onClick={() => mediaFileInputRef.current?.click()}
              className="w-full mt-2 py-2 px-3 rounded-xl border border-dashed border-indigo-400/50 hover:border-indigo-400 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isProcessingUpload ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span>Processing Upload...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Select Video / Presentation from PC (Instant Local Play)</span>
                </>
              )}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ─── StreamYard-Grade "New Scene" Layout Selection Modal ───────── */}
      {isMounted && isAddModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#0e0f1a] border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white animate-in zoom-in-95 duration-150 max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 bg-[#121322] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Add a New Scene</h3>
                  <p className="text-[11px] text-slate-400">Choose a layout template or duplicate your current stage</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {/* Scene Name Input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Scene Name
                </label>
                <input
                  type="text"
                  value={newSceneName}
                  onChange={(e) => setNewSceneName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateScene();
                  }}
                  placeholder="e.g. Host Intro, Guest Interview, Slide Demo..."
                  className="w-full bg-[#161726] border border-white/15 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Mode Toggle: Preset vs Snapshot */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Initial Stage Setup
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSceneMode("blank")}
                    className={cn(
                      "p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all text-xs",
                      newSceneMode === "blank"
                        ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/40"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                      <Clapperboard className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Choose Layout</div>
                      <div className="text-[10px] text-slate-400">Pick from layout templates</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewSceneMode("snapshot")}
                    className={cn(
                      "p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all text-xs",
                      newSceneMode === "snapshot"
                        ? "bg-indigo-600/20 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/40"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                      <Camera className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">Copy Current Stage</div>
                      <div className="text-[10px] text-slate-400">Snapshot on-stage state</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Layout Picker Grid (when newSceneMode === "blank") */}
              {newSceneMode === "blank" ? (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Select Layout Preset
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {LAYOUT_PRESETS.map((preset) => {
                      const isSelected = newSceneLayout === preset.id;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => setNewSceneLayout(preset.id)}
                          className={cn(
                            "relative p-2 rounded-xl border cursor-pointer transition-all flex flex-col items-center gap-1.5 text-center group",
                            isSelected
                              ? "bg-indigo-950/70 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-500/10"
                              : "bg-[#141525] border-white/10 hover:border-white/25 hover:bg-[#1a1c30]"
                          )}
                        >
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                          <div className="w-full">
                            {preset.renderPreview()}
                          </div>
                          <div>
                            <div className={cn("text-[11px] font-semibold tracking-tight", isSelected ? "text-indigo-200" : "text-white")}>
                              {preset.title}
                            </div>
                            <div className="text-[9px] text-slate-400 leading-tight line-clamp-1">
                              {preset.desc}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Optional Media Attachment */}
                  {mediaLibrary.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Pre-attach Media / Slides (Optional)</span>
                        {newSceneMedia && (
                          <button
                            type="button"
                            onClick={() => setNewSceneMedia(null)}
                            className="text-[10px] text-rose-400 hover:underline"
                          >
                            Clear
                          </button>
                        )}
                      </label>
                      <select
                        value={newSceneMedia?.id || ""}
                        onChange={(e) => {
                          const found = mediaLibrary.find((m) => m.id === e.target.value);
                          setNewSceneMedia(found || null);
                        }}
                        className="w-full bg-[#161726] border border-white/15 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="">Camera Only (No Media Attached)</option>
                        {mediaLibrary.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.type.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200/90 leading-relaxed">
                  📸 <strong>Snapshot Mode:</strong> This scene will immediately capture the current stage layout, on-stage participants, media source, and active background. You can switch back to this state at any time during your stream with one click.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-white/10 bg-[#121322] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-white/15 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateScene}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-lg flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Scene</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </aside>
  );
};
