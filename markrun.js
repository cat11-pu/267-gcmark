// markrun.js：按标记预算标记并留账
import { link, targets } from "./refgraph.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function cloneState(state) {
  const refs = {};
  Object.keys(state.refs || {}).forEach(function (name) {
    refs[name] = (state.refs[name] || []).slice();
  });
  return {
    refs: refs,
    roots: (state.roots || []).slice(),
    marked: (state.marked || []).slice(),
    queue: (state.queue || []).slice(),
    freed: (state.freed || []).slice(),
    applied: (state.applied || []).slice()
  };
}

function enqueue(state, name) {
  if (!state.marked.includes(name) && !state.queue.includes(name)) {
    state.queue.push(name);
  }
}

function eventKey(event, index) {
  return event && event.id !== undefined && event.id !== null ? String(event.id) : "#" + index;
}

export function step(spec) {
  const state = cloneState(spec.state || {});
  const events = spec.events || [];
  const objects = (spec.objects || []).slice();
  let budget = Number.isFinite(spec.budget) ? spec.budget : 0;

  function drain() {
    let markedNow = 0;
    while (budget > 0 && state.queue.length > 0) {
      const name = state.queue.shift();
      if (state.marked.includes(name)) continue;
      state.marked.push(name);
      budget -= 1;
      markedNow += 1;
      targets(state.refs, name).forEach(function (target) { enqueue(state, target); });
    }
    return markedNow;
  }

  let marked = 0;
  let judged = 0;
  events.forEach(function (event, index) {
    const key = eventKey(event, index);
    if (state.applied.includes(key)) return;
    if (!event || typeof event !== "object" || typeof event.kind !== "string") {
      fail("E_BAD_EVENT", "event #" + index + " is not a legal event");
    }
    if (event.kind === "root") {
      if (typeof event.obj !== "string" || !objects.includes(event.obj)) {
        fail("E_UNKNOWN_OBJECT", "unknown root object: " + event.obj);
      }
      if (!state.roots.includes(event.obj)) state.roots.push(event.obj);
      enqueue(state, event.obj);
    } else if (event.kind === "link") {
      if (typeof event.from !== "string" || !objects.includes(event.from)
          || typeof event.to !== "string" || !objects.includes(event.to)) {
        fail("E_UNKNOWN_OBJECT", "unknown link endpoint: " + event.from + " -> " + event.to);
      }
      state.refs = link(state.refs, event.from, event.to);
      if (state.marked.includes(event.from)) enqueue(state, event.to);
    } else {
      fail("E_BAD_EVENT", "unknown event kind: " + event.kind);
    }
    state.applied.push(key);
    judged += 1;
    marked += drain();
  });

  return {
    state: state,
    marked: marked,
    queue_before: state.queue.length,
    queue: state.queue.slice(),
    judged: judged,
    judged_bound: events.length
  };
}

export function close(spec) {
  const state = cloneState(spec.state || {});
  let catchup = 0;
  while (state.queue.length > 0) {
    const name = state.queue.shift();
    if (state.marked.includes(name)) continue;
    state.marked.push(name);
    catchup += 1;
    targets(state.refs, name).forEach(function (target) {
      if (!state.marked.includes(target) && !state.queue.includes(target)) {
        state.queue.push(target);
      }
    });
  }
  const live = new Set(state.marked);
  const objects = (spec.objects || []).slice().sort();
  objects.forEach(function (name) {
    if (!live.has(name) && !state.freed.includes(name)) state.freed.push(name);
  });
  state.freed.sort();
  return { state: state, catchup: catchup };
}
