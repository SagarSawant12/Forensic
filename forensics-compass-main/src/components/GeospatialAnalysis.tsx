import React, { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { ForensicRecord, ImageMetadata } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, ZoomIn, ZoomOut, RotateCcw, Layers, Image as ImageIcon, Activity } from "lucide-react";
import L from "leaflet";

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LocationData {
  id: string;
  record: ImageMetadata;
  position: [number, number];
  timestamp: string;
  device?: string;
  filename: string;
}

interface GeospatialAnalysisProps {
  records: ForensicRecord[];
  onLocationClick?: (record: ImageMetadata) => void;
}

// Component to fit map bounds
function FitBounds({ locations }: { locations: LocationData[] }) {
  const map = useMap();

  React.useEffect(() => {
    if (locations.length > 0) {
      const validLocations = locations.filter(loc => 
        loc.position && 
        typeof loc.position[0] === 'number' && 
        typeof loc.position[1] === 'number' &&
        !isNaN(loc.position[0]) && 
        !isNaN(loc.position[1])
      );
      
      if (validLocations.length > 0) {
        const bounds = L.latLngBounds(validLocations.map(loc => loc.position));
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  }, [locations, map]);

  return null;
}

export default function GeospatialAnalysis({ records, onLocationClick }: GeospatialAnalysisProps) {
  const [selectedDevice, setSelectedDevice] = useState<string>("all");
  const [mapType, setMapType] = useState<"streets" | "satellite">("streets");
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Extract location data from image records
  const locationData = useMemo(() => {
    return records
      .filter(record => record.type === "image" && (record as ImageMetadata).location)
      .map((record, index) => {
        const image = record as ImageMetadata;
        return {
          id: `location-${index}`,
          record: image,
          position: [image.location!.lat, image.location!.lng] as [number, number],
          timestamp: image.timestamp || record.timestamp || "",
          device: image.device,
          filename: image.filename
        } as LocationData;
      });
  }, [records]);

  // Filter by device
  const filteredLocations = useMemo(() => {
    if (selectedDevice === "all") return locationData;
    return locationData.filter(loc => loc.device === selectedDevice);
  }, [locationData, selectedDevice]);

  // Get unique devices
  const devices = useMemo(() => {
    const deviceSet = new Set<string>();
    locationData.forEach(loc => {
      if (loc.device) deviceSet.add(loc.device);
    });
    return Array.from(deviceSet);
  }, [locationData]);

  // Calculate clusters/heatmap data
  const locationClusters = useMemo(() => {
    const clusters: Record<string, LocationData[]> = {};
    filteredLocations.forEach(location => {
      const key = `${Math.round(location.position[0] * 100) / 100}_${Math.round(location.position[1] * 100) / 100}`;
      if (!clusters[key]) clusters[key] = [];
      clusters[key].push(location);
    });
    return clusters;
  }, [filteredLocations]);

  // Map tile URLs
  const tileUrls = {
    streets: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
  };

  const attributions = {
    streets: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    satellite: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
  };

  if (locationData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No location data available</p>
          <p className="text-xs mt-1">Image records with GPS coordinates will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <Select value={selectedDevice} onValueChange={setSelectedDevice}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by device" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Devices</SelectItem>
              {devices.map(device => (
                <SelectItem key={device} value={device}>
                  {device}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={mapType} onValueChange={(value: "streets" | "satellite") => setMapType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="streets">Streets</SelectItem>
              <SelectItem value="satellite">Satellite</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={showHeatmap ? "default" : "outline"}
            size="sm"
            onClick={() => setShowHeatmap(!showHeatmap)}
          >
            <Activity className="h-4 w-4 mr-1" />
            Clusters
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{filteredLocations.length} locations</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Location List - Left Side */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-auto">
                {filteredLocations.map((location) => (
                  <div
                    key={location.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary cursor-pointer transition-colors"
                    onClick={() => onLocationClick?.(location.record)}
                  >
                    <div className="flex items-center gap-3">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm">{location.filename}</div>
                        <div className="text-xs text-muted-foreground">
                          {location.device && `${location.device} · `}
                          {location.timestamp && new Date(location.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs">
                        {location.position[0].toFixed(4)}
                      </div>
                      <div className="font-mono text-xs">
                        {location.position[1].toFixed(4)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map - Center/Middle (2 columns wide) */}
        <div className="lg:col-span-2">
          <Card className="relative">
            <CardContent className="p-0">
              <div className="h-[500px] w-full relative pt-4">
                <MapContainer
                  center={locationData.length > 0 ? locationData[0].position : [40.7128, -74.0060]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                  className="rounded-lg"
                >
                  <TileLayer
                    url={tileUrls[mapType]}
                    attribution={attributions[mapType]}
                  />

                  <FitBounds locations={filteredLocations} />

                  {/* Individual markers */}
                  {filteredLocations.map((location) => (
                    <Marker
                      key={location.id}
                      position={location.position}
                      eventHandlers={{
                        click: () => onLocationClick?.(location.record)
                      }}
                    >
                      <Popup>
                        <div className="space-y-2 min-w-48">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            <span className="font-medium">{location.filename}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {location.device && <div>Device: {location.device}</div>}
                            {location.timestamp && (
                              <div>Time: {new Date(location.timestamp).toLocaleString()}</div>
                            )}
                            <div className="font-mono text-xs">
                              {location.position[0].toFixed(6)}, {location.position[1].toFixed(6)}
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* Cluster circles */}
                  {showHeatmap && Object.entries(locationClusters).map(([key, locations]) => {
                    if (locations.length < 2) return null;

                    const center = locations[0].position;
                    const radius = Math.max(50, locations.length * 20); // Dynamic radius based on cluster size

                    return (
                      <Circle
                        key={key}
                        center={center}
                        radius={radius}
                        pathOptions={{
                          color: locations.length > 5 ? "#ef4444" : locations.length > 3 ? "#f59e0b" : "#10b981",
                          fillColor: locations.length > 5 ? "#ef4444" : locations.length > 3 ? "#f59e0b" : "#10b981",
                          fillOpacity: 0.3,
                          weight: 2
                        }}
                      >
                        <Popup>
                          <div className="text-center">
                            <div className="font-bold">{locations.length} images</div>
                            <div className="text-sm text-muted-foreground">
                              Clustered location
                            </div>
                          </div>
                        </Popup>
                      </Circle>
                    );
                  })}
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}