/* eslint react/no-unescaped-entities: 0 */

"use client";

import { useMemo, useRef, useState } from "react";
import {
  pondEstimate,
  PondVars,
  PondRates,
  PondExtras,
} from "@/lib/calculators/pond";

import BidPreview from "@/components/BidPreview";
import { COMPANY } from "@/lib/company";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

function currency(n: number) {
  if (Number.isNaN(n) || !Number.isFinite(n)) return "$0";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export default function NewPondEstimate() {
  // Defaults
  const [v, setV] = useState<PondVars>({
    L_top_ft: 120,
    W_top_ft: 80,
    depth_ft: 10,
    side_slope_H_per_V: 3, // 3:1
    haul_off_fraction: 0.25,
    truck_capacity_yd3: 12,
    haul_round_trip_min: 30,
    prod_excavator_yd3_per_hr: 40,
    prod_dozer_yd3_per_hr: 60,
    prod_loader_yd3_per_hr: 45,
  });

  const [r, setR] = useState<PondRates>({
    excavator_hr: 140,
    dozer_hr: 130,
    loader_hr: 110,
    trucking_hr: 95,
    pipe_per_ft: 20,
    end_section_each: 95,
    sand_yd3: 35,
    stone_ton: 45,
    stone_density_ton_per_yd3: 1.5,
    clay_yd3: 30,
  });

  const [x, setX] = useState<PondExtras>({
    overflow_pipe_len_ft: 0,
    overflow_pipe_d_in: 4,
    end_sections_ea: 0,
    beach_len_ft: 0,
    beach_width_ft: 0,
    beach_thk_ft: 0,
    decorative_len_ft: 0,
    decorative_width_ft: 0,
    decorative_thk_ft: 0,
    clay_import_yd3: 0,
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
  const [overheadPct, setOverheadPct] = useState(0.1);
  const [contingencyPct, setContingencyPct] = useState(0.1);
  const [profitMargin, setProfitMargin] = useState(0.15);

  // Validation
  const errors = useMemo(() => {
    const e: string[] = [];
    if (v.L_top_ft <= 0 || v.W_top_ft <= 0) e.push("Top length/width must be positive.");
    if (v.depth_ft <= 0) e.push("Depth must be positive.");
    if (v.side_slope_H_per_V < 0) e.push("Side slope H:V must be ≥ 0.");
    if (v.truck_capacity_yd3 <= 0) e.push("Truck capacity must be positive.");
    if (
      v.prod_excavator_yd3_per_hr <= 0 ||
      v.prod_dozer_yd3_per_hr <= 0 ||
      v.prod_loader_yd3_per_hr <= 0
    ) {
      e.push("Productivities must be positive.");
    }
    if (overheadPct < 0 || contingencyPct < 0 || profitMargin < 0 || profitMargin >= 0.95) {
      e.push("Markup values look invalid.");
    }
    return e;
  }, [v, overheadPct, contingencyPct, profitMargin]);

  // Compute
  const calc = useMemo(() => pondEstimate(v, r, x), [v, r, x]);

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
    const Lb_est = v.L_top_ft - 2 * v.side_slope_H_per_V * v.depth_ft;
    const Wb_est = v.W_top_ft - 2 * v.side_slope_H_per_V * v.depth_ft;
    if (Lb_est <= 0 || Wb_est <= 0) {
      w.push("Bottom dimensions would be non-positive given depth & slopes — bottom clipped to 1 ft.");
    }
    if (x.beach_thk_ft && x.beach_thk_ft > 1) {
      w.push('Beach thickness > 12" — double-check sand section.');
    }
    if (x.decorative_thk_ft && x.decorative_thk_ft > 1) {
      w.push('Decorative stone thickness > 12" — double-check detail.');
    }
    return w;
  }, [v, x]);

  // ----- PDF Export (proposal only) -----
  const bidRef = useRef<HTMLDivElement>(null);
  const downloadPDF = async () => {
    const el = bidRef.current;
    if (!el) return;
    document.body.classList.add("exporting"); // hide .no-print while capturing
    await new Promise((r) => setTimeout(r, 0));

    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    document.body.classList.remove("exporting");

    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();

    const mmW = (canvas.width * 25.4) / 96;
    const mmH = (canvas.height * 25.4) / 96;
    const ratio = Math.min(pw / mmW, ph / mmH);
    const imgW = mmW * ratio;
    const imgH = mmH * ratio;

    pdf.addImage(img, "PNG", (pw - imgW) / 2, 10, imgW, imgH);
    pdf.save(`Pond_Bid_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold">SiteBid AI — Pond Estimate</h1>
      <p className="text-slate-600 mt-1">
        Bowl cut (frustum), on-site shaping, optional beach, stone ring, overflow pipe, clay import, and permit fees.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {/* Inputs */}
        <section className="space-y-4">
          <Card title="Geometry & Slopes">
            <Row label="Top length (ft)">
              <input type="number" className="input" value={v.L_top_ft} onChange={(e) => setV({ ...v, L_top_ft: num(e) })} />
            </Row>
            <Row label="Top width (ft)">
              <input type="number" className="input" value={v.W_top_ft} onChange={(e) => setV({ ...v, W_top_ft: num(e) })} />
            </Row>
            <Row label="Depth (ft)">
              <input type="number" step="0.1" className="input" value={v.depth_ft} onChange={(e) => setV({ ...v, depth_ft: num(e) })} />
            </Row>
            <Row label="Side slope (H:1)">
              <input
                type="number"
                step="0.1"
                className="input"
                value={v.side_slope_H_per_V}
                onChange={(e) => setV({ ...v, side_slope_H_per_V: num(e) })}
              />
            </Row>
          </Card>

          <Card title="Productivity & Haul">
            <Row label="Excavator (yd³/hr)">
              <input
                type="number"
                className="input"
                value={v.prod_excavator_yd3_per_hr}
                onChange={(e) => setV({ ...v, prod_excavator_yd3_per_hr: num(e) })}
              />
            </Row>
            <Row label="Dozer (yd³/hr)">
              <input
                type="number"
                className="input"
                value={v.prod_dozer_yd3_per_hr}
                onChange={(e) => setV({ ...v, prod_dozer_yd3_per_hr: num(e) })}
              />
            </Row>
            <Row label="Loader (yd³/hr)">
              <input
                type="number"
                className="input"
                value={v.prod_loader_yd3_per_hr}
                onChange={(e) => setV({ ...v, prod_loader_yd3_per_hr: num(e) })}
              />
            </Row>
            <Row label="Haul-off fraction (0–1)">
              <input
                type="number"
                step="0.05"
                className="input"
                value={v.haul_off_fraction}
                onChange={(e) => setV({ ...v, haul_off_fraction: num(e) })}
              />
            </Row>
            <Row label="Truck cap (yd³)">
              <input
                type="number"
                className="input"
                value={v.truck_capacity_yd3}
                onChange={(e) => setV({ ...v, truck_capacity_yd3: num(e) })}
              />
            </Row>
            <Row label="Round-trip haul (min)">
              <input
                type="number"
                className="input"
                value={v.haul_round_trip_min}
                onChange={(e) => setV({ ...v, haul_round_trip_min: num(e) })}
              />
            </Row>
          </Card>

          <Card title="Rates">
            <Row label="Excavator ($/hr)">
              <input type="number" className="input" value={r.excavator_hr} onChange={(e) => setR({ ...r, excavator_hr: num(e) })} />
            </Row>
            <Row label="Dozer ($/hr)">
              <input type="number" className="input" value={r.dozer_hr} onChange={(e) => setR({ ...r, dozer_hr: num(e) })} />
            </Row>
            <Row label="Loader ($/hr)">
              <input type="number" className="input" value={r.loader_hr} onChange={(e) => setR({ ...r, loader_hr: num(e) })} />
            </Row>
            <Row label="Trucking ($/hr)">
              <input type="number" className="input" value={r.trucking_hr} onChange={(e) => setR({ ...r, trucking_hr: num(e) })} />
            </Row>
          </Card>

          <Card title="Overflow Pipe & Appurtenances">
            <Row label="Pipe length (ft)">
              <input
                type="number"
                className="input"
                value={x.overflow_pipe_len_ft ?? 0}
                onChange={(e) => setX({ ...x, overflow_pipe_len_ft: num(e) })}
              />
            </Row>
            <Row label="Pipe Ø (in)">
              <input
                type="number"
                className="input"
                value={x.overflow_pipe_d_in ?? 0}
                onChange={(e) => setX({ ...x, overflow_pipe_d_in: num(e) })}
              />
            </Row>
            <Row label="End sections (ea)">
              <input
                type="number"
                className="input"
                value={x.end_sections_ea ?? 0}
                onChange={(e) => setX({ ...x, end_sections_ea: num(e) })}
              />
            </Row>
            <Row label="Pipe ($/ft)">
              <input type="number" className="input" value={r.pipe_per_ft} onChange={(e) => setR({ ...r, pipe_per_ft: num(e) })} />
            </Row>
            <Row label="End section ($/ea)">
              <input type="number" className="input" value={r.end_section_each} onChange={(e) => setR({ ...r, end_section_each: num(e) })} />
            </Row>
          </Card>

          <Card title="Beach (Sand)">
            <Row label="Length (ft)">
              <input type="number" className="input" value={x.beach_len_ft ?? 0} onChange={(e) => setX({ ...x, beach_len_ft: num(e) })} />
            </Row>
            <Row label="Width (ft)">
              <input
                type="number"
                className="input"
                value={x.beach_width_ft ?? 0}
                onChange={(e) => setX({ ...x, beach_width_ft: num(e) })}
              />
            </Row>
            <Row label="Thickness (ft)">
              <input
                type="number"
                step="0.1"
                className="input"
                value={x.beach_thk_ft ?? 0}
                onChange={(e) => setX({ ...x, beach_thk_ft: num(e) })}
              />
            </Row>
            <Row label="Sand ($/yd³)">
              <input type="number" className="input" value={r.sand_yd3} onChange={(e) => setR({ ...r, sand_yd3: num(e) })} />
            </Row>
          </Card>

          <Card title="Decorative Stone Ring">
            <Row label="Length (ft)">
              <input
                type="number"
                className="input"
                value={x.decorative_len_ft ?? 0}
                onChange={(e) => setX({ ...x, decorative_len_ft: num(e) })}
              />
            </Row>
            <Row label="Width (ft)">
              <input
                type="number"
                className="input"
                value={x.decorative_width_ft ?? 0}
                onChange={(e) => setX({ ...x, decorative_width_ft: num(e) })}
              />
            </Row>
            <Row label="Thickness (ft)">
              <input
                type="number"
                step="0.1"
                className="input"
                value={x.decorative_thk_ft ?? 0}
                onChange={(e) => setX({ ...x, decorative_thk_ft: num(e) })}
              />
            </Row>
            <Row label="Stone ($/ton)">
              <input type="number" className="input" value={r.stone_ton} onChange={(e) => setR({ ...r, stone_ton: num(e) })} />
            </Row>
            <Row label="Density (t/yd³)">
              <input
                type="number"
                step="0.01"
                className="input"
                value={r.stone_density_ton_per_yd3}
                onChange={(e) => setR({ ...r, stone_density_ton_per_yd3: num(e) })}
              />
            </Row>
          </Card>

          <Card title="Clay Import (rare)">
            <Row label="Qty (yd³)">
              <input
                type="number"
                className="input"
                value={x.clay_import_yd3 ?? 0}
                onChange={(e) => setX({ ...x, clay_import_yd3: num(e) })}
              />
            </Row>
            <Row label="Clay ($/yd³)">
              <input type="number" className="input" value={r.clay_yd3} onChange={(e) => setR({ ...r, clay_yd3: num(e) })} />
            </Row>
          </Card>

          <Card title="Extras & Permit">
            <Row label="Extras (lump $)">
              <input type="number" className="input" value={x.extrasUSD ?? 0} onChange={(e) => setX({ ...x, extrasUSD: num(e) })} />
            </Row>
            <Row label="Permit fees ($)">
              <input type="number" className="input" value={permitFees} onChange={(e) => setPermitFees(num(e))} />
            </Row>
          </Card>

          <Card title="Markup">
            <Row label="Overhead (%)">
              <input
                type="number"
                step={1}
                className="input"
                value={overheadPct * 100}
                onChange={(e) => setOverheadPct(Number(e.target.value) / 100)}
              />
            </Row>
            <Row label="Contingency (%)">
              <input
                type="number"
                step={1}
                className="input"
                value={contingencyPct * 100}
                onChange={(e) => setContingencyPct(Number(e.target.value) / 100)}
              />
            </Row>
            <Row label="Profit margin (%)">
              <input
                type="number"
                step={1}
                className="input"
                value={profitMargin * 100}
                onChange={(e) => setProfitMargin(Number(e.target.value) / 100)}
              />
            </Row>
          </Card>

          {/* Client info (for proposal) */}
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
                <ul className="list-disc ml-5 mt-1">
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </Banner>
            )}
            {warnings.length > 0 && (
              <Banner tone="amber" title="Heads up:">
                <ul className="list-disc ml-5 mt-1">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </Banner>
            )}

            <div className="grid grid-cols-2 gap-3">
              <KV k="Bottom length (ft)" v={`${calc.Lb.toFixed(1)}`} />
              <KV k="Bottom width (ft)" v={`${calc.Wb.toFixed(1)}`} />
              <KV k="Excavation (yd³)" v={`${calc.V_exc_yd3.toFixed(1)}`} />
              <KV k="Haul-off (yd³)" v={`${calc.V_haul_yd3.toFixed(1)}`} />
              <KV k="Trips" v={`${calc.trips}`} />
              <KV k="Trucking hours" v={`${calc.hrs_truck.toFixed(2)} h`} />

              <KV k="Excavator hours" v={`${calc.dig_h.toFixed(2)} h`} />
              <KV k="Dozer hours" v={`${calc.dozer_h.toFixed(2)} h`} />
              <KV k="Loader hours" v={`${calc.load_h.toFixed(2)} h`} />

              <KV k="Beach sand (yd³)" v={`${calc.V_beach_yd3.toFixed(1)}`} />
              <KV k="Decorative stone (yd³)" v={`${calc.V_stone_yd3.toFixed(1)}`} />
              <KV k="Decorative stone (t)" v={`${calc.stone_tons.toFixed(1)} t`} />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <KV k="Materials cost" v={currency(calc.materials)} />
              <KV k="Trucking cost" v={currency(calc.cost_truck)} />
              <KV
                k="Equipment cost"
                v={currency(calc.cost_excavator + calc.cost_dozer + calc.cost_loader)}
              />
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
                <li>Materials: {(sMat * 100).toFixed(0)}%</li>
                <li>Trucking: {(sTrk * 100).toFixed(0)}%</li>
                <li>Equipment: {(sEqp * 100).toFixed(0)}%</li>
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
                  projectName: "Pond Construction",
                  dateISO: new Date().toISOString(),
                  validDays: 14,
                  notes:
                    "Excavate frustum bowl to design depth and slopes; shape; haul/dispose per calc; optional features as listed.",
                }}
                pricing={{
                  materials: calc.materials,
                  equipment: calc.cost_excavator + calc.cost_dozer + calc.cost_loader,
                  trucking: calc.cost_truck,
                  extras: x.extrasUSD || 0,
                  permitFees: permitFees || 0,
                  subtotal: calc.subtotal,
                  overheadPct,
                  contingencyPct,
                  profitMargin,
                  permitPassThrough: true,
                }}
                scopeBullets={[
                  `Excavate basin to depth ${v.depth_ft} ft, side slopes ${v.side_slope_H_per_V}:1 (approx. bottom ${calc.Lb.toFixed(
                    0
                  )}×${calc.Wb.toFixed(0)} ft).`,
                  `Haul off ~${Math.round(v.haul_off_fraction * 100)}% spoils; on-site shaping/grading.`,
                  ...(x.overflow_pipe_len_ft && x.overflow_pipe_len_ft > 0
                    ? [`Install overflow pipe ${x.overflow_pipe_len_ft} ft @ Ø ${x.overflow_pipe_d_in}" with ${x.end_sections_ea || 0} end sections.`]
                    : []),
                  ...(x.beach_thk_ft && x.beach_thk_ft > 0
                    ? [`Construct beach ${x.beach_len_ft || 0}×${x.beach_width_ft || 0} ft @ ${(x.beach_thk_ft || 0)} ft sand.`]
                    : []),
                  ...(x.decorative_thk_ft && x.decorative_thk_ft > 0
                    ? [
                        `Install decorative stone ring ${x.decorative_len_ft || 0}×${x.decorative_width_ft || 0} ft @ ${
                          x.decorative_thk_ft || 0
                        } ft.`,
                      ]
                    : []),
                  ...(x.clay_import_yd3 && x.clay_import_yd3 > 0
                    ? [`Import clay ${x.clay_import_yd3} yd³ for lining as needed.`]
                    : []),
                ]}
                inclusions={[
                  "Excavation and on-site shaping",
                  "Hauling & disposal as noted",
                  "Mobilization",
                ]}
                exclusions={[
                  "Rock excavation or dewatering",
                  "Erosion control, landscaping, fencing, water fill",
                  "Permits/fees (listed separately)",
                  "Items not specifically described",
                ]}
                printId="pond-bid"
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
              <li>
                Frustum bowl from top {v.L_top_ft}×{v.W_top_ft} ft to bottom ~{calc.Lb.toFixed(0)}×{calc.Wb.toFixed(0)} ft @ depth{" "}
                {v.depth_ft} ft, slopes {v.side_slope_H_per_V}:1.
              </li>
              <li>
                Haul-off fraction {Math.round(v.haul_off_fraction * 100)}%, truck {v.truck_capacity_yd3} yd³, round-trip{" "}
                {v.haul_round_trip_min} min.
              </li>
              <li>
                Optional pipe {x.overflow_pipe_len_ft ?? 0} ft @ Ø {x.overflow_pipe_d_in ?? 0}" with {x.end_sections_ea ?? 0} end
                sections.
              </li>
              <li>
                Beach {x.beach_len_ft ?? 0}×{x.beach_width_ft ?? 0} ft × {(x.beach_thk_ft ?? 0)} ft; decorative stone{" "}
                {x.decorative_len_ft ?? 0}×{x.decorative_width_ft ?? 0} ft × {(x.decorative_thk_ft ?? 0)} ft.
              </li>
              <li>
                Overhead {(overheadPct * 100).toFixed(0)}%, Contingency {(contingencyPct * 100).toFixed(0)}%, Profit{" "}
                {(profitMargin * 100).toFixed(0)}%. Permits listed separately.
              </li>
            </ul>
          </Card>

          <Card title="Inclusions / Exclusions (draft)">
            <p className="text-sm">
              <b>Inclusions:</b> excavation, on-site shaping, hauling as noted, optional pipe, beach/stone if listed, mobilization.
            </p>
            <p className="text-sm mt-1">
              <b>Exclusions:</b> rock excavation, dewatering, utility relocations, erosion control, landscaping, fencing, water fill,
              permits/fees (listed separately), items not specifically described.
            </p>
          </Card>
        </section>
      </div>

      {/* Print/export CSS */}
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

function Banner({
  tone,
  title,
  children,
}: {
  tone: "red" | "amber";
  title: string;
  children: React.ReactNode;
}) {
  const colors = tone === "red" ? "border-red-300 bg-red-50 text-red-700" : "border-amber-300 bg-amber-50 text-amber-900";
  return (
    <div className={`rounded-lg border p-3 mb-2 ${colors}`}>
      <b>{title}</b>
      {children}
    </div>
  );
}
