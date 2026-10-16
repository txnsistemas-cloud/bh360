# Validação da entrega — Fase 1

- Build estático de produção: Next.js 16.4.2, compilação e verificação TypeScript concluídas.
- Dez testes automatizados: busca, nomes, distância conhecida, rejeição de dados inválidos e integridade geográfica dos seis conjuntos. Todos passaram.
- Auditoria npm das dependências de produção: nenhuma vulnerabilidade conhecida na consulta realizada durante a entrega.
- Serviços oficiais consultados: GetCapabilities WFS e GetFeature PBH; API de malhas IBGE. Todos os seis conjuntos foram obtidos. As capacidades WFS estão preservadas em `docs/wfs-capabilities.xml`.
- Navegação visual desktop/mobile, interação WebGL e geocodificação no navegador: **não verificadas nesta sessão**. As tentativas de acessar prévias HTTP locais pelo navegador falharam por timeout. A compilação não substitui esses testes.
- Publicação: workflow do GitHub Pages preparado para o repositório público `txnsistemas-cloud/bh360`. Confirmar o resultado da execução em Actions; o endereço de destino é `https://txnsistemas-cloud.github.io/bh360/`. A pasta `out/` contém o resultado estático com o prefixo `/bh360` quando compilada com `NEXT_PUBLIC_BASE_PATH=/bh360`.
- GitHub: repositório fornecido pelo usuário e permissão de escrita confirmada. Código, lockfile, CI e documentação preparados para envio. O fluxo GitHub Pages é independente da tentativa anterior de publicação privada via Sites, bloqueada pela aprovação automática.

Antes de considerar a Fase 1 integralmente aceita, executar o roteiro manual do README em navegadores desktop e móvel, confirmar carregamento de tiles, seleção no mapa, mudança das camadas, busca de endereços e exportação. O escopo de simulação não faz parte desta entrega.
