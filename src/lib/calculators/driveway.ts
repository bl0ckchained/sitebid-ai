// src/lib/calculators/driveway.ts
export type DrivewayVars = {
  L_ft: number; W_ft: number;
  strip_T_ft: number;
  base_lift_ft: number;           // 2–3" stone base (compacted)
  top_lift_ft: number;            // finer top lift (can be 0)
  base_density_ton_per_yd3: number;
  top_density_ton_per_yd3: number;

  strip_method: "dozer" | "excavator";
  dozer_coverage_ft2_per_hr: number;  // area/hr stripping & rough grade
  prod_excavator_yd3_per_hr: number;  // if you prefer excavator for strip
  prod_loader_yd3_per_hr: number;

  compaction_passes: number;          // set 0 if not using roller
  roller_coverage_ft2_per_hr: number;

  haul_round_trip_min: number;
  truck_capacity_tons: number;
  truck_load_factor: number;
};

export type DrivewayRates = {
  dozer_hr: number;
  excavator_hr: number;
  loader_hr: number;
  roller_hr: number;
  trucking_hr: number;
  base_stone_ton: number;
  top_stone_ton: number;
};

export function drivewayEstimate(
  v: DrivewayVars,
  r: DrivewayRates,
  extrasUSD = 0
) {
  const A_ft2 = v.L_ft * v.W_ft;

  // Volumes
  const V_strip_yd3 = (A_ft2 * v.strip_T_ft) / 27;
  const V_base_yd3 = (A_ft2 * v.base_lift_ft) / 27;
  const V_top_yd3  = (A_ft2 * v.top_lift_ft) / 27;
  const V_stone_yd3 = V_base_yd3 + V_top_yd3;

  // Tons per lift
  const tons_base = V_base_yd3 * v.base_density_ton_per_yd3;
  const tons_top  = V_top_yd3  * v.top_density_ton_per_yd3;
  const tons_total = tons_base + tons_top;

  // Trips & trucking
  const tons_per_load = v.truck_capacity_tons * v.truck_load_factor;
  const trips = Math.max(0, Math.ceil(tons_total / Math.max(tons_per_load, 0.0001)));
  const hrs_truck = (trips * v.haul_round_trip_min) / 60;

  // Stripping hours (choose dozer OR excavator)
  const hrs_dozer = v.strip_method === "dozer" ? (A_ft2 / Math.max(v.dozer_coverage_ft2_per_hr, 0.0001)) : 0;
  const hrs_exc   = v.strip_method === "excavator" ? (V_strip_yd3 / Math.max(v.prod_excavator_yd3_per_hr, 0.0001)) : 0;

  // Loading/placement hours
  const hrs_load = V_stone_yd3 / Math.max(v.prod_loader_yd3_per_hr, 0.0001);

  // Roller hours (optional)
  const hrs_compact = v.compaction_passes > 0
    ? (A_ft2 * v.compaction_passes) / Math.max(v.roller_coverage_ft2_per_hr, 0.0001)
    : 0;

  // Material costs
  const cost_base_stone = tons_base * r.base_stone_ton;
  const cost_top_stone  = tons_top  * r.top_stone_ton;

  // Equipment & trucking
  const cost_dozer   = hrs_dozer   * r.dozer_hr;
  const cost_exc     = hrs_exc     * r.excavator_hr;
  const cost_loader  = hrs_load    * r.loader_hr;
  const cost_roller  = hrs_compact * r.roller_hr;
  const cost_truck   = hrs_truck   * r.trucking_hr;

  const subtotal =
    cost_dozer + cost_exc + cost_loader + cost_roller + cost_truck +
    cost_base_stone + cost_top_stone + (extrasUSD || 0);

  return {
    // geometry & volumes
    A_ft2, V_strip_yd3, V_base_yd3, V_top_yd3, V_stone_yd3,
    // tons & logistics
    tons_base, tons_top, tons_total, trips, hrs_truck,
    // hours
    hrs_dozer, hrs_exc, hrs_load, hrs_compact,
    // costs
    cost_dozer, cost_exc, cost_loader, cost_roller, cost_truck,
    cost_base_stone, cost_top_stone, extrasUSD,
    subtotal,
  };
}
