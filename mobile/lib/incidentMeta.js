export const CATEGORY_META = {
  wildfires: { icon: "flame", color: "#ff4500", label: "Incendio" },
  floods: { icon: "water", color: "#1e90ff", label: "Inundación" },
  earthquakes: { icon: "pulse", color: "#8b4513", label: "Sismo" },
  severeStorms: { icon: "thunderstorm", color: "#4169e1", label: "Tormenta" },
  volcanoes: { icon: "triangle", color: "#dc143c", label: "Volcán" },
  landslides: { icon: "trending-down", color: "#a0522d", label: "Deslizamiento" },
  cyclone: { icon: "sync", color: "#00ced1", label: "Ciclón" },
  tsunami: { icon: "water", color: "#0077b6", label: "Tsunami" },
  drought: { icon: "sunny", color: "#d2a679", label: "Sequía" },
  dustHaze: { icon: "cloud", color: "#a89f91", label: "Polvo / bruma" },
  tempExtremes: { icon: "thermometer", color: "#e63946", label: "Temp. extrema" },
  snow: { icon: "snow", color: "#7fb7d9", label: "Nieve" },
  seaLakeIce: { icon: "snow", color: "#5aa9c9", label: "Hielo" },
  waterColor: { icon: "color-fill", color: "#2a9d8f", label: "Color del agua" },
  manmade: { icon: "warning", color: "#ffa500", label: "Provocado" },
};

export const TIER_META = {
  legit: { label: "Verificado", color: "#2e9e5b", icon: "shield-checkmark" },
  likely: { label: "Probable", color: "#e0a100", icon: "shield-half" },
  unverified: { label: "Sin verificar", color: "#8a8a8a", icon: "shield-outline" },
};

export function timeAgo(date) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}
