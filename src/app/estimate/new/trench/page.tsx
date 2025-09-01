/* eslint react/no-unescaped-entities: 0 */

"use client";

import { useMemo, useRef, useState } from "react";
import {
  trenchEstimate,
  TrenchVars,
  TrenchRates,
  TrenchExtras,
} from "@/lib/calculators/trench";

import BidPreview from "@/components/BidPreview";
import { COMPANY } from "@/lib/company";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

function currency(n: number) {
  if (Number.isNaN(n) || !Number.isFinite(n)) return "$0";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export default function NewTrenchEstimate() {
  // Defaults tuned for small utility trench
  const [v, setV] = useState<TrenchVars>({
    L_ft: 120,
    depth_ft: 4.0,

    pipe_d_in: 6,
    side_clearance_ft: 0.5,
    bedding_t_ft: 0.5,
    trench_width_override_ft: 0, // 0 => auto

    haul_off_fraction: 0.5,
    truck_capacity_yd3: 12,
    haul_round_trip_min: 25,

    prod_dig_yd3_per_hr: 28,
    prod_backfill_yd3_per_hr: 40,
    prod_loader_yd3_per_hr: 45,
  });

  const [r, setR] = useState<TrenchRates>({
    excavator_hr: 125,
    loader_hr: 110,
    trucking_hr: 95,

    bedding_yd3: 38,
    pipe_per_ft: 12,
    tracer_per_ft: 0.5,
    warning_tape_per_ft: 0.3,

    asphalt_sf: 6,
    concrete_sf: 10,
    lawn_sf: 2.5,
    dump_fee_yd3: 8,
  });

  const [x, setX] = useState<TrenchExtras>({
    asphalt_restore_sf: 80,
    concrete_restore_sf: 0,
    lawn_restore_sf: 120,
    extrasUSD: 0,
  });

  // Permit fees (pass-through)
  const [permitFees, setPermitFees] = useState(0);

  // Client info for proposal
  const [client, setClient] = useState({
    name: "",
    phone: "",
    email: "",
    addressLines: [] as string[],
    projectAddressLines: [] as string[],
  });

  // Markups
  const [overheadPct, setOverheadPct] = useState(0.10);
  const [contingencyPct, setContingencyPct] = useState(0.10);
  const [profitMargin, setProfitMargin] = useState(0.15);

  // Validation
  const errors = useMemo(() => {
    const e: string[] = [];
    if (v.L_ft <= 0) e.push("Trench length must be positive.");
    if (v.depth_ft <= 0) e.push("Depth must be positive.");
    if (v.pipe_d_in <= 0) e.push("Pipe diameter must be positive.");
    if (v.side_clearance_ft < 0) e.push("Side clearance cannot be negative.");
    if (v.truck_capacity_yd3 <= 0) e.push("Truck capacity must be positive.");
    if (
      v.prod_dig_yd3_per_hr <= 0 ||
      v.prod_backfill_yd3_per_hr <= 0 ||
      v.prod_loader_yd3_per_hr <= 0
    ) e.push("Productivities must be positive.");
    if (overheadPct < 0 || contingencyPct < 0 || profitMargin < 0 || profitMargin >= 0.95) {
      e.push("Markup values look invalid.");
    }
    return e;
  }, [v, overheadPct, contingencyPct, profitMargin]);

  // Compute
  const calc = useMemo(() => trenchEstimate(v, r, x), [v, r, x]);

  // Totals (permit pass-through after profit)
  const base = calc.subtotal * (1 + overheadPct + contingencyPct);
  const total = base / (1 - profitMargin);
  const grandTotal = total + (permitFees || 0);

  // Sensitivity
  const materialsAndDisposal =
    (calc.cost_pipe || 0) +
    (calc.cost_tracer || 0) +
    (calc.cost_tape || 0) +
    (calc.cost_bedding || 0) +
    (calc.cost_asphalt || 0) +
    (calc.cost_concrete || 0) +
    (calc.cost_lawn || 0) +
    (calc.cost_dump_fees || 0);

  const truckingCost = calc.cost_truck || 0;
  const equipCost = (calc.cost_excavator || 0) + (calc.cost_loader || 0);

  const sMat = materialsAndDisposal / Math.max(calc.subtotal, 1);
  const sTrk = truckingCost / Math.max(calc.subtotal, 1);
  const sEqp = equipCost / Math.max(calc.subtotal, 1);

  // Warnings
  const warnings = useMemo(() => {
    const w: string[] = [];
    if (v.trench_width_override_ft > 0 && v.trench_width_override_ft < (v.pipe_d_in/12 + 2*v.side_clearance_ft)) {
      w.push("Override trench width is less than pipe + side clearances.");
    }
    if (v.bedding_t_ft <= 0) w.push("Bedding thickness is 0 — confirm spec.");
    if (r.tracer_per_ft > 0 && v.depth_ft < 1.0) w.push("Very shallow depth with tracer wire — check frost/cover requirements.");
    return w;
  }, [v.trench_width_override_ft, v.pipe_d_in, v.side_clearance_ft, v.bedding_t_ft, r.tracer_per_ft, v.depth_ft]);

  const num = (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value);

  // ----- PDF Export (proposal only) -----
  const bidRef = useRef<HTMLDivElement>(null);
  const downloadPDF = async () => {
    const el = bidRef.current;
    if (!el) return;
    document.body.classList.add("exporting");
    await new Promise((r) => setTimeout(r, 0));

    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    document.body.classList.remove("exporting");

    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();

    // px (96dpi) -> mm
    const mmW = (canvas.width * 25.4) / 96;
    const mmH = (canvas.height * 25.4) / 96;
    const ratio = Math.min(pw / mmW, ph / mmH);
    const imgW = mmW * ratio;
    const imgH = mmH * ratio;

    pdf.addImage(img, "PNG", (pw - imgW) / 2, 10, imgW, imgH);
    pdf.save(`Trench_Bid_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold">SiteBid AI — Trench Estimate</h1>
      <p className="text-slate-600 mt-1">Linear trench with pipe, bedding, hauling, and surface restoration. Extras + permit fees included.</p>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {/* Inputs */}
        <section className="space-y-4">
          <Card title="Geometry">
            <Row label="Length (ft)">
              <input type="number" className="input" value={v.L_ft} onChange={e=>setV({...v,L_ft:num(e)})}/>
            </Row>
            <Row label="Depth (ft)">
              <input type="number" step="0.1" className="input" value={v.depth_ft} onChange={e=>setV({...v,depth_ft:num(e)})}/>
            </Row>
            <Row label="Pipe OD (in)">
              <input type="number" className="input" value={v.pipe_d_in} onChange={e=>setV({...v,pipe_d_in:num(e)})}/>
            </Row>
            <Row label="Side clearance (ft)">
              <input type="number" step="0.1" className="input" value={v.side_clearance_ft} onChange={e=>setV({...v,side_clearance_ft:num(e)})}/>
            </Row>
            <Row label="Bedding thickness (ft)">
              <input type="number" step="0.1" className="input" value={v.bedding_t_ft} onChange={e=>setV({...v,bedding_t_ft:num(e)})}/>
            </Row>
            <Row label="Width override (ft)">
              <input type="number" step="0.1" className="input" value={v.trench_width_override_ft} onChange={e=>setV({...v,trench_width_override_ft:num(e)})}/>
            </Row>
          </Card>

          <Card title="Productivity & Haul">
            <Row label="Dig prod (yd³/hr)">
              <input type="number" className="input" value={v.prod_dig_yd3_per_hr} onChange={e=>setV({...v,prod_dig_yd3_per_hr:num(e)})}/>
            </Row>
            <Row label="Backfill prod (yd³/hr)">
              <input type="number" className="input" value={v.prod_backfill_yd3_per_hr} onChange={e=>setV({...v,prod_backfill_yd3_per_hr:num(e)})}/>
            </Row>
            <Row label="Loader prod (yd³/hr)">
              <input type="number" className="input" value={v.prod_loader_yd3_per_hr} onChange={e=>setV({...v,prod_loader_yd3_per_hr:num(e)})}/>
            </Row>
            <Row label="Haul-off fraction (0–1)">
              <input type="number" step="0.05" className="input" value={v.haul_off_fraction} onChange={e=>setV({...v,haul_off_fraction:num(e)})}/>
            </Row>
            <Row label="Truck cap (yd³)">
              <input type="number" className="input" value={v.truck_capacity_yd3} onChange={e=>setV({...v,truck_capacity_yd3:num(e)})}/>
            </Row>
            <Row label="Round-trip haul (min)">
              <input type="number" className="input" value={v.haul_round_trip_min} onChange={e=>setV({...v,haul_round_trip_min:num(e)})}/>
            </Row>
          </Card>

          <Card title="Rates — Linear & Materials">
            <Row label="Excavator ($/hr)">
              <input type="number" className="input" value={r.excavator_hr} onChange={e=>setR({...r,excavator_hr:num(e)})}/>
            </Row>
            <Row label="Loader ($/hr)">
              <input type="number" className="input" value={r.loader_hr} onChange={e=>setR({...r,loader_hr:num(e)})}/>
            </Row>
            <Row label="Trucking ($/hr)">
              <input type="number" className="input" value={r.trucking_hr} onChange={e=>setR({...r,trucking_hr:num(e)})}/>
            </Row>
            <Row label="Pipe ($/ft)">
              <input type="number" className="input" value={r.pipe_per_ft} onChange={e=>setR({...r,pipe_per_ft:num(e)})}/>
            </Row>
            <Row label="Tracer wire ($/ft)">
              <input type="number" className="input" value={r.tracer_per_ft} onChange={e=>setR({...r,tracer_per_ft:num(e)})}/>
            </Row>
            <Row label="Warning tape ($/ft)">
              <input type="number" className="input" value={r.warning_tape_per_ft} onChange={e=>setR({...r,warning_tape_per_ft:num(e)})}/>
            </Row>
            <Row label="Bedding ($/yd³)">
              <input type="number" className="input" value={r.bedding_yd3} onChange={e=>setR({...r,bedding_yd3:num(e)})}/>
            </Row>
            <Row label="Dump fee ($/yd³)">
              <input type="number" className="input" value={r.dump_fee_yd3} onChange={e=>setR({...r,dump_fee_yd3:num(e)})}/>
            </Row>
          </Card>

          <Card title="Surface Restoration">
            <Row label="Asphalt restore (sf)">
              <input type="number" className="input" value={x.asphalt_restore_sf ?? 0} onChange={e=>setX({...x,asphalt_restore_sf:num(e)})}/>
            </Row>
            <Row label="Concrete restore (sf)">
              <input type="number" className="input" value={x.concrete_restore_sf ?? 0} onChange={e=>setX({...x,concrete_restore_sf:num(e)})}/>
            </Row>
            <Row label="Lawn restore (sf)">
              <input type="number" className="input" value={x.lawn_restore_sf ?? 0} onChange={e=>setX({...x,lawn_restore_sf:num(e)})}/>
            </Row>
          </Card>

          <Card title="Extras & Permit">
            <Row label="Extras (lump $)">
              <input type="number" className="input" value={x.extrasUSD ?? 0} onChange={e=>setX({...x,extrasUSD:num(e)})}/>
            </Row>
            <Row label="Permit fees ($)">
              <input type="number" className="input" value={permitFees} onChange={e=>setPermitFees(num(e))}/>
            </Row>
          </Card>

          <Card title="Markup">
            <Row label="Overhead (%)">
              <input type="number" step={1} className="input" value={overheadPct*100} onChange={e=>setOverheadPct(Number(e.target.value)/100)}/>
            </Row>
            <Row label="Contingency (%)">
              <input type="number" step={1} className="input" value={contingencyPct*100} onChange={e=>setContingencyPct(Number(e.target.value)/100)}/>
            </Row>
            <Row label="Profit margin (%)">
              <input type="number" step={1} className="input" value={profitMargin*100} onChange={e=>setProfitMargin(Number(e.target.value)/100)}/>
            </Row>
          </Card>

          {/* Client info for proposal */}
          <Card title="Client Info">
            <Row label="Name">
              <input className="input" value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} />
            </Row>
            <Row label="Phone">
              <input className="input" value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} />
            </Row>
            <Row label="Email">
              <input className="input" value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} />
            </Row>
            <Row label="Address (line)">
              <input
                className="input"
                placeholder="123 Main St"
                onBlur={(e) => setClient({ ...client, addressLines: [e.target.value] })}
              />
            </Row>
            <Row label="Project Addr (line)">
              <input
                className="input"
                placeholder="Project site address"
                onBlur={(e) => setClient({ ...client, projectAddressLines: [e.target.value] })}
              />
            </Row>
          </Card>
        </section>

        {/* Outputs */}
        <section className="space-y-4">
          <Card title="Results">
            {errors.length > 0 && (
              <Banner tone="red" title="Fix these:">
                <ul className="list-disc ml-5 mt-1">{errors.map((e,i)=><li key={i}>{e}</li>)}</ul>
              </Banner>
            )}
            {warnings.length > 0 && (
              <Banner tone="amber" title="Heads up:">
                <ul className="list-disc ml-5 mt-1">{warnings.map((w,i)=><li key={i}>{w}</li>)}</ul>
              </Banner>
            )}

            <div className="grid grid-cols-2 gap-3">
              <KV k="Trench width (ft)" v={`${calc.trench_w_ft.toFixed(2)}`} />
              <KV k="Excavation (yd³)" v={`${calc.V_exc_yd3.toFixed(2)}`} />
              <KV k="Bedding (yd³)" v={`${calc.V_bed_yd3.toFixed(2)}`} />
              <KV k="Backfill (yd³)" v={`${calc.V_backfill_yd3.toFixed(2)}`} />
              <KV k="Haul-off (yd³)" v={`${calc.V_haul_yd3.toFixed(2)}`} />

              <KV k="Trips" v={`${calc.trips}`} />
              <KV k="Trucking hours" v={`${calc.hrs_truck.toFixed(2)} h`} />

              <KV k="Dig hours" v={`${calc.dig_h.toFixed(2)} h`} />
              <KV k="Backfill hours" v={`${calc.backfill_h.toFixed(2)} h`} />
              <KV k="Loader hours" v={`${calc.loader_h.toFixed(2)} h`} />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <KV k="Pipe" v={currency(calc.cost_pipe)} />
              <KV k="Tracer wire" v={currency(calc.cost_tracer)} />
              <KV k="Warning tape" v={currency(calc.cost_tape)} />
              <KV k="Bedding" v={currency(calc.cost_bedding)} />
              <KV k="Asphalt restore" v={currency(calc.cost_asphalt)} />
              <KV k="Concrete restore" v={currency(calc.cost_concrete)} />
              <KV k="Lawn restore" v={currency(calc.cost_lawn)} />
              <KV k="Dump fees" v={currency(calc.cost_dump_fees)} />
              <KV k="Equipment" v={currency((calc.cost_excavator || 0) + (calc.cost_loader || 0))} />
              <KV k="Trucking" v={currency(calc.cost_truck)} />
              <KV k="Extras" v={currency(calc.extrasUSD || 0)} />
              <KV k="Subtotal" v={currency(calc.subtotal)} />
              <KV k="Base (OH+Cont)" v={currency(base)} />
              <KV k="Total (with profit)" v={currency(total)} />
              <KV k="Permit fees (pass-through)" v={currency(permitFees || 0)} />
              <KV k="Grand Total" v={currency(grandTotal)} />
            </div>

            <div className="mt-4">
              <h3 className="font-semibold">Sensitivity (share of subtotal)</h3>
              <ul className="list-disc ml-5 text-sm mt-1">
                <li>Materials + disposal: {(sMat*100).toFixed(0)}%</li>
                <li>Trucking: {(sTrk*100).toFixed(0)}%</li>
                <li>Equipment: {(sEqp*100).toFixed(0)}%</li>
              </ul>
            </div>
          </Card>

          {/* Proposal Preview + actions */}
          <Card title="Proposal Preview">
            <div ref={bidRef}>
              <BidPreview
                company={COMPANY}
                client={client}
                meta={{
                  projectName: "Utility Trench Install",
                  dateISO: new Date().toISOString(),
                  validDays: 14,
                  notes:
                    "Excavate, bed, install pipe with tracer & warning tape, backfill/shape, restore surfaces as noted; haul/dispose spoils per calculation.",
                }}
                pricing={{
                  materials: materialsAndDisposal,    // includes disposal to keep pricing simple
                  equipment: equipCost,
                  trucking: truckingCost,
                  extras: x.extrasUSD || 0,
                  permitFees: permitFees || 0,
                  subtotal: calc.subtotal,
                  overheadPct,
                  contingencyPct,
                  profitMargin,
                  permitPassThrough: true,
                }}
                scopeBullets={[
                  `Trench ~${v.L_ft} ft long @ ~${v.depth_ft} ft depth (OD ${v.pipe_d_in}" pipe).`,
                  `Bedding ${v.bedding_t_ft} ft; side clearance ${v.side_clearance_ft} ft each side; width ${calc.trench_w_ft.toFixed(2)} ft ${v.trench_width_override_ft > 0 ? "(override applied)" : "(auto)"}.`,
                  `Install pipe + tracer wire + warning tape; backfill and shape.`,
                  `Surface restoration: asphalt ${x.asphalt_restore_sf ?? 0} sf, concrete ${x.concrete_restore_sf ?? 0} sf, lawn ${x.lawn_restore_sf ?? 0} sf.`,
                  `Haul-off ~${Math.round(v.haul_off_fraction*100)}% of spoils; truck ${v.truck_capacity_yd3} yd³; RT haul ${v.haul_round_trip_min} min.`,
                ]}
                inclusions={[
                  "Excavation, bedding, pipe installation",
                  "Tracer wire and warning tape (if specified)",
                  "Backfill and shaping",
                  "Surface restoration as listed",
                  "Trucking/disposal as calculated",
                  "Mobilization",
                ]}
                exclusions={[
                  "Rock excavation, dewatering, shoring/boxes",
                  "Service reconnections, pressure testing",
                  "Traffic control beyond noted",
                  "Permits/fees (listed separately)",
                  "Items not specifically described",
                ]}
                printId="trench-bid"
              />
            </div>

            <div className="mt-3 no-print">
              <button onClick={downloadPDF} className="rounded-lg border px-3 py-2">
                Download PDF
              </button>
            </div>
          </Card>

          <Card title="Assumptions (auto-print on quote)">
            <ul className="list-disc ml-5 text-sm">
              <li>Trench for {v.L_ft} ft; depth {v.depth_ft} ft; pipe {v.pipe_d_in}" OD; bedding {v.bedding_t_ft} ft; side clearance {v.side_clearance_ft} ft each side.</li>
              <li>Width {calc.trench_w_ft.toFixed(2)} ft (override {v.trench_width_override_ft > 0 ? "yes" : "no"}).</li>
              <li>Haul-off {Math.round(v.haul_off_fraction*100)}% of spoils; truck {v.truck_capacity_yd3} yd³; RT haul {v.haul_round_trip_min} min.</li>
              <li>Overhead {(overheadPct*100).toFixed(0)}%, Contingency {(contingencyPct*100).toFixed(0)}%, Profit {(profitMargin*100).toFixed(0)}%. Permits listed separately (no markup).</li>
            </ul>
          </Card>

          <Card title="Inclusions / Exclusions (draft)">
            <p className="text-sm">
              <b>Inclusions:</b> trench excavation, bedding, pipe install (materials as noted), backfill/shape, trucking/disposal, surface restoration (if listed), mobilization.
            </p>
            <p className="text-sm mt-1">
              <b>Exclusions:</b> rock excavation, dewatering, shoring/boxes, traffic control beyond noted, service reconnections, pressure testing, permits/fees (listed separately).
            </p>
          </Card>
        </section>
      </div>

      {/* Print/export CSS so we can hide buttons during capture */}
      <style jsx global>{`
        .exporting .no-print { display: none !important; }
      `}</style>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid grid-cols-[1fr_auto] items-center gap-3 py-1">
      <span className="text-sm text-slate-700">{label}</span>
      <span className="w-48">{children}</span>
    </label>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-2">
      <div className="text-xs text-slate-500">{k}</div>
      <div className="font-semibold">{v}</div>
    </div>
  );
}

function Banner({ tone, title, children }: { tone: "red" | "amber"; title: string; children: React.ReactNode }) {
  const colors = tone === "red"
    ? "border-red-300 bg-red-50 text-red-700"
    : "border-amber-300 bg-amber-50 text-amber-900";
  return (
    <div className={`rounded-lg border p-3 mb-2 ${colors}`}>
      <b>{title}</b>
      {children}
    </div>
  );
}
