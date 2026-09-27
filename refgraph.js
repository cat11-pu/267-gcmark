// refgraph.js：引用登记与邻居（同一对引用只记一次）
export function link(refs, from, to) {
  const next = {};
  for (const key of Object.keys(refs || {})) {
    next[key] = (refs[key] || []).slice();
  }
  if (!next[from]) next[from] = [];
  if (!next[from].includes(to)) next[from].push(to);
  return next;
}

export function targets(refs, name) {
  const list = (refs && refs[name]) || [];
  return list.slice();
}
