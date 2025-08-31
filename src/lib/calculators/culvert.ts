export function culvertEstimate(
  v: {
    L_pipe_ft: number; D_in: number; invert_depth_ft: number; cover_ft: number;
    bedding_t_ft: number; side_clearance_ft: number; haul_round_trip_min: number;
    truck_capacity_yd3: number; prod_dig_yd3_per_hr: number; prod_backfill_yd3_per_hr: number;
  },
  r: {
    excavator_hr: number; trucking_hr: number; bedding_yd3: number; pipe_per_ft: number;
    end_section_each: number; asphalt_sf: number; riprap_yd3: number;
  },
  extras: {
    riprap_area_ft2?: number; riprap_thickness_ft?: number; asphalt_restore_sf?: number; end_sections_ea?: number;

    /** NEW: pass-through fees (not marked up by subtotal math) */
    permit_usd?: number;

    /** NEW: optional tuning (defaults chosen to preserve today’s outputs) */
    swell_factor_loose?: number;        // e.g. 1.2–1.3 for common soils; default 1.0 (no change)
    truck_load_factor?: number;         // 0–1, default 1.0 (no change)
    lump_sum_extras_usd?: number;       // optional: other extras you want included in subtotal
  } = {}
) {
  // Geometry
  const D_ft = v.D_in / 12;
  const w = D_ft + 2 * v.side_clearance_ft;
  const trench_depth = v.invert_depth_ft + v.bedding_t_ft;

  // Volumes (bank)
  const V_exc = (v.L_pipe_ft * w * trench_depth) / 27;
  const V_bed = (v.L_pipe_ft * w * v.bedding_t_ft) / 27;
  const V_backfill = V_exc - V_bed;

  // Haul calc (optionally consider swell + load factor; defaults keep legacy behavior)
  const swell = extras.swell_factor_loose ?? 1.0;      // set to ~1.25 if you want loose volume for trucking
  const loadFactor = extras.truck_load_factor ?? 1.0;  // set to <1 if you want partial loads
  const effTruckCap = Math.max(v.truck_capacity_yd3 * loadFactor, 0.0001);
  const V_loose_for_truck = V_exc * swell;

  const trips = Math.ceil(V_loose_for_truck / effTruckCap);
  const hrs_truck = (trips * v.haul_round_trip_min) / 60;

  // Productivity
  const dig_h = V_exc / v.prod_dig_yd3_per_hr;
  const backfill_h = V_backfill / v.prod_backfill_yd3_per_hr;

  // Materials (line items)
  const cost_pipe = v.L_pipe_ft * r.pipe_per_ft;
  const cost_bedding = V_bed * r.bedding_yd3;

  const asphalt_sf = extras.asphalt_restore_sf ?? 0;
  const cost_asphalt = asphalt_sf * r.asphalt_sf;

  const riprap_yd3 = (((extras.riprap_area_ft2 ?? 0) * (extras.riprap_thickness_ft ?? 0)) / 27);
  const cost_riprap = riprap_yd3 * r.riprap_yd3;

  const end_sections = extras.end_sections_ea ?? 0;
  const cost_end_sections = end_sections * r.end_section_each;

  const materials = cost_pipe + cost_bedding + cost_asphalt + cost_riprap + cost_end_sections;

  // Equipment & Trucking
  const cost_excavation = (dig_h + backfill_h) * r.excavator_hr;
  const cost_truck = hrs_truck * r.trucking_hr;

  // Optional lump-sum extras that you DO want marked up (unlike permits)
  const lump_sum_extras = extras.lump_sum_extras_usd ?? 0;

  // Subtotal (subject to OH/contingency/profit in UI)
  const subtotal = cost_excavation + cost_truck + materials + lump_sum_extras;

  // Pass-throughs (NOT included in subtotal; add after profit in the UI)
  const permit_pass_through = extras.permit_usd ?? 0;

  return {
    // geometry/volumes
    w, trench_depth, V_exc, V_bed, V_backfill,

    // haul/productivity
    trips, hrs_truck, dig_h, backfill_h,

    // costs (line items)
    cost_pipe, cost_bedding, cost_asphalt, cost_riprap, cost_end_sections,
    cost_excavation, cost_truck, materials,

    // totals
    subtotal,

    // pass-throughs & knobs (for the UI to show/decide how to add)
    permit_pass_through,
    swell_used: swell,
    truck_load_factor_used: loadFactor,
    lump_sum_extras,
  };
}
