const express=require("express");
const {createAuthMiddleware}=require("../../middleware/auth.middleware");
const {createDashboardService}=require("./dashboard.service");
function createDashboardRouter({db,jwtSecret}) {
 const router=express.Router();router.use(createAuthMiddleware({db,jwtSecret}));
 const service=createDashboardService(db);
 router.get("/summary",(req,res)=>{const month=String(req.query.month||"");if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return res.status(400).json({error:"Invalid month."});res.json(service.getSummary(req.user.id,month));});
 return router;
}
module.exports={createDashboardRouter};
