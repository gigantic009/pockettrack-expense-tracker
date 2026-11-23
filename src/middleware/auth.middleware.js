const jwt=require("jsonwebtoken");
const AppError=require("../utils/AppError");
function createAuthMiddleware({db,jwtSecret}) {
  return function auth(req,res,next) {
    const token=req.cookies?.pt_session;
    if(!token) return next(new AppError("Please log in.",401,"UNAUTHENTICATED"));
    try {
      const payload=jwt.verify(token,jwtSecret,{algorithms:["HS256"],issuer:"pockettrack",audience:"pockettrack-web"});
      const user=db.prepare("SELECT id,name,email FROM users WHERE id=?").get(payload.userId);
      if(!user) return next(new AppError("Account not found.",401,"UNAUTHENTICATED"));
      req.user=user; next();
    } catch(err) {
      if(err instanceof AppError) return next(err);
      next(new AppError("Session expired. Please log in again.",401,"UNAUTHENTICATED"));
    }
  };
}
module.exports={createAuthMiddleware};
