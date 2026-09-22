"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface Batch {
  id: string;
  itemCode: string;
  imei: string;
  openingQty: number;
}

export default function EditItemPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // Form states
  const [itemName, setItemName] = useState("REALME C 31");
  const [category, setCategory] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [trackingType, setTrackingType] = useState<"batch" | "clear">("batch");
  const [activeTab, setActiveTab] = useState<"pricing" | "stock" | "online">("pricing");

  // Pricing
  const [salePrice, setSalePrice] = useState(7500);
  const [salePriceTax, setSalePriceTax] = useState("Without Tax");
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [minWholesaleQty, setMinWholesaleQty] = useState("");

  // Stock
  const [openingQuantity, setOpeningQuantity] = useState(1);
  const [asOfDate, setAsOfDate] = useState("2023-05-13");
  const [atPrice, setAtPrice] = useState("");
  const [minStock, setMinStock] = useState("");
  const [location, setLocation] = useState("");

  // Batches
  const [batches, setBatches] = useState<Batch[]>([
    {
      id: "1",
      itemCode: "SUREBUYV912",
      imei: "866909063011816",
      openingQty: 1,
    },
  ]);
  const [showBatchModal, setShowBatchModal] = useState(false);

  // Load item data (simulate API)
  useEffect(() => {
    if (id === "14") {
      setItemName("REALME C 31");
      setSalePrice(7500);
      setOpeningQuantity(1);
    }
  }, [id]);

  const handleUpdate = () => {
    // In real project → call API here
    alert("Item updated successfully!");
    router.push(`/items/${id}`);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this item?")) {
      alert("Item deleted!");
      router.push("/items");
    }
  };

  const addBatch = () => {
    setBatches([
      ...batches,
      {
        id: Date.now().toString(),
        itemCode: "",
        imei: "",
        openingQty: 1,
      },
    ]);
  };

  const updateBatch = (batchId: string, field: keyof Batch, value: string | number) => {
    setBatches(
      batches.map((b) =>
        b.id === batchId ? { ...b, [field]: value } : b
      )
    );
  };

  const removeBatch = (batchId: string) => {
    setBatches(batches.filter((b) => b.id !== batchId));
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b">
        <h1 className="text-lg font-semibold text-gray-800">Edit Item</h1>
        <button
          onClick={() => router.back()}
          className="text-2xl text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6 max-w-4xl">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="text-sm text-gray-600">Item Name *</label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select Unit</option>
              <option value="Mobile">Mobile</option>
              <option value="Accessory">Accessory</option>
              <option value="Laptop">Laptop</option>
            </select>
          </div>
        </div>

        {/* Item Code */}
        <div className="mb-6">
          <label className="text-sm text-gray-600">Item Code</label>
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter item code"
            />
            <button className="border rounded-md px-4 py-2 text-sm hover:bg-gray-50 whitespace-nowrap">
              Assign Code
            </button>
          </div>
        </div>

        {/* Tracking Type */}
        <div className="flex gap-6 mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tracking"
              checked={trackingType === "batch"}
              onChange={() => setTrackingType("batch")}
              className="accent-blue-600"
            />
            <span className="text-sm">Batch Tracking</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tracking"
              checked={trackingType === "clear"}
              onChange={() => setTrackingType("clear")}
              className="accent-blue-600"
            />
            <span className="text-sm">Clear Tracking</span>
          </label>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            onClick={() => setActiveTab("pricing")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === "pricing"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Pricing
          </button>
          <button
            onClick={() => setActiveTab("stock")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === "stock"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Stock
          </button>
          <button
            onClick={() => setActiveTab("online")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === "online"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Online Store
          </button>
        </div>

        {/* ===== PRICING TAB ===== */}
        {activeTab === "pricing" && (
          <div className="space-y-6">
            <div>
              <label className="text-sm text-gray-600">Sale Price</label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-500">₹</span>
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value))}
                  className="border rounded-md px-3 py-2 w-40 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <select
                  value={salePriceTax}
                  onChange={(e) => setSalePriceTax(e.target.value)}
                  className="border rounded-md px-2 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option>Without Tax</option>
                  <option>With Tax</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600">Wholesale Price</label>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <input
                  type="text"
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(e.target.value)}
                  placeholder="Wholesale Price"
                  className="border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <select className="border rounded-md px-2 py-2">
                  <option>Without Tax</option>
                  <option>With Tax</option>
                </select>
                <input
                  type="text"
                  value={minWholesaleQty}
                  onChange={(e) => setMinWholesaleQty(e.target.value)}
                  placeholder="Minimum Wholesale Qty"
                  className="border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* ===== STOCK TAB ===== */}
        {activeTab === "stock" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-600">Opening Quantity</label>
                <input
                  type="number"
                  value={openingQuantity}
                  onChange={(e) => setOpeningQuantity(Number(e.target.value))}
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">As Of Date</label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">At Price</label>
                <input
                  type="text"
                  value={atPrice}
                  onChange={(e) => setAtPrice(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Min Stock To Maintain</label>
                <input
                  type="text"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Batch Tracking Section */}
            {trackingType === "batch" && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-700">Batches</h3>
                  <button
                    onClick={() => setShowBatchModal(true)}
                    className="text-blue-600 text-sm font-medium hover:underline"
                  >
                    + Add Stock / Batches
                  </button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b text-left text-gray-500">
                        <th className="py-2.5 px-3">ITEM CODE</th>
                        <th className="py-2.5 px-3">IMEI NO.</th>
                        <th className="py-2.5 px-3">OPENING QTY</th>
                        <th className="py-2.5 px-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((batch) => (
                        <tr key={batch.id} className="border-b">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={batch.itemCode}
                              onChange={(e) =>
                                updateBatch(batch.id, "itemCode", e.target.value)
                              }
                              className="w-full border rounded px-2 py-1"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={batch.imei}
                              onChange={(e) =>
                                updateBatch(batch.id, "imei", e.target.value)
                              }
                              className="w-full border rounded px-2 py-1"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={batch.openingQty}
                              onChange={(e) =>
                                updateBatch(batch.id, "openingQty", Number(e.target.value))
                              }
                              className="w-20 border rounded px-2 py-1"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => removeBatch(batch.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              🗑
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-2 text-sm text-gray-600">
                  Total {batches.reduce((sum, b) => sum + b.openingQty, 0)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== ONLINE STORE TAB ===== */}
        {activeTab === "online" && (
          <div className="py-8 text-center text-gray-500">
            Online Store settings coming soon...
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-10 pt-6 border-t">
          <button
            onClick={handleDelete}
            className="border border-red-500 text-red-500 hover:bg-red-50 px-6 py-2 rounded-md text-sm font-medium"
          >
            Delete
          </button>
          <button
            onClick={handleUpdate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium"
          >
            Update
          </button>
        </div>
      </div>

      {/* ===== ADD STOCK / BATCHES MODAL ===== */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Add Stock - Batches</h2>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-2xl text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <div className="text-sm text-gray-500">Item Name</div>
                <div className="font-medium">{itemName}</div>
              </div>

              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-3">ITEM CODE</th>
                    <th className="py-2 pr-3">IMEI NO.</th>
                    <th className="py-2 pr-3">OPENING QTY</th>
                    <th className="py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id} className="border-b">
                      <td className="py-2 pr-3">
                        <input
                          type="text"
                          value={batch.itemCode}
                          onChange={(e) =>
                            updateBatch(batch.id, "itemCode", e.target.value)
                          }
                          className="w-full border rounded px-2 py-1.5"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="text"
                          value={batch.imei}
                          onChange={(e) =>
                            updateBatch(batch.id, "imei", e.target.value)
                          }
                          className="w-full border rounded px-2 py-1.5"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="number"
                          value={batch.openingQty}
                          onChange={(e) =>
                            updateBatch(batch.id, "openingQty", Number(e.target.value))
                          }
                          className="w-24 border rounded px-2 py-1.5"
                        />
                      </td>
                      <td className="py-2 text-center">
                        <button
                          onClick={() => removeBatch(batch.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                onClick={addBatch}
                className="text-blue-600 text-sm font-medium hover:underline mb-6"
              >
                + Add another batch
              </button>

              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  Total {batches.reduce((sum, b) => sum + Number(b.openingQty), 0)}
                </div>
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-md font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}