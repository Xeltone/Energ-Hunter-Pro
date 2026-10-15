import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeDrinks, parseDrinks } from "./data.ts";
import type { Drink } from "./types.ts";

const drink = (id: string, name = "Red Bull"): Drink => ({
  id,
  name,
  flavor: "Original",
  status: "drank",
  date: "2026-10-08",
  rating: { taste: 4, effect: 4, design: 3, value: 4 },
  notes: "",
  volume: 0.25,
  caffeine: 80,
  sugar: 27,
  price: 120,
  store: "Test",
  image: "",
});

describe("drink data helpers", () => {
  it("accepts valid records and rejects invalid records without mutating input", () => {
    const valid = drink("valid");
    assert.deepEqual(parseDrinks([valid, { id: "bad" }]), [valid]);
  });

  it("keeps local records absent from cloud and lets cloud records win by id", () => {
    const local = [drink("local"), drink("shared")];
    const cloud = [drink("shared", "Cloud Red Bull")];

    assert.deepEqual(mergeDrinks(local, cloud), [
      cloud[0],
      local[0],
    ]);
  });

  it("limits imported data to the supported maximum", () => {
    const records = Array.from({ length: 2001 }, (_, i) => drink(`item-${i}`));
    assert.throws(() => parseDrinks(records), /2000/);
  });
});
