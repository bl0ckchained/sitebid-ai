// src/lib/calculators/basement.ts

export type BasementVars = {
  // Geometry
  L_in_ft: number;               // interior basement length
  W_in_ft: number;               // interior basement width
  depth_ft: number;              // grade to bottom of footing
  overdig_ft: number;            // working space each side (e.g., 2 ft)

  // Access ramp (triangular prism wedge)
  ramp_len_ft: number;
  ramp_width_ft: number;

  // Site strip (optional display only)
  topsoil_thk_ft: number;

  // Hauling & productivities
  haul_off_fraction: number;     // 0..1 fraction of spoils hauled away
  truck_capacity_yd3: number;
  haul_round_trip_min: number;

  prod_excavator_yd3_per_hr: number;
  prod_dozer_yd3_per_hr: number; // on-site shaping/stockpile/backfill shaping
  prod_loader_yd3_per_hr: number; // placing stone/gravel
};

export type BasementRates = {
  excavator_hr: number;
  dozer_hr: number;
  loader_hr: number;
  trucking_hr: number;

  base_stone_yd3: number;        // under-slab stone ($/yd³)
  drain_pipe_per_ft: number;     // perforated pipe ($/ft)
  drain_gravel_yd3: number;      // pipe trench gravel ($/yd³)

  dump_fee_yd3: number;          // soil disposal/tipping ($/yd³)
};

export type BasementExtras = {
  // Under-slab stone
  base_stone_thk_ft?: number;    // e.g., 0.33 ft (~4")

  // Perimeter drain (optional)
  perimeter_drain_len_ft?: number;      // if 0, no pipe
  drain_trench_width_ft?: number;       // e.g., 1.0 ft
  drain_trench_depth_ft?: number;       // e.g., 0.5 ft

  // Lump sum extras
  extrasUSD?: number;
};

export function basementEstimate(v: BasementVars, r: BasementRates, x: BasementExtras = {}) {
  // Excavation box (interior + overdig each side)
  const L_exc_ft = v.L_in_ft + 2 * v.overdig_ft;
  const W_exc_ft = v.W_in_ft + 2 * v.overdig_ft;

  const A_pad_ft2 = L_exc_ft * W_exc_ft;

  // Rectangular prism for basement box
  const V_box_ft3 = A_pad_ft2 * v.depth_ft;
  const V_box_yd3 = V_box_ft3 / 27;

  // Access ramp as triangular prism: (depth * ramp_len * ramp_width / 2)
  const V_ramp_ft3 = (v.depth_ft * v.ramp_len_ft * v.ramp_width_ft) / 2;
  const V_ramp_yd3 = V_ramp_ft3 / 27;

  // Optional: topsoil strip (pad + ramp footprint), displayed but not costed separately
  const A_strip_ft2 = A_pad_ft2 + v.ramp_len_ft * v.ramp_width_ft;
  const V_strip_yd3 = (A_strip_ft2 * v.topsoil_thk_ft) / 27;

  // Total excavation
  const V_exc_total_yd3 = V_box_yd3 + V_ramp_yd3;

  // Haul-off
  const haul_frac = Math.min(Math.max(v.haul_off_fraction, 0), 1);
  const V_haul_yd3 = V_exc_total_yd3 * haul_frac;

  // Trucking
  const trips = Math.ceil(V_haul_yd3 / Math.max(1e-6, v.truck_capacity_yd3));
  const hrs_truck = (trips * v.haul_round_trip_min) / 60;

  // Equipment hours
  const dig_h = V_exc_total_yd3 / Math.max(1e-6, v.prod_excavator_yd3_per_hr);
  const dozer_h = (V_exc_total_yd3 - V_haul_yd3) / Math.max(1e-6, v.prod_dozer_yd3_per_hr);

  // Materials: under-slab stone
  const V_base_stone_yd3 =
    (v.L_in_ft * v.W_in_ft * (x.base_stone_thk_ft ?? 0)) / 27;

  // Perimeter drain
  const perim_ft = 2 * (v.L_in_ft + v.W_in_ft);
  const drain_len_ft = x.perimeter_drain_len_ft ?? perim_ft; // user can override
  const drain_trench_width_ft = x.drain_trench_width_ft ?? 1.0;
  const drain_trench_depth_ft = x.drain_trench_depth_ft ?? 0.5;
  const V_drain_gravel_yd3 =
    (drain_len_ft * drain_trench_width_ft * drain_trench_depth_ft) / 27;

  // Loader time (placing stone & drain gravel)
  const load_h =
    (V_base_stone_yd3 + V_drain_gravel_yd3) / Math.max(1e-6, v.prod_loader_yd3_per_hr);

  // Costs
  const cost_excavator = dig_h * r.excavator_hr;
  const cost_dozer = dozer_h * r.dozer_hr;
  const cost_loader = load_h * r.loader_hr;
  const cost_truck = hrs_truck * r.trucking_hr;

  const cost_base_stone = V_base_stone_yd3 * r.base_stone_yd3;
  const cost_drain_pipe = (drain_len_ft > 0 ? drain_len_ft : 0) * r.drain_pipe_per_ft;
  const cost_drain_gravel = V_drain_gravel_yd3 * r.drain_gravel_yd3;

  const cost_dump_fees = V_haul_yd3 * r.dump_fee_yd3;

  const materials =
    cost_base_stone + cost_drain_pipe + cost_drain_gravel + cost_dump_fees;

  const extrasUSD = x.extrasUSD ?? 0;

  const subtotal =
    cost_excavator + cost_dozer + cost_loader + cost_truck + materials + extrasUSD;

  return {
    // geometry & volumes
    L_exc_ft, W_exc_ft, A_pad_ft2,
    V_box_yd3, V_ramp_yd3, V_exc_total_yd3, V_strip_yd3,
    // hauling
    V_haul_yd3, trips, hrs_truck,
    // hours
    dig_h, dozer_h, load_h,
    // materials breakdown
    V_base_stone_yd3, V_drain_gravel_yd3, drain_len_ft,
    cost_base_stone, cost_drain_pipe, cost_drain_gravel, cost_dump_fees,
    // costs
    cost_excavator, cost_dozer, cost_loader, cost_truck,
    materials, extrasUSD,
    // subtotal
    subtotal,
  };
}
// ------------------------------------------------------------------------------
// src/lib/calculators/pond.ts
// ---------------------------------------------------------------------------