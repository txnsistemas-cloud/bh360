# BH 360° — Belo Horizonte em Transformação

Fase 1: explorador cartográfico real em Next.js, React, TypeScript, MapLibre GL JS, Lucide e Turf.js. Interface em português, tema escuro, painéis recolhíveis e layout móvel. Não é uma previsão urbanística nem substitui consulta técnica.

## Executar

Requer Node.js 22.19+ ou 24 LTS e npm. Não requer chave, banco de dados ou conta.

```sh
npm ci
npm run dev
```

Abra http://127.0.0.1:3000. O navegador precisa de WebGL e de acesso à internet para tiles, fontes e pesquisa de endereços. As geometrias oficiais acompanham o código e não dependem de chamadas WFS durante a navegação. Para ambiente totalmente offline, fornecer uma base cartográfica local e fontes locais.

```sh
npm test
npm run typecheck
npm run build
```

O build gera `out/`, pronto para hospedagem estática. O arquivo `.babelrc` usa o compilador Babel para compatibilidade com o ambiente Windows de execução. O inicializador em `scripts/build.mjs` aplica uma alternativa síncrona para operações de sistema de arquivos que retornem EPERM no ambiente restrito Windows, preservando a resolução de links e as permissões do sistema. Em PowerShell com restrição de scripts, use `npm.cmd`.

O inicializador também copia o worker original do MapLibre e sua licença para `public/`, preservando o módulo sem transformações de Babel. Esses dois arquivos são gerados a partir da dependência instalada e incluídos na exportação estática. O contêiner do mapa mantém posição absoluta e acompanha alterações de tamanho por ResizeObserver.

## Funcionalidades

- Limite municipal IBGE 3106200, independente da região metropolitana.
- 323 bairros oficiais selecionáveis, busca local sem distinção de acentos.
- Parques municipais, centros de saúde, escolas municipais de ensino fundamental e rotas cicloviárias, com alternância individual e identificação.
- Pesquisa de ruas e lugares via Nominatim ao enviar a consulta; resultados de terceiros identificados. O serviço público pode limitar consultas.
- Zoom, deslocamento, rotação, inclinação, norte, enquadramento municipal e escala métrica.
- Medição de caminhos por distância geodésica (não representa percurso viário).
- Área geodésica dos polígonos completos selecionados, calculada com Turf.js; exportação GeoJSON.
- Catálogo com origem, coleta, limitações e situação das fontes; avisos de falhas externas.

## Dados e atualização

Origem PBH: https://prefeitura.pbh.gov.br/bhgeo/acesso-aos-dados

WFS: https://bhmap.pbh.gov.br/v2/api/idebhgeo/wfs

O importador consulta GetCapabilities, confirma os nomes das camadas, pagina GetFeature e solicita EPSG:4326. O CRS original declarado é EPSG:31983. Cada conjunto é substituído por renomeação após validação; falhas não sobrescrevem a cópia anterior. O catálogo registra a tentativa e indisponibilidades. Revise as alterações antes de publicar.

```sh
node --use-system-ca scripts/ingest.mjs
```

`public/data/catalog.json` registra a data real da coleta em UTC. A interface converte a data para America/Sao_Paulo. O serviço não informa ano de referência nesta extração: não confundir coleta com atualização da fonte. `docs/wfs-capabilities.xml` preserva as capacidades consultadas. A ausência de restrição declarada não é licença explícita de redistribuição: consultar metadados e condições PBH antes de uso comercial. A malha simplificada IBGE não serve para cadastro de lotes. Quantidades de feições são contagens da extração, sem afirmar cobertura completa ou situação atual de funcionamento.

Limite municipal: API de malhas IBGE v3, município 3106200, qualidade intermediária. Base vetorial escura: OpenFreeMap / © OpenMapTiles, com dados © OpenStreetMap (ODbL). Base raster clara: © OpenStreetMap, com atribuição visível. O estilo Dark do OpenFreeMap é incluído em `public/data/basemap-dark.json`; veja https://openfreemap.org/quick_start/. Camadas de extrusão são excluídas para evitar edifícios sem alturas verificadas. A opção clara também serve como alternativa quando o serviço vetorial falha. Endereços: © OpenStreetMap/Nominatim, enviados apenas após ação do usuário, sem autocomplete externo. Escolas não incluem toda a rede educacional; centros de saúde não incluem toda a rede hospitalar. Rotas podem ter diferentes situações cadastrais: ver atributos.

## Arquitetura

`app/`: páginas e estilos; `components/Explorer.tsx`: mapa e painéis; `lib/geo.mjs`: busca, medição e validação; `scripts/ingest.mjs`: atualização das fontes; `public/data/`: cópias oficiais e catálogo; `tests/`: testes geométricos e de dados. Sem segredos no frontend, HTML de propriedades não é injetado, validação de coleções na ingestão e timeouts em chamadas externas. Sem autenticação ou dados privados nesta fase.

## Publicar e GitHub

Repositório: https://github.com/txnsistemas-cloud/bh360

O workflow `.github/workflows/pages.yml` publica a branch `main` no GitHub Pages após testes, build e verificação TypeScript. Em **Settings → Pages → Build and deployment → Source**, selecione **GitHub Actions**. O endereço esperado após a publicação é https://txnsistemas-cloud.github.io/bh360/ — confirme a conclusão em Actions antes de considerar o site publicado.

No build para Pages, `NEXT_PUBLIC_BASE_PATH=/bh360` configura os arquivos Next.js e os caminhos de dados. Para execução local, deixe essa variável ausente e use `npm run dev` normalmente. Ao usar outro nome de repositório, atualize essa variável no workflow.

Qualquer hospedagem estática pode servir `out/` na raiz do domínio. O workflow `.github/workflows/ci.yml` verifica testes, tipos e build a cada push/PR. Para Vercel, importar repositório como Next.js; para Cloudflare Pages, comando `npm run build`, saída `out`. Sites usa o manifesto `.openai/hosting.json` e o fluxo nativo de publicação privada.

Para criar um repositório no seu GitHub, crie um repositório vazio e execute, com sua URL real:

Se extrair o ZIP de código, inicialize antes com `git init -b main`, `git add .` e `git commit -m "BH 360 fase 1"`. A pasta original desta entrega já possui um repositório Git local.

```sh
git remote add github https://github.com/SEU_USUARIO/bh360.git
git push -u github HEAD:main
```

Nenhuma URL de repositório GitHub é presumida. A publicação via Sites utiliza o repositório de origem gerenciado pela plataforma.

## Aceitação manual

1. Abrir mapa e confirmar limite pontilhado municipal e atribuição.
2. Pesquisar Sion e selecionar; verificar destaque e painel correspondente. Bairros cadastrais oficiais podem ter nomes diferentes dos bairros populares.
3. Ativar cada camada; selecionar parque ou equipamento, ler seus atributos e fonte.
4. Recolher painéis e testar zoom, rotação, norte e medição com dois cliques.
5. Pesquisar endereço com Enter; falha externa deve produzir aviso sem apagar dados locais.
6. Exportar seleção e abrir GeoJSON em GIS; conferir geometria completa.
7. Testar largura 390 px e 1440 px, teclado e nomes acessíveis.

## Próximas fases

Fase 2: indicadores IBGE, zoneamento e metadados completos. Fase 3: séries históricas e projetos documentados. Fase 4: editor e motor de cenários versionados. Fase 5: persistência entre dispositivos e autenticação. Botões dessas áreas informam o escopo; não exibem resultados fictícios. O botão 3D nesta entrega inclina a base plana, sem edifícios inventados.
