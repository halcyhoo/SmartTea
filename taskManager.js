const tasks = [];

const add = (task) => {
  tasks.push(task);
  return tasks.length;
};

const getAll = () => tasks;

const get = (id) => tasks[id];

module.exports = {
  add,
  get,
  getAll,
};
