import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateCollection } from "../lib/geo.mjs";
const catalog = JSON.parse(
  await readFile(
    new URL("../public/data/catalog.json", import.meta.url),
    "utf8",
  ),
);
for (const item of catalog.datasets) {
  test(`integridade e coordenadas WGS84: ${item.id}`, async () => {
    assert.equal(item.status, "available");
    const data = validateCollection(
      JSON.parse(
        await readFile(
          new URL(`../public/data/${item.id}.geojson`, import.meta.url),
          "utf8",
        ),
      ),
    );
    assert.equal(data.features.length, item.count);
    const ids = new Set();
    function check(coords) {
      if (typeof coords[0] === "number") {
        assert.ok(coords[0] > -44.2 && coords[0] < -43.7);
        assert.ok(coords[1] > -20.2 && coords[1] < -19.6);
      } else coords.forEach(check);
    }
    for (const f of data.features) {
      check(f.geometry.coordinates);
      if (f.id) {
        assert.ok(!ids.has(f.id));
        ids.add(f.id);
      }
    }
  });
}
