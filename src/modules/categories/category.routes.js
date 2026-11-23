const express=require("express");
const {createAuthMiddleware}=require("../../middleware/auth.middleware");
const {createCategoryRepository}=require("../../database/repositories/category.repository");
function createCategoryRouter({db,jwtSecret}) {
  const router=express.Router();router.use(createAuthMiddleware({db,jwtSecret}));
  const repo=createCategoryRepository(db);
  router.get("/",(req,res)=>res.json({categories:repo.list(req.user.id)}));
  return router;
}
module.exports={createCategoryRouter};
