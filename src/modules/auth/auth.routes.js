const express=require("express");
const rateLimit=require("express-rate-limit");
const {createAuthMiddleware}=require("../../middleware/auth.middleware");
const {createAuthService}=require("./auth.service");

function createAuthRouter({db,jwtSecret,production}) {
  const router=express.Router(), service=createAuthService({db,jwtSecret});
  const auth=createAuthMiddleware({db,jwtSecret});
  const loginLimiter=rateLimit({windowMs:15*60*1000,limit:10,standardHeaders:true,legacyHeaders:false});
  const registrationLimiter=rateLimit({windowMs:60*60*1000,limit:5,standardHeaders:true,legacyHeaders:false});
  const cookieOptions={httpOnly:true,secure:production,sameSite:"strict",path:"/",maxAge:7*24*60*60*1000};
  router.post("/register",registrationLimiter,(req,res,next)=>{try{const result=service.register(req.body||{});res.cookie("pt_session",result.token,cookieOptions);res.status(201).json({user:result.user});}catch(e){next(e);}});
  router.post("/login",loginLimiter,(req,res,next)=>{try{const result=service.login(req.body?.email,req.body?.password);res.cookie("pt_session",result.token,cookieOptions);res.json({user:result.user});}catch(e){next(e);}});
  router.post("/logout",(req,res)=>{res.clearCookie("pt_session",{...cookieOptions,maxAge:undefined});res.json({ok:true});});
  router.get("/me",auth,(req,res)=>res.json({user:req.user}));
  return router;
}
module.exports={createAuthRouter};
