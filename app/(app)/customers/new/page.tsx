"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddPartyPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<"Customer" | "Supplier" | "Both">("Customer");
  const [gstin, setGstin] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [balanceType, setBalanceType] = useState<"to_receive" | "to_pay">("to_receive");
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    if (!name.trim()) {
      alert("Party name is required");
      return;
    }

    if (!phone.trim()) {
      alert("Phone number is required");
      return;
    }

    // In real project → call your API here
    const payload = {
      name,
      phone,
      email,
      type,
      gstin,
      billingAddress,
      shippingAddress,
      openingBalance,
      balanceType,
      creditLimit,
      notes,
    };

    console.log("Creating Party:", payload);
    alert("Party created successfully!");
    router.push("/parties");
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="flex-1 overflow-auto p-6 max-w-4xl">
        {/* Basic Details */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
            Basic Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-sm text-gray-600">
                Party Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter party name"
                className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email (optional)"
                className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Party Type</label>
              <select
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "Customer" | "Supplier" | "Both")
                }
                className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Customer">Customer</option>
                <option value="Supplier">Supplier</option>
                <option value="Both">Both</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600">GSTIN</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="Enter GSTIN (optional)"
                className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
            Address
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-sm text-gray-600">Billing Address</label>
              <textarea
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                rows={3}
                placeholder="Enter billing address"
                className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Shipping Address</label>
              <textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={3}
                placeholder="Enter shipping address (optional)"
                className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Opening Balance & Credit */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
            Opening Balance & Credit
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="text-sm text-gray-600">Opening Balance</label>
              <input
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(Number(e.target.value))}
                className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Balance Type</label>
              <select
                value={balanceType}
                onChange={(e) =>
                  setBalanceType(e.target.value as "to_receive" | "to_pay")
                }
                className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="to_receive">To Receive</option>
                <option value="to_pay">To Pay</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600">Credit Limit</label>
              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(Number(e.target.value))}
                placeholder="0 = No limit"
                className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
            Additional Notes
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any additional notes..."
            className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={() => router.back()}
            className="border px-6 py-2 rounded-md text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium"
          >
            Save Party
          </button>
        </div>
      </div>
    </div>
  );
}