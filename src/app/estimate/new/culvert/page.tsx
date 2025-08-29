"use client";

import { useMemo, useState } from "react";
import { culvertEstimate } from "@/lib/calculators/culvert";

function currency(n: number) {
  if (Number.isNaN(n) || !Number.isFinite(n)) return "$0";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export default function NewCulvertEstimate() {
  // Vars (geom/productivity/logistics)
  const [v, setV] = useState({
    L_pipe_ft: 24,
    D_in: 15,
    invert_depth_ft: 3,
    cover_ft: 1.5,
    bedding_t_ft: 0.5,
    side_clearance_ft: 0.5,
    haul_round_trip_min: 22,
    truck_capacity_yd3: 10,
    prod_dig_yd3_per_hr: 25,
    prod_backfill_yd3_per_hr: 35,
  });

  // Rates (materials/equipment)
  const [r, setR] = useState({
    excavator_hr: 120,
    trucking_hr: 95,
    bedding_yd3: 40,
    pipe_per_ft: 20,
    end_section_each: 95,
    asphalt_sf: 6,
    riprap_yd3: 65,
  });

  // Optional extras/toggles
  const [endSections, setEndSections] = useState(2);      // 0, 1, or 2
  const [asphaltSF, setAsphaltSF] = useState(80);         // 0 = none
  const [riprapArea, setRiprapArea] = useState(60);       // 0 = none
  const [riprapThkFt, setRiprapThkFt] = useState(0.5);    // in feet (0 = none)
  const [extrasUSD, setExtrasUSD] = useState(0);          // lump-sum extras

  // Markups (fractions)
  const [overheadPct, setOverheadPct] = useState(0.10);
  const [contingencyPct, setContingencyPct] = useState(0.10);
  const [profitMargin, setProfitMargin] = useState(0.15);

  // Validation
  const errors = useMemo(() => {
    const e: string[] = [];
    if (v.L_pipe_ft <= 0) e.push("Pipe length must be positive.");
    if (v.D_in <= 0) e.push("Pipe diameter must be positive.");
    if (v.invert_depth_ft <= 0) e.push("Invert depth must be positive.");
    if (v.bedding_t_ft <= 0) e.push("Bedding thickness must be positive.");
    if (v.side_clearance_ft <= 0) e.push("Side clearance must be positive.");
    if (v.truck_capacity_yd3 <= 0) e.push("Truck capacity must be positive.");
    if (v.prod_dig_yd3_per_hr <= 0 || v.prod_backfill_yd3_per_hr <= 0) e.push("Productivities must be positive.");
    if (overheadPct < 0 || contingencyPct < 0 || profitMargin < 0 || profitMargin >= 0.95) e.push("Markup values look invalid.");
    return e;
  }, [v, overheadPct, contingencyPct, profitMargin]);

  // Compute (pass optionals via extras object)
  const calc = useMemo(() => {
    return culvertEstimate(
      v,
      r,
      {
        end_sections_ea: endSections,
        asphalt_restore_sf: asphaltSF,
        riprap_area_ft2: riprapArea,
        riprap_thickness_ft: riprapThkFt,
      }
    );
  }, [v, r, endSections, asphaltSF, riprapArea, riprapThkFt]);

  const subtotalPlusExtras = calc.subtotal + (extrasUSD || 0);
  const base = subtotalPlusExtras * (1 + overheadPct + contingencyPct);
  const total = base / (1 - profitMargin);

  // Guardrails
  const warnings = useMemo(() => {
    const w: string[] = [];
    if (v.cover_ft < 1.0) w.push("Cover < 12\" — verify manufacturer minimum for this pipe.");
    if (asphaltSF === 0) w.push("Asphalt restoration set to 0 — confirm no pavement impacted.");
    if (endSections === 0) w.push("No end sections selected — confirm headwalls/aprons are not required.");
    return w;
  }, [v.cover_ft, asphaltSF, endSections]);

  // Sensitivity (materials vs trucking vs equipment)
  const truckingCost = calc.hrs_truck * r.trucking_hr;
  const materialsCost = calc.materials;
  const equipCost = (calc.dig_h + calc.backfill_h) * r.excavator_hr;
  const sMat = materialsCost / Math.max(calc.subtotal, 1);
  const sTrk = truckingCost / Math.max(calc.subtotal, 1);
  const sEqp = equipCost / Math.max(calc.subtotal, 1);

  const num = (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold">SiteBid AI — Culvert Estimate</h1>
      <p className="text-slate-600 mt-1">Trench geometry, bedding, restoration, and extras—all in one pass.</p>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {/* Inputs */}
        <section className="space-y-4">
          <Card title="Pipe & Trench">
            <Row label="Pipe length (ft)"><input type="number" className="input" value={v.L_pipe_ft} onChange={e=>setV({...v,L_pipe_ft:num(e)})}/></Row>
            <Row label="Diameter (in)"><input type="number" className="input" value={v.D_in} onChange={e=>setV({...v,D_in:num(e)})}/></Row>
            <Row label="Invert depth (ft)"><input type="number" step="0.1" className="input" value={v.invert_depth_ft} onChange={e=>setV({...v,invert_depth_ft:num(e)})}/></Row>
            <Row label="Cover (ft)"><input type="number" step="0.1" className="input" value={v.cover_ft} onChange={e=>setV({...v,cover_ft:num(e)})}/></Row>
            <Row label="Bedding thickness (ft)"><input type="number" step="0.1" className="input" value={v.bedding_t_ft} onChange={e=>setV({...v,bedding_t_ft:num(e)})}/></Row>
            <Row label="Side clearance (ft)"><input type="number" step="0.1" className="input" value={v.side_clearance_ft} onChange={e=>setV({...v,side_clearance_ft:num(e)})}/></Row>
          </Card>

          <Card title="Productivity & Haul">
            <Row label="Dig prod (yd³/hr)"><input type="number" className="input" value={v.prod_dig_yd3_per_hr} onChange={e=>setV({...v,prod_dig_yd3_per_hr:num(e)})}/></Row>
            <Row label="Backfill prod (yd³/hr)"><input type="number" className="input" value={v.prod_backfill_yd3_per_hr} onChange={e=>setV({...v,prod_backfill_yd3_per_hr:num(e)})}/></Row>
            <Row label="Truck capacity (yd³)"><input type="number" className="input" value={v.truck_capacity_yd3} onChange={e=>setV({...v,truck_capacity_yd3:num(e)})}/></Row>
            <Row label="Round-trip haul (min)"><input type="number" className="input" value={v.haul_round_trip_min} onChange={e=>setV({...v,haul_round_trip_min:num(e)})}/></Row>
          </Card>

          <Card title="Rates & Extras">
            <Row label="Excavator ($/hr)"><input type="number" className="input" value={r.excavator_hr} onChange={e=>setR({...r,excavator_hr:num(e)})}/></Row>
            <Row label="Trucking ($/hr)"><input type="number" className="input" value={r.trucking_hr} onChange={e=>setR({...r,trucking_hr:num(e)})}/></Row>
            <Row label="Bedding ($/yd³)"><input type="number" className="input" value={r.bedding_yd3} onChange={e=>setR({...r,bedding_yd3:num(e)})}/></Row>
            <Row label="Pipe ($/ft)"><input type="number" className="input" value={r.pipe_per_ft} onChange={e=>setR({...r,pipe_per_ft:num(e)})}/></Row>
            <Row label="End section ($/ea)"><input type="number" className="input" value={r.end_section_each} onChange={e=>setR({...r,end_section_each:num(e)})}/></Row>
            <Row label="Asphalt ($/sf)"><input type="number" className="input" value={r.asphalt_sf} onChange={e=>setR({...r,asphalt_sf:num(e)})}/></Row>
            <Row label="Riprap ($/yd³)"><input type="number" className="input" value={r.riprap_yd3} onChange={e=>setR({...r,riprap_yd3:num(e)})}/></Row>
            <Row label="Extras (lump sum $)"><input type="number" className="input" value={extrasUSD} onChange={e=>setExtrasUSD(num(e))}/></Row>
          </Card>

          <Card title="Restoration & Appurtenances">
            <Row label="End sections (ea)">
              <input type="number" className="input" value={endSections} onChange={e=>setEndSections(num(e))}/>
            </Row>
            <Row label="Asphalt restore (sf)">
              <input type="number" className="input" value={asphaltSF} onChange={e=>setAsphaltSF(num(e))}/>
            </Row>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm">Riprap area (ft²)</div>
                <input type="number" className="input mt-1 w-full" value={riprapArea} onChange={e=>setRiprapArea(num(e))}/>
              </div>
              <div>
                <div className="text-sm">Riprap thickness (ft)</div>
                <input type="number" step="0.1" className="input mt-1 w-full" value={riprapThkFt} onChange={e=>setRiprapThkFt(num(e))}/>
              </div>
            </div>
          </Card>

          <Card title="Markup">
            <Row label="Overhead (%)"><input type="number" step="1" className="input" value={overheadPct*100} onChange={e=>setOverheadPct(Number(e.target.value)/100)}/></Row>
            <Row label="Contingency (%)"><input type="number" step="1" className="input" value={contingencyPct*100} onChange={e=>setContingencyPct(Number(e.target.value)/100)}/></Row>
            <Row label="Profit margin (%)"><input type="number" step="1" className="input" value={profitMargin*100} onChange={e=>setProfitMargin(Number(e.target.value)/100)}/></Row>
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
              <KV k="Trench width (ft)" v={( (v.D_in/12) + 2*v.side_clearance_ft ).toFixed(2)} />
              <KV k="Excavation (yd³)" v={calc.V_exc.toFixed(2)} />
              <KV k="Bedding (yd³)" v={calc.V_bed.toFixed(2)} />
              <KV k="Backfill (yd³)" v={calc.V_backfill.toFixed(2)} />

              <KV k="Trips" v={`${calc.trips}`} />
              <KV k="Trucking hours" v={`${calc.hrs_truck.toFixed(2)} h`} />
              <KV k="Dig hours" v={`${calc.dig_h.toFixed(2)} h`} />
              <KV k="Backfill hours" v={`${calc.backfill_h.toFixed(2)} h`} />

              <KV k="Materials cost" v={currency(calc.materials)} />
              <KV k="Trucking cost" v={currency(truckingCost)} />
              <KV k="Equipment cost" v={currency(equipCost)} />

              <KV k="Extras" v={currency(extrasUSD || 0)} />
              <KV k="Subtotal" v={currency(subtotalPlusExtras)} />
              <KV k="Base (OH+Cont)" v={currency(base)} />
              <KV k="Total (with profit)" v={currency(total)} />
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
              <li>Pipe {v.D_in}" × {v.L_pipe_ft} ft; invert {v.invert_depth_ft} ft; cover {v.cover_ft} ft.</li>
              <li>Bedding {v.bedding_t_ft} ft; side clearance {v.side_clearance_ft} ft each side.</li>
              <li>End sections {endSections} ea; asphalt restore {asphaltSF} sf; riprap {riprapArea} ft² × {riprapThkFt} ft.</li>
              <li>Haul RT {v.haul_round_trip_min} min; truck {v.truck_capacity_yd3} yd³.</li>
              <li>Overhead {(overheadPct*100).toFixed(0)}%, Contingency {(contingencyPct*100).toFixed(0)}%, Profit {(profitMargin*100).toFixed(0)}%.</li>
            </ul>
          </Card>

          <Card title="Inclusions / Exclusions (draft)">
            <p className="text-sm">
              <b>Inclusions:</b> trench excavation, bedding, pipe placement, backfill/compaction, trucking/disposal, end sections (if listed), restoration (if listed), mobilization.
            </p>
            <p className="text-sm mt-1">
              <b>Exclusions:</b> rock excavation, dewatering, utility relocations, traffic control beyond noted, permits/fees, unsuitable subgrade remediation, paving beyond listed areas.
            </p>
          </Card>
        </section>
      </div>
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
