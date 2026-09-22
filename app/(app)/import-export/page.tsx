"use client";

import { useState, useRef } from "react";

type ModuleType =
  | "parties"
  | "items"
  | "sale-invoices"
  | "purchase-invoices"
  | "expenses";

export default function ImportExportPage() {
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [selectedModule, setSelectedModule] = useState<ModuleType>("parties");
  const [importStatus, setImportStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modules = [
    { id: "parties" as ModuleType, label: "Parties (Customers & Suppliers)", icon: "👥" },
    { id: "items" as ModuleType, label: "Items / Products", icon: "📦" },
    { id: "sale-invoices" as ModuleType, label: "Sale Invoices", icon: "🧾" },
    { id: "purchase-invoices" as ModuleType, label: "Purchase Invoices", icon: "🛒" },
    { id: "expenses" as ModuleType, label: "Expenses", icon: "💸" },
  ];

  // ========== EXPORT ==========
  const handleExport = () => {
    let headers: string[] = [];
    let sampleRows: string[][] = [];

    switch (selectedModule) {
      case "parties":
        headers = ["Name", "Phone", "Email", "Type", "GSTIN", "Address", "Opening Balance"];
        sampleRows = [
          ["LIVANDER", "9994164499", "", "Customer", "", "RASULKARN", "0"],
          ["TECH SUPPLIERS", "06741234567", "contact@tech.com", "Supplier", "21AAAAA0000A1Z5", "Bhubaneswar", "125000"],
        ];
        break;
      case "items":
        headers = ["Item Name", "Item Code", "Sale Price", "Purchase Price", "Stock Qty", "Category"];
        sampleRows = [
          ["REALME C 31", "RC31", "7500", "0", "1", "Mobile"],
          ["ONEPLUS 3", "OP3", "8000", "0", "1", "Mobile"],
        ];
        break;
      case "sale-invoices":
        headers = ["Date", "Invoice No", "Party Name", "Amount", "Payment Type", "Status"];
        sampleRows = [
          ["19/09/2026", "18616", "LIVANDER", "23000", "CARD", "Paid"],
        ];
        break;
      case "purchase-invoices":
        headers = ["Date", "Invoice No", "Supplier", "Amount", "Payment Type", "Status"];
        sampleRows = [
          ["18/09/2026", "P-1001", "TECH SUPPLIERS", "125000", "BANK", "Paid"],
        ];
        break;
      case "expenses":
        headers = ["Date", "Category", "Description", "Amount", "Payment Type"];
        sampleRows = [
          ["19/09/2026", "Rent", "Shop Rent", "15000", "BANK"],
        ];
        break;
    }

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...sampleRows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${selectedModule}_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert(`${modules.find((m) => m.id === selectedModule)?.label} exported successfully!`);
  };

  // ========== IMPORT ==========
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim() !== "");
      const dataRows = lines.length - 1; // excluding header

      setImportStatus(
        `Successfully imported ${dataRows} records from ${file.name}`
      );

      // In real project → send data to your API here
      console.log("Imported data:", text);
    };
    reader.readAsText(file);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadSample = () => {
    handleExport(); // re-use export as sample
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <h1 className="text-xl font-semibold text-gray-800">Import / Export</h1>
        <p className="text-sm text-gray-500 mt-1">
          Export your data to Excel or import data from Excel/CSV files
        </p>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 flex gap-6 border-b">
        <button
          onClick={() => setActiveTab("export")}
          className={`pb-3 text-sm font-medium border-b-2 transition ${
            activeTab === "export"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Export Data
        </button>
        <button
          onClick={() => setActiveTab("import")}
          className={`pb-3 text-sm font-medium border-b-2 transition ${
            activeTab === "import"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Import Data
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* ========== EXPORT TAB ========== */}
        {activeTab === "export" && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-medium mb-4">Select what to export</h2>

            <div className="space-y-3 mb-8">
              {modules.map((mod) => (
                <label
                  key={mod.id}
                  className={`flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition ${
                    selectedModule === mod.id
                      ? "border-blue-500 bg-blue-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="module"
                    checked={selectedModule === mod.id}
                    onChange={() => setSelectedModule(mod.id)}
                    className="accent-blue-600"
                  />
                  <span className="text-2xl">{mod.icon}</span>
                  <span className="font-medium">{mod.label}</span>
                </label>
              ))}
            </div>

            <button
              onClick={handleExport}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2"
            >
              📊 Export to Excel (CSV)
            </button>
          </div>
        )}

        {/* ========== IMPORT TAB ========== */}
        {activeTab === "import" && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-medium mb-2">Import data from Excel / CSV</h2>
            <p className="text-sm text-gray-500 mb-6">
              Download the sample file first, fill your data, then upload it back.
            </p>

            {/* Module Selection */}
            <div className="mb-6">
              <label className="text-sm text-gray-600 mb-2 block">
                Select Module to Import
              </label>
              <select
                value={selectedModule}
                onChange={(e) =>
                  setSelectedModule(e.target.value as ModuleType)
                }
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {modules.map((mod) => (
                  <option key={mod.id} value={mod.id}>
                    {mod.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Steps */}
            <div className="bg-gray-50 rounded-xl p-5 mb-6 space-y-4">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <div className="font-medium">Download Sample File</div>
                  <button
                    onClick={downloadSample}
                    className="text-blue-600 text-sm hover:underline mt-1"
                  >
                    Download sample CSV →
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <div className="font-medium">Fill your data</div>
                  <p className="text-sm text-gray-500 mt-1">
                    Open the file in Excel and add your data (do not change the header row)
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <div className="font-medium">Upload the file</div>
                  <p className="text-sm text-gray-500 mt-1">
                    Click the button below and select your filled CSV/Excel file
                  </p>
                </div>
              </div>
            </div>

            {/* Upload Area */}
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              ref={fileInputRef}
              onChange={handleImport}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl py-10 flex flex-col items-center justify-center text-gray-500 hover:text-blue-600 transition"
            >
              <span className="text-4xl mb-2">📁</span>
              <span className="font-medium">Click to upload file</span>
              <span className="text-sm mt-1">CSV or Excel files only</span>
            </button>

            {importStatus && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                ✅ {importStatus}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}