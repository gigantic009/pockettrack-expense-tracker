const express=require("express");
const path=require("node:path");
const cookieParser=require("cookie-parser");
const helmet=require("helmet");
const env=require("./config/env");
const {createDatabase}=require("./database/connection");
const {createAuthRouter}=require("./modules/auth/auth.routes");
const {createTransactionRouter}=require("./modules/transactions/transaction.routes");
const {createCategoryRouter}=require("./modules/categories/category.routes");
const {createDashboardRouter}=require("./modules/dashboard/dashboard.routes");
const errorHandler=require("./middleware/error.middleware");

function sameOriginApiGuard(req,res,next) {
  if(!["POST","PUT","PATCH","DELETE"].includes(req.method)) return next();
  const origin=req.get("origin"), fetchSite=req.get("sec-fetch-site");
  if(fetchSite==="cross-site"||!origin) return res.status(403).json({error:"Cross-origin or origin-less requests are not allowed."});
  try {
    const parsed=new URL(origin), host=req.get("host");
    if(parsed.origin==="null"||parsed.host!==host||parsed.protocol!==(req.secure?"https:":"http:")) return res.status(403).json({error:"Request origin is not allowed."});
  } catch { return res.status(403).json({error:"Invalid request origin."}); }
  return next();
}

function createApp({db=createDatabase(),jwtSecret=env.jwtSecret,production=env.isProduction}={}) {
  const app=express();
  app.disable("x-powered-by");
  app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'"],styleSrcAttr:["'none'"],imgSrc:["'self'","data:"],connectSrc:["'self'"],objectSrc:["'none'"],baseUri:["'self'"],frameAncestors:["'none'"],formAction:["'self'"]}}}));
  app.use(express.json({limit:"20kb"}));
  app.use(cookieParser());
  app.use("/api",sameOriginApiGuard);
  app.use("/api/auth",createAuthRouter({db,jwtSecret,production}));
  app.use("/api/transactions",createTransactionRouter({db,jwtSecret}));
  app.use("/api/categories",createCategoryRouter({db,jwtSecret}));
  app.use("/api",createDashboardRouter({db,jwtSecret}));
  app.use(express.static(path.join(process.cwd(),"public")));
  app.use("/api",(req,res)=>res.status(404).json({error:"API endpoint not found."}));
  app.get("*",(req,res)=>res.sendFile(path.join(process.cwd(),"public","index.html")));
  app.use((req,res)=>res.status(404).json({error:"Not found."}));
  app.use(errorHandler);
  return {app,db};
}
module.exports={createApp};
