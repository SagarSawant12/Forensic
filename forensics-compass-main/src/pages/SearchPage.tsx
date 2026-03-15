import { useState } from "react";
import { useInvestigation } from "@/contexts/InvestigationContext";
import { Navigate } from "react-router-dom";
import AdvancedSearch from "@/components/AdvancedSearch";
import { ForensicRecord } from "@/lib/types";

export default function SearchPage() {
  const { data } = useInvestigation();
  const [searchResults, setSearchResults] = useState<ForensicRecord[]>([]);

  if (!data) return <Navigate to="/" replace />;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-mono text-primary cyber-text-glow">Advanced Search</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search through all forensic records with advanced filters and criteria
        </p>
      </div>

      <AdvancedSearch
        records={data.rawRecords}
        onResultsChange={setSearchResults}
      />
    </div>
  );
}