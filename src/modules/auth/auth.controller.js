/** Controller conventions reference: route handlers should only translate HTTP input/output. Domain work belongs to auth.service. */
module.exports = Object.freeze({
  publicUser(user) { return { id:user.id, name:user.name, email:user.email }; }
});
