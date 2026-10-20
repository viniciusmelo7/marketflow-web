# MarketFlow

Frontend de uma loja virtual de tecnologia desenvolvido como projeto de portfólio. O MarketFlow demonstra uma aplicação React e TypeScript conectada a uma API Java/Spring Boot, com catálogo real, autenticação, carrinho e acompanhamento de pedidos.

## Funcionalidades implementadas

- Consulta de produtos e categorias pela API, com imagens da resposta e assets locais conhecidos como alternativa; imagens indisponíveis usam um placeholder.
- Login integrado à API e área do carrinho acessível apenas com sessão.
- Adição de produtos ao carrinho e atualização de quantidade e remoção de itens pela API.
- Criação idempotente de pedidos, recuperação de tentativas pendentes e início de checkout pelo backend.
- Página de confirmação que consulta o estado do pedido na API.

Preços, estoque, carrinho, pedidos e confirmação de pagamento são dados e responsabilidades do backend. O frontend não simula produtos nem confirma pagamentos por conta própria.

## Tecnologias

Versões principais declaradas no package.json:

- React 19 e React DOM 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4 e @tailwindcss/vite
- React Router 7
- Axios
- Lucide React
- ESLint 10 e TypeScript ESLint
- Testes com node:test integrado ao Node.js

## Organização do projeto

- src/components: componentes compartilhados, como cabeçalho e catálogo.
- src/layouts: estrutura comum das páginas.
- src/pages: início, login, carrinho e confirmação do pedido.
- src/routes: rotas e proteção de acesso ao carrinho.
- src/services: comunicação HTTP com a API e persistência da sessão/tentativa de pedido.
- src/types: contratos TypeScript usados pelo frontend.
- src/utils: validações e regras auxiliares, como imagens, carrinho e recuperação de pedidos.
- src/assets e public: recursos visuais.
- tests: testes automatizados de utilitários e fluxos isolados.

## Pré-requisitos

- Node.js 22 (verificado com 22.17.1).
- npm (verificado com 10.9.2).
- Backend MarketFlow em execução e acessível pelo navegador.

O package.json não fixa a versão do Node com o campo engines.

## Instalação e configuração

Na raiz do frontend, instale as dependências:

~~~sh
npm install
~~~

Crie .env a partir do exemplo:

~~~sh
cp .env.example .env
~~~

Configure a URL base da API em .env:

~~~env
VITE_API_URL=http://localhost:8081
~~~

VITE_API_URL é a única variável de ambiente usada pelo frontend. Se ela não estiver definida, a camada Axios usa http://localhost:8081. Não coloque credenciais ou segredos no frontend; arquivos .env locais são ignorados pelo Git.

## Executar localmente

~~~sh
npm run dev
~~~

O frontend usa http://localhost:5173. A configuração strictPort faz o Vite encerrar com erro se essa porta estiver ocupada. A API usa http://localhost:8081 por padrão. Como o navegador chama a API diretamente, o backend precisa aceitar a origem do frontend via CORS; a configuração atual da API inclui http://localhost:5173 como origem padrão.

## Rotas

| Rota | Acesso | Conteúdo |
| --- | --- | --- |
| / | Público | Página inicial, proposta e catálogo. |
| /login | Público | Formulário de login. |
| /cart | Exige sessão | Consulta e gerenciamento do carrinho; sem sessão, a aplicação encaminha para /login. |
| /checkout/confirmation | Pública no roteador | Consulta o pedido pendente associado à sessão do navegador. |

A rota de confirmação é pública na camada de rotas, mas os dados do pedido continuam protegidos pela autenticação exigida pela API.

## Autenticação e sessão

O login envia e-mail e senha para POST /auth/login. Após sucesso, a resposta da API é armazenada no localStorage sob a chave marketflow.session. A senha não é armazenada. A instância Axios central consulta a sessão e envia Authorization: Bearer <token> nas requisições quando há token; ela preserva um cabeçalho Authorization definido explicitamente pela chamada.

A proteção no frontend melhora a navegação, mas não substitui a validação do token e das permissões pelo backend. O frontend não oferece telas de cadastro ou recuperação de senha.

## Integração com a API e checkout

A camada HTTP usa a instância Axios compartilhada e, por padrão, aponta para http://localhost:8081.

- Catálogo: GET /products e GET /categories; os dados exibidos vêm da API.
- Carrinho autenticado: GET /cart, POST /cart/items, PUT /cart/items/{itemId} e DELETE /cart/items/{itemId}. O conteúdo do carrinho é consultado e atualizado no backend.
- Pedidos: POST /orders cria o pedido com uma chave Idempotency-Key; GET /orders/{id} consulta seu estado; GET /orders/by-idempotency-key recupera uma tentativa pela chave do usuário. O frontend preserva a tentativa para reduzir o risco de duplicidade em falhas ambíguas.
- Pagamento: POST /payments/{orderId} solicita ao backend uma sessão de Stripe Checkout e recebe checkoutUrl. O navegador é redirecionado para essa URL; o frontend não integra credenciais Stripe diretamente.

Ao retornar do checkout, a página /checkout/confirmation consulta GET /orders/{id}. Enquanto o pedido estiver pendente, consulta novamente a cada 3 segundos, por até 60 segundos. A tela só apresenta pagamento confirmado quando a API retorna o estado correspondente. A confirmação do pagamento e as atualizações assíncronas são responsabilidade do backend, que processa os eventos do webhook Stripe.

Na configuração atual do backend, a URL local padrão de sucesso é http://localhost:5173/checkout/confirmation. Em outro ambiente, a URL de retorno deve apontar para a rota correspondente do frontend.

## Scripts

~~~sh
npm run dev     # inicia o servidor de desenvolvimento
npm test        # executa os testes automatizados existentes
npm run lint    # executa o ESLint
npm run build   # verifica os projetos TypeScript e gera o build de produção
npm run preview # serve localmente o build de produção
~~~

Os testes atuais cobrem regras auxiliares de autenticação do carrinho, validação de identificadores e imagens, erros de checkout, idempotência, recuperação de pedidos e estados de confirmação. Eles usam node:test; não são testes de navegador, ponta a ponta nem uma validação visual completa da aplicação.

## Dependências e limitações da demonstração

Para testar catálogo e carrinho, mantenha o backend e sua infraestrutura de persistência configurados e acessíveis, com CORS liberando a origem do frontend. Para percorrer o pagamento completo, o backend também precisa estar configurado para Stripe e receber o webhook de confirmação. As credenciais de pagamento pertencem somente à configuração segura do backend.

O frontend não inclui Dockerfile ou configuração Compose próprios. Também não há página de histórico de pedidos, cadastro ou recuperação de senha. Produtos e categorias não são dados de demonstração: dependem da API. A exibição de imagens depende de imageUrl ou de uma associação local conhecida; nos demais casos, o catálogo apresenta um placeholder.
