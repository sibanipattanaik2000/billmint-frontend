"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface Party {
  id: string;
  name: string;
  phone: string;
  email: string;
  type: "Customer" | "Supplier" | "Both";
  gstin: string;
  billingAddress: string;
  shippingAddress: string;
  openingBalance: number;
  balanceType: "to_receive" | "to_pay";
  creditLimit: number;
  notes: string;
  receivable: number;
  payable: number;
}

// Mock data (replace with real API later)
const mockParties: Record<string, Party> = {
  "1": {
    id: "1",
    name: "LIVANDER",
    phone: "9994164499",
    email: "",
    type: "Customer",
    gstin: "",
    billingAddress: "RASULKARN",
    shippingAddress: "",
    openingBalance: 0,
    balanceType: "to_receive",
    creditLimit: 0,
    notes: "",
    receivable: 0,
    payable: 0,
  },
  "4": {
    id: "4",
    name: "MIHIR RANJAN TRIPATHY",
    phone: "9988776655",
    email: "",
    type: "Customer",
    gstin: "",
    billingAddress: "",
    shippingAddress: "",
    openingBalance: 7000,
    balanceType: "to_receive",
    creditLimit: 0,
    notes: "",
    receivable: 7000,
    payable: 0,
  },
  "7": {
    id: "7",
    name: "TECH SUPPLIERS PVT LTD",
    phone: "0674-1234567",
    email: "contact@techsuppliers.com",
    type: "Supplier",
    gstin: "21AAAAA0000A1Z5",
    billingAddress: "Industrial Area, Bhubaneswar",
    shippingAddress: "",
    openingBalance: 125000,
    balanceType: "to_pay",
    creditLimit: 0,
    notes: "Preferred supplier for mobiles",
    receivable: 0,
    payable: 125000,
  },
};

export default function EditPartyPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<"Customer" | "Supplier" | "Both">("Customer");
  const [gstin, setGstin] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [openingBalance, setOpeningBalance] = useState(0);
  const [balanceType, setBalanceType] = useState<"to_receive" | "to_pay">("to_receive");
  const [creditLimit, setCreditLimit] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // Simulate API fetch
    const party = mockParties[id];

    if (party) {
      setName(party.name);
      setPhone(party.phone);
      setEmail(party.email);
      setType(party.type);
      setGstin(party.gstin);
      setBillingAddress(party.billingAddress);
      setShippingAddress(party.shippingAddress);
      setOpeningBalance(party.openingBalance);
      setBalanceType(party.balanceType);
      setCreditLimit(party.creditLimit);
      setNotes(party.notes);
    } else {
      // Fallback for unknown ID
      setName("Unknown Party");
    }
    setLoading(false);
  }, [id]);

  const handleUpdate = () => {
    if (!name.trim()) {
      alert("Party name is required");
      return;
    }
    if (!phone.trim()) {
      alert("Phone number is required");
      return;
    }

    const payload = {
      id,
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

    console.log("Updating Party:", payload);
    alert("Party updated successfully!");
    router.push("/parties");
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this party?")) {
      console.log("Deleting party:", id);
      alert("Party deleted successfully!");
      router.push("/parties");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b">
          <h1 className="text-lg font-semibold">Edit Party</h1>
      </div>

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
                className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">Shipping Address</label>
              <textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={3}
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
            className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <button
            onClick={handleDelete}
            className="text-red-500 hover:text-red-700 text-sm font-medium"
          >
            Delete Party
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="border px-6 py-2 rounded-md text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium"
            >
              Update Party
            </button>
             <button
            onClick={handleDelete}
            className="border border-red-500 text-red-500 hover:bg-red-50 px-4 py-1.5 rounded text-sm"
          >
            Delete
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}