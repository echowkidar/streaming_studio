export interface VirtualBackgroundPreset {
  id: string;
  name: string;
  category: string;
  url: string;
  thumb: string;
}

export const VIRTUAL_BACKGROUND_PRESETS: VirtualBackgroundPreset[] = [
  {
    id: "office-modern",
    name: "Modern Executive Office",
    category: "Office",
    url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80",
    thumb: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "newsroom-studio",
    name: "Broadcast Newsroom",
    category: "Studio",
    url: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=1920&q=80",
    thumb: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "cozy-library",
    name: "Library Bookshelf",
    category: "Cozy",
    url: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1920&q=80",
    thumb: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "loft-brick",
    name: "Industrial Loft Brick",
    category: "Creative",
    url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1920&q=80",
    thumb: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "minimal-interior",
    name: "Minimal Warm Studio",
    category: "Modern",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80",
    thumb: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "cyber-neon",
    name: "Cyber Neon Tech",
    category: "Tech",
    url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80",
    thumb: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "city-penthouse",
    name: "Penthouse Dusk Skyline",
    category: "Skyline",
    url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1920&q=80",
    thumb: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "dark-sleek-stage",
    name: "Deep Dark Spotlight",
    category: "Stage",
    url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1920&q=80",
    thumb: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80",
  },
];
