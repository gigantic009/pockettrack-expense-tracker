const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");
const AppError=require("../../utils/AppError");
const {validateRegistration}=require("./auth.validation");
const defaults=require("../../shared/constants/categories");

function createAuthService({db,jwtSecret}) {
  const publicUser=u=>({id:u.id,name:u.name,email:u.email});
  function seedCategories(userId) {
    const insert=db.prepare("INSERT OR IGNORE INTO categories(user_id,name,type) VALUES(?,?,?)");
    db.transaction(()=>Object.entries(defaults).forEach(([type,names])=>names.forEach(name=>insert.run(userId,name,type))))();
  }
  function issueToken(user) {
    return jwt.sign({userId:user.id},jwtSecret,{algorithm:"HS256",expiresIn:"7d",issuer:"pockettrack",audience:"pockettrack-web"});
  }
  return {
    register(input) {
      const valid=validateRegistration(input);
      const hash=bcrypt.hashSync(valid.password,12);
      try {
        const result=db.prepare("INSERT INTO users(name,email,password_hash) VALUES(?,?,?)").run(valid.name,valid.email,hash);
        const user=db.prepare("SELECT id,name,email FROM users WHERE id=?").get(result.lastInsertRowid);
        seedCategories(user.id); return {user:publicUser(user),token:issueToken(user)};
      } catch(err) {
        if(err.code==="SQLITE_CONSTRAINT_UNIQUE") throw new AppError("An account with this email already exists.",409,"EMAIL_EXISTS");
        throw err;
      }
    },
    login(email,password) {
      const user=db.prepare("SELECT * FROM users WHERE email=?").get(String(email||"").trim().toLowerCase());
      if(!user||!bcrypt.compareSync(String(password||""),user.password_hash)) throw new AppError("Incorrect email or password.",401,"INVALID_CREDENTIALS");
      return {user:publicUser(user),token:issueToken(user)};
    }
  };
}
module.exports={createAuthService};
