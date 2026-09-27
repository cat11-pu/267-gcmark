import assert from "node:assert";
import { link, targets } from "../refgraph.js";
import { step, close } from "../markrun.js";
import { render } from "../app.js";

const base = {
  budget: 1, objects: ["o1", "o2"],
  state: { refs: {}, roots: [], marked: [], queue: [], freed: [], applied: [] },
  events: [],
  unknown_error_code: "E_UNKNOWN_OBJECT", event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("link returns a table", () => {
  assert.strictEqual(typeof link({}, "o1", "o2"), "object");
});

check("targets returns a list", () => {
  assert.ok(Array.isArray(targets({}, "o1")));
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
