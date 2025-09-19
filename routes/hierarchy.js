@@ .. @@
 // @desc    Get hierarchy by ID
 // @route   GET /api/hierarchy/:id
 // @access  Private
 router.get('/:id', protect, async (req, res) => {
   try {
-    const hierarchy = await Hierarchy.findById(parseInt(req.params.id));
+    const hierarchyId = req.params.id;
+    
+    // Validate hierarchyId is a valid number
+    if (!hierarchyId || isNaN(parseInt(hierarchyId))) {
+      return res.status(400).json({
+        success: false,
+        message: 'Invalid hierarchy ID provided'
+      });
+    }
+
+    const hierarchy = await Hierarchy.findById(parseInt(hierarchyId));

     if (!hierarchy) {
       return res.status(404).json({
         success: false,
         message: 'Hierarchy not found'
       });
     }

     // Check if user has access to this hierarchy
     if (req.user.role !== 'admin' && hierarchy.company_id !== req.user.company_id) {
       return res.status(403).json({
         success: false,
         message: 'Access denied to this hierarchy'
       });
     }

     res.json({
       success: true,
       data: {
         hierarchy: hierarchy.toJSON()
       }
     });
   } catch (error) {
     console.error('Get hierarchy error:', error);
     res.status(500).json({
       success: false,
       message: 'Server error getting hierarchy'
     });
   }
 });