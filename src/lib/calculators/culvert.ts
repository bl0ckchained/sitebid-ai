export function culvertEstimate(v:{
  L_pipe_ft:number; D_in:number; invert_depth_ft:number; cover_ft:number;
  bedding_t_ft:number; side_clearance_ft:number; haul_round_trip_min:number;
  truck_capacity_yd3:number; prod_dig_yd3_per_hr:number; prod_backfill_yd3_per_hr:number;
}, r:{excavator_hr:number; trucking_hr:number; bedding_yd3:number; pipe_per_ft:number;
      end_section_each:number; asphalt_sf:number; riprap_yd3:number},
  extras:{riprap_area_ft2?:number; riprap_thickness_ft?:number; asphalt_restore_sf?:number; end_sections_ea?:number} = {}
){
  const D_ft = v.D_in/12;
  const w = D_ft + 2*(v.side_clearance_ft);
  const trench_depth = v.invert_depth_ft + v.bedding_t_ft;
  const V_exc = (v.L_pipe_ft * w * trench_depth) / 27;
  const V_bed = (v.L_pipe_ft * w * v.bedding_t_ft) / 27;
  const V_backfill = V_exc - V_bed;
  const trips = Math.ceil(V_exc / v.truck_capacity_yd3);
  const hrs_truck = (trips * v.haul_round_trip_min) / 60;
  const dig_h = V_exc / v.prod_dig_yd3_per_hr;
  const backfill_h = V_backfill / v.prod_backfill_yd3_per_hr;

  const materials =
    v.L_pipe_ft * r.pipe_per_ft +
    V_bed * r.bedding_yd3 +
    (extras.asphalt_restore_sf ?? 0) * r.asphalt_sf +
    (((extras.riprap_area_ft2 ?? 0) * (extras.riprap_thickness_ft ?? 0)) / 27) * r.riprap_yd3 +
    (extras.end_sections_ea ?? 0) * r.end_section_each;

  const subtotal = (dig_h + backfill_h) * r.excavator_hr + hrs_truck * r.trucking_hr + materials;
  return {w, trench_depth, V_exc, V_bed, V_backfill, trips, hrs_truck, dig_h, backfill_h, materials, subtotal};
}
