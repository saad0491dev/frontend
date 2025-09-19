@@ .. @@
 static async getDeviceChartData(device_id, timeRange = 'day') {
   let timeFilter = '';
   let groupBy = '';

   switch (timeRange) {
     case 'hour':
       timeFilter = "dd.created_at >= now() - interval '1 hour'";
       groupBy = "date_trunc('minute', dd.created_at)";
       break;
     case 'day':
       timeFilter = "dd.created_at >= date_trunc('day', now())";
       groupBy = "date_trunc('minute', dd.created_at)";
       break;
     case 'week':
       timeFilter = "dd.created_at >= now() - interval '7 days'";
       groupBy = "date_trunc('hour', dd.created_at)";
       break;
     case 'month':
       timeFilter = "dd.created_at >= now() - interval '30 days'";
       groupBy = "date_trunc('day', dd.created_at)";
       break;
     default:
       timeFilter = "dd.created_at >= date_trunc('day', now())";
       groupBy = "date_trunc('minute', dd.created_at)";
   }

+  // First check what type of device this is
+  const deviceTypeQuery = `
+    SELECT dt.type_name 
+    FROM device d 
+    JOIN device_type dt ON d.device_type_id = dt.id 
+    WHERE d.id = $1
+  `;
+  const deviceTypeResult = await database.query(deviceTypeQuery, [device_id]);
+  const deviceType = deviceTypeResult.rows[0]?.type_name;
+
+  // Build dynamic query based on device type
+  let selectFields = '';
+  if (deviceType === 'MPFM') {
+    selectFields = `
+      AVG((dd.data->>'GFR')::numeric) AS avg_gfr,
+      AVG((dd.data->>'GOR')::numeric) AS avg_gor,
+      AVG((dd.data->>'GVF')::numeric) AS avg_gvf,
+      AVG((dd.data->>'OFR')::numeric) AS avg_ofr,
+      AVG((dd.data->>'WFR')::numeric) AS avg_wfr,
+      AVG((dd.data->>'WLR')::numeric) AS avg_wlr,
+      AVG((dd.data->>'PressureAvg')::numeric) AS avg_pressure,
+      AVG((dd.data->>'TemperatureAvg')::numeric) AS avg_temp
+    `;
+  } else if (deviceType === 'Pressure Sensor') {
+    selectFields = `
+      NULL AS avg_gfr,
+      NULL AS avg_gor,
+      NULL AS avg_gvf,
+      NULL AS avg_ofr,
+      NULL AS avg_wfr,
+      NULL AS avg_wlr,
+      AVG((dd.data->>'Pressure')::numeric) AS avg_pressure,
+      AVG((dd.data->>'TemperatureAvg')::numeric) AS avg_temp
+    `;
+  } else if (deviceType === 'Temperature Sensor') {
+    selectFields = `
+      NULL AS avg_gfr,
+      NULL AS avg_gor,
+      NULL AS avg_gvf,
+      NULL AS avg_ofr,
+      NULL AS avg_wfr,
+      NULL AS avg_wlr,
+      AVG((dd.data->>'PressureAvg')::numeric) AS avg_pressure,
+      AVG((dd.data->>'Temperature')::numeric) AS avg_temp
+    `;
+  } else if (deviceType === 'Flow Meter') {
+    selectFields = `
+      NULL AS avg_gfr,
+      NULL AS avg_gor,
+      NULL AS avg_gvf,
+      AVG((dd.data->>'FlowRate')::numeric) AS avg_ofr,
+      NULL AS avg_wfr,
+      NULL AS avg_wlr,
+      AVG((dd.data->>'PressureAvg')::numeric) AS avg_pressure,
+      AVG((dd.data->>'TemperatureAvg')::numeric) AS avg_temp
+    `;
+  } else {
+    // Default for other device types
+    selectFields = `
+      NULL AS avg_gfr,
+      NULL AS avg_gor,
+      NULL AS avg_gvf,
+      NULL AS avg_ofr,
+      NULL AS avg_wfr,
+      NULL AS avg_wlr,
+      NULL AS avg_pressure,
+      NULL AS avg_temp
+    `;
+  }

   const query = `
     SELECT 
       ${groupBy} AS time_period,
-      AVG((dd.data->>'GFR')::numeric) AS avg_gfr,
-      AVG((dd.data->>'GOR')::numeric) AS avg_gor,
-      AVG((dd.data->>'GVF')::numeric) AS avg_gvf,
-      AVG((dd.data->>'OFR')::numeric) AS avg_ofr,
-      AVG((dd.data->>'WFR')::numeric) AS avg_wfr,
-      AVG((dd.data->>'WLR')::numeric) AS avg_wlr,
-      AVG((dd.data->>'PressureAvg')::numeric) AS avg_pressure,
-      AVG((dd.data->>'TemperatureAvg')::numeric) AS avg_temp,
+      ${selectFields},
       COUNT(*) as data_points
     FROM device_data dd
     WHERE dd.device_id = $1 AND ${timeFilter}
     GROUP BY ${groupBy}
     ORDER BY time_period
   `;

   const result = await database.query(query, [device_id]);
   return result.rows;
 }