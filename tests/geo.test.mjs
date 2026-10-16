import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalize,
  featureName,
  distanceKm,
  validateCollection,
} from "../lib/geo.mjs";
test("busca ignora acentos e caixa", () =>
  assert.equal(normalize("São LUÍS"), "sao luis"));
test("nome vem do atributo da fonte", () =>
  assert.equal(featureName({ properties: { NOME: "Centro" } }), "Centro"));
test("medição geodésica conhecida e caminho vazio", () => {
  assert.ok(
    Math.abs(
      distanceKm([
        [0, 0],
        [1, 0],
      ]) - 111.195,
    ) < 0.01,
  );
  assert.equal(distanceKm([]), 0);
});
test("rejeita payloads inválidos e vazios", () => {
  assert.throws(() =>
    validateCollection({ type: "FeatureCollection", features: [] }),
  );
  assert.throws(() => validateCollection({ error: "indisponível" }));
});
