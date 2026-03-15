import { useInvestigation } from "@/contexts/InvestigationContext";
import { Navigate } from "react-router-dom";
import GeospatialAnalysis from "@/components/GeospatialAnalysis";
import { ForensicRecord, ImageMetadata } from "@/lib/types";

export default function GeospatialPage() {
  const { data } = useInvestigation();

  if (!data) return <Navigate to="/" replace />;

  const handleLocationClick = (record: ImageMetadata) => {
    console.log("Location clicked:", record);
    // Could open a modal or navigate to details
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-mono text-primary cyber-text-glow">Geospatial Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualize location data from media files and analyze movement patterns
        </p>
      </div>

      <GeospatialAnalysis
        records={data.rawRecords}
        onLocationClick={handleLocationClick}
      />
    </div>
  );
}