import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-rotatedmarker"; // for rotation support
import polyline from "@mapbox/polyline"; // for realistic decoded routes

// --- Constants ---
const INITIAL_CENTER = [17.4, 78.495];

// --- Custom Vehicle Icon ---
const vehicleIcon = L.icon({
  iconUrl: "/bus1.png",
  iconSize: [50, 50],
  iconAnchor: [25, 25],
});

// --- Helper: Fetch Dummy or Real Polyline Route ---
const fetchRouteData = async () => {
  try {
    const response = await fetch("public/dummy-route.json");
    const data = await response.json();
    return data.map((p) => ({
      lat: p.latitude,
      lng: p.longitude,
      timestamp: p.timestamp,
    }));
  } catch (error) {
    console.error("Failed to load route data:", error);

    // Fallback demo: decoded real-world route (Hyderabad sample)
    const encoded =
      "svu_GotssPp@`@n@r@rAjA`@f@x@r@l@`@f@pA`A`@l@p@v@f@v@p@r@x@b@dA|@`@l@j@";
    const decoded = polyline.decode(encoded).map(([lat, lng]) => ({
      lat,
      lng,
      timestamp: Date.now(),
    }));
    return decoded;
  }
};

// --- Helper: Compute rotation angle between two points ---
const getRotationAngle = (prev, next) => {
  const dx = next.lng - prev.lng;
  const dy = next.lat - prev.lat;
  return (Math.atan2(dx, dy) * 180) / Math.PI;
};

// --- Main Component ---
function VehicleMap() {
  const [routeData, setRouteData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [interpolatedPos, setInterpolatedPos] = useState({
  lat: INITIAL_CENTER[0],
  lng: INITIAL_CENTER[1],
});

  const [isPlaying, setIsPlaying] = useState(false);
  const markerRef = useRef(null);
  const intervalRef = useRef(null);

  // --- Load route data once ---
  useEffect(() => {
    const load = async () => {
      const data = await fetchRouteData();
      setRouteData(data);
      setInterpolatedPos([
        data[0]?.lat || INITIAL_CENTER[0],
        data[0]?.lng || INITIAL_CENTER[1],
      ]);
    };
    load();
  }, []);

  // --- Animate movement along route ---
  useEffect(() => {
    if (!isPlaying || routeData.length < 2) return;

    const start = routeData[currentIndex];
    const end = routeData[currentIndex + 1];
    if (!start || !end) return;

    let step = 0;
    const steps = 20; // increase for smoother movement
    const intervalTime = 100; // ms per step

    intervalRef.current = setInterval(() => {
      step++;
      const lat = start.lat + ((end.lat - start.lat) * step) / steps;
      const lng = start.lng + ((end.lng - start.lng) * step) / steps;
      setInterpolatedPos({ lat, lng });

      // Move to next point when one segment finishes
      if (step >= steps) {
        setCurrentIndex((prev) =>
          prev + 1 < routeData.length - 1 ? prev + 1 : prev
        );
        step = 0;
      }
    }, intervalTime);

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, currentIndex, routeData]);

  // --- Rotate the marker smoothly ---
  useEffect(() => {
    if (
      !markerRef.current ||
      currentIndex === 0 ||
      currentIndex >= routeData.length
    )
      return;
    const prev = routeData[currentIndex - 1];
    const next = routeData[currentIndex];
    if (!prev || !next) return;
    const angle = getRotationAngle(prev, next);
    markerRef.current.setRotationAngle(angle);
  }, [currentIndex, routeData]);

  // --- Controls ---
  const togglePlay = () => setIsPlaying((p) => !p);
  const resetSimulation = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    if (routeData.length > 0)
      setInterpolatedPos({ lat: routeData[0].lat, lng: routeData[0].lng });
  };

  const currentPosition = routeData[currentIndex] || {};

  return (
    <div className="h-screen w-full relative">
      <MapContainer
        center={INITIAL_CENTER}
        zoom={15}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {routeData.length > 0 && (
          <>
            {/* --- Full Route Path --- */}
            <Polyline
              pathOptions={{ color: "gray", weight: 3, opacity: 0.5 }}
              positions={routeData.map((p) => [p.lat, p.lng])}
            />

            {/* --- Traveled Path --- */}
            <Polyline
              pathOptions={{
                color: "#2563EB",
                weight: 6,
                opacity: 0.9,
                lineCap: "round",
              }}
              positions={routeData
                .slice(0, currentIndex + 1)
                .map((p) => [p.lat, p.lng])}
            />

            {/* --- Vehicle Marker --- */}
            {interpolatedPos?.lat !== undefined &&
              interpolatedPos?.lng !== undefined && (
                <Marker
                  position={[interpolatedPos.lat, interpolatedPos.lng]}
                  icon={vehicleIcon}
                  ref={markerRef}
                />
              )}
          </>
        )}
      </MapContainer>

      {/* --- Live Info Box --- */}
      {currentPosition && (
        <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-md text-sm">
          <p>
            <strong>Latitude:</strong> {interpolatedPos.lat?.toFixed(5)}
          </p>
          <p>
            <strong>Longitude:</strong> {interpolatedPos.lng?.toFixed(5)}
          </p>
          <p>
            <strong>Point:</strong> {currentIndex + 1} / {routeData.length}
          </p>
        </div>
      )}

      {/* --- Control Buttons --- */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] flex gap-4">
        <button
          onClick={togglePlay}
          className={`px-6 py-2 font-semibold rounded-lg shadow-md text-white transition
            ${
              isPlaying
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
        >
          {isPlaying ? "Pause" : "Start"}
        </button>

        <button
          onClick={resetSimulation}
          className="px-6 py-2 font-semibold rounded-lg shadow-md bg-gray-300 hover:bg-gray-400 text-gray-800 transition"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export default VehicleMap;
