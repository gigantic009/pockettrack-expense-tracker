function createCategoryService(repository) {
  return {list(userId){return repository.list(userId);},exists(userId,name,type){return repository.exists(userId,name,type);}};
}
module.exports={createCategoryService};
