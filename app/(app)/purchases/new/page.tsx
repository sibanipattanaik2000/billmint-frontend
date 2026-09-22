"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PurchaseItem {
  id: string;
  name: string;
  itemCode: string;
  imei: string;
  qty: number;
  unit: string;
  price: number;
  discountPercent: number;
  discountAmount: number;
  tax: string;
  amount: number;
}

export default function NewPurchasePage() {
  const router = useRouter();

  // Supplier details
  const [supplier, setSupplier] = useState("");
  const [billingName, setBillingName] = useState("");
  const [phone, setPhone] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");

  // Invoice meta
  const [invoiceDate] = useState(new Date().toLocaleDateString("en-GB"));
  const [invoiceTime] = useState(
    new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );

  // Payment
  const [paymentType, setPaymentType] = useState("CASH");
  const [referenceNo, setReferenceNo] = useState("");
  const [paid, setPaid] = useState(true);

  // Items
  const [items, setItems] = useState<PurchaseItem[]>([
    {
      id: "1",
      name: "",
      itemCode: "",
      imei: "",
      qty: 1,
      unit: "NONE",
      price: 0,
      discountPercent: 0,
      discountAmount: 0,
      tax: "NONE",
      amount: 0,
    },
  ]);

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalDiscount = items.reduce(
    (sum, item) => sum + (item.discountAmount || 0),
    0
  );
  const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);

  const updateItem = (
    id: string,
    field: keyof PurchaseItem,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        if (
          field === "price" ||
          field === "qty" ||
          field === "discountPercent" ||
          field === "discountAmount"
        ) {
          const price = Number(updated.price) || 0;
          const qty = Number(updated.qty) || 0;
          let discountAmt = Number(updated.discountAmount) || 0;

          if (field === "discountPercent") {
            discountAmt = (price * qty * Number(value)) / 100;
            updated.discountAmount = Number(discountAmt.toFixed(2));
          }

          updated.amount = Number((price * qty - discountAmt).toFixed(2));
        }

        return updated;
      })
    );
  };

  const addRow = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        name: "",
        itemCode: "",
        imei: "",
        qty: 1,
        unit: "NONE",
        price: 0,
        discountPercent: 0,
        discountAmount: 0,
        tax: "NONE",
        amount: 0,
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const handleSave = () => {
    if (!supplier.trim()) {
      alert("Please enter supplier name");
      return;
    }

    const payload = {
      supplier,
      billingName,
      phone,
      billingAddress,
      shippingAddress,
      paymentType,
      referenceNo,
      paid,
      items,
      totalAmount,
      invoiceDate,
      invoiceTime,
    };

    console.log("Saving Purchase Invoice:", payload);
    alert("Purchase Invoice created successfully!");
    router.push("/purchases");
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b">
          <h1 className="text-lg font-semibold">Purchase</h1>
        </div>

      {/* Supplier Section */}
      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-6 border-b">
        <div>
          <label className="text-xs text-gray-500">Supplier *</label>
          <input
            type="text"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="Search or type supplier"
            className="w-full border rounded px-2 py-1.5 mt-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Billing Name (Optional)</label>
          <input
            type="text"
            value={billingName}
            onChange={(e) => setBillingName(e.target.value)}
            className="w-full border rounded px-2 py-1.5 mt-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Phone No.</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border rounded px-2 py-1.5 mt-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="text-right text-sm">
          <div className="text-gray-500">Invoice Number</div>
          <div className="font-medium text-gray-400">Auto</div>
          <div className="text-gray-500 mt-2">Invoice Date</div>
          <div>{invoiceDate}</div>
          <div className="text-gray-500">Time</div>
          <div>{invoiceTime}</div>
        </div>
      </div>

      {/* Address */}
      <div className="px-6 py-3 grid grid-cols-1 md:grid-cols-2 gap-6 border-b">
        <div>
          <label className="text-xs text-gray-500">Billing Address</label>
          <textarea
            value={billingAddress}
            onChange={(e) => setBillingAddress(e.target.value)}
            rows={2}
            className="w-full border rounded px-2 py-1.5 mt-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Shipping Address</label>
          <textarea
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            rows={2}
            className="w-full border rounded px-2 py-1.5 mt-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Items Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 w-8"></th>
              <th className="py-2">ITEM</th>
              <th className="py-2">ITEM CODE</th>
              <th className="py-2">IMEI NO</th>
              <th className="py-2">QTY</th>
              <th className="py-2">UNIT</th>
              <th className="py-2 text-right">PRICE/UNIT</th>
              <th className="py-2 text-right">DISCOUNT</th>
              <th className="py-2">TAX</th>
              <th className="py-2 text-right">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2 text-center">
                  <button
                    onClick={() => removeRow(item.id)}
                    className="text-red-500 hover:text-red-700 text-lg"
                  >
                    ×
                  </button>
                </td>
                <td className="py-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, "name", e.target.value)}
                    placeholder="Item name"
                    className="w-full border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2">
                  <input
                    type="text"
                    value={item.itemCode}
                    onChange={(e) =>
                      updateItem(item.id, "itemCode", e.target.value)
                    }
                    className="w-full border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2">
                  <input
                    type="text"
                    value={item.imei}
                    onChange={(e) => updateItem(item.id, "imei", e.target.value)}
                    className="w-full border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) =>
                      updateItem(item.id, "qty", Number(e.target.value))
                    }
                    className="w-16 border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2">
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                    className="border rounded px-1 py-1"
                  >
                    <option>NONE</option>
                    <option>PCS</option>
                    <option>KG</option>
                    <option>BOX</option>
                  </select>
                </td>
                <td className="py-2">
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) =>
                      updateItem(item.id, "price", Number(e.target.value))
                    }
                    className="w-24 border rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2">
                  <div className="flex gap-1 justify-end">
                    <input
                      type="number"
                      value={item.discountPercent}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "discountPercent",
                          Number(e.target.value)
                        )
                      }
                      className="w-16 border rounded px-1 py-1 text-right"
                      placeholder="%"
                    />
                    <input
                      type="number"
                      value={item.discountAmount}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "discountAmount",
                          Number(e.target.value)
                        )
                      }
                      className="w-20 border rounded px-1 py-1 text-right"
                    />
                  </div>
                </td>
                <td className="py-2">
                  <select
                    value={item.tax}
                    onChange={(e) => updateItem(item.id, "tax", e.target.value)}
                    className="border rounded px-1 py-1"
                  >
                    <option>NONE</option>
                    <option>GST 18%</option>
                    <option>GST 12%</option>
                    <option>GST 5%</option>
                    <option>GST 28%</option>
                  </select>
                </td>
                <td className="py-2 text-right font-medium">
                  {item.amount.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={10} className="py-3">
                <button
                  onClick={addRow}
                  className="text-blue-600 text-sm font-medium hover:underline"
                >
                  + ADD ROW
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mt-6">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>TOTAL QTY</span>
              <span>{totalQty}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Discount</span>
              <span>{totalDiscount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total</span>
              <span>₹ {totalAmount.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Payment */}
      <div className="border-t px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label className="text-xs text-gray-500">Terms & Conditions</label>
          <select className="w-full border rounded px-2 py-1.5 mt-1 text-sm">
            <option>Purchase Invoice</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">
            *Goods once purchased are subject to supplier terms
          </p>
        </div>

        <div>
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            <div>
              <label className="text-xs text-gray-500">Payment Type</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm block mt-1"
              >
                <option>CASH</option>
                <option>BANK</option>
                <option>UPI</option>
                <option>CARD</option>
                <option>OTHERS</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Reference No.</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm block mt-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <input
              type="checkbox"
              checked={paid}
              onChange={(e) => setPaid(e.target.checked)}
              id="paid"
            />
            <label htmlFor="paid" className="text-sm">
              Paid
            </label>
            <span className="ml-auto font-medium">
              {totalAmount.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Balance</span>
            <span>{paid ? 0 : totalAmount.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>
              <div className="flex items-center gap-3 justify-end px-6 py-4 border-t bg-gray-50">
          <button className="border px-4 py-1.5 rounded text-sm hover:bg-gray-50">
            Share
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-1.5 rounded text-sm font-medium"
          >
            Save
          </button>
        </div>
    </div>
  );
}