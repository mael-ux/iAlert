import React, { useEffect, useRef, useState } from "react";

export default function Mapa3D({ points = null, style = { width: "100%", height: "600px" } }) {
  const mountRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let globe = null;
    let mounted = true;

    (async () => {
      try {
        const Globe = (await import("globe.gl")).default;
        globe = Globe()(mountRef.current)
          .globeImageUrl("//unpkg.com/three-globe/example/img/earth-dark.jpg")
          .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
          .pointAltitude("size")
          .pointColor("color");

        const defaultPoints = [
          { lat: 19.4326, lng: -99.1332, size: 0.02, color: "red", city: "CDMX" },
          { lat: 20.9674, lng: -89.5926, size: 0.02, color: "yellow", city: "Mérida" },
          { lat: 21.1619, lng: -86.8515, size: 0.02, color: "orange", city: "Cancún" }
        ];

        globe.pointsData(points ?? defaultPoints);

        globe
          .pointLabel(d => `${d.city || ""}`)
          .onPointClick((p) => {
            alert(`Punto: ${p.city} (${p.lat}, ${p.lng})`);
          });

        if (!mounted && globe) {
          globe = null;
        }
      } catch (err) {
        console.error("Error cargando Globe.gl:", err);
        setError(err.message || String(err));
      }
    })();

    return () => {
      mounted = false;
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
  }, [points]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      {error ? (
        <div style={{ color: "red" }}>Error al cargar el globo: {error}</div>
      ) : (
        <div ref={mountRef} style={style} />
      )}
    </div>
  );
}
