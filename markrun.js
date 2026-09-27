// markrun.js：按标记预算标记并留账，收尾不限预算标记完再回收
import { link, targets } from "./refgraph.js";

function badEvent(message) {
  const error = new Error(message);
  error.code = "E_BAD_EVENT";
  return error;
}

function unknownObject(name) {
  const error = new Error("对象不在对象表里：" + name);
  error.code = "E_UNKNOWN_OBJECT";
  return error;
}

function eventKey(event) {
  if (event && event.id !== undefined && event.id !== null) return String(event.id);
  return JSON.stringify(event);
}

function validate(events, objects) {
  const known = new Set(objects || []);
  for (const event of events || []) {
    if (!event || typeof event !== "object" || typeof event.kind !== "string") {
      throw badEvent("事件缺少合法 kind");
    }
    if (event.kind === "root") {
      if (typeof event.obj !== "string") throw badEvent("root 事件缺少 obj");
      if (!known.has(event.obj)) throw unknownObject(event.obj);
    } else if (event.kind === "link") {
      if (typeof event.from !== "string" || typeof event.to !== "string") {
        throw badEvent("link 事件缺少 from/to");
      }
      if (!known.has(event.from)) throw unknownObject(event.from);
      if (!known.has(event.to)) throw unknownObject(event.to);
    } else {
      throw badEvent("不支持的事件类型：" + event.kind);
    }
  }
}

function cloneState(state) {
  const source = state || {};
  const refs = {};
  for (const key of Object.keys(source.refs || {})) {
    refs[key] = (source.refs[key] || []).slice();
  }
  return {
    refs,
    roots: (source.roots || []).slice(),
    marked: (source.marked || []).slice(),
    queue: (source.queue || []).slice(),
    freed: (source.freed || []).slice(),
    applied: (source.applied || []).slice()
  };
}

export function step(spec) {
  const input = spec || {};
  const events = input.events || [];
  const objects = input.objects || [];
  validate(events, objects);

  const state = cloneState(input.state);
  const markedSet = new Set(state.marked);
  const queuedSet = new Set(state.queue);
  const appliedSet = new Set(state.applied);

  function enqueue(name) {
    if (!markedSet.has(name) && !queuedSet.has(name)) {
      state.queue.push(name);
      queuedSet.add(name);
    }
  }

  let remaining = Math.max(0, Math.floor(Number(input.budget) || 0));
  let judged = 0;
  let newlyMarked = 0;

  for (const event of events) {
    const key = eventKey(event);
    if (appliedSet.has(key)) continue;
    appliedSet.add(key);
    state.applied.push(key);
    judged += 1;

    if (event.kind === "root") {
      if (!state.roots.includes(event.obj)) state.roots.push(event.obj);
      enqueue(event.obj);
    } else if (event.kind === "link") {
      state.refs = link(state.refs, event.from, event.to);
      if (markedSet.has(event.from)) enqueue(event.to);
    }

    while (remaining > 0 && state.queue.length > 0) {
      const name = state.queue.shift();
      queuedSet.delete(name);
      if (markedSet.has(name)) continue;
      markedSet.add(name);
      state.marked.push(name);
      remaining -= 1;
      newlyMarked += 1;
      for (const target of targets(state.refs, name)) enqueue(target);
    }
  }

  return {
    state,
    marked: newlyMarked,
    queue_before: state.queue.length,
    queue: state.queue.slice(),
    judged,
    judged_bound: events.length
  };
}

export function close(spec) {
  const input = spec || {};
  const state = cloneState(input.state);
  const markedSet = new Set(state.marked);
  const queuedSet = new Set(state.queue);
  let catchup = 0;

  while (state.queue.length > 0) {
    const name = state.queue.shift();
    queuedSet.delete(name);
    if (markedSet.has(name)) continue;
    markedSet.add(name);
    state.marked.push(name);
    catchup += 1;
    for (const target of targets(state.refs, name)) {
      if (!markedSet.has(target) && !queuedSet.has(target)) {
        state.queue.push(target);
        queuedSet.add(target);
      }
    }
  }

  const reachable = new Set(state.marked);
  const freedSet = new Set(state.freed);
  for (const name of input.objects || []) {
    if (!reachable.has(name)) freedSet.add(name);
  }
  state.freed = Array.from(freedSet).sort();
  state.roots = Array.from(new Set(state.roots)).sort();

  return { state, catchup };
}
