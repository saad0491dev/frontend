@@ .. @@
 // @desc    Get aggregated chart data for a hierarchy (region, area, field, well)
 // @route   GET /api/charts/hierarchy/:hierarchyId
 // @access  Private
 router.get('/hierarchy/:hierarchyId', protect, async (req, res) => {
   try {
-    const hierarchyId = parseInt(req.params.hierarchyId);
+    const hierarchyId = req.params.hierarchyId;
     const timeRange = req.query.timeRange || 'day'; // hour, day, week, month

+    // Validate hierarchyId is a valid number
+    if (!hierarchyId || isNaN(parseInt(hierarchyId))) {
+      return res.status(400).json({
+        success: false,
+        message: 'Invalid hierarchy ID provided'
+      });
+    }
+
+    const hierarchyIdInt = parseInt(hierarchyId);

     // Check if hierarchy exists and user has access
-    const hierarchy = await Hierarchy.findById(hierarchyId);
+    const hierarchy = await Hierarchy.findById(hierarchyIdInt);
     if (!hierarchy) {
       return res.status(404).json({
         success: false,
         message: 'Hierarchy not found'
       });
     }

     // Check if user has access to this hierarchy (same company or admin)
     if (req.user.role !== 'admin' && hierarchy.company_id !== req.user.company_id) {
       return res.status(403).json({
         success: false,
         message: 'Access denied to this hierarchy'
       });
     }

     // Get aggregated chart data for this hierarchy and all its children
-    const chartData = await Device.getHierarchyChartData(hierarchyId, timeRange);
+    const chartData = await Device.getHierarchyChartData(hierarchyIdInt, timeRange);

     // Get devices under this hierarchy
     const database = require('../config/database');
     const devicesQuery = `
       WITH RECURSIVE hierarchy_cte AS (
         SELECT id FROM hierarchy WHERE id = $1
         UNION ALL
         SELECT h.id FROM hierarchy h JOIN hierarchy_cte c ON h.parent_id = c.id
       )
       SELECT d.*, dt.type_name as device_type_name, h.name as hierarchy_name,
              dl.data as latest_data, dl.updated_at as latest_data_time
       FROM device d
       JOIN device_type dt ON d.device_type_id = dt.id
       JOIN hierarchy_device hd ON d.id = hd.device_id
       JOIN hierarchy h ON hd.hierarchy_id = h.id
       LEFT JOIN device_latest dl ON d.id = dl.device_id
       WHERE hd.hierarchy_id IN (SELECT id FROM hierarchy_cte)
       ORDER BY d.serial_number
     `;

-    const devicesResult = await database.query(devicesQuery, [hierarchyId]);
+    const devicesResult = await database.query(devicesQuery, [hierarchyIdInt]);
     const devices = devicesResult.rows;

     res.json({
       success: true,
       message: 'Hierarchy chart data retrieved successfully',
       data: {
         hierarchy: hierarchy.toJSON(),
         chartData: chartData.map(row => ({
           timestamp: row.minute,
           totalGfr: parseFloat(row.total_gfr) || 0,
           totalGor: parseFloat(row.total_gor) || 0,
           totalOfr: parseFloat(row.total_ofr) || 0,
           totalWfr: parseFloat(row.total_wfr) || 0,
           totalGvf: parseFloat(row.total_gvf) || 0,
           totalWlr: parseFloat(row.total_wlr) || 0,
           avgPressure: parseFloat(row.avg_pressure) || 0,
           avgTemperature: parseFloat(row.avg_temp) || 0,
           deviceCount: parseInt(row.device_count) || 0
         })),
         devices: devices.map(device => ({
           id: device.id,
           serialNumber: device.serial_number,
           deviceType: device.device_type_name,
           hierarchyName: device.hierarchy_name,
           metadata: device.metadata,
           latestData: device.latest_data,
           latestDataTime: device.latest_data_time
         })),
         timeRange,
         totalDataPoints: chartData.length,
         totalDevices: devices.length
       }
     });
   } catch (error) {
     console.error('Get hierarchy chart data error:', error);
     res.status(500).json({
       success: false,
       message: 'Server error getting hierarchy chart data'
     });
   }
 });