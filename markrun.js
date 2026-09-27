// markrun.js：按标记预算标记并留账（基线：一律给空表）
import { link, targets } from "./refgraph.js";

export function step(spec) {
  return { state: spec.state, marked: 0, queue_before: 0, queue: [], judged: 0, judged_bound: 0 };
}

export function close(spec) {
  return { state: spec.state, catchup: 0 };
}
