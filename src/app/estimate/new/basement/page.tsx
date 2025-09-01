/* eslint react/no-unescaped-entities: 0 */
"use client";

import { useMemo, useRef, useState } from "react";
import {
  basementEstimate,
  BasementVars,
  BasementRates,
  BasementExtras,
} from "@/lib/calculators/basement";

import BidPreview from "@/components/BidPreview";
import { COMPANY } from "@/lib/company";

// PDF export libs (install first: npm i jspdf html2canvas)
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

function currency(n: number) {
  if (Number.isNaN(n) || !Number.isFinite(n)) return "$0";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export default function NewBasementEstimate() {
  // Defaults
  const [v, setV] = useState<BasementVars>({
    L_in_ft: 60,
    W_in_ft: 36,
    depth_ft: 8,              // to bottom of footing
    overdig_ft: 2,

    ramp_len_ft: 20,
    ramp_width_ft: 12,

    topsoil_thk_ft: 0.25,     // 3"

    haul_off_fraction: 0.40,
    truck_capacity_yd3: 12,
    haul_round_trip_min: 30,

    prod_excavator_yd3_per_hr: 45,
    prod_dozer_yd3_per_hr: 60,
    prod_loader_yd3_per_hr: 45,
  });

  const [r, setR] = useState<BasementRates>({
    excavator_hr: 140,
    dozer_hr: 120,
    loader_hr: 110,
    trucking_hr: 95,

    base_stone_yd3: 35,       // under-slab gravel
    drain_pipe_per_ft: 6,     // perf pipe
    drain_gravel_yd3: 32,

    dump_fee_yd3: 8,          // soil tipping fee
  });

  const [x, setX] = useState<BasementExtras>({
    base_stone_thk_ft: 0.33,  // ~4"
    perimeter_drain_len_ft: 0, // 0 => auto = perimeter
    drain_trench_width_ft: 1.0,
    drain_trench_depth_ft: 0.5,
    extrasUSD: 0,
  });

  // Permit fees (pass-through)
  const [permitFees, setPermitFees] = useState(0);

  // Markups
  const [overheadPct, setOverheadPct] = useState(0.10);
  const [contingencyPct, setContingencyPct] = useState(0.10);
  const [profitMargin, setProfitMargin] = useState(0.15);

  // Client info (for proposal)
  const [client, setClient] = useState({
    name: "",
    phone: "",
    email: "",
    addressLines: [] as string[],
    projectAddressLines: [] as string[],
  });

  // Validation
  const errors = useMemo(() => {
    const e: string[] = [];
    if (v.L_in_ft <= 0 || v.W_in_ft <= 0) e.push("Interior length/width must be positive.");
    if (v.depth_ft <= 0) e.push("Depth must be positive.");
    if (v.overdig_ft < 0) e.push("Overdig cannot be negative.");
    if (v.truck_capacity_yd3 <= 0) e.push("Truck capacity must be positive.");
    if (v.prod_excavator_yd3_per_hr <= 0 || v.prod_dozer_yd3_per_hr <= 0 || v.prod_loader_yd3_per_hr <= 0) {
      e.push("Productivities must be positive.");
    }
    if (overheadPct < 0 || contingencyPct < 0 || profitMargin < 0 || profitMargin >= 0.95) {
      e.push("Markup values look invalid.");
    }
    return e;
  }, [v, overheadPct, contingencyPct, profitMargin]);

  // Compute
  const calc = useMemo(() => basementEstimate(v, r, x), [v, r, x]);

  // Totals (permits as pass-through after profit)
  const base = calc.subtotal * (1 + overheadPct + contingencyPct);
  const total = base / (1 - profitMargin);
  const grandTotal = total + (permitFees || 0);

  // Sensitivity (share of subtotal)
  const truckingCost = calc.cost_truck;
  const materialsCost = calc.materials;
  const equipCost = calc.cost_excavator + calc.cost_dozer + calc.cost_loader;
  const sMat = materialsCost / Math.max(calc.subtotal, 1);
  const sTrk = truckingCost / Math.max(calc.subtotal, 1);
  const sEqp = equipCost / Math.max(calc.subtotal, 1);

  const num = (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value);

  // Warnings
  const warnings = useMemo(() => {
    const w: string[] = [];
    if ((x.base_stone_thk_ft ?? 0) > 1) w.push('Under-slab stone > 12" — check spec.');
    if ((x.drain_trench_depth_ft ?? 0) > 1.5) w.push("Drain trench depth unusually large — check detail.");
    if (v.haul_off_fraction > 0.8) w.push("High haul-off fraction — confirm fill/backfill availability on site.");
    return w;
  }, [x, v.haul_off_fraction]);

  // ----- PDF Export (capture only the proposal) -----
  const bidRef = useRef<HTMLDivElement>(null);
  const downloadPDF = async () => {
    const el = bidRef.current;
    if (!el) return;
    // Hide 'no-print' UI during capture
    document.body.classList.add("exporting");
    await new Promise((r) => setTimeout(r, 0));

    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    document.body.classList.remove("exporting");

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Convert canvas px to mm (assuming 96 DPI)
    const mmFullWidth = (canvas.width * 25.4) / 96;
    const mmFullHeight = (canvas.height * 25.4) / 96;

    const ratio = Math.min(pageWidth / mmFullWidth, pageHeight / mmFullHeight);
    const imgW = mmFullWidth * ratio;
    const imgH = mmFullHeight * ratio;

    pdf.addImage(imgData, "PNG", (pageWidth - imgW) / 2, 10, imgW, imgH);
    pdf.save(`Basement_Bid_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold">SiteBid AI — Basement Estimate</h1>
      <p className="text-slate-600 mt-1">Overdig box + ramp, under-slab stone, optional perimeter drain, trucking, dump fees, extras, and permit fees.</p>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {/* Inputs */}
        <section className="space-y-4">
          <Card title="Geometry & Overdig">
            <Row label="Interior length (ft)">
              <input type="number" className="input" value={v.L_in_ft} onChange={e=>setV({...v,L_in_ft:num(e)})}/>
            </Row>
            <Row label="Interior width (ft)">
              <input type="number" className="input" value={v.W_in_ft} onChange={e=>setV({...v,W_in_ft:num(e)})}/>
            </Row>
            <Row label="Depth to footing (ft)">
              <input type="number" step="0.1" className="input" value={v.depth_ft} onChange={e=>setV({...v,depth_ft:num(e)})}/>
            </Row>
            <Row label="Overdig each side (ft)">
              <input type="number" step="0.1" className="input" value={v.overdig_ft} onChange={e=>setV({...v,overdig_ft:num(e)})}/>
            </Row>
            <Row label="Topsoil strip (ft)">
              <input type="number" step="0.05" className="input" value={v.topsoil_thk_ft} onChange={e=>setV({...v,topsoil_thk_ft:num(e)})}/>
            </Row>
          </Card>

          <Card title="Ramp (access)">
            <Row label="Ramp length (ft)">
              <input type="number" className="input" value={v.ramp_len_ft} onChange={e=>setV({...v,ramp_len_ft:num(e)})}/>
            </Row>
            <Row label="Ramp width (ft)">
              <input type="number" className="input" value={v.ramp_width_ft} onChange={e=>setV({...v,ramp_width_ft:num(e)})}/>
            </Row>
          </Card>

          <Card title="Productivity & Haul">
            <Row label="Excavator (yd³/hr)">
              <input type="number" className="input" value={v.prod_excavator_yd3_per_hr} onChange={e=>setV({...v,prod_excavator_yd3_per_hr:num(e)})}/>
            </Row>
            <Row label="Dozer (yd³/hr)">
              <input type="number" className="input" value={v.prod_dozer_yd3_per_hr} onChange={e=>setV({...v,prod_dozer_yd3_per_hr:num(e)})}/>
            </Row>
            <Row label="Loader (yd³/hr)">
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

          <Card title="Rates & Materials">
            <Row label="Excavator ($/hr)">
              <input type="number" className="input" value={r.excavator_hr} onChange={e=>setR({...r,excavator_hr:num(e)})}/>
            </Row>
            <Row label="Dozer ($/hr)">
              <input type="number" className="input" value={r.dozer_hr} onChange={e=>setR({...r,dozer_hr:num(e)})}/>
            </Row>
            <Row label="Loader ($/hr)">
              <input type="number" className="input" value={r.loader_hr} onChange={e=>setR({...r,loader_hr:num(e)})}/>
            </Row>
            <Row label="Trucking ($/hr)">
              <input type="number" className="input" value={r.trucking_hr} onChange={e=>setR({...r,trucking_hr:num(e)})}/>
            </Row>
            <Row label="Under-slab stone ($/yd³)">
              <input type="number" className="input" value={r.base_stone_yd3} onChange={e=>setR({...r,base_stone_yd3:num(e)})}/>
            </Row>
            <Row label="Drain pipe ($/ft)">
              <input type="number" className="input" value={r.drain_pipe_per_ft} onChange={e=>setR({...r,drain_pipe_per_ft:num(e)})}/>
            </Row>
            <Row label="Drain gravel ($/yd³)">
              <input type="number" className="input" value={r.drain_gravel_yd3} onChange={e=>setR({...r,drain_gravel_yd3:num(e)})}/>
            </Row>
            <Row label="Dump fee ($/yd³)">
              <input type="number" className="input" value={r.dump_fee_yd3} onChange={e=>setR({...r,dump_fee_yd3:num(e)})}/>
            </Row>
          </Card>

          <Card title="Under-slab & Perimeter Drain">
            <Row label="Under-slab stone (ft)">
              <input type="number" step="0.05" className="input" value={x.base_stone_thk_ft ?? 0} onChange={e=>setX({...x,base_stone_thk_ft:num(e)})}/>
            </Row>
            <Row label="Drain length (ft)">
              <input type="number" className="input" value={x.perimeter_drain_len_ft ?? 0} onChange={e=>setX({...x,perimeter_drain_len_ft:num(e)})}/>
            </Row>
            <Row label="Drain trench width (ft)">
              <input type="number" step="0.1" className="input" value={x.drain_trench_width_ft ?? 0} onChange={e=>setX({...x,drain_trench_width_ft:num(e)})}/>
            </Row>
            <Row label="Drain trench depth (ft)">
              <input type="number" step="0.1" className="input" value={x.drain_trench_depth_ft ?? 0} onChange={e=>setX({...x,drain_trench_depth_ft:num(e)})}/>
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

          {/* Client info (for proposal) */}
          <Card title="Client Info">
            <Row label="Name">
              <input className="input" value={client.name} onChange={(e)=>setClient({...client, name: e.target.value})}/>
            </Row>
            <Row label="Phone">
              <input className="input" value={client.phone} onChange={(e)=>setClient({...client, phone: e.target.value})}/>
            </Row>
            <Row label="Email">
              <input className="input" value={client.email} onChange={(e)=>setClient({...client, email: e.target.value})}/>
            </Row>
            <Row label="Address (line)">
              <input className="input" placeholder="123 Main St" onBlur={(e)=>setClient({...client, addressLines:[e.target.value]})}/>
            </Row>
            <Row label="Project Addr (line)">
              <input className="input" placeholder="Project site address" onBlur={(e)=>setClient({...client, projectAddressLines:[e.target.value]})}/>
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
              <KV k="Excavation pad (ft)" v={`${calc.L_exc_ft.toFixed(1)} × ${calc.W_exc_ft.toFixed(1)}`} />
              <KV k="Pad area (ft²)" v={`${Math.round(calc.A_pad_ft2).toLocaleString()}`} />
              <KV k="Box volume (yd³)" v={`${calc.V_box_yd3.toFixed(1)}`} />
              <KV k="Ramp volume (yd³)" v={`${calc.V_ramp_yd3.toFixed(1)}`} />
              <KV k="Topsoil strip (yd³)" v={`${calc.V_strip_yd3.toFixed(1)}`} />
              <KV k="Excavation total (yd³)" v={`${calc.V_exc_total_yd3.toFixed(1)}`} />

              <KV k="Haul-off (yd³)" v={`${calc.V_haul_yd3.toFixed(1)}`} />
              <KV k="Trips" v={`${calc.trips}`} />
              <KV k="Trucking hours" v={`${calc.hrs_truck.toFixed(2)} h`} />

              <KV k="Excavator hours" v={`${calc.dig_h.toFixed(2)} h`} />
              <KV k="Dozer hours" v={`${calc.dozer_h.toFixed(2)} h`} />
              <KV k="Loader hours" v={`${calc.load_h.toFixed(2)} h`} />

              <KV k="Under-slab stone (yd³)" v={`${calc.V_base_stone_yd3.toFixed(1)}`} />
              <KV k="Drain gravel (yd³)" v={`${calc.V_drain_gravel_yd3.toFixed(1)}`} />
              <KV k="Drain length (ft)" v={`${calc.drain_len_ft.toFixed(0)} ft`} />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <KV k="Materials cost" v={currency(calc.materials)} />
              <KV k="Trucking cost" v={currency(calc.cost_truck)} />
              <KV k="Equipment cost" v={currency(calc.cost_excavator + calc.cost_dozer + calc.cost_loader)} />
              <KV k="Dump fees" v={currency(calc.cost_dump_fees)} />
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
                <li>Materials: {(sMat*100).toFixed(0)}%</li>
                <li>Trucking: {(sTrk*100).toFixed(0)}%</li>
                <li>Equipment: {(sEqp*100).toFixed(0)}%</li>
              </ul>
            </div>
          </Card>

          <Card title="Assumptions (auto-print on quote)">
            <ul className="list-disc ml-5 text-sm">
              <li>Excavation to bottom of footing depth {v.depth_ft} ft with overdig {v.overdig_ft} ft each side; ramp {v.ramp_len_ft}×{v.ramp_width_ft} ft wedge.</li>
              <li>Haul-off {Math.round(v.haul_off_fraction*100)}% of spoils; truck {v.truck_capacity_yd3} yd³; RT haul {v.haul_round_trip_min} min.</li>
              <li>Under-slab stone {(x.base_stone_thk_ft ?? 0)} ft; perimeter drain length {(x.perimeter_drain_len_ft ?? 2*(v.L_in_ft+v.W_in_ft)).toFixed(0)} ft.</li>
              <li>Overhead {(overheadPct*100).toFixed(0)}%, Contingency {(contingencyPct*100).toFixed(0)}%, Profit {(profitMargin*100).toFixed(0)}%. Permits listed separately.</li>
            </ul>
          </Card>

          <Card title="Inclusions / Exclusions (draft)">
            <p className="text-sm">
              <b>Inclusions:</b> excavation with overdig and ramp, on-site shaping, hauling as noted, under-slab stone and/or perimeter drain if listed, mobilization.
            </p>
            <p className="text-sm mt-1">
              <b>Exclusions:</b> rock excavation, dewatering, shoring/bracing, utility relocations, concrete, waterproofing, sump systems, erosion control, permits/fees (listed separately).
            </p>
          </Card>

          {/* Proposal Preview + actions */}
          <Card title="Proposal Preview">
            <div ref={bidRef}>
              <BidPreview
                company={COMPANY}
                client={client}
                meta={{
                  projectName: "Basement Excavation",
                  dateISO: new Date().toISOString(),
                  validDays: 14,
                  // bidNo: "BSM-2025-001",
                  notes: "Quantities, haul, and productivities as calculated above.",
                }}
                pricing={{
                  materials: calc.materials,
                  equipment: calc.cost_excavator + calc.cost_dozer + calc.cost_loader,
                  trucking: calc.cost_truck,
                  extras: calc.extrasUSD || 0,
                  permitFees: permitFees || 0,
                  subtotal: calc.subtotal,
                  overheadPct,
                  contingencyPct,
                  profitMargin,
                  permitPassThrough: true,
                }}
                additionalItems={[
                  { label: "Dump Fees", amount: calc.cost_dump_fees },
                ]}
                scopeBullets={[
                  `Excavate to footing depth ${v.depth_ft} ft with ${v.overdig_ft} ft overdig each side.`,
                  `Ramp ${v.ramp_len_ft}×${v.ramp_width_ft} ft for access; haul-off ≈ ${Math.round(v.haul_off_fraction*100)}% of spoils.`,
                  `Under-slab stone ${(x.base_stone_thk_ft ?? 0)} ft; perimeter drain ${(x.perimeter_drain_len_ft ?? 2*(v.L_in_ft+v.W_in_ft)).toFixed(0)} ft (if listed).`,
                ]}
                inclusions={[
                  "Mobilization and access ramp",
                  "Excavation, shaping, and export per plan",
                  "Trucking & disposal as noted",
                ]}
                exclusions={[
                  "Rock excavation or dewatering",
                  "Shoring/bracing or utility relocations",
                  "Concrete, waterproofing, sump systems",
                  "Permits/fees unless listed",
                ]}
                printId="basement-bid"
              />
            </div>

            <div className="mt-3 no-print">
              <button onClick={downloadPDF} className="rounded-lg border px-3 py-2">
                Download PDF
              </button>
            </div>
          </Card>
        </section>
      </div>

      {/* Print & export CSS */}
      <style jsx global>{`
        /* Hide .no-print elements when exporting to PDF via html2canvas */
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
