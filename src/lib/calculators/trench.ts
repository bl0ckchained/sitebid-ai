// src/lib/calculators/trench.ts

export type TrenchVars = {
  // Core geometry
  L_ft: number;                     // trench length (ft)
  depth_ft: number;                 // average depth (ft)

  // Pipe & trench width
  pipe_d_in: number;                // pipe outside diameter (in)
  side_clearance_ft: number;        // each side clearance (ft)
  bedding_t_ft: number;             // bedding thickness (ft)
  trench_width_override_ft: number; // 0 => auto

  // Haul & productivities
  haul_off_fraction: number;        // 0..1 of spoils hauled
  truck_capacity_yd3: number;
  haul_round_trip_min: number;

  prod_dig_yd3_per_hr: number;
  prod_backfill_yd3_per_hr: number;
  prod_loader_yd3_per_hr: number;   // for bedding placement
};

export type TrenchRates = {
  excavator_hr: number;
  loader_hr: number;
  trucking_hr: number;

  bedding_yd3: number;              // $/yd³
  pipe_per_ft: number;              // $/ft
  tracer_per_ft: number;            // $/ft (set 0 to disable)
  warning_tape_per_ft: number;      // $/ft (set 0 to disable)

  asphalt_sf: number;               // $/sf
  concrete_sf: number;              // $/sf
  lawn_sf: number;                  // $/sf (topsoil/seed/sod)
  dump_fee_yd3: number;             // $/yd³ (disposal)
};

export type TrenchExtras = {
  // Surface restorations (areas you can set to 0)
  asphalt_restore_sf?: number;
  concrete_restore_sf?: number;
  lawn_restore_sf?: number;

  extrasUSD?: number;               // lump sum
};

export function trenchEstimate(v: TrenchVars, r: TrenchRates, x: TrenchExtras = {}) {
  const pipe_d_ft = v.pipe_d_in / 12;
  const auto_width_ft = pipe_d_ft + 2 * v.side_clearance_ft;
  const trench_w_ft = v.trench_width_override_ft > 0 ? v.trench_width_override_ft : auto_width_ft;

  // Volumes
  const V_exc_yd3 = (v.L_ft * trench_w_ft * v.depth_ft) / 27;
  const V_bed_yd3 = (v.L_ft * trench_w_ft * v.bedding_t_ft) / 27;
  const V_backfill_yd3 = Math.max(V_exc_yd3 - V_bed_yd3, 0);

  // Hauling
  const haul_frac = Math.min(Math.max(v.haul_off_fraction, 0), 1);
  const V_haul_yd3 = V_exc_yd3 * haul_frac;
  const trips = Math.ceil(V_haul_yd3 / Math.max(1e-6, v.truck_capacity_yd3));
  const hrs_truck = (trips * v.haul_round_trip_min) / 60;

  // Hours
  const dig_h = V_exc_yd3 / Math.max(1e-6, v.prod_dig_yd3_per_hr);
  const backfill_h = V_backfill_yd3 / Math.max(1e-6, v.prod_backfill_yd3_per_hr);
  const loader_h = V_bed_yd3 / Math.max(1e-6, v.prod_loader_yd3_per_hr);

  // Materials (linear + bedding + restorations + dump fees)
  const cost_pipe = v.L_ft * r.pipe_per_ft;
  const cost_tracer = v.L_ft * r.tracer_per_ft;
  const cost_tape = v.L_ft * r.warning_tape_per_ft;

  const cost_bedding = V_bed_yd3 * r.bedding_yd3;
  const cost_asphalt = (x.asphalt_restore_sf ?? 0) * r.asphalt_sf;
  const cost_concrete = (x.concrete_restore_sf ?? 0) * r.concrete_sf;
  const cost_lawn = (x.lawn_restore_sf ?? 0) * r.lawn_sf;
  const cost_dump_fees = V_haul_yd3 * r.dump_fee_yd3;

  const materials =
    cost_pipe + cost_tracer + cost_tape +
    cost_bedding + cost_asphalt + cost_concrete + cost_lawn + cost_dump_fees;

  const extrasUSD = x.extrasUSD ?? 0;

  // Equipment & trucking
  const cost_excavator = (dig_h + backfill_h) * r.excavator_hr;
  const cost_loader = loader_h * r.loader_hr;
  const cost_truck = hrs_truck * r.trucking_hr;

  const subtotal = cost_excavator + cost_loader + cost_truck + materials + extrasUSD;

  return {
    // geometry
    trench_w_ft,
    // volumes
    V_exc_yd3, V_bed_yd3, V_backfill_yd3, V_haul_yd3,
    // hauling
    trips, hrs_truck,
    // hours
    dig_h, backfill_h, loader_h,
    // materials breakdown
    cost_pipe, cost_tracer, cost_tape, cost_bedding, cost_asphalt, cost_concrete, cost_lawn, cost_dump_fees,
    // costs
    cost_excavator, cost_loader, cost_truck, materials, extrasUSD,
    // subtotal
    subtotal,
  };
}
// ------------------------------------------------------------------------------
// src/lib/calculators/basement.ts
// ------------------------------------------------------------------------------