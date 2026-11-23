const env=require("./config/env");
const {createApp}=require("./app");
const {app,db}=createApp();
const server=app.listen(env.port,()=>console.log(`PocketTrack modular server running on port ${env.port}`));
function shutdown(signal) {
  console.log(`${signal}: shutting down PocketTrack`);
  server.close(()=>{try{db.close();}finally{process.exit(0);}});
  setTimeout(()=>process.exit(1),10000).unref();
}
process.once("SIGINT",()=>shutdown("SIGINT"));
process.once("SIGTERM",()=>shutdown("SIGTERM"));
