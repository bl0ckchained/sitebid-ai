// src/app/estimate/new/page.tsx
"use client";

import { useMemo, useState } from "react";
import { drivewayEstimate } from "@/lib/calculators/driveway";

type Vars = {
  L_ft: number; W_ft: number;
  strip_T_ft: number; stone_lift_ft: number;
  stone_density_ton_per_yd3: number;
  compaction_passes: number;
  roller_coverage_ft2_per_hr: number;
  haul_round_trip_min: number;
  truck_capacity_tons: number; truck_load_factor: number;
  prod_excavator_yd3_per_hr: number; prod_loader_yd3_per_hr: number;
};

type Rates = {
  excavator_hr: number; loader_hr: number; roller_hr: number;
  trucking_hr: number; stone_ton: number;
};

function currency(n: number) {
  if (Number.isNaN(n) || !Number.isFinite(n)) return "$0";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export default function NewEstimate() {
  // Defaults you can tweak; these become your “catalog” later
  const [v, setV] = useState<Vars>({
    L_ft: 200, W_ft: 12,
    strip_T_ft: 0.25, stone_lift_ft: 0.5,
    stone_density_ton_per_yd3: 1.5,
    compaction_passes: 3,
    roller_coverage_ft2_per_hr: 12000,
    haul_round_trip_min: 30,
    truck_capacity_tons: 14, truck_load_factor: 0.9,
    prod_excavator_yd3_per_hr: 30, prod_loader_yd3_per_hr: 45,
  });

  const [r, setR] = useState<Rates>({
    excavator_hr: 120, loader_hr: 110, roller_hr: 95,
    trucking_hr: 95, stone_ton: 22,
  });

  // Markups (as fractions). Policy: base = subtotal*(1+oh+cont); total = base/(1 - profit_margin)
  const [overheadPct, setOverheadPct] = useState(0.10);
  const [contingencyPct, setContingencyPct] = useState(0.10);
  const [profitMargin, setProfitMargin] = useState(0.15);

  // Basic validation (client-side). Keep it simple and loud.
  const errors = useMemo(() => {
    const err: string[] = [];
    if (v.L_ft <= 0 || v.W_ft <= 0) err.push("Length and width must be positive.");
    if (v.stone_lift_ft <= 0) err.push("Stone lift must be greater than 0.");
    if (v.truck_capacity_tons <= 0 || v.truck_load_factor <= 0) err.push("Truck capacity and load factor must be positive.");
    if (v.prod_excavator_yd3_per_hr <= 0 || v.prod_loader_yd3_per_hr <= 0) err.push("Productivities must be positive.");
    if (overheadPct < 0 || contingencyPct < 0 || profitMargin < 0 || profitMargin >= 0.95) err.push("Markup values look invalid.");
    return err;
  }, [v, overheadPct, contingencyPct, profitMargin]);

  // Compute
  const calc = useMemo(() => drivewayEstimate(v, r), [v, r]);

  // Guardrails / warnings (domain sanity)
  const warnings = useMemo(() => {
    const w: string[] = [];
    if (v.stone_lift_ft < 0.333) w.push("Stone lift is under 4\"; many driveways need 4–6\" compacted.");
    if (calc.trips > 12) w.push(`Calculated trips = ${calc.trips}. Double-check haul distance or consider larger trucks.`);
    if (v.compaction_passes < 1) w.push("Compaction passes are zero—add passes or expect performance issues.");
    return w;
  }, [v.stone_lift_ft, v.compaction_passes, calc.trips]);

  // Totals
  const base = calc.subtotal * (1 + overheadPct + contingencyPct);
  const total = base / (1 - profitMargin);

  // Sensitivity (very simple: share of subtotal)
  const stoneCost = (calc.tons * r.stone_ton);
  const truckingCost = (calc.hrs_truck * r.trucking_hr);
  const equipCost = calc.subtotal - stoneCost - truckingCost;
  const sStone = stoneCost / Math.max(calc.subtotal, 1);
  const sTruck = truckingCost / Math.max(calc.subtotal, 1);
  const sEquip = equipCost / Math.max(calc.subtotal, 1);

  // Simple input helper
  const num = (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-bold">SiteBid AI — New Driveway Estimate</h1>
      <p className="text-slate-600 mt-1">Parameter in, profit out. Fill a few fields; get a clean price.</p>

      {/* Layout: two columns */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {/* Inputs */}
        <section className="space-y-4">
          <Card title="Dimensions">
            <Row label="Length (ft)">
              <input type="number" className="input" value={v.L_ft} onChange={e => setV({ ...v, L_ft: num(e) })} />
            </Row>
            <Row label="Width (ft)">
              <input type="number" className="input" value={v.W_ft} onChange={e => setV({ ...v, W_ft: num(e) })} />
            </Row>
            <Row label="Topsoil strip (ft)">
              <input type="number" step="0.01" className="input" value={v.strip_T_ft} onChange={e => setV({ ...v, strip_T_ft: num(e) })} />
            </Row>
            <Row label="Stone lift (ft)">
              <input type="number" step="0.01" className="input" value={v.stone_lift_ft} onChange={e => setV({ ...v, stone_lift_ft: num(e) })} />
            </Row>
          </Card>

          <Card title="Production & Haul">
            <Row label="Excavator prod (yd³/hr)">
              <input type="number" className="input" value={v.prod_excavator_yd3_per_hr} onChange={e => setV({ ...v, prod_excavator_yd3_per_hr: num(e) })} />
            </Row>
            <Row label="Loader prod (yd³/hr)">
              <input type="number" className="input" value={v.prod_loader_yd3_per_hr} onChange={e => setV({ ...v, prod_loader_yd3_per_hr: num(e) })} />
            </Row>
            <Row label="Compaction passes">
              <input type="number" className="input" value={v.compaction_passes} onChange={e => setV({ ...v, compaction_passes: num(e) })} />
            </Row>
            <Row label="Roller coverage (ft²/hr)">
              <input type="number" className="input" value={v.roller_coverage_ft2_per_hr} onChange={e => setV({ ...v, roller_coverage_ft2_per_hr: num(e) })} />
            </Row>
            <Row label="Round-trip haul (min)">
              <input type="number" className="input" value={v.haul_round_trip_min} onChange={e => setV({ ...v, haul_round_trip_min: num(e) })} />
            </Row>
            <Row label="Truck cap (tons)">
              <input type="number" className="input" value={v.truck_capacity_tons} onChange={e => setV({ ...v, truck_capacity_tons: num(e) })} />
            </Row>
            <Row label="Load factor (0–1)">
              <input type="number" step="0.01" className="input" value={v.truck_load_factor} onChange={e => setV({ ...v, truck_load_factor: num(e) })} />
            </Row>
            <Row label="Stone density (ton/yd³)">
              <input type="number" step="0.01" className="input" value={v.stone_density_ton_per_yd3} onChange={e => setV({ ...v, stone_density_ton_per_yd3: num(e) })} />
            </Row>
          </Card>

          <Card title="Rates (from your catalog later)">
            <Row label="Excavator ($/hr)">
              <input type="number" className="input" value={r.excavator_hr} onChange={e => setR({ ...r, excavator_hr: num(e) })} />
            </Row>
            <Row label="Loader ($/hr)">
              <input type="number" className="input" value={r.loader_hr} onChange={e => setR({ ...r, loader_hr: num(e) })} />
            </Row>
            <Row label="Roller ($/hr)">
              <input type="number" className="input" value={r.roller_hr} onChange={e => setR({ ...r, roller_hr: num(e) })} />
            </Row>
            <Row label="Trucking ($/hr)">
              <input type="number" className="input" value={r.trucking_hr} onChange={e => setR({ ...r, trucking_hr: num(e) })} />
            </Row>
            <Row label="Stone ($/ton)">
              <input type="number" className="input" value={r.stone_ton} onChange={e => setR({ ...r, stone_ton: num(e) })} />
            </Row>
          </Card>

          <Card title="Markup">
            <Row label="Overhead (%)">
              <input type="number" step="1" className="input" value={overheadPct * 100} onChange={e => setOverheadPct(Number(e.target.value) / 100)} />
            </Row>
            <Row label="Contingency (%)">
              <input type="number" step="1" className="input" value={contingencyPct * 100} onChange={e => setContingencyPct(Number(e.target.value) / 100)} />
            </Row>
            <Row label="Profit margin (%)">
              <input type="number" step="1" className="input" value={profitMargin * 100} onChange={e => setProfitMargin(Number(e.target.value) / 100)} />
            </Row>
          </Card>
        </section>

        {/* Outputs */}
        <section className="space-y-4">
          <Card title="Results">
            {errors.length > 0 && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-700 mb-2">
                <b>Fix these:</b>
                <ul className="list-disc ml-5 mt-1">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </div>
            )}
            {warnings.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 mb-2">
                <b>Heads up:</b>
                <ul className="list-disc ml-5 mt-1">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <KV k="Area" v={`${(v.L_ft * v.W_ft).toLocaleString()} ft²`} />
              <KV k="Strip volume" v={`${calc.V_strip.toFixed(2)} yd³`} />
              <KV k="Stone volume" v={`${calc.V_stone.toFixed(2)} yd³`} />
              <KV k="Stone tons" v={`${calc.tons.toFixed(2)} t`} />
              <KV k="Trips" v={`${calc.trips}`} />
              <KV k="Trucking hours" v={`${calc.hrs_truck.toFixed(2)} h`} />
              <KV k="Excavator hours" v={`${calc.hrs_exc.toFixed(2)} h`} />
              <KV k="Loader hours" v={`${calc.hrs_load.toFixed(2)} h`} />
              <KV k="Compaction hours" v={`${calc.hrs_compact.toFixed(2)} h`} />
              <KV k="Subtotal cost" v={currency(calc.subtotal)} />
              <KV k="Base (OH+Cont)" v={currency(base)} />
              <KV k="Total (with profit)" v={currency(total)} />
            </div>

            <div className="mt-4">
              <h3 className="font-semibold">Sensitivity (share of subtotal)</h3>
              <ul className="list-disc ml-5 text-sm mt-1">
                <li>Stone: {(sStone * 100).toFixed(0)}%</li>
                <li>Trucking: {(sTruck * 100).toFixed(0)}%</li>
                <li>Equipment+Labor: {(sEquip * 100).toFixed(0)}%</li>
              </ul>
            </div>
          </Card>

          <Card title="Assumptions (auto-print on quote)">
            <ul className="list-disc ml-5 text-sm">
              <li>Stone lift {Math.round(v.stone_lift_ft * 12)}″ compacted; density {v.stone_density_ton_per_yd3} t/yd³.</li>
              <li>Haul RT {v.haul_round_trip_min} min; truck {v.truck_capacity_tons} t @ {Math.round(v.truck_load_factor * 100)}% load.</li>
              <li>Compaction {v.compaction_passes} passes; roller coverage {v.roller_coverage_ft2_per_hr.toLocaleString()} ft²/hr.</li>
              <li>Overhead {(overheadPct * 100).toFixed(0)}%, Contingency {(contingencyPct * 100).toFixed(0)}%, Profit {(profitMargin * 100).toFixed(0)}%.</li>
              <li>No dewatering, no utility relocations, access ≥ 10 ft clear.</li>
            </ul>
          </Card>

          <Card title="Inclusions / Exclusions (draft)">
            <p className="text-sm">
              <b>Inclusions:</b> aggregate supply and delivery, compaction, trucking, disposal, mobilization.
            </p>
            <p className="text-sm mt-1">
              <b>Exclusions:</b> rock removal, dewatering, unsuitable subgrade remediation, traffic control beyond noted, permits/fees, fabric unless listed.
            </p>
          </Card>
        </section>
      </div>
    </main>
  );
}

// Simple presentational helpers
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
      <span className="w-40">{children}</span>
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
