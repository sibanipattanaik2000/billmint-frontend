"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<
    "company" | "invoice" | "tax" | "users" | "backup" | "general"
  >("company");

  // Company Profile
  const [companyName, setCompanyName] = useState("SUREBUY STORE");
  const [phone, setPhone] = useState("+91 77956 87633");
  const [email, setEmail] = useState("surebuystore@gmail.com");
  const [gstin, setGstin] = useState("");
  const [address, setAddress] = useState("Bhubaneswar, Odisha");
  const [state, setState] = useState("Odisha");

  // Invoice Settings
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [nextInvoiceNo, setNextInvoiceNo] = useState("18617");
  const [terms, setTerms] = useState(
    "Goods once sold can not be exchanged or money refunded"
  );
  const [showSignature, setShowSignature] = useState(true);
  const [showBankDetails, setShowBankDetails] = useState(true);

  // Tax Settings
  const [enableGst, setEnableGst] = useState(true);
  const [defaultTaxRate, setDefaultTaxRate] = useState("18");

  // General
  const [currency, setCurrency] = useState("INR");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [financialYear, setFinancialYear] = useState("2025-26");

  const handleSave = () => {
    alert("Settings saved successfully!");
  };

  const tabs = [
    { id: "company", label: "Company Profile" },
    { id: "invoice", label: "Invoice Settings" },
    { id: "tax", label: "Tax & GST" },
    { id: "users", label: "Users & Permissions" },
    { id: "backup", label: "Backup & Restore" },
    { id: "general", label: "General" },
  ] as const;

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Settings</h1>
        <button
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-1.5 rounded-md text-sm font-medium"
        >
          Save Changes
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Tabs */}
        <div className="w-56 border-r bg-gray-50 p-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* ========== COMPANY PROFILE ========== */}
          {activeTab === "company" && (
            <div className="max-w-2xl space-y-5">
              <h2 className="text-lg font-semibold mb-4">Company Profile</h2>

              <div>
                <label className="text-sm text-gray-600">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">GSTIN</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="Enter GSTIN if applicable"
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* ========== INVOICE SETTINGS ========== */}
          {activeTab === "invoice" && (
            <div className="max-w-2xl space-y-5">
              <h2 className="text-lg font-semibold mb-4">Invoice Settings</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Invoice Prefix</label>
                  <input
                    type="text"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Next Invoice No.</label>
                  <input
                    type="text"
                    value={nextInvoiceNo}
                    onChange={(e) => setNextInvoiceNo(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">
                  Default Terms & Conditions
                </label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={3}
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSignature}
                    onChange={(e) => setShowSignature(e.target.checked)}
                    className="accent-blue-600 w-4 h-4"
                  />
                  <span className="text-sm">Show signature on invoice</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBankDetails}
                    onChange={(e) => setShowBankDetails(e.target.checked)}
                    className="accent-blue-600 w-4 h-4"
                  />
                  <span className="text-sm">Show bank details on invoice</span>
                </label>
              </div>
            </div>
          )}

          {/* ========== TAX & GST ========== */}
          {activeTab === "tax" && (
            <div className="max-w-2xl space-y-5">
              <h2 className="text-lg font-semibold mb-4">Tax & GST Settings</h2>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableGst}
                  onChange={(e) => setEnableGst(e.target.checked)}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-sm font-medium">Enable GST</span>
              </label>

              {enableGst && (
                <div>
                  <label className="text-sm text-gray-600">
                    Default Tax Rate (%)
                  </label>
                  <select
                    value={defaultTaxRate}
                    onChange={(e) => setDefaultTaxRate(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* ========== USERS ========== */}
          {activeTab === "users" && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-4">Users & Permissions</h2>

              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b text-left text-gray-500">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 px-4">
                        <div className="font-medium">Admin</div>
                        <div className="text-xs text-gray-500">
                          surebuystore@gmail.com
                        </div>
                      </td>
                      <td className="py-3 px-4">Owner</td>
                      <td className="py-3 px-4">
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                          Active
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-blue-600 text-sm hover:underline">
                          Edit
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button className="mt-4 border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-md text-sm font-medium">
                + Add New User
              </button>
            </div>
          )}

          {/* ========== BACKUP ========== */}
          {activeTab === "backup" && (
            <div className="max-w-2xl space-y-6">
              <h2 className="text-lg font-semibold mb-4">Backup & Restore</h2>

              <div className="border rounded-xl p-5">
                <h3 className="font-medium mb-2">Create Backup</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Download a complete backup of all your business data.
                </p>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md text-sm font-medium">
                  📥 Download Backup
                </button>
              </div>

              <div className="border rounded-xl p-5">
                <h3 className="font-medium mb-2">Restore Backup</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Upload a previously downloaded backup file to restore data.
                </p>
                <button className="border border-gray-300 hover:bg-gray-50 px-5 py-2 rounded-md text-sm font-medium">
                  📤 Upload Backup File
                </button>
              </div>
            </div>
          )}

          {/* ========== GENERAL ========== */}
          {activeTab === "general" && (
            <div className="max-w-2xl space-y-5">
              <h2 className="text-lg font-semibold mb-4">General Settings</h2>

              <div>
                <label className="text-sm text-gray-600">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600">Date Format</label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600">Financial Year</label>
                <select
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="2024-25">2024-25</option>
                  <option value="2025-26">2025-26</option>
                  <option value="2026-27">2026-27</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}