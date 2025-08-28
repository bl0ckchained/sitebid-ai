export function drivewayEstimate(v: {
  L_ft:number; W_ft:number; strip_T_ft:number; stone_lift_ft:number;
  stone_density_ton_per_yd3:number; compaction_passes:number;
  roller_coverage_ft2_per_hr:number; haul_round_trip_min:number;
  truck_capacity_tons:number; truck_load_factor:number;
  prod_excavator_yd3_per_hr:number; prod_loader_yd3_per_hr:number;
}, r:{excavator_hr:number; loader_hr:number; roller_hr:number; trucking_hr:number; stone_ton:number}) {
  const A = v.L_ft * v.W_ft;
  const V_strip = (A * v.strip_T_ft) / 27;
  const V_stone = (A * v.stone_lift_ft) / 27;
  const tons = V_stone * v.stone_density_ton_per_yd3;
  const trips = Math.ceil(tons / (v.truck_capacity_tons * v.truck_load_factor));
  const hrs_truck = (trips * v.haul_round_trip_min) / 60;
  const hrs_exc = V_strip / v.prod_excavator_yd3_per_hr;
  const hrs_load = V_stone / v.prod_loader_yd3_per_hr;
  const hrs_compact = (A * v.compaction_passes) / v.roller_coverage_ft2_per_hr;
  const subtotal = hrs_exc*r.excavator_hr + hrs_load*r.loader_hr + hrs_compact*r.roller_hr
                 + hrs_truck*r.trucking_hr + tons*r.stone_ton;
  return {A, V_strip, V_stone, tons, trips, hrs_truck, hrs_exc, hrs_load, hrs_compact, subtotal};
}
