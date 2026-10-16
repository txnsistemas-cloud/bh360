"use client";
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as GLMap, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Search,
  Layers,
  Map as MapIcon,
  Leaf,
  HeartPulse,
  GraduationCap,
  Bike,
  Compass,
  Plus,
  Minus,
  LocateFixed,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUpRight,
  Info,
  Check,
  Navigation,
  Ruler,
  Globe,
  Settings2,
  Download,
  PanelLeft,
  Building2,
  Clock3,
  ChartNoAxesCombined,
  Route,
} from "lucide-react";
import type { Feature, FeatureCollection } from "geojson";
import bbox from "@turf/bbox";
import area from "@turf/area";
import { normalize, featureName, distanceKm } from "../lib/geo.mjs";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const definitions = [
  {
    id: "bairros",
    name: "Bairros oficiais",
    detail: "Limites territoriais",
    color: "#5ac9e8",
    Icon: Building2,
  },
  {
    id: "parques",
    name: "Parques municipais",
    detail: "Polígonos de parques",
    color: "#65d5a3",
    Icon: Leaf,
  },
  {
    id: "ciclovias",
    name: "Rotas cicloviárias",
    detail: "Situação conforme cadastro",
    color: "#e6bd72",
    Icon: Bike,
  },
  {
    id: "saude",
    name: "Centros de saúde",
    detail: "Rede municipal",
    color: "#e697ab",
    Icon: HeartPulse,
  },
  {
    id: "escolas",
    name: "Escolas municipais",
    detail: "Ensino fundamental",
    color: "#b9a2ed",
    Icon: GraduationCap,
  },
];
type Catalog = {
  downloadedAt: string;
  referenceYear: null;
  datasets: {
    id: string;
    count?: number;
    source: string;
    status: string;
    layer?: string;
  }[];
};
type Selected = { feature: Feature; layer: string };
export default function Explorer() {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<GLMap | null>(null),
    collections = useRef<Record<string, FeatureCollection>>({}),
    measuring = useRef(false),
    points = useRef<number[][]>([]);
  const [ready, setReady] = useState(false),
    [catalog, setCatalog] = useState<Catalog | null>(null),
    [enabled, setEnabled] = useState<Record<string, boolean>>({
      bairros: true,
      parques: true,
      ciclovias: false,
      saude: false,
      escolas: false,
    }),
    [selected, setSelected] = useState<Selected | null>(null),
    [query, setQuery] = useState(""),
    [results, setResults] = useState<Selected[]>([]),
    [remote, setRemote] = useState<Feature[]>([]),
    [searching, setSearching] = useState(false),
    [left, setLeft] = useState(true),
    [right, setRight] = useState(true),
    [tab, setTab] = useState("camadas"),
    [modal, setModal] = useState(""),
    [error, setError] = useState(""),
    [coords, setCoords] = useState([-43.9345, -19.9167]),
    [measure, setMeasure] = useState(false),
    [length, setLength] = useState(0),
    [pitch, setPitch] = useState(false),
    [base, setBase] = useState("escuro");
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>("[role=dialog]");
    const elements = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>("button,a,input,[tabindex]") ??
          [],
      ).filter((e) => !e.hasAttribute("disabled"));
    elements()[0]?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setModal("");
      if (e.key === "Tab") {
        const items = elements(),
          first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [modal]);
  useEffect(() => {
    if (!container.current) return;
    let stopped = false;
    let m: GLMap;
    try {
      m = new maplibregl.Map({
        container: container.current,
        center: [-43.95, -19.88],
        zoom: 11.4,
        minZoom: 8,
        maxZoom: 19,
        style: {
          version: 8,
          sources: {
            base: {
              type: "raster",
              tiles: [
                "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
              attribution:
                '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
            },
          },
          layers: [{ id: "base", type: "raster", source: "base" }],
        },
        attributionControl: { compact: true },
      });
    } catch {
      setError(
        "Não foi possível iniciar o mapa. Este navegador precisa de WebGL habilitado; tente outro navegador ou dispositivo.",
      );
      return;
    }
    map.current = m;
    m.addControl(
      new maplibregl.ScaleControl({ unit: "metric" }),
      "bottom-left",
    );
    m.on("mousemove", (e) => setCoords([e.lngLat.lng, e.lngLat.lat]));
    let tileWarned = false;
    m.on("error", (e) => {
      if (!tileWarned) {
        tileWarned = true;
        setError(
          "Uma fonte cartográfica falhou. Os dados locais continuam disponíveis; confira sua conexão.",
        );
      }
      console.warn(e.error.message);
    });
    m.on("load", async () => {
      try {
        const c = await fetch(`${basePath}/data/catalog.json`).then((r) => {
          if (!r.ok) throw Error("Catálogo indisponível");
          return r.json();
        });
        if (stopped) return;
        setCatalog(c);
        const municipal = await fetch(`${basePath}/data/municipio.geojson`).then((r) =>
          r.json(),
        );
        collections.current.municipio = municipal;
        m.addSource("municipio", { type: "geojson", data: municipal });
        m.addLayer({
          id: "municipio-fill",
          type: "fill",
          source: "municipio",
          paint: { "fill-color": "#48c9d0", "fill-opacity": 0.035 },
        });
        m.addLayer({
          id: "municipio-line",
          type: "line",
          source: "municipio",
          paint: {
            "line-color": "#74d5d5",
            "line-width": 2,
            "line-dasharray": [4, 3],
          },
        });
        await Promise.all(
          definitions.map(async (d) => {
            try {
              const r = await fetch(`${basePath}/data/${d.id}.geojson`);
              if (!r.ok) throw Error();
              const data = await r.json();
              if (stopped) return;
              collections.current[d.id] = data;
              m.addSource(d.id, {
                type: "geojson",
                data,
                promoteId: d.id === "bairros" ? "ID_BAC" : undefined,
              });
              const type =
                d.id === "saude" || d.id === "escolas"
                  ? "circle"
                  : d.id === "ciclovias"
                    ? "line"
                    : "fill";
              const paint =
                type === "circle"
                  ? {
                      "circle-radius": 5,
                      "circle-color": d.color,
                      "circle-stroke-color": "#10212d",
                      "circle-stroke-width": 2,
                    }
                  : type === "line"
                    ? { "line-color": d.color, "line-width": 3 }
                    : {
                        "fill-color": d.color,
                        "fill-opacity": d.id === "bairros" ? 0.035 : 0.3,
                      };
              m.addLayer({
                id: d.id,
                type,
                source: d.id,
                layout: {
                  visibility: ["bairros", "parques"].includes(d.id)
                    ? "visible"
                    : "none",
                },
                paint,
              } as maplibregl.LayerSpecification);
              if (type === "fill")
                m.addLayer({
                  id: d.id + "-outline",
                  type: "line",
                  source: d.id,
                  layout: {
                    visibility: ["bairros", "parques"].includes(d.id)
                      ? "visible"
                      : "none",
                  },
                  paint: {
                    "line-color": d.color,
                    "line-width": d.id === "bairros" ? 0.65 : 1,
                    "line-opacity": 0.5,
                  },
                });
            } catch {
              setError(
                `Não foi possível carregar ${d.name}. Outras camadas seguem disponíveis.`,
              );
            }
          }),
        );
        if (stopped) return;
        m.addSource("selection", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        m.addLayer({
          id: "selected-fill",
          type: "fill",
          source: "selection",
          filter: ["==", ["geometry-type"], "Polygon"],
          paint: { "fill-color": "#46d6df", "fill-opacity": 0.2 },
        });
        m.addLayer({
          id: "selected-line",
          type: "line",
          source: "selection",
          filter: ["!=", ["geometry-type"], "Point"],
          paint: { "line-color": "#8aeef2", "line-width": 2 },
        });
        m.addLayer({
          id: "selected-point",
          type: "circle",
          source: "selection",
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-color": "#fff",
            "circle-radius": 9,
            "circle-stroke-color": "#32b5c8",
            "circle-stroke-width": 4,
          },
        });
        m.addSource("measure", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        m.addLayer({
          id: "measure-line",
          type: "line",
          source: "measure",
          paint: {
            "line-color": "#ffd28b",
            "line-width": 3,
            "line-dasharray": [2, 2],
          },
        });
        setReady(true);
      } catch {
        setError(
          "Falha ao carregar os dados locais. Recarregue a página ou consulte o README.",
        );
      }
    });
    m.on("click", (e) => {
      if (measuring.current) {
        points.current.push([e.lngLat.lng, e.lngLat.lat]);
        setLength(distanceKm(points.current));
        if (points.current.length > 1)
          (m.getSource("measure") as GeoJSONSource)?.setData({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: points.current },
          });
        return;
      }
      const layers = [
        "saude",
        "escolas",
        "parques",
        "ciclovias",
        "bairros",
      ].filter((id) => m.getLayer(id));
      const f = m.queryRenderedFeatures(e.point, { layers })[0];
      if (f) {
        const original = collections.current[f.layer.id]?.features.find(
          (item) =>
            String(item.id) === String(f.id) ||
            (f.layer.id === "bairros" &&
              item.properties?.ID_BAC === f.properties?.ID_BAC),
        );
        setSelected({
          feature: original ?? JSON.parse(JSON.stringify(f)),
          layer: f.layer.id,
        });
        setRight(true);
      }
    });
    return () => {
      stopped = true;
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    for (const [id, on] of Object.entries(enabled))
      for (const layer of [id, id + "-outline"])
        if (m.getLayer(layer))
          m.setLayoutProperty(layer, "visibility", on ? "visible" : "none");
  }, [enabled, ready]);
  useEffect(() => {
    if (!ready) return;
    (map.current?.getSource("selection") as GeoJSONSource)?.setData({
      type: "FeatureCollection",
      features: selected ? [selected.feature] : [],
    });
  }, [selected, ready]);
  useEffect(() => {
    const q = normalize(query.trim());
    setRemote([]);
    setResults(
      q.length < 2
        ? []
        : Object.entries(collections.current)
            .filter(([id]) => id !== "municipio" && id !== "ciclovias")
            .flatMap(([layer, c]) =>
              c.features
                .filter((f) => normalize(featureName(f)).includes(q))
                .map((feature) => ({ feature, layer })),
            )
            .slice(0, 9),
    );
  }, [query]);
  function focus(s: Selected) {
    setSelected(s);
    setRight(true);
    setQuery("");
    const b = bbox(s.feature);
    if (b[0] === b[2]) map.current?.flyTo({ center: [b[0], b[1]], zoom: 16 });
    else
      map.current?.fitBounds(b as [number, number, number, number], {
        padding: 70,
        maxZoom: 15,
        duration: 1000,
      });
  }
  async function searchAddress() {
    if (query.trim().length < 3) return;
    setSearching(true);
    setRemote([]);
    try {
      const q = new URLSearchParams({
        q: `${query}, Belo Horizonte, Minas Gerais, Brasil`,
        format: "geojson",
        limit: "5",
        viewbox: "-44.07,-19.77,-43.85,-20.06",
        bounded: "1",
        countrycodes: "br",
        addressdetails: "1",
      });
      const r = await fetch("https://nominatim.openstreetmap.org/search?" + q, {
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) throw Error();
      const data = await r.json();
      setRemote(data.features);
      if (!data.features.length)
        setError("Nenhum endereço encontrado. Tente o nome completo da via.");
    } catch {
      setError(
        "Busca de endereços indisponível. A busca local de bairros continua funcionando.",
      );
    } finally {
      setSearching(false);
    }
  }
  function toggleMeasure() {
    const next = !measure;
    measuring.current = next;
    setMeasure(next);
    points.current = [];
    setLength(0);
    (map.current?.getSource("measure") as GeoJSONSource)?.setData({
      type: "FeatureCollection",
      features: [],
    });
  }
  function exportSelection() {
    const data = selected
      ? { type: "FeatureCollection", features: [selected.feature] }
      : collections.current.municipio;
    if (!data) return;
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify({
            ...data,
            source:
              selected?.layer === "osm"
                ? "OpenStreetMap/Nominatim"
                : selected
                  ? "PBH/BHGEO"
                  : "IBGE",
            downloadedAt: catalog?.downloadedAt,
          }),
        ],
        { type: "application/geo+json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "bh360-selecao.geojson";
    a.click();
    URL.revokeObjectURL(url);
  }
  const d = definitions.find((d) => d.id === selected?.layer),
    isPolygon =
      selected &&
      ["Polygon", "MultiPolygon"].includes(selected.feature.geometry.type),
    selectedArea = isPolygon ? area(selected.feature) / 1e6 : null;
  return (
    <main className="app">
      <div
        ref={container}
        className="map"
        aria-label="Mapa interativo de Belo Horizonte"
      />
      <div className="map-shade" />
      <header className="topbar">
        <a href={`${basePath}/`} className="brand" aria-label="BH 360 página inicial">
          <span className="brand-mark">
            <Globe size={24} />
          </span>
          <span>
            BH <b>360°</b>
            <small>BELO HORIZONTE EM TRANSFORMAÇÃO</small>
          </span>
        </a>
        <div className="search-wrap">
          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              searchAddress();
            }}
          >
            <Search size={18} />
            <input
              aria-label="Pesquisar bairros, ruas e lugares"
              placeholder="Busque um bairro, rua ou lugar em BH"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => setQuery("")}
              >
                <X size={15} />
              </button>
            ) : (
              <kbd>↵</kbd>
            )}
          </form>
          {query.length > 1 && (
            <div className="search-results">
              {results.map((s, i) => (
                <button key={i} onClick={() => focus(s)}>
                  <MapIcon size={16} />
                  <span>
                    {featureName(s.feature)}
                    <small>
                      {definitions.find((x) => x.id === s.layer)?.name} · PBH
                    </small>
                  </span>
                  <ArrowUpRight size={14} />
                </button>
              ))}
              {remote.map((f, i) => (
                <button
                  key={"r" + i}
                  onClick={() => focus({ feature: f, layer: "osm" })}
                >
                  <Navigation size={15} />
                  <span>
                    {String(f.properties?.display_name)}
                    <small>OpenStreetMap · endereço de terceiros</small>
                  </span>
                </button>
              ))}
              <button onClick={searchAddress} disabled={searching}>
                <Search size={16} />
                {searching
                  ? "Consultando endereço…"
                  : "Pesquisar endereço no OpenStreetMap"}
              </button>
              <small className="search-note">
                Busca externa somente ao pressionar Enter. Resultado pode estar
                fora do município; limite oficial permanece visível.
              </small>
            </div>
          )}
        </div>
        <div className="top-actions">
          <span className="live">
            <i />
            EXPLORADOR TERRITORIAL
          </span>
          <button className="version" onClick={() => setModal("fase")}>
            Fase 01 <ArrowUpRight size={14} />
          </button>
          <button
            className="icon-btn"
            aria-label="Configurações"
            onClick={() => setModal("config")}
          >
            <Settings2 size={18} />
          </button>
        </div>
      </header>
      <nav className="rail" aria-label="Navegação principal">
        {[
          { id: "camadas", Icon: Compass, label: "Explorar" },
          { id: "bairros", Icon: Building2, label: "Bairros" },
          { id: "fontes", Icon: Layers, label: "Fontes de dados" },
          { id: "futuro", Icon: Route, label: "Mobilidade e próximas fases" },
          { id: "historico", Icon: Clock3, label: "Evolução histórica" },
          {
            id: "indicadores",
            Icon: ChartNoAxesCombined,
            label: "Indicadores",
          },
        ].map((n) => (
          <button
            key={n.id}
            title={n.label}
            aria-label={n.label}
            className={tab === n.id ? "active" : ""}
            onClick={() => {
              if (["futuro", "historico", "indicadores"].includes(n.id)) {
                setModal("fase");
                return;
              }
              setTab(n.id);
              setLeft(true);
            }}
          >
            <n.Icon size={21} />
            {tab === n.id && <i />}
          </button>
        ))}
        <div className="rail-bottom">
          <button
            title="Sobre os dados"
            aria-label="Sobre os dados"
            onClick={() => setModal("fontes")}
          >
            <Info size={20} />
          </button>
          <span>BH</span>
        </div>
      </nav>
      {left ? (
        <aside className="left panel">
          <div className="panel-head">
            <span className="eyebrow">CONHEÇA O TERRITÓRIO</span>
            <button
              aria-label="Recolher painel de camadas"
              onClick={() => setLeft(false)}
            >
              <ChevronLeft size={17} />
            </button>
          </div>
          <h1>
            {tab === "bairros"
              ? "Bairros de BH"
              : tab === "fontes"
                ? "Dados transparentes"
                : "Uma cidade.\nMuitas perspectivas."}
          </h1>
          <p className="intro">
            Explore as camadas que compõem Belo Horizonte e descubra a cidade
            por outro ângulo.
          </p>
          <div className="tabs">
            <button
              className={tab !== "bairros" ? "selected" : ""}
              onClick={() => setTab("camadas")}
            >
              Camadas do mapa
            </button>
            <button
              className={tab === "bairros" ? "selected" : ""}
              onClick={() => setTab("bairros")}
            >
              Bairros
            </button>
          </div>
          {tab === "bairros" ? (
            <div className="neighborhoods">
              <label className="mini-search">
                <Search size={15} />
                <input
                  placeholder="Encontrar bairro…"
                  aria-label="Filtrar bairros"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              {(collections.current.bairros?.features ?? [])
                .filter((f) =>
                  normalize(featureName(f)).includes(normalize(query)),
                )
                .sort((a, b) =>
                  featureName(a).localeCompare(featureName(b), "pt-BR"),
                )
                .map((f, i) => (
                  <button
                    key={i}
                    onClick={() => focus({ feature: f, layer: "bairros" })}
                  >
                    <span>{featureName(f)}</span>
                    <ChevronRight size={14} />
                  </button>
                ))}
              {!ready && <p>Carregando bairros…</p>}
            </div>
          ) : tab === "fontes" ? (
            <div className="source-summary">
              <h3>Origem verificável</h3>
              <p>
                Limite municipal: IBGE. Bairros e equipamentos: PBH/BHGEO. Mapa
                base: OpenStreetMap/CARTO.
              </p>
              <button className="primary" onClick={() => setModal("fontes")}>
                Consultar catálogo <ArrowUpRight size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="section-label">
                TERRITÓRIO E INFRAESTRUTURA <span>{definitions.length}</span>
              </div>
              <div className="layer-list">
                {definitions.map((layer) => (
                  <button
                    key={layer.id}
                    className="layer-row"
                    role="switch"
                    aria-checked={!!enabled[layer.id]}
                    onClick={() =>
                      setEnabled((v) => ({ ...v, [layer.id]: !v[layer.id] }))
                    }
                  >
                    <span
                      className="layer-icon"
                      style={{
                        color: layer.color,
                        background: layer.color + "12",
                      }}
                    >
                      <layer.Icon size={19} />
                    </span>
                    <span className="layer-label">
                      {layer.name}
                      <small>{layer.detail}</small>
                    </span>
                    <span
                      className={"switch " + (enabled[layer.id] ? "on" : "")}
                    />
                  </button>
                ))}
              </div>
              <div className="official-note">
                <span className="data-dot" />
                DADOS OFICIAIS · PBH / IBGE
                <button
                  aria-label="Consultar fontes"
                  onClick={() => setModal("fontes")}
                >
                  <Info size={14} />
                </button>
              </div>
              <div className="discovery">
                <span className="eyebrow">COMECE A EXPLORAR</span>
                <h3>A cidade além do mapa.</h3>
                <p>
                  Selecione um bairro para conhecer seus limites e informações
                  territoriais.
                </p>
                <button
                  onClick={() => {
                    const f = collections.current.bairros?.features.find(
                      (f) => normalize(featureName(f)) === "centro",
                    );
                    if (f) focus({ feature: f, layer: "bairros" });
                    else setTab("bairros");
                  }}
                >
                  Explorar o Centro <ArrowUpRight size={16} />
                </button>
                <div className="contour c1" />
                <div className="contour c2" />
                <div className="contour c3" />
              </div>
              <button
                className="source-link"
                onClick={() => setModal("fontes")}
              >
                Fontes, referências e metodologia <ArrowUpRight size={14} />
              </button>
            </>
          )}
          <div className="panel-foot">
            <span className="data-dot" />
            {ready
              ? "Base territorial carregada"
              : "Carregando base territorial…"}
          </div>
        </aside>
      ) : (
        <button
          className="reopen-left icon-btn"
          aria-label="Abrir painel de camadas"
          onClick={() => setLeft(true)}
        >
          <PanelLeft size={20} />
        </button>
      )}
      <div className={"map-title " + (!left ? "wide" : "")}>
        <span>
          <i />
          MINAS GERAIS, BRASIL
        </span>
        <h2>
          Belo Horizonte<small>19°55′ S &nbsp; 43°56′ O</small>
        </h2>
      </div>
      <div className="map-controls">
        <div className="dimension">
          <button
            className={!pitch ? "active" : ""}
            onClick={() => {
              setPitch(false);
              map.current?.easeTo({ pitch: 0, bearing: 0 });
            }}
          >
            2D
          </button>
          <button
            className={pitch ? "active" : ""}
            onClick={() => {
              setPitch(true);
              map.current?.easeTo({ pitch: 55 });
              setError(
                "Vista inclinada ativada. Não há edifícios 3D: alturas confiáveis ainda não foram integradas.",
              );
            }}
          >
            3D
          </button>
        </div>
        <div className="control-stack">
          <button
            aria-label="Aumentar zoom"
            onClick={() => map.current?.zoomIn()}
          >
            <Plus size={20} />
          </button>
          <button
            aria-label="Diminuir zoom"
            onClick={() => map.current?.zoomOut()}
          >
            <Minus size={20} />
          </button>
          <button
            aria-label="Norte para cima"
            onClick={() => map.current?.easeTo({ bearing: 0 })}
          >
            <Compass size={20} />
          </button>
        </div>
        <button
          className="control-single"
          aria-label="Enquadrar município"
          onClick={() => {
            const f = collections.current.municipio;
            if (f)
              map.current?.fitBounds(
                bbox(f) as [number, number, number, number],
                { padding: 75 },
              );
          }}
        >
          <LocateFixed size={20} />
        </button>
        <button
          className={"control-single " + (measure ? "measuring" : "")}
          aria-label="Medir distância"
          onClick={toggleMeasure}
        >
          <Ruler size={20} />
        </button>
      </div>
      {right ? (
        <aside className="right panel">
          <div className="panel-head">
            <span className="eyebrow">
              {selected ? "SELEÇÃO NO MAPA" : "VISÃO GERAL"}
            </span>
            <button
              aria-label="Recolher painel de informações"
              onClick={() => setRight(false)}
            >
              <X size={16} />
            </button>
          </div>
          <div className="territory-icon">
            {selected ? (
              d ? (
                <d.Icon size={24} />
              ) : (
                <MapIcon size={24} />
              )
            ) : (
              <Globe size={25} />
            )}
          </div>
          <span className="location-type">
            {selected
              ? (d?.name ?? "Resultado de endereço")
              : "MUNICÍPIO · MINAS GERAIS"}
          </span>
          <h2>
            {selected
              ? selected.layer === "osm"
                ? String(selected.feature.properties?.display_name).split(
                    ",",
                  )[0]
                : featureName(selected.feature)
              : "Belo Horizonte"}
          </h2>
          <p className="territory-sub">
            {selected
              ? "Território em foco"
              : "Uma leitura do território da capital mineira."}
          </p>
          <span className="verified">
            <Check size={12} />
            {selected?.layer === "osm" ? "Dado de terceiros" : "Fonte oficial"}
          </span>
          <div className="divider" />
          <span className="section-label">INFORMAÇÕES TERRITORIAIS</span>
          <div className="stat">
            <span>{selected ? "Área do polígono" : "Código do município"}</span>
            <strong>
              {selected
                ? selectedArea !== null
                  ? selectedArea.toLocaleString("pt-BR", {
                      maximumFractionDigits: 3,
                    })
                  : "—"
                : "3106200"}
              <small>{selectedArea !== null && selected ? " km²" : ""}</small>
            </strong>
          </div>
          <p className="stat-note">
            {selectedArea !== null
              ? "Área geodésica calculada com Turf.js a partir da geometria selecionada."
              : selected
                ? "Área não se aplica a pontos e linhas."
                : "Identificador oficial IBGE"}
          </p>
          {!selected && (
            <div className="coverage">
              <div>
                <Building2 size={16} />
                <span>Bairros oficiais</span>
                <b>
                  {catalog?.datasets.find((x) => x.id === "bairros")?.count ??
                    "—"}
                </b>
              </div>
              <div>
                <Leaf size={16} />
                <span>Parques cadastrados</span>
                <b>
                  {catalog?.datasets.find((x) => x.id === "parques")?.count ??
                    "—"}
                </b>
              </div>
              <div>
                <HeartPulse size={16} />
                <span>Centros de saúde</span>
                <b>
                  {catalog?.datasets.find((x) => x.id === "saude")?.count ??
                    "—"}
                </b>
              </div>
            </div>
          )}
          {selected && (
            <div className="properties">
              {Object.entries(selected.feature.properties ?? {})
                .filter(
                  ([k, v]) =>
                    v !== null &&
                    /NOME|BAIRRO|LOGRADOURO|NUMERO|REGIONAL|SITUACAO|TIPO|TELEFONE/.test(
                      k,
                    ),
                )
                .slice(0, 6)
                .map(([k, v]) => (
                  <div key={k}>
                    <span>{k.replaceAll("_", " ").toLowerCase()}</span>
                    <b>{String(v)}</b>
                  </div>
                ))}
            </div>
          )}
          <div className="data-disclaimer">
            <Info size={15} />
            <p>
              População e indicadores demográficos serão integrados na Fase 2,
              com ano e metodologia próprios.
            </p>
          </div>
          <div className="source-block">
            <span>FONTE DOS DADOS</span>
            <a
              href={
                selected?.layer === "osm"
                  ? "https://www.openstreetmap.org/copyright"
                  : selected
                    ? "https://prefeitura.pbh.gov.br/bhgeo/acesso-aos-dados"
                    : "https://servicodados.ibge.gov.br/api/docs/malhas?versao=3"
              }
              target="_blank"
              rel="noreferrer"
            >
              {selected?.layer === "osm"
                ? "OpenStreetMap / Nominatim"
                : selected
                  ? "Prefeitura de BH · BHGEO"
                  : "IBGE · Malha municipal"}
              <ArrowUpRight size={14} />
            </a>
            <small>
              Coleta:{" "}
              {catalog
                ? new Date(catalog.downloadedAt).toLocaleDateString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })
                : "…"}{" "}
              · Referência: não informada
            </small>
          </div>
          <button
            className="export"
            disabled={!ready}
            onClick={exportSelection}
          >
            <Download size={15} />
            Exportar geometria GeoJSON
          </button>
          {selected && (
            <button
              className="clear-selection"
              onClick={() => setSelected(null)}
            >
              Limpar seleção
            </button>
          )}
        </aside>
      ) : (
        <button
          className="reopen-right icon-btn"
          aria-label="Abrir informações"
          onClick={() => setRight(true)}
        >
          <Info size={20} />
        </button>
      )}
      <div className="bottom-tools">
        <button onClick={() => setModal("config")}>
          <Layers size={17} />
          <span>Mapa {base}</span>
          <ChevronRight size={14} />
        </button>
        <span className="legend-line" />
        Limite municipal <span className="legend-area" />
        Bairros oficiais
      </div>
      <footer className="statusbar">
        <span>
          <span className="data-dot" />
          BELO HORIZONTE <em>MG · BR</em>
        </span>
        <span className="coordinate">
          {coords[1].toFixed(5)}°, {coords[0].toFixed(5)}°
        </span>
        <span>
          WGS 84 <i />{" "}
          {ready ? "Dados locais · fontes verificáveis" : "Carregando…"}
        </span>
        <button onClick={() => setModal("fontes")}>
          Catálogo de fontes <ArrowUpRight size={12} />
        </button>
      </footer>
      {measure && (
        <div className="measure-info">
          <Ruler size={17} />
          <span>
            {length.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} km{" "}
            <small>
              Clique no mapa para traçar. Distância geodésica; não é rota
              viária.
            </small>
          </span>
          <button onClick={toggleMeasure} aria-label="Encerrar medição">
            <X size={18} />
          </button>
        </div>
      )}
      {error && (
        <div role="status" className="toast">
          <Info size={17} />
          <span>{error}</span>
          <button aria-label="Fechar aviso" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal("")}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Informações da plataforma"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Fechar"
              onClick={() => setModal("")}
            >
              <X size={20} />
            </button>
            <span className="eyebrow">BH 360° · EXPLORAÇÃO RESPONSÁVEL</span>
            <h2>
              {modal === "config"
                ? "Seu mapa, sua perspectiva"
                : modal === "fase"
                  ? "Construindo por etapas"
                  : "Fontes e metodologia"}
            </h2>
            {modal === "config" ? (
              <>
                <p>
                  Escolha a base cartográfica. As camadas oficiais são
                  preservadas.
                </p>
                <div className="base-options">
                  {["escuro", "claro"].map((v) => (
                    <button
                      className={base === v ? "selected" : ""}
                      key={v}
                      onClick={() => {
                        setBase(v);
                        (
                          map.current?.getSource(
                            "base",
                          ) as maplibregl.RasterTileSource
                        )?.setTiles([
                          `https://a.basemaps.cartocdn.com/${v === "claro" ? "light_all" : "dark_all"}/{z}/{x}/{y}.png`,
                        ]);
                      }}
                    >
                      <MapIcon />
                      {v === "escuro" ? "Noturno" : "Claro"}
                      {base === v && <Check size={16} />}
                    </button>
                  ))}
                </div>
                <p>
                  3D nesta fase significa inclinação do mapa plano. Não há
                  extrusão de edifícios sem dados de altura.
                </p>
              </>
            ) : modal === "fase" ? (
              <>
                <p>
                  Esta entrega cobre a Fase 1: mapa real, busca, seleção de
                  bairros, camadas e painel contextual.
                </p>
                <ol>
                  <li className="done">Base funcional · disponível</li>
                  <li>Dados urbanos e indicadores · próxima fase</li>
                  <li>Evolução histórica e projetos documentados</li>
                  <li>Simulador com premissas explícitas</li>
                  <li>Contas, persistência e publicação ampliada</li>
                </ol>
                <p>
                  Nenhuma simulação, série histórica ou obra é representada por
                  dados inventados.
                </p>
              </>
            ) : (
              <>
                <p>
                  As geometrias são cópias dos serviços oficiais. Data de coleta
                  não representa o ano de referência dos dados.
                </p>
                <div className="catalog">
                  {catalog?.datasets.map((s) => (
                    <div key={s.id}>
                      <strong>
                        {s.id === "municipio"
                          ? "Limite municipal · IBGE"
                          : definitions.find((x) => x.id === s.id)?.name}
                      </strong>
                      <span>
                        {s.count ?? "—"} feições ·{" "}
                        {s.status === "available"
                          ? "Disponível"
                          : "Indisponível"}
                      </span>
                      <a
                        href={
                          s.id === "municipio"
                            ? s.source
                            : `${s.source}?service=WFS&request=GetCapabilities`
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Consultar serviço <ArrowUpRight size={12} />
                      </a>
                    </div>
                  ))}
                </div>
                <p>
                  PBH: origem EPSG:31983; exportação solicitada em EPSG:4326.
                  IBGE: malha simplificada, inadequada para cadastro de lotes.
                  Áreas calculadas geodesicamente com Turf.js. Licença
                  específica da PBH não informada no GetCapabilities; confirmar
                  termos para redistribuição comercial.
                </p>
                <p>
                  Base: © OpenStreetMap (ODbL), © CARTO. Endereços: Nominatim,
                  consulta acionada pelo usuário, sem autocomplete externo.
                  Município e região metropolitana são territórios distintos.
                </p>
                <a
                  className="source-link"
                  href="https://prefeitura.pbh.gov.br/bhgeo/acesso-aos-dados"
                  target="_blank"
                  rel="noreferrer"
                >
                  Portal de acesso aos dados BHGEO <ArrowUpRight size={14} />
                </a>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
