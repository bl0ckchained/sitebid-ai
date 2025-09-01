/* eslint react/no-unescaped-entities: 0 */

"use client";

import { useMemo, useRef, useState } from "react";
import {
  septicEstimate,
  SepticVars,
  SepticRates,
  SepticExtras,
  SepticSystemType,
} from "@/lib/calculators/septic";

import BidPreview from "@/components/BidPreview";
import { COMPANY } from "@/lib/company";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

function currency(n: number) {
  if (Number.isNaN(n) || !Number.isFinite(n)) return "$0";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export default function NewSepticEstimate() {
  // Defaults (reasonable starting points)
  const [v, setV] = useState<SepticVars>({
    system_type: "gravel",

    field_total_length_ft: 200,
    trench_width_ft: 3.0,
    field_depth_ft: 2.5,

    bedding_under_pipe_ft: 0.5,
    cover_gravel_over_pipe_ft: 0.5,
    use_fabric: true,

    chamber_unit_length_ft: 4.0,
    chamber_bedding_ft: 0.0,

    perforated_pipe_length_ft: 200,
    solid_pipe_length_ft: 60,
    pipe_d_in: 4,

    tank_exc_L_ft: 10,
    tank_exc_W_ft: 6,
    tank_exc_D_ft: 6,
    d_box_count: 1,
    riser_count: 0,

    haul_off_fraction: 0.6,
    truck_capacity_yd3: 12,
    haul_round_trip_min: 25,

    prod_dig_yd3_per_hr: 28,
    prod_backfill_yd3_per_hr: 40,
    prod_loader_yd3_per_hr: 45,
  });

  const [r, setR] = useState<SepticRates>({
    excavator_hr: 125,
    loader_hr: 110,
    trucking_hr: 95,

    tank_each: 1800,
    d_box_each: 150,
    riser_each: 85,

    gravel_yd3: 45,
    chamber_each: 75,
    perforated_pipe_ft: 2.5,
    solid_pipe_ft: 3.0,
    fabric_sf: 0.45,
    dump_fee_yd3: 8,
  });

  const [x, setX] = useState<SepticExtras>({ extrasUSD: 0 });

  // Permit fees (pass-through, not marked up)
  const [permitFees, setPermitFees] = useState(0);

  // Client info (for proposal)
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
    if (v.field_total_length_ft <= 0) e.push("Field total length must be positive.");
    if (v.trench_width_ft <= 0) e.push("Trench width must be positive.");
    if (v.field_depth_ft <= 0) e.push("Field trench depth must be positive.");
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

  const calc = useMemo(() => septicEstimate(v, r, x), [v, r, x]);

  // Totals (permit is pass-through added after profit)
  const base = calc.subtotal * (1 + overheadPct + contingencyPct);
  const total = base / (1 - profitMargin);
  const grandTotal = total + (permitFees || 0);

  // Sensitivity
  const materialsCost = calc.materials;
  const truckingCost = calc.cost_truck;
  const equipCost = calc.cost_excavator + calc.cost_loader;
  const sMat = materialsCost / Math.max(calc.subtotal, 1);
  const sTrk = truckingCost / Math.max(calc.subtotal, 1);
  const sEqp = equipCost / Math.max(calc.subtotal, 1);

  // Warnings
  const warnings = useMemo(() => {
    const w: string[] = [];
    if (v.system_type === "gravel") {
      if (v.bedding_under_pipe_ft <= 0) w.push("Gravel bedding under pipe is 0 — confirm spec.");
      if (v.cover_gravel_over_pipe_ft <= 0) w.push("No gravel cover above pipe — confirm spec.");
      if (v.use_fabric === false) w.push("Fabric disabled for gravel system — confirm local requirement.");
    } else {
      // chamber
      if (r.chamber_each <= 0) w.push("Chamber unit cost is 0 — enter a value.");
      if (v.chamber_unit_length_ft <= 0) w.push("Chamber unit length must be positive.");
    }
    if (v.pipe_d_in <= 0) w.push("Pipe diameter looks invalid.");
    return w;
  }, [v.system_type, v.bedding_under_pipe_ft, v.cover_gravel_over_pipe_ft, v.use_fabric, r.chamber_each, v.chamber_unit_length_ft, v.pipe_d_in]);

  const num = (e: React.ChangeEvent<HTMLInputElement>) => Number(e.target.value);

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

    // convert px (96dpi) to mm
    const mmW = (canvas.width * 25.4) / 96;
    const mmH = (canvas.height * 25.4) / 96;
    const ratio = Math.min(pw / mmW, ph / mmH);
    const imgW = mmW * ratio;
    const imgH = mmH * ratio;

    pdf.addImage(img, "PNG", (pw - imgW) / 2, 10, imgW, imgH);
    pdf.save(`Septic_Bid_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-bold">SiteBid AI — Septic & Field Bed Estimate</h1>
      <p className="text-slate-600 mt-1">Conventional gravel or chamber system, tank & d-box, bedding, hauling, and permit fees.</p>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {/* Inputs */}
        <section className="space-y-4">
          <Card title="System Type">
            <Row label="Type">
              <select
                className="input"
                value={v.system_type}
                onChange={(e) => setV({ ...v, system_type: e.target.value as SepticSystemType })}
              >
                <option value="gravel">Gravel trench</option>
                <option value="chamber">Chamber</option>
              </select>
            </Row>
          </Card>

          <Card title="Field Geometry">
            <Row label="Field length total (ft)">
              <input type="number" className="input" value={v.field_total_length_ft} onChange={e=>setV({...v,field_total_length_ft:num(e)})}/>
            </Row>
            <Row label="Trench width (ft)">
              <input type="number" step="0.1" className="input" value={v.trench_width_ft} onChange={e=>setV({...v,trench_width_ft:num(e)})}/>
            </Row>
            <Row label="Trench depth (ft)">
              <input type="number" step="0.1" className="input" value={v.field_depth_ft} onChange={e=>setV({...v,field_depth_ft:num(e)})}/>
            </Row>

            {v.system_type === "gravel" ? (
              <>
                <Row label="Bedding under pipe (ft)">
                  <input type="number" step="0.1" className="input" value={v.bedding_under_pipe_ft} onChange={e=>setV({...v,bedding_under_pipe_ft:num(e)})}/>
                </Row>
                <Row label="Gravel over pipe (ft)">
                  <input type="number" step="0.1" className="input" value={v.cover_gravel_over_pipe_ft} onChange={e=>setV({...v,cover_gravel_over_pipe_ft:num(e)})}/>
                </Row>
                <Row label="Use fabric on top">
                  <input type="checkbox" className="h-5 w-5" checked={v.use_fabric} onChange={e=>setV({...v,use_fabric:e.target.checked})}/>
                </Row>
              </>
            ) : (
              <>
                <Row label="Chamber unit length (ft)">
                  <input type="number" step="0.1" className="input" value={v.chamber_unit_length_ft} onChange={e=>setV({...v,chamber_unit_length_ft:num(e)})}/>
                </Row>
                <Row label="Chamber bedding (ft)">
                  <input type="number" step="0.1" className="input" value={v.chamber_bedding_ft} onChange={e=>setV({...v,chamber_bedding_ft:num(e)})}/>
                </Row>
              </>
            )}
          </Card>

          <Card title="Tank & Piping">
            <Row label="Tank exc L (ft)">
              <input type="number" className="input" value={v.tank_exc_L_ft} onChange={e=>setV({...v,tank_exc_L_ft:num(e)})}/>
            </Row>
            <Row label="Tank exc W (ft)">
              <input type="number" className="input" value={v.tank_exc_W_ft} onChange={e=>setV({...v,tank_exc_W_ft:num(e)})}/>
            </Row>
            <Row label="Tank exc D (ft)">
              <input type="number" className="input" value={v.tank_exc_D_ft} onChange={e=>setV({...v,tank_exc_D_ft:num(e)})}/>
            </Row>
            <Row label="D-Box count">
              <input type="number" className="input" value={v.d_box_count} onChange={e=>setV({...v,d_box_count:num(e)})}/>
            </Row>
            <Row label="Riser count">
              <input type="number" className="input" value={v.riser_count} onChange={e=>setV({...v,riser_count:num(e)})}/>
            </Row>
            <Row label="Perforated pipe length (ft)">
              <input type="number" className="input" value={v.perforated_pipe_length_ft} onChange={e=>setV({...v,perforated_pipe_length_ft:num(e)})}/>
            </Row>
            <Row label="Solid pipe length (ft)">
              <input type="number" className="input" value={v.solid_pipe_length_ft} onChange={e=>setV({...v,solid_pipe_length_ft:num(e)})}/>
            </Row>
            <Row label="Pipe OD (in)">
              <input type="number" className="input" value={v.pipe_d_in} onChange={e=>setV({...v,pipe_d_in:num(e)})}/>
            </Row>
          </Card>

          <Card title="Productivity & Haul">
            <Row label="Haul-off fraction (0–1)">
              <input type="number" step="0.05" className="input" value={v.haul_off_fraction} onChange={e=>setV({...v,haul_off_fraction:num(e)})}/>
            </Row>
            <Row label="Truck cap (yd³)">
              <input type="number" className="input" value={v.truck_capacity_yd3} onChange={e=>setV({...v,truck_capacity_yd3:num(e)})}/>
            </Row>
            <Row label="Round-trip haul (min)">
              <input type="number" className="input" value={v.haul_round_trip_min} onChange={e=>setV({...v,haul_round_trip_min:num(e)})}/>
            </Row>
            <Row label="Dig prod (yd³/hr)">
              <input type="number" className="input" value={v.prod_dig_yd3_per_hr} onChange={e=>setV({...v,prod_dig_yd3_per_hr:num(e)})}/>
            </Row>
            <Row label="Backfill prod (yd³/hr)">
              <input type="number" className="input" value={v.prod_backfill_yd3_per_hr} onChange={e=>setV({...v,prod_backfill_yd3_per_hr:num(e)})}/>
            </Row>
            <Row label="Loader prod (yd³/hr)">
              <input type="number" className="input" value={v.prod_loader_yd3_per_hr} onChange={e=>setV({...v,prod_loader_yd3_per_hr:num(e)})}/>
            </Row>
          </Card>

          <Card title="Rates & Fees">
            <Row label="Excavator ($/hr)"><input type="number" className="input" value={r.excavator_hr} onChange={e=>setR({...r,excavator_hr:num(e)})}/></Row>
            <Row label="Loader ($/hr)"><input type="number" className="input" value={r.loader_hr} onChange={e=>setR({...r,loader_hr:num(e)})}/></Row>
            <Row label="Trucking ($/hr)"><input type="number" className="input" value={r.trucking_hr} onChange={e=>setR({...r,trucking_hr:num(e)})}/></Row>

            <Row label="Tank ($/ea)"><input type="number" className="input" value={r.tank_each} onChange={e=>setR({...r,tank_each:num(e)})}/></Row>
            <Row label="D-Box ($/ea)"><input type="number" className="input" value={r.d_box_each} onChange={e=>setR({...r,d_box_each:num(e)})}/></Row>
            <Row label="Riser ($/ea)"><input type="number" className="input" value={r.riser_each} onChange={e=>setR({...r,riser_each:num(e)})}/></Row>

            <Row label="Gravel ($/yd³)"><input type="number" className="input" value={r.gravel_yd3} onChange={e=>setR({...r,gravel_yd3:num(e)})}/></Row>
            <Row label="Chamber ($/ea)"><input type="number" className="input" value={r.chamber_each} onChange={e=>setR({...r,chamber_each:num(e)})}/></Row>
            <Row label="Perforated pipe ($/ft)"><input type="number" className="input" value={r.perforated_pipe_ft} onChange={e=>setR({...r,perforated_pipe_ft:num(e)})}/></Row>
            <Row label="Solid pipe ($/ft)"><input type="number" className="input" value={r.solid_pipe_ft} onChange={e=>setR({...r,solid_pipe_ft:num(e)})}/></Row>
            <Row label="Fabric ($/sf)"><input type="number" className="input" value={r.fabric_sf} onChange={e=>setR({...r,fabric_sf:num(e)})}/></Row>
            <Row label="Dump fee ($/yd³)"><input type="number" className="input" value={r.dump_fee_yd3} onChange={e=>setR({...r,dump_fee_yd3:num(e)})}/></Row>

            <Row label="Extras (lump $)"><input type="number" className="input" value={x.extrasUSD ?? 0} onChange={e=>setX({...x,extrasUSD:num(e)})}/></Row>
            <Row label="Permit fees ($)"><input type="number" className="input" value={permitFees} onChange={e=>setPermitFees(num(e))}/></Row>
          </Card>

          <Card title="Markup">
            <Row label="Overhead (%)"><input type="number" step={1} className="input" value={overheadPct*100} onChange={e=>setOverheadPct(Number(e.target.value)/100)}/></Row>
            <Row label="Contingency (%)"><input type="number" step={1} className="input" value={contingencyPct*100} onChange={e=>setContingencyPct(Number(e.target.value)/100)}/></Row>
            <Row label="Profit margin (%)"><input type="number" step={1} className="input" value={profitMargin*100} onChange={e=>setProfitMargin(Number(e.target.value)/100)}/></Row>
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
                <ul className="list-disc ml-5 mt-1">{errors.map((e,i)=><li key={i}>{e}</li>)}</ul>
              </Banner>
            )}
            {warnings.length > 0 && (
              <Banner tone="amber" title="Heads up:">
                <ul className="list-disc ml-5 mt-1">{warnings.map((w,i)=><li key={i}>{w}</li>)}</ul>
              </Banner>
            )}

            <div className="grid grid-cols-2 gap-3">
              <KV k="System" v={v.system_type === "gravel" ? "Gravel" : "Chamber"} />
              <KV k="Trench width (ft)" v={`${v.trench_width_ft.toFixed(2)}`} />
              <KV k="Field excavation (yd³)" v={`${calc.V_field_exc_yd3.toFixed(2)}`} />
              <KV k="Tank excavation (yd³)" v={`${calc.V_tank_exc_yd3.toFixed(2)}`} />
              <KV k="Total excavation (yd³)" v={`${calc.V_total_exc_yd3.toFixed(2)}`} />

              <KV k="Bedding (yd³)" v={`${calc.V_bedding_yd3.toFixed(2)}`} />
              <KV k="Gravel cover (yd³)" v={`${calc.V_cover_gravel_yd3.toFixed(2)}`} />
              <KV k="Gravel total (yd³)" v={`${calc.V_gravel_total_yd3.toFixed(2)}`} />
              <KV k="Backfill (yd³)" v={`${calc.V_backfill_yd3.toFixed(2)}`} />

              <KV k="Haul-off (yd³)" v={`${calc.V_haul_yd3.toFixed(2)}`} />
              <KV k="Trips" v={`${calc.trips}`} />
              <KV k="Trucking hours" v={`${calc.hrs_truck.toFixed(2)} h`} />

              <KV k="Dig hours" v={`${calc.dig_h.toFixed(2)} h`} />
              <KV k="Backfill hours" v={`${calc.backfill_h.toFixed(2)} h`} />
              <KV k="Loader hours" v={`${calc.loader_h.toFixed(2)} h`} />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <KV k="Tank" v={currency(calc.cost_tank)} />
              <KV k="D-Box" v={currency(calc.cost_dbox)} />
              <KV k="Risers" v={currency(calc.cost_risers)} />
              <KV k="Chambers" v={currency(calc.cost_chambers)} />
              <KV k="Gravel" v={currency(calc.cost_gravel)} />
              <KV k="Perforated pipe" v={currency(calc.cost_perforated)} />
              <KV k="Solid pipe" v={currency(calc.cost_solid)} />
              <KV k="Fabric" v={currency(calc.cost_fabric)} />
              <KV k="Dump fees" v={currency(calc.cost_dump_fees)} />
              <KV k="Equipment" v={currency(calc.cost_excavator + calc.cost_loader)} />
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
                <li>Materials: {(sMat*100).toFixed(0)}%</li>
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
                  projectName: v.system_type === "gravel" ? "Septic System (Gravel Trench)" : "Septic System (Chamber)",
                  dateISO: new Date().toISOString(),
                  validDays: 14,
                  notes:
                    "Install complete septic system per plan/spec; excavation, bedding/chambers or gravel, tank & d-box set, piping, backfill, and restoration as noted.",
                }}
                pricing={{
                  materials: calc.materials,
                  equipment: calc.cost_excavator + calc.cost_loader,
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
                  v.system_type === "gravel"
                    ? `Gravel trench system: bedding ${v.bedding_under_pipe_ft} ft under pipe, ${v.cover_gravel_over_pipe_ft} ft cover${v.use_fabric ? ", fabric on top" : ""}.`
                    : `Chamber system: ${calc.chamber_units} units @ ${v.chamber_unit_length_ft} ft each; bedding ${v.chamber_bedding_ft} ft.`,
                  `Field: ${v.field_total_length_ft} ft total length × ${v.trench_width_ft} ft wide × ${v.field_depth_ft} ft depth.`,
                  `Tank excavation ~${v.tank_exc_L_ft} × ${v.tank_exc_W_ft} × ${v.tank_exc_D_ft} ft. D-box: ${v.d_box_count}, risers: ${v.riser_count}.`,
                  `Piping: perforated ${v.perforated_pipe_length_ft} ft, solid ${v.solid_pipe_length_ft} ft @ Ø ${v.pipe_d_in}"`,
                  `Haul-off ~${Math.round(v.haul_off_fraction*100)}% of spoils; truck ${v.truck_capacity_yd3} yd³; RT haul ${v.haul_round_trip_min} min.`,
                ]}
                inclusions={[
                  "Excavation, bedding/chambers or gravel per spec",
                  "Tank & d-box set and connection",
                  "Piping, backfill, shaping",
                  "Trucking/disposal as calculated",
                  "Mobilization",
                ]}
                exclusions={[
                  "Rock excavation or groundwater control/dewatering",
                  "Shoring/boxes, perc tests/design/permits",
                  "Electrical for pumps/alarms if required",
                  "Traffic control beyond noted",
                  "Items not specifically described",
                ]}
                printId="septic-bid"
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
              <li>{v.system_type === "gravel"
                ? `Gravel bedding ${v.bedding_under_pipe_ft} ft under pipe, ${v.cover_gravel_over_pipe_ft} ft cover${v.use_fabric ? ", fabric on top" : ""}.`
                : `Chamber units ${calc.chamber_units} @ ${v.chamber_unit_length_ft} ft each; bedding ${v.chamber_bedding_ft} ft.`}
              </li>
              <li>Field length {v.field_total_length_ft} ft × width {v.trench_width_ft} ft × depth {v.field_depth_ft} ft.</li>
              <li>Tank excavation {v.tank_exc_L_ft} × {v.tank_exc_W_ft} × {v.tank_exc_D_ft} ft.</li>
              <li>Haul-off {Math.round(v.haul_off_fraction*100)}% of spoils; truck {v.truck_capacity_yd3} yd³; RT {v.haul_round_trip_min} min.</li>
              <li>Overhead {(overheadPct*100).toFixed(0)}%, Contingency {(contingencyPct*100).toFixed(0)}%, Profit {(profitMargin*100).toFixed(0)}%. Permit fees listed separately (no markup).</li>
            </ul>
          </Card>

          <Card title="Inclusions / Exclusions (draft)">
            <p className="text-sm">
              <b>Inclusions:</b> excavation, bedding/gravel (as applicable), tank & d-box set, piping, backfill/shape, trucking/disposal, chambers or gravel per spec, mobilization.
            </p>
            <p className="text-sm mt-1">
              <b>Exclusions:</b> rock excavation, groundwater control/dewatering, shoring/boxes, perc tests/design, electrical for pumps/alarms, traffic control beyond noted, permits/fees (listed separately).
            </p>
          </Card>
        </section>
      </div>

      {/* Print/export CSS for PDF capture (hide buttons, etc.) */}
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
