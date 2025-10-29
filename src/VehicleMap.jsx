import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-rotatedmarker"; 

const INITIAL_CENTER = [17.400, 78.495];

const vehicleIcon = L.icon({
  iconUrl: "/bus1.png",
  iconSize: [50, 50],
  iconAnchor: [25, 25],
});

function VehicleMap() {
  const [routeData, setRouteData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);
  const markerRef = useRef(null); 

  useEffect(() => {
    const loadData = async () => {
      const response = await fetch("public/dummy-route.json");
      const data = await response.json();
      setRouteData(
        data.map((p) => ({
          lat: p.latitude,
          lng: p.longitude,
          timestamp: p.timestamp,
        }))
      );
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isPlaying && routeData.length > 0 && currentIndex < routeData.length - 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 2000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, currentIndex, routeData]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  const resetSimulation = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const currentPosition = routeData[currentIndex] || routeData[0];

 // Rotation logic 
  useEffect(() => {
    if (!markerRef.current || currentIndex === 0 || currentIndex >= routeData.length) return;

    const prev = routeData[currentIndex - 1];
    const next = routeData[currentIndex];
    if (!prev || !next) return;

    const dx = next.lng - prev.lng;
    const dy = next.lat - prev.lat;
    const angle = (Math.atan2(dx, dy) * 180) / Math.PI;

    markerRef.current.setRotationAngle(angle);
  }, [currentIndex, routeData]);

  return (
    <div className="h-screen w-full relative">
      <MapContainer
        center={INITIAL_CENTER}
        zoom={16}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {routeData.length > 0 && (
          <>
            {/* Full route */}
            <Polyline
              pathOptions={{ color: "gray", weight: 3, opacity: 0.5 }}
              positions={routeData.map((p) => [p.lat, p.lng])}
            />

            {/* Traveled route */}
            <Polyline
  pathOptions={{ color: "gray", weight: 4, dashArray: "6 6", opacity: 0.5 }}
  positions={routeData.map(p => [p.lat, p.lng])}
/>

<Polyline
  pathOptions={{
    color: "#2563EB", // nice blue
    weight: 6,
    opacity: 0.9,
    lineCap: "round",
  }}
  positions={routeData.slice(0, currentIndex + 1).map(p => [p.lat, p.lng])}
/>


            {/* Vehicle marker */}
            <Marker
              position={[currentPosition.lat, currentPosition.lng]}
              icon={vehicleIcon}
              ref={markerRef} 
            />
          </>
        )}
      </MapContainer>

      {/* Controls Section */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] flex gap-4">
        <button
          onClick={togglePlay}
          className={`px-6 py-2 font-semibold rounded-lg shadow-md text-white transition
            ${isPlaying ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
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
