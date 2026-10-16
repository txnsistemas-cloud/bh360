import { mkdir, writeFile, rename, readFile } from "node:fs/promises";
import { validateCollection } from "../lib/geo.mjs";
const base = "https://bhmap.pbh.gov.br/v2/api/idebhgeo/wfs";
const layers = [
  ["bairros", "BAIRRO_OFICIAL"],
  ["parques", "PARQUES_MUNICIPAIS"],
  ["saude", "CENTRO_SAUDE"],
  ["escolas", "ESCOLAS_MUNICIPAIS_ENSINO_FUNDAMENTAL"],
  ["ciclovias", "ROTA_CICLOVIARIA"],
];
await mkdir("public/data", { recursive: true });
async function download(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(90000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}
const xml = await download(
  base + "?service=WFS&version=2.0.0&request=GetCapabilities",
);
await mkdir("docs", { recursive: true });
await writeFile("docs/wfs-capabilities.xml", xml);
const metadata = {
  downloadedAt: new Date().toISOString(),
  crs: "EPSG:4326",
  originalCRS: "EPSG:31983",
  referenceYear: null,
  accessConstraints:
    "GetCapabilities sem restrição declarada; licença específica não informada. Confirmar termos na PBH antes de redistribuição comercial.",
  datasets: [],
};
for (const [id, type] of layers) {
  try {
    if (!xml.includes("ide_bhgeo:" + type))
      throw new Error("Camada não consta nas capacidades");
    let features = [];
    for (let start = 0; start < 50000;) {
      const q = new URLSearchParams({
        service: "WFS",
        version: "2.0.0",
        request: "GetFeature",
        typeNames: "ide_bhgeo:" + type,
        outputFormat: "application/json",
        srsName: "EPSG:4326",
        count: "1000",
        startIndex: String(start),
      });
      const page = validateCollection(
        JSON.parse(await download(base + "?" + q)),
      );
      features.push(...page.features);
      const total = Number(page.totalFeatures ?? page.numberMatched);
      if (
        page.features.length < 1000 ||
        (Number.isFinite(total) && features.length >= total)
      )
        break;
      start += page.features.length;
    }
    const data = validateCollection({ type: "FeatureCollection", features });
    await writeFile(`public/data/${id}.geojson.tmp`, JSON.stringify(data));
    await rename(`public/data/${id}.geojson.tmp`, `public/data/${id}.geojson`);
    metadata.datasets.push({
      id,
      layer: type,
      count: features.length,
      source: base,
      status: "available",
    });
    console.log(id, features.length);
  } catch (e) {
    metadata.datasets.push({
      id,
      layer: type,
      status: "unavailable",
      error: e.message,
    });
    console.error(id, e.message);
  }
}
try {
  const url =
    "https://servicodados.ibge.gov.br/api/v3/malhas/municipios/3106200?formato=application/vnd.geo+json&qualidade=intermediaria";
  const data = validateCollection(JSON.parse(await download(url)));
  await writeFile("public/data/municipio.geojson", JSON.stringify(data));
  metadata.datasets.push({
    id: "municipio",
    source: url,
    count: data.features.length,
    status: "available",
    quality:
      "Malha simplificada, qualidade intermediária; inadequada para cadastro de lotes.",
  });
} catch (e) {
  console.error(e);
  process.exitCode = 1;
}
await writeFile("public/data/catalog.json", JSON.stringify(metadata, null, 2));
if (metadata.datasets.some((d) => d.status === "unavailable"))
  process.exitCode = 1;
