"use client";

import { useState } from "react";
import { ArrowLeft, Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { useOrganization } from "@/lib/hooks/use-organization";
import { orgApiFetch, ApiError } from "@/lib/api";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

interface ParsedRow {
  name: string;
  type: string;
  serialNumber: string;
  manufacturer?: string;
  model?: string;
  installDate?: string;
  warrantyExpiry?: string;
  location?: string;
  notes?: string;
}

interface ImportResult {
  imported: number;
  skipped: string[];
  errors: Array<{ row: number; errors: string[] }>;
  total: number;
}

const REQUIRED_HEADERS = ["name", "type", "serialNumber"];
const ALL_HEADERS = [
  "name",
  "type",
  "serialNumber",
  "manufacturer",
  "model",
  "installDate",
  "warrantyExpiry",
  "location",
  "notes",
];

function parseCSV(text: string): { rows: ParsedRow[]; errors: string[] } {
  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    return { rows: [], errors: ["CSV must have a header row and at least one data row"] };
  }

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const errors: string[] = [];

  // Validate required headers
  for (const required of REQUIRED_HEADERS) {
    if (!headers.includes(required)) {
      errors.push(`Missing required header: "${required}"`);
    }
  }
  if (errors.length > 0) return { rows: [], errors };

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      if (ALL_HEADERS.includes(headers[j])) {
        row[headers[j]] = values[j] || "";
      }
    }
    rows.push(row as unknown as ParsedRow);
  }

  return { rows, errors };
}

export default function ImportEquipmentPage() {
  const { orgId, loading: orgLoading } = useOrganization();
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isParsed, setIsParsed] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      handleParse(text);
    };
    reader.readAsText(file);
  };

  const handleParse = (text?: string) => {
    const input = text || csvText;
    if (!input.trim()) {
      setParseErrors(["Please provide CSV data"]);
      return;
    }

    const { rows, errors } = parseCSV(input);
    setParsedRows(rows);
    setParseErrors(errors);
    setIsParsed(true);
    setResult(null);
    setError(null);
  };

  const handleImport = async () => {
    if (!orgId || parsedRows.length === 0) return;

    setImporting(true);
    setError(null);

    try {
      const data = await orgApiFetch<ImportResult>(
        "/equipment/import",
        orgId,
        {
          method: "POST",
          body: JSON.stringify({ rows: parsedRows }),
        }
      );
      setResult(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred during import.");
      }
    } finally {
      setImporting(false);
    }
  };

  if (orgLoading || !orgId) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => (window.location.href = "/equipment")}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Equipment</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Upload a CSV file to bulk import equipment records
          </p>
        </div>
      </div>

      {/* CSV Format Guide */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">CSV Format</h2>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-gray-600 mb-3">
            Required columns: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">name</code>,{" "}
            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">type</code>,{" "}
            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">serialNumber</code>.
            Optional: manufacturer, model, installDate, warrantyExpiry, location, notes.
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Valid types: MRI, XRAY, CT_SCANNER, ULTRASOUND, VENTILATOR, PATIENT_MONITOR, INFUSION_PUMP, DEFIBRILLATOR, OTHER
          </p>
          <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-700 overflow-x-auto">
            name,type,serialNumber,manufacturer,model,location
            <br />
            MRI Scanner Room 3,MRI,SN-2024-001,Siemens,MAGNETOM Sola,Building A Room 301
            <br />
            X-Ray Unit 2,XRAY,SN-2024-002,GE Healthcare,Optima XR220,Building B Room 105
          </div>
        </CardBody>
      </Card>

      {/* Upload */}
      <Card>
        <CardBody className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-light file:text-primary hover:file:bg-primary/10 cursor-pointer"
            />
          </div>
          <div className="text-center text-sm text-gray-400">or paste CSV data below</div>
          <div>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste CSV data here..."
              rows={6}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleParse()}
              disabled={!csvText.trim()}
            >
              Parse CSV
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Parse Errors */}
      {parseErrors.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex items-center gap-2 text-danger mb-2">
              <AlertCircle className="h-5 w-5" />
              <h3 className="font-semibold">Parse Errors</h3>
            </div>
            <ul className="list-disc list-inside text-sm text-danger space-y-1">
              {parseErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* Preview */}
      {isParsed && parsedRows.length > 0 && !result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Preview ({parsedRows.length} rows)
              </h2>
              <Button
                icon={<Upload className="h-4 w-4" />}
                loading={importing}
                onClick={handleImport}
              >
                Import {parsedRows.length} Equipment
              </Button>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Serial #</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Manufacturer</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {parsedRows.slice(0, 20).map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2 text-sm">{row.name}</td>
                    <td className="px-4 py-2 text-sm">{row.type}</td>
                    <td className="px-4 py-2 text-sm font-mono">{row.serialNumber}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{row.manufacturer || "\u2014"}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{row.location || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedRows.length > 20 && (
              <p className="text-center text-sm text-gray-400 py-2">
                ...and {parsedRows.length - 20} more rows
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-3">
          <p className="text-sm text-danger font-medium">{error}</p>
        </div>
      )}

      {/* Import Result */}
      {result && (
        <Card>
          <CardBody>
            <div className="flex items-center gap-2 text-success mb-3">
              <CheckCircle className="h-5 w-5" />
              <h3 className="font-semibold text-lg">Import Complete</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-success">{result.imported}</p>
                <p className="text-xs text-gray-500">Imported</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-warning">{result.skipped.length}</p>
                <p className="text-xs text-gray-500">Skipped (duplicates)</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-danger">{result.errors.length}</p>
                <p className="text-xs text-gray-500">Errors</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-700">{result.total}</p>
                <p className="text-xs text-gray-500">Total Rows</p>
              </div>
            </div>
            {result.skipped.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 mb-1">Skipped Serial Numbers:</p>
                <p className="text-sm text-gray-500">{result.skipped.join(", ")}</p>
              </div>
            )}
            {result.errors.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Validation Errors:</p>
                <ul className="text-sm text-danger space-y-1">
                  {result.errors.map((e, i) => (
                    <li key={i}>Row {e.row}: {e.errors.join("; ")}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-4">
              <Button onClick={() => (window.location.href = "/equipment")}>
                View Equipment List
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
