// src/lib/calculators/pond.ts

export type PondVars = {
  L_top_ft: number;                  // top length at grade
  W_top_ft: number;                  // top width at grade
  depth_ft: number;                  // max depth
  side_slope_H_per_V: number;        // e.g. 3 means 3H:1V
  haul_off_fraction: number;         // 0..1 fraction of spoils hauled off
  truck_capacity_yd3: number;        // yd³ per truck
  haul_round_trip_min: number;       // minutes
  prod_excavator_yd3_per_hr: number; // yd³/hr
  prod_dozer_yd3_per_hr: number;     // yd³/hr (on-site shaping/embankment)
  prod_loader_yd3_per_hr: number;    // yd³/hr (placing stone/sand)
};

export type PondRates = {
  excavator_hr: number;
  dozer_hr: number;
  loader_hr: number;
  trucking_hr: number;

  // materials
  pipe_per_ft: number;               // overflow pipe supply only ($/ft)
  end_section_each: number;          // headwall/flared end ($/ea)

  sand_yd3: number;                  // beach sand ($/yd³)
  stone_ton: number;                 // decorative stone ($/ton)
  stone_density_ton_per_yd3: number; // e.g. 1.5 t/yd³
  clay_yd3: number;                  // imported clay ($/yd³)
};

export type PondExtras = {
  // overflow pipe
  overflow_pipe_len_ft?: number;
  overflow_pipe_d_in?: number;       // optional, informational

  end_sections_ea?: number;

  // beach
  beach_len_ft?: number;             // shoreline length treated
  beach_width_ft?: number;           // beach width from shore
  beach_thk_ft?: number;             // sand thickness

  // decorative stone ring
  decorative_len_ft?: number;        // perimeter length treated
  decorative_width_ft?: number;      // ring width
  decorative_thk_ft?: number;        // ring thickness

  // rare: clay import (yd³)
  clay_import_yd3?: number;

  // lump-sum extras (conduit, elbows, trash pump rental, etc.)
  extrasUSD?: number;
};

export function pondEstimate(v: PondVars, r: PondRates, x: PondExtras = {}) {
  // Bottom dimensions from side slopes
  const Lb = Math.max(1, v.L_top_ft - 2 * v.side_slope_H_per_V * v.depth_ft);
  const Wb = Math.max(1, v.W_top_ft - 2 * v.side_slope_H_per_V * v.depth_ft);

  const A_top_ft2 = v.L_top_ft * v.W_top_ft;
  const A_bot_ft2 = Lb * Wb;

  // Frustum of a rectangular pyramid: V = h/3 (A1 + A2 + sqrt(A1*A2))
  const V_exc_ft3 =
    v.depth_ft / 3 * (A_top_ft2 + A_bot_ft2 + Math.sqrt(A_top_ft2 * A_bot_ft2));
  const V_exc_yd3 = V_exc_ft3 / 27;

  // Haul-off spoils
  const V_haul_yd3 = Math.max(0, V_exc_yd3 * Math.min(Math.max(v.haul_off_fraction, 0), 1));
  const trips = Math.ceil(V_haul_yd3 / Math.max(1e-6, v.truck_capacity_yd3));
  const hrs_truck = (trips * v.haul_round_trip_min) / 60;

  // Equipment hours
  const dig_h = V_exc_yd3 / Math.max(1e-6, v.prod_excavator_yd3_per_hr);
  const dozer_h = (V_exc_yd3 - V_haul_yd3) / Math.max(1e-6, v.prod_dozer_yd3_per_hr);

  // Volumes for beach & decorative stone (simple boxes)
  const V_beach_yd3 =
    ((x.beach_len_ft ?? 0) * (x.beach_width_ft ?? 0) * (x.beach_thk_ft ?? 0)) / 27;
  const V_stone_yd3 =
    ((x.decorative_len_ft ?? 0) * (x.decorative_width_ft ?? 0) * (x.decorative_thk_ft ?? 0)) / 27;

  // Loader time to place sand + stone
  const load_h = (V_beach_yd3 + V_stone_yd3) / Math.max(1e-6, v.prod_loader_yd3_per_hr);

  // Materials
  const cost_pipe =
    (x.overflow_pipe_len_ft ?? 0) * r.pipe_per_ft +
    (x.end_sections_ea ?? 0) * r.end_section_each;

  const cost_sand = V_beach_yd3 * r.sand_yd3;

  const stone_tons = V_stone_yd3 * r.stone_density_ton_per_yd3;
  const cost_stone = stone_tons * r.stone_ton;

  const cost_clay = (x.clay_import_yd3 ?? 0) * r.clay_yd3;

  const materials =
    cost_pipe + cost_sand + cost_stone + cost_clay;

  const cost_excavator = dig_h * r.excavator_hr;
  const cost_dozer = dozer_h * r.dozer_hr;
  const cost_loader = load_h * r.loader_hr;
  const cost_truck = hrs_truck * r.trucking_hr;

  const extrasUSD = x.extrasUSD ?? 0;

  const subtotal =
    cost_excavator + cost_dozer + cost_loader + cost_truck + materials + extrasUSD;

  return {
    // geometry
    Lb, Wb, A_top_ft2, A_bot_ft2, V_exc_yd3,
    // materials volumes
    V_beach_yd3, V_stone_yd3, stone_tons,
    // logistics
    V_haul_yd3, trips, hrs_truck,
    // hours
    dig_h, dozer_h, load_h,
    // costs
    cost_pipe, cost_sand, cost_stone, cost_clay,
    cost_excavator, cost_dozer, cost_loader, cost_truck,
    materials, extrasUSD,
    // totals
    subtotal,
  };
}
