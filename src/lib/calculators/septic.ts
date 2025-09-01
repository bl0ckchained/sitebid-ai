// src/lib/calculators/septic.ts

export type SepticSystemType = "gravel" | "chamber";

export type SepticVars = {
  system_type: SepticSystemType;

  // Drain field (laterals)
  field_total_length_ft: number;        // sum of all lateral lengths
  trench_width_ft: number;              // trench width
  field_depth_ft: number;               // trench depth (bottom to finished grade)

  // Gravel system specifics
  bedding_under_pipe_ft: number;        // gravel thickness under pipe
  cover_gravel_over_pipe_ft: number;    // gravel thickness over pipe
  use_fabric: boolean;                  // geotextile on top of gravel

  // Chamber system specifics
  chamber_unit_length_ft: number;       // ft per chamber unit (e.g., 4')
  chamber_bedding_ft: number;           // sand/gravel leveling layer under chamber (can be 0)

  // Pipe
  perforated_pipe_length_ft: number;    // default = field_total_length_ft
  solid_pipe_length_ft: number;         // house->tank and tank->d-box->field combined
  pipe_d_in: number;                    // OD, for sanity checks only

  // Tank & D-Box / Risers
  tank_exc_L_ft: number;
  tank_exc_W_ft: number;
  tank_exc_D_ft: number;
  d_box_count: number;
  riser_count: number;

  // Haul & productivities
  haul_off_fraction: number;            // 0..1 of spoils hauled away
  truck_capacity_yd3: number;
  haul_round_trip_min: number;

  prod_dig_yd3_per_hr: number;
  prod_backfill_yd3_per_hr: number;
  prod_loader_yd3_per_hr: number;       // for bedding/gravel handling
};

export type SepticRates = {
  excavator_hr: number;
  loader_hr: number;
  trucking_hr: number;

  // materials
  tank_each: number;
  d_box_each: number;
  riser_each: number;

  gravel_yd3: number;                 // bedding/cover gravel $/yd³
  chamber_each: number;               // chamber unit $/ea
  perforated_pipe_ft: number;         // $/ft
  solid_pipe_ft: number;              // $/ft
  fabric_sf: number;                  // $/sf (geotextile)
  dump_fee_yd3: number;               // $/yd³ hauled/disposed
};

export type SepticExtras = {
  extrasUSD?: number;
};

export function septicEstimate(v: SepticVars, r: SepticRates, x: SepticExtras = {}) {
  const field_len_ft = v.field_total_length_ft;
  const w_ft = v.trench_width_ft;

  // --- Volumes (yd³)
  const V_field_exc_yd3 = (field_len_ft * w_ft * v.field_depth_ft) / 27;
  const V_tank_exc_yd3 = (v.tank_exc_L_ft * v.tank_exc_W_ft * v.tank_exc_D_ft) / 27;

  // Bedding volumes depend on system type
  let V_bedding_yd3 = 0;
  let V_cover_gravel_yd3 = 0;

  if (v.system_type === "gravel") {
    V_bedding_yd3 += (field_len_ft * w_ft * v.bedding_under_pipe_ft) / 27;
    V_cover_gravel_yd3 += (field_len_ft * w_ft * v.cover_gravel_over_pipe_ft) / 27;
  } else {
    // chambers may use a leveling layer (often thin)
    V_bedding_yd3 += (field_len_ft * w_ft * Math.max(v.chamber_bedding_ft, 0)) / 27;
  }

  const V_gravel_total_yd3 = V_bedding_yd3 + V_cover_gravel_yd3;

  const V_total_exc_yd3 = V_field_exc_yd3 + V_tank_exc_yd3;
  const V_backfill_yd3 = Math.max(V_total_exc_yd3 - V_gravel_total_yd3, 0);

  // Haul
  const haul_frac = Math.min(Math.max(v.haul_off_fraction, 0), 1);
  const V_haul_yd3 = V_total_exc_yd3 * haul_frac;
  const trips = Math.ceil(V_haul_yd3 / Math.max(1e-6, v.truck_capacity_yd3));
  const hrs_truck = (trips * v.haul_round_trip_min) / 60;

  // Hours
  const dig_h = V_total_exc_yd3 / Math.max(1e-6, v.prod_dig_yd3_per_hr);
  const backfill_h = V_backfill_yd3 / Math.max(1e-6, v.prod_backfill_yd3_per_hr);
  const loader_h = V_gravel_total_yd3 / Math.max(1e-6, v.prod_loader_yd3_per_hr);

  // --- Materials
  // Chambers vs gravel
  const chamber_units = v.system_type === "chamber"
    ? Math.ceil(field_len_ft / Math.max(1e-6, v.chamber_unit_length_ft))
    : 0;
  const cost_chambers = chamber_units * r.chamber_each;

  const cost_gravel = V_gravel_total_yd3 * r.gravel_yd3;

  // Pipes
  const perf_len_ft = v.perforated_pipe_length_ft > 0 ? v.perforated_pipe_length_ft : field_len_ft;
  const cost_perforated = perf_len_ft * r.perforated_pipe_ft;
  const cost_solid = v.solid_pipe_length_ft * r.solid_pipe_ft;

  // Fabric (on top of gravel)
  const fabric_area_sf = v.system_type === "gravel" && v.use_fabric ? field_len_ft * w_ft : 0;
  const cost_fabric = fabric_area_sf * r.fabric_sf;

  const cost_tank = r.tank_each; // one tank
  const cost_dbox = r.d_box_each * Math.max(1, v.d_box_count);
  const cost_risers = r.riser_each * Math.max(0, v.riser_count);

  const cost_dump_fees = V_haul_yd3 * r.dump_fee_yd3;

  const materials =
    cost_tank + cost_dbox + cost_risers +
    cost_chambers + cost_gravel + cost_perforated + cost_solid + cost_fabric +
    cost_dump_fees;

  const extrasUSD = x.extrasUSD ?? 0;

  // --- Equipment & Trucking
  const cost_excavator = (dig_h + backfill_h) * r.excavator_hr;
  const cost_loader = loader_h * r.loader_hr;
  const cost_truck = hrs_truck * r.trucking_hr;

  const subtotal = materials + extrasUSD + cost_excavator + cost_loader + cost_truck;

  return {
    // geometry & volumes
    w_ft,
    V_field_exc_yd3, V_tank_exc_yd3, V_total_exc_yd3,
    V_bedding_yd3, V_cover_gravel_yd3, V_gravel_total_yd3,
    V_backfill_yd3, V_haul_yd3,
    // hauling
    trips, hrs_truck,
    // hours
    dig_h, backfill_h, loader_h,
    // materials breakdown
    chamber_units, fabric_area_sf,
    cost_tank, cost_dbox, cost_risers,
    cost_chambers, cost_gravel, cost_perforated, cost_solid, cost_fabric, cost_dump_fees,
    // equipment/trucking
    cost_excavator, cost_loader, cost_truck,
    materials, extrasUSD,
    // subtotal
    subtotal,
  };
}
