const AppError = require("../../utils/AppError");
function validateRegistration({name,email,password}) {
  const cleanName=String(name||"").trim(), cleanEmail=String(email||"").trim().toLowerCase();
  if(cleanName.length<2||cleanName.length>60) throw new AppError("Name must be 2–60 characters.",400,"INVALID_NAME");
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)||cleanEmail.length>254) throw new AppError("Enter a valid email address.",400,"INVALID_EMAIL");
  if(String(password||"").length<8||String(password||"").length>72) throw new AppError("Password must be 8–72 characters.",400,"INVALID_PASSWORD");
  return {name:cleanName,email:cleanEmail,password:String(password)};
}
module.exports={validateRegistration};
