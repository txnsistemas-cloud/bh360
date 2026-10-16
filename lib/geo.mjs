export function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
export function featureName(feature) {
  const p = feature?.properties ?? {};
  const key =
    Object.keys(p).find((k) =>
      /^(NOME|NOM_BAIRRO|NOME_BAIRRO|NOM_PARQUE|NOME_FANTASIA|NOM_CENTRO_SAUDE)$/i.test(
        k,
      ),
    ) ?? Object.keys(p).find((k) => /NOM|DENOM/i.test(k));
  return String(key ? p[key] : (feature?.id ?? "Elemento geográfico"));
}
export function distanceKm(points) {
  let km = 0;
  for (let i = 1; i < points.length; i++) {
    const [a, b] = points[i - 1],
      [c, d] = points[i];
    const r = Math.PI / 180;
    const h =
      Math.sin(((d - b) * r) / 2) ** 2 +
      Math.cos(b * r) * Math.cos(d * r) * Math.sin(((c - a) * r) / 2) ** 2;
    km += 6371.0088 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
  return km;
}
export function validateCollection(data) {
  if (
    data?.type !== "FeatureCollection" ||
    !Array.isArray(data.features) ||
    !data.features.length
  )
    throw new Error("Coleção geográfica vazia ou inválida");
  for (const f of data.features) {
    if (!f.geometry || !f.geometry.coordinates)
      throw new Error("Geometria ausente");
  }
  return data;
}
