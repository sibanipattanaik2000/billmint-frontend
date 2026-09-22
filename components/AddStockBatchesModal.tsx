"use client";

import { useState, useEffect } from "react";

interface Batch {
  id: string;
  itemCode: string;
  imei: string;
  openingQty: number;
}

interface AddStockBatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  initialBatches?: Batch[];
  onSave: (batches: Batch[]) => void;
}

export default function AddStockBatchesModal({
  isOpen,
  onClose,
  itemName,
  initialBatches = [],
  onSave,
}: AddStockBatchesModalProps) {
  const [batches, setBatches] = useState<Batch[]>(initialBatches);

  // Reset batches when modal opens
  useEffect(() => {
    if (isOpen) {
      setBatches(
        initialBatches.length > 0
          ? initialBatches
          : [
              {
                id: Date.now().toString(),
                itemCode: "",
                imei: "",
                openingQty: 1,
              },
            ]
      );
    }
  }, [isOpen, initialBatches]);

  const addBatch = () => {
    setBatches([
      ...batches,
      {
        id: Date.now().toString() + Math.random(),
        itemCode: "",
        imei: "",
        openingQty: 1,
      },
    ]);
  };

  const updateBatch = (
    id: string,
    field: keyof Batch,
    value: string | number
  ) => {
    setBatches(
      batches.map((batch) =>
        batch.id === id ? { ...batch, [field]: value } : batch
      )
    );
  };

  const removeBatch = (id: string) => {
    if (batches.length === 1) return; // keep at least one row
    setBatches(batches.filter((batch) => batch.id !== id));
  };

  const handleSave = () => {
    // Filter out completely empty rows
    const validBatches = batches.filter(
      (b) => b.itemCode.trim() !== "" || b.imei.trim() !== ""
    );
    onSave(validBatches.length > 0 ? validBatches : batches);
    onClose();
  };

  const totalQty = batches.reduce(
    (sum, b) => sum + (Number(b.openingQty) || 0),
    0
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            Add Stock - Batches
          </h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-500 hover:text-gray-700 leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-5">
            <div className="text-sm text-gray-500">Item Name</div>
            <div className="font-medium text-base text-gray-800">{itemName}</div>
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
                  <tr key={batch.id} className="border-b last:border-b-0">
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={batch.itemCode}
                        onChange={(e) =>
                          updateBatch(batch.id, "itemCode", e.target.value)
                        }
                        placeholder="Enter item code"
                        className="w-full border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={batch.imei}
                        onChange={(e) =>
                          updateBatch(batch.id, "imei", e.target.value)
                        }
                        placeholder="Enter IMEI"
                        className="w-full border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="0"
                        value={batch.openingQty}
                        onChange={(e) =>
                          updateBatch(
                            batch.id,
                            "openingQty",
                            Number(e.target.value)
                          )
                        }
                        className="w-24 border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => removeBatch(batch.id)}
                        className="text-red-500 hover:text-red-700 text-lg"
                        title="Remove"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={addBatch}
            className="mt-3 text-blue-600 text-sm font-medium hover:underline"
          >
            + Add another batch
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between bg-gray-50">
          <div className="text-sm font-medium text-gray-700">
            Total {totalQty}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="border border-gray-300 hover:bg-gray-100 px-5 py-2 rounded-md text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-md text-sm font-medium"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}