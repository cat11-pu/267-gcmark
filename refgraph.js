// refgraph.js：引用登记与邻居

export function link(refs, from, to) {
  const next = {};
  Object.keys(refs).forEach(function (name) {
    next[name] = refs[name].slice();
  });
  const list = next[from] ? next[from].slice() : [];
  if (!list.includes(to)) {
    list.push(to);
  }
  next[from] = list;
  return next;
}

export function targets(refs, name) {
  return refs[name] ? refs[name].slice() : [];
}
