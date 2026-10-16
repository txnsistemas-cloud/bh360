# Validação da entrega — Fase 1

Validação em 15/10/2026 (horário de Brasília).

- Site: https://txnsistemas-cloud.github.io/bh360/
- Código: https://github.com/txnsistemas-cloud/bh360
- Commit publicado: 0b81721a265836024f86428d73195acd53677a6e.
- GitHub Actions: CI Qualidade 38840425144 e Pages 38840425121 concluídos com sucesso. Dez testes, build estático e TypeScript passaram.
- Auditoria npm de produção: nenhuma vulnerabilidade conhecida na consulta realizada durante a entrega.
- Dados oficiais PBH/BHGEO e IBGE: seis conjuntos obtidos; 323 bairros, 84 parques, 160 centros de saúde, 180 escolas e 973 segmentos cicloviários. O catálogo registra coleta e fontes; referência temporal desconhecida permanece indicada.
- Edge desktop: base OpenFreeMap renderizada, geometrias oficiais carregadas; seleção e busca local de Sion com área de 1,598 km²; camada de saúde ativada; troca para base clara preservando seleção.
- Busca externa: Avenida Afonso Pena retornou resultados Nominatim, identificados como dados de terceiros.
- Exportação: bh360-selecao.geojson baixado e lido como FeatureCollection, com fonte PBH/BHGEO.
- Visual móvel: viewport 390 × 844, pesquisa, navegação inferior e painel de Sion conferidos. Não equivale a ensaio em aparelho físico.
- Worker MapLibre servido como módulo original da distribuição. Build copia worker e licença para os arquivos públicos.
- Medição possui testes geodésicos automatizados; roteiro manual de cliques não concluído. Outros navegadores não ensaiados.

Exportação estática sem conta ou backend. Tiles e geocodificação dependem dos serviços externos e de internet. Fase 1 não inclui população integrada, simulação urbana ou edifícios com altura real; 3D representa inclinação do mapa plano.
