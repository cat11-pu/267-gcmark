// app.js：渲染结果
import { link, targets } from "./refgraph.js";
import { step, close } from "./markrun.js";

export function render(spec) {
  const events = spec.events || [];
  const half = Math.ceil(events.length / 2);
  const first = step(spec);
  const closed = close(Object.assign({}, spec, { state: first.state }));
  const r1 = step(Object.assign({}, spec, { events: events.slice(0, half) }));
  const r2 = step(Object.assign({}, spec, { state: r1.state, events: events.slice(half) }));
  const closedTwo = close(Object.assign({}, spec, { state: r2.state }));
  const replay = step(Object.assign({}, spec, { state: closed.state }));
  const wide = step(Object.assign({}, spec, { budget: spec.budget + 2 }));
  const full = step(Object.assign({}, spec, { events: events, budget: events.length + 2 }));
  const fullClosed = close(Object.assign({}, spec, { state: full.state }));
  const fingerprint = function (state) {
    return JSON.stringify({
      refs: state.refs, roots: state.roots.slice().sort(), marked: state.marked.slice().sort(),
      queue: state.queue.slice().sort(), freed: state.freed.slice().sort(),
      applied: state.applied.length
    });
  };
  return { marked: closed.state.marked.slice().sort(), freed: closed.state.freed.slice().sort(),
           roots: closed.state.roots.slice().sort(),
           marked_first: first.marked, marked_wide: wide.marked,
           pair_differs: first.marked !== wide.marked,
           queue_before: first.queue_before, queue: first.queue,
           catchup: closed.catchup, queue_after: closed.state.queue.length,
           mid_differs: fingerprint(r2.state) !== fingerprint(first.state),
           closed_equal: fingerprint(closedTwo.state) === fingerprint(closed.state),
           replay_new: replay.marked, judged: first.judged, judged_bound: first.judged_bound,
           full_diff: fingerprint(closed.state) === fingerprint(fullClosed.state) ? 0 : 1,
           count: events.length, tail: targets({}, "o1").length + Object.keys(link({}, "o1", "o2")).length };
}
