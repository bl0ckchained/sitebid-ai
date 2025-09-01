"use client";

import { useMemo, useRef, useState } from "react";
import { drivewayEstimate, DrivewayVars, DrivewayRates } from "@/lib/calculators/driveway";
import BidPreview from "@/components/BidPreview";
import { COMPANY } from "@/lib/company";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

function currency(n: number) {
  if (Number.isNaN(n) || !Number.isFinite(n)) return "$0";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export default function NewEstimate() {
  // Defaults (tweak to your region/crew)
  const [v, setV] = useState<DrivewayVars>({
    L_ft: 200, W_ft: 12,
    strip_T_ft: 0.25,                // 3" topsoil
    base_lift_ft: 0.333,             // 4" base
    top_lift_ft: 0.167,              // 2" top (set 0 if single-lift)
    base_density_ton_per_yd3: 1.35,  // 2-3" stone often lighter
    top_density_ton_per_yd3: 1.50,   // 21AA/3/4" minus typical

    strip_method: "dozer",
    dozer_coverage_ft2_per_hr: 8000, // stripping & rough grade
    prod_excavator_yd3_per_hr: 30,
    prod_loader_yd3_per_hr: 45,

    compaction_passes: 0,            // roller often unused; set 0
    roller_coverage_ft2_per_hr: 12000,

    haul_round_trip_min: 30,
    truck_capacity_tons: 14,
    truck_load_factor: 0.9,
  });

  const [r, setR] = useState<DrivewayRates>({
    dozer_hr: 140,
    excavator_hr: 120,
    loader_hr: 110,
    roller_hr: 95,
    trucking_hr: 95,
    base_stone_ton: 21,              // price your #2/#3 base
    top_stone_ton: 22,               // price your 21AA/3/4" minus
  });

  const [extrasUSD, setExtrasUSD] = useState(0);
  const [permitFees, setPermitFees] = useState(0); // pass-through

  // Client info for proposal
  const [client, setClient] = useState({
    name: "",
    phone: "",
    email: "",
    addressLines: [] as string[],
    projectAddressLines: [] as string[],
  });

  // Markups (fractions)
  const [overheadPct, setOverheadPct] = useState(0.10);
  const [contingencyPct, setContingencyPct] = useState(0.10);
  const [profitMargin, setProfitMargin] = useState(0.15);

  // Basic validation
  const errors = useMemo((): string[] => {
    const err: string[] = [];
    if (v.L_ft <= 0 || v.W_ft <= 0) err.push("Length and width must be positive.");
    if (v.base_lift_ft < 0 && v.top_lift_ft <= 0) err.push("At least one stone lift must be > 0.");
    if (v.truck_capacity_tons <= 0 || v.truck_load_factor <= 0) err.push("Truck capacity and load factor must be positive.");
    if (v.strip_method === "dozer" && v.dozer_coverage_ft2_per_hr <= 0) err.push("Dozer coverage must be positive.");
    if (v.strip_method === "excavator" && v.prod_excavator_yd3_per_hr <= 0) err.push("Excavator productivity must be positive.");
    if (v.prod_loader_yd3_per_hr <= 0) err.push("Loader productivity must be positive.");
    if (overheadPct < 0 || contingencyPct < 0 || profitMargin < 0 || profitMargin >= 0.95) err.push("Markup values look invalid.");
    return err;
  }, [v, overheadPct, contingencyPct, profitMargin]);

  // Compute
  const calc = useMemo(() => drivewayEstimate(v, r, extrasUSD), [v, r, extrasUSD]);

  // Guardrails
  const warnings = useMemo(() => {
    const w: string[] = [];
    if (v.top_lift_ft === 0 && v.base_lift_ft < 0.333) w.push("Single-lift under 4\" often underperforms—consider thicker base or a top lift.");
    if (calc.trips > 12) w.push(`Calculated trips = ${calc.trips}. Double-check haul distance or consider larger trucks.`);
    if (v.compaction_passes === 0) w.push("No roller passes selected—ensure tracks/truck tires will achieve compaction you want.");
    return w;
  }, [v.base_lift_ft, v.top_lift_ft, v.compaction_passes, calc.trips]);

  // Totals — permits treated as pass-through AFTER profit
  const base = calc.subtotal * (1 + overheadPct + contingencyPct);
  const total = base / (1 - profitMargin);
  const grandTotal = total + (permitFees || 0);

  // Sensitivity (share of subtotal)
  const stoneCost = calc.cost_base_stone + calc.cost_top_stone;
  const truckingCost = calc.cost_truck;
  const equipCost = calc.subtotal - stoneCost - truckingCost - (calc.extrasUSD || 0);
  const sStone = stoneCost / Math.max(calc.subtotal, 1);
  const sTruck = truckingCost / Math.max(calc.subtotal, 1);
  const sEquip = equipCost / Math.max(calc.subtotal, 1);

  const num = (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value);

  // ----- PDF Export of the proposal -----
  const bidRef = useRef<HTMLDivElement>(null);
  const downloadPDF = async () => {
    const el = bidRef.current;
    if (!el) return;
    document.body.classList.add("exporting"); // hide .no-print while capturing
    await new Promise((r) => setTimeout(r, 0));

    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    document.body.classList.remove("exporting");

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const mmFullWidth = (canvas.width * 25.4) / 96;
    const mmFullHeight = (canvas.height * 25.4) / 96;

    const ratio = Math.min(pageWidth / mmFullWidth, pageHeight / mmFullHeight);
    const imgW = mmFullWidth * ratio;
    const imgH = mmFullHeight * ratio;

    pdf.addImage(imgData, "PNG", (pageWidth - imgW) / 2, 10, imgW, imgH);
    pdf.save(`Driveway_Bid_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold">SiteBid AI — Driveway Estimate</h1>
      <p className="text-slate-600 mt-1">Dozer-first flow, two stone lifts, and extras included.</p>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {/* Inputs */}
        <section className="space-y-4">
          <Card title="Dimensions & Lifts">
            <Row label="Length (ft)"><input type="number" className="input" value={v.L_ft} onChange={e=>setV({...v,L_ft:num(e)})}/></Row>
            <Row label="Width (ft)"><input type="number" className="input" value={v.W_ft} onChange={e=>setV({...v,W_ft:num(e)})}/></Row>
            <Row label="Topsoil strip (ft)"><input type="number" step="0.01" className="input" value={v.strip_T_ft} onChange={e=>setV({...v,strip_T_ft:num(e)})}/></Row>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm font-medium">Base lift (ft)</div>
                <input type="number" step="0.01" className="input mt-1 w-full" value={v.base_lift_ft} onChange={e=>setV({...v,base_lift_ft:num(e)})}/>
              </div>
              <div>
                <div className="text-sm font-medium">Top lift (ft)</div>
                <input type="number" step="0.01" className="input mt-1 w-full" value={v.top_lift_ft} onChange={e=>setV({...v,top_lift_ft:num(e)})}/>
              </div>
              <div>
                <div className="text-sm text-slate-600">Base density (t/yd³)</div>
                <input type="number" step="0.01" className="input mt-1 w-full" value={v.base_density_ton_per_yd3} onChange={e=>setV({...v,base_density_ton_per_yd3:num(e)})}/>
              </div>
              <div>
                <div className="text-sm text-slate-600">Top density (t/yd³)</div>
                <input type="number" step="0.01" className="input mt-1 w-full" value={v.top_density_ton_per_yd3} onChange={e=>setV({...v,top_density_ton_per_yd3:num(e)})}/>
              </div>
            </div>
          </Card>

          <Card title="Permit Fees (pass-through)">
            <Row label="Permit Fees ($)">
              <input type="number" className="input" value={permitFees} onChange={e=>setPermitFees(num(e))}/>
            </Row>
          </Card>

          <Card title="Stripping Method">
            <Row label="Method">
              <select className="input" value={v.strip_method} onChange={e=>setV({...v, strip_method: e.target.value as "dozer"|"excavator"})}>
                <option value="dozer">Dozer (strip & rough grade)</option>
                <option value="excavator">Excavator</option>
              </select>
            </Row>

            {v.strip_method === "dozer" ? (
              <Row label="Dozer coverage (ft²/hr)">
                <input type="number" className="input" value={v.dozer_coverage_ft2_per_hr} onChange={e=>setV({...v,dozer_coverage_ft2_per_hr:num(e)})}/>
              </Row>
            ) : (
              <Row label="Excavator prod (yd³/hr)">
                <input type="number" className="input" value={v.prod_excavator_yd3_per_hr} onChange={e=>setV({...v,prod_excavator_yd3_per_hr:num(e)})}/>
              </Row>
            )}

            <Row label="Loader prod (yd³/hr)">
              <input type="number" className="input" value={v.prod_loader_yd3_per_hr} onChange={e=>setV({...v,prod_loader_yd3_per_hr:num(e)})}/>
            </Row>
          </Card>

          <Card title="Haul & Compaction">
            <Row label="Round-trip haul (min)"><input type="number" className="input" value={v.haul_round_trip_min} onChange={e=>setV({...v,haul_round_trip_min:num(e)})}/></Row>
            <Row label="Truck cap (tons)"><input type="number" className="input" value={v.truck_capacity_tons} onChange={e=>setV({...v,truck_capacity_tons:num(e)})}/></Row>
            <Row label="Load factor (0–1)"><input type="number" step="0.01" className="input" value={v.truck_load_factor} onChange={e=>setV({...v,truck_load_factor:num(e)})}/></Row>
            <Row label="Roller passes (0 = none)"><input type="number" className="input" value={v.compaction_passes} onChange={e=>setV({...v,compaction_passes:num(e)})}/></Row>
            <Row label="Roller coverage (ft²/hr)"><input type="number" className="input" value={v.roller_coverage_ft2_per_hr} onChange={e=>setV({...v,roller_coverage_ft2_per_hr:num(e)})}/></Row>
          </Card>

          <Card title="Rates & Extras">
            <Row label="Dozer ($/hr)"><input type="number" className="input" value={r.dozer_hr} onChange={e=>setR({...r,dozer_hr:num(e)})}/></Row>
            <Row label="Excavator ($/hr)"><input type="number" className="input" value={r.excavator_hr} onChange={e=>setR({...r,excavator_hr:num(e)})}/></Row>
            <Row label="Loader ($/hr)"><input type="number" className="input" value={r.loader_hr} onChange={e=>setR({...r,loader_hr:num(e)})}/></Row>
            <Row label="Roller ($/hr)"><input type="number" className="input" value={r.roller_hr} onChange={e=>setR({...r,roller_hr:num(e)})}/></Row>
            <Row label="Trucking ($/hr)"><input type="number" className="input" value={r.trucking_hr} onChange={e=>setR({...r,trucking_hr:num(e)})}/></Row>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm">Base stone ($/ton)</div>
                <input type="number" className="input mt-1 w-full" value={r.base_stone_ton} onChange={e=>setR({...r,base_stone_ton:num(e)})}/>
              </div>
              <div>
                <div className="text-sm">Top stone ($/ton)</div>
                <input type="number" className="input mt-1 w-full" value={r.top_stone_ton} onChange={e=>setR({...r,top_stone_ton:num(e)})}/>
              </div>
            </div>

            <Row label="Extras ($)">
              <input type="number" className="input" value={extrasUSD} onChange={e=>setExtrasUSD(num(e))}/>
            </Row>
          </Card>

          {/* Client info for proposal */}
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
              <KV k="Area" v={`${(v.L_ft*v.W_ft).toLocaleString()} ft²`} />
              <KV k="Strip volume" v={`${calc.V_strip_yd3.toFixed(2)} yd³`} />

              <KV k="Base vol" v={`${calc.V_base_yd3.toFixed(2)} yd³`} />
              <KV k="Top vol" v={`${calc.V_top_yd3.toFixed(2)} yd³`} />
              <KV k="Stone total" v={`${calc.V_stone_yd3.toFixed(2)} yd³`} />

              <KV k="Base tons" v={`${calc.tons_base.toFixed(2)} t`} />
              <KV k="Top tons" v={`${calc.tons_top.toFixed(2)} t`} />
              <KV k="Trips" v={`${calc.trips}`} />

              <KV k="Dozer hours" v={`${calc.hrs_dozer.toFixed(2)} h`} />
              <KV k="Excavator hours" v={`${calc.hrs_exc.toFixed(2)} h`} />
              <KV k="Loader hours" v={`${calc.hrs_load.toFixed(2)} h`} />
              <KV k="Trucking hours" v={`${calc.hrs_truck.toFixed(2)} h`} />
              <KV k="Roller hours" v={`${calc.hrs_compact.toFixed(2)} h`} />

              <KV k="Stone cost" v={currency(calc.cost_base_stone + calc.cost_top_stone)} />
              <KV k="Trucking cost" v={currency(calc.cost_truck)} />
              <KV k="Equipment cost" v={currency(calc.cost_dozer + calc.cost_exc + calc.cost_loader + calc.cost_roller)} />
              <KV k="Extras" v={currency(calc.extrasUSD || 0)} />
              <KV k="Subtotal" v={currency(calc.subtotal)} />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <KV k="Base (OH+Cont)" v={currency(base)} />
              <KV k="Total (with profit)" v={currency(total)} />
              <KV k="Permit fees (pass-through)" v={currency(permitFees || 0)} />
              <KV k="Grand Total" v={currency(grandTotal)} />
            </div>

            <div className="mt-4">
              <h3 className="font-semibold">Sensitivity (share of subtotal)</h3>
              <ul className="list-disc ml-5 text-sm mt-1">
                <li>Stone: {(sStone*100).toFixed(0)}%</li>
                <li>Trucking: {(sTruck*100).toFixed(0)}%</li>
                <li>Equipment+Labor: {(sEquip*100).toFixed(0)}%</li>
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
                  projectName: "Driveway Construction",
                  dateISO: new Date().toISOString(),
                  validDays: 14,
                  notes: "Topsoil strip, stone base/top, haul and shaping as calculated.",
                }}
                pricing={{
                  materials: stoneCost,
                  equipment: calc.cost_dozer + calc.cost_exc + calc.cost_loader + calc.cost_roller,
                  trucking: calc.cost_truck,
                  extras: extrasUSD || 0,
                  permitFees: permitFees || 0,
                  subtotal: calc.subtotal, // core subtotal (before extras)
                  overheadPct,
                  contingencyPct,
                  profitMargin,
                  permitPassThrough: true,
                }}
                scopeBullets={[
                  `Strip topsoil ~${Math.round(v.strip_T_ft*12)}" using ${v.strip_method}.`,
                  `Place ${Math.round(v.base_lift_ft*12)}" base stone and ${Math.round(v.top_lift_ft*12)}" top stone.`,
                  `Shape/grade, haul/dispose spoils${v.compaction_passes>0 ? `, compact (${v.compaction_passes} passes)` : ""}.`,
                ]}
                inclusions={[
                  "Strip & grade, aggregate supply/placement",
                  "Trucking & disposal",
                  "Mobilization",
                ]}
                exclusions={[
                  "Rock excavation or dewatering",
                  "Unsuitable subgrade remediation",
                  "Permits/fees unless listed",
                  "Geotextile fabric unless listed",
                ]}
                printId="driveway-bid"
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
