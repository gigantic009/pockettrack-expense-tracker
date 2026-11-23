const express=require("express");
const {createAuthMiddleware}=require("../../middleware/auth.middleware");
const {createTransactionService}=require("./transaction.service");
function createTransactionRouter({db,jwtSecret}) {
  const router=express.Router();
  const auth=createAuthMiddleware({db,jwtSecret});
  const service=createTransactionService({transactionRepository:require("../../database/repositories/transaction.repository").createTransactionRepository(db),categoryRepository:require("../../database/repositories/category.repository").createCategoryRepository(db)});
  router.use(auth);
  router.get("/",(req,res,next)=>{const month=String(req.query.month||"");if(month&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return res.status(400).json({error:"Invalid month."});try{res.json({transactions:service.list(req.user.id,month||null)});}catch(e){next(e);}});
  router.post("/",(req,res,next)=>{try{const data={...req.body,userId:req.user.id,description:String(req.body?.description||"").trim(),category:String(req.body?.category||"").trim(),amount:Number(req.body?.amount)};const id=service.create(data);const transaction=db.prepare("SELECT id,description,amount,type,category,transaction_date AS date FROM transactions WHERE id=? AND user_id=?").get(id,req.user.id);res.status(201).json({transaction});}catch(e){next(e);}});
  router.put("/:id",(req,res,next)=>{const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<=0)return res.status(400).json({error:"Invalid transaction ID."});try{service.update(id,{...req.body,userId:req.user.id,description:String(req.body?.description||"").trim(),category:String(req.body?.category||"").trim(),amount:Number(req.body?.amount)});res.json({ok:true});}catch(e){next(e);}});
  router.delete("/:id",(req,res,next)=>{const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<=0)return res.status(400).json({error:"Invalid transaction ID."});try{service.delete(id,req.user.id);res.json({ok:true});}catch(e){next(e);}});
  return router;
}
module.exports={createTransactionRouter};
