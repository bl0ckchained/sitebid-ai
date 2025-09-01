/* eslint react/no-unescaped-entities: 0 */
"use client";

import { useMemo, useState } from "react";
import type { CompanyProfile } from "@/lib/company";

function currency(n: number) {
  if (Number.isNaN(n) || !Number.isFinite(n)) return "$0";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export type ClientInfo = {
  name: string;
  email?: string;
  phone?: string;
  addressLines?: string[];
  projectAddressLines?: string[]; // if different from mailing address
};

export type BidMeta = {
  projectName: string;         // "Driveway Replacement", "Culvert Install", etc.
  bidNo?: string;              // optional job/bid id
  dateISO?: string;            // e.g., new Date().toISOString()
  validDays?: number;          // offer validity window (defaults to 14)
  notes?: string;              // optional notes under scope
};

export type PricingInput = {
  // Breakdown from your calculator
  materials?: number;
  equipment?: number;
  trucking?: number;
  extras?: number;               // lump sum extras you entered
  permitFees?: number;           // pass-through fees (often unmarked up)
  subtotal: number;              // calc.subtotal (before OH/Cont/Profit & permit)
  overheadPct: number;           // 0.10 for 10%
  contingencyPct: number;        // 0.10 for 10%
  profitMargin: number;          // 0.15 for 15%
  permitPassThrough?: boolean;   // default true -> added after profit
};

export type LineItem = { label: string; amount: number };

export default function BidPreview({
  company,
  client,
  meta,
  pricing,
  scopeBullets,
  inclusions,
  exclusions,
  additionalItems = [],
  printId = "bid-print",
}: {
  company: CompanyProfile;
  client: ClientInfo;
  meta: BidMeta;
  pricing: PricingInput;
  scopeBullets: string[];
  inclusions?: string[];
  exclusions?: string[];
  additionalItems?: LineItem[];
  printId?: string; // to isolate print area
}) {
  const validDays = meta.validDays ?? 14;
  const date = meta.dateISO ? new Date(meta.dateISO) : new Date();

  const { base, profitAmount, total, grandTotal } = useMemo(() => {
    const p = pricing;
    const base = p.subtotal * (1 + p.overheadPct + p.contingencyPct);
    const total = base / (1 - p.profitMargin); // profit on top
    const permit = p.permitFees ?? 0;
    const permitPass = p.permitPassThrough ?? true;
    const grand = permitPass ? total + permit : total; // typical: add permit after profit
    const profitAmount = total - base;
    return { base, total, grandTotal: grand, profitAmount };
  }, [pricing]);

  const coreItems: LineItem[] = [
    ...(pricing.materials ? [{ label: "Materials", amount: pricing.materials }] : []),
    ...(pricing.equipment ? [{ label: "Equipment & Labor", amount: pricing.equipment }] : []),
    ...(pricing.trucking ? [{ label: "Trucking", amount: pricing.trucking }] : []),
    ...(pricing.extras ? [{ label: "Extras (Lump Sum)", amount: pricing.extras }] : []),
    { label: "Subtotal", amount: pricing.subtotal },
    { label: `Overhead (${Math.round(pricing.overheadPct * 100)}%) + Contingency (${Math.round(pricing.contingencyPct * 100)}%)`, amount: base - pricing.subtotal },
    { label: `Profit (${Math.round(pricing.profitMargin * 100)}%)`, amount: profitAmount },
  ];

  const permitRow: LineItem[] =
    pricing.permitPassThrough ?? true
      ? (pricing.permitFees ? [{ label: "Permit Fees (pass-through)", amount: pricing.permitFees }] : [])
      : [];

  const allItems = [...coreItems, ...additionalItems, ...permitRow];

  const [showLogo, setShowLogo] = useState(true);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {company.logoUrl && showLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoUrl} alt={`${company.name} logo`} className="h-12 w-auto" />
          )}
          <div>
            <div className="text-xl font-bold">{company.name}</div>
            <div className="text-sm text-slate-600">
              {company.phone} • {company.email}{company.website ? ` • ${company.website}` : ""}
            </div>
            <div className="text-sm text-slate-600">{company.addressLines.join(", ")}</div>
            {company.license && <div className="text-xs text-slate-500 mt-1">{company.license}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">Proposal</div>
          {meta.bidNo && <div className="text-sm text-slate-600">Bid #{meta.bidNo}</div>}
          <div className="text-sm text-slate-600">{date.toLocaleDateString()}</div>
          <div className="text-sm text-slate-600">Valid {validDays} days</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border p-3">
          <div className="text-sm font-semibold">Bill To</div>
          <div className="font-medium">{client.name || "—"}</div>
          {client.phone && <div className="text-sm text-slate-600">{client.phone}</div>}
          {client.email && <div className="text-sm text-slate-600">{client.email}</div>}
          {client.addressLines?.length ? (
            <div className="text-sm text-slate-600">{client.addressLines.join(", ")}</div>
          ) : null}
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-sm font-semibold">Project</div>
          <div className="font-medium">{meta.projectName}</div>
          {client.projectAddressLines?.length ? (
            <div className="text-sm text-slate-600">{client.projectAddressLines.join(", ")}</div>
          ) : null}
          {meta.notes && <div className="text-xs text-slate-500 mt-1">{meta.notes}</div>}
        </div>
      </div>

      <div className="mt-5">
        <div className="text-sm font-semibold mb-1">Scope of Work</div>
        <ul className="list-disc ml-5 text-sm">
          {scopeBullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left text-sm font-semibold border p-2">Item</th>
              <th className="text-right text-sm font-semibold border p-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {allItems.map((it, i) => (
              <tr key={i}>
                <td className="border p-2 text-sm">{it.label}</td>
                <td className="border p-2 text-right font-medium">{currency(it.amount)}</td>
              </tr>
            ))}
            <tr className="bg-slate-50">
              <td className="border p-2 text-sm font-semibold">Total (before permit)</td>
              <td className="border p-2 text-right font-semibold">{currency(total)}</td>
            </tr>
            {(pricing.permitPassThrough ?? true) && (pricing.permitFees ?? 0) > 0 && (
              <tr className="bg-slate-50">
                <td className="border p-2 text-sm">Permit Fees (added)</td>
                <td className="border p-2 text-right">{currency(pricing.permitFees!)}</td>
              </tr>
            )}
            <tr className="bg-black/5">
              <td className="border p-2 text-sm font-bold">Grand Total</td>
              <td className="border p-2 text-right text-lg font-bold">{currency(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {inclusions?.length ? (
        <div className="mt-5">
          <div className="text-sm font-semibold mb-1">Inclusions</div>
          <ul className="list-disc ml-5 text-sm">
            {inclusions.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      ) : null}

      {exclusions?.length ? (
        <div className="mt-3">
          <div className="text-sm font-semibold mb-1">Exclusions</div>
          <ul className="list-disc ml-5 text-sm">
            {exclusions.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 text-xs text-slate-500">
        <p>Payment terms: Net 15 unless otherwise stated. Scheduling subject to weather and site access.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="text-sm font-semibold mb-2">Acceptance</div>
          <div className="border rounded-lg p-3 text-sm">
            <div>Client Signature: _______________________________</div>
            <div className="mt-3">Printed Name: __________________________________</div>
            <div className="mt-3">Date: __________________________________________</div>
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold mb-2">Company</div>
          <div className="border rounded-lg p-3 text-sm">
            <div>Signer: _______________________________</div>
            <div className="mt-3">Title: __________________________________</div>
            <div className="mt-3">Date: __________________________________</div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 no-print">
        <button onClick={() => window.print()} className="rounded-lg border px-3 py-2">Print / Save as PDF</button>
        <label className="ml-3 flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4" checked={showLogo} onChange={(e)=>setShowLogo(e.target.checked)} />
          Show logo
        </label>
      </div>

      {/* Print CSS to isolate proposal */}
      <div id={printId} />
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .rounded-2xl.border.bg-white.p-5.shadow-sm, 
          .rounded-2xl.border.bg-white.p-5.shadow-sm * { visibility: visible; }
          .rounded-2xl.border.bg-white.p-5.shadow-sm { position: absolute; inset: 0; margin: 0 !important; padding: 24px !important; box-shadow: none !important; border: 0 !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
// ------------------------------------------------------------------------------
// src/lib/company.ts
// ------------------------------------------------------------------------------