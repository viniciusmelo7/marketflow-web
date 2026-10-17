# MarketFlow Web

Frontend de uma loja virtual desenvolvido como projeto de portfólio. A aplicação apresenta produtos e categorias consultados da API, oferece login e carrinho integrado e inicia o fluxo de checkout pelo backend.

## Tecnologias

Dependências declaradas em `package.json`:

- React 19 e React DOM
- TypeScript 6
- Vite 8
- Tailwind CSS 4 com integração para Vite
- React Router 7
- Axios
- Lucide React
- ESLint 10 e TypeScript ESLint

## Pré-requisitos

- Node.js 22 (o projeto foi verificado com Node.js 22.17.1)
- npm (verificado com npm 10.9.2)
- Backend MarketFlow disponível para os recursos integrados à API

## Instalação

Na pasta do projeto, instale as dependências:

```sh
npm install
```

## Configuração da API

Use `.env.example` como referência para criar um arquivo `.env` na raiz:

```powershell
Copy-Item .env.example .env
```

Defina `VITE_API_URL` com a URL base do backend. O exemplo fornecido aponta para `http://localhost:8081`:

```env
VITE_API_URL=http://localhost:8081
```

Não coloque credenciais ou segredos nesse arquivo. Arquivos `.env` reais são ignorados pelo Git; `.env.example` pode ser versionado.

## Desenvolvimento

Com o backend disponível para consultar catálogo, autenticar usuários e usar as operações integradas, inicie o frontend:

```sh
npm run dev
```

O Vite utiliza a porta `5173` e falha explicitamente se ela estiver ocupada.

## Comandos disponíveis

```sh
npm test       # testes existentes
npm run lint   # análise estática com ESLint
npm run build  # verificação TypeScript e build de produção
```

Também estão disponíveis `npm run preview` para servir localmente o build de produção.

## Integração com o backend

O catálogo, a autenticação, o carrinho, a criação do pedido, o início do checkout e a consulta da confirmação dependem dos endpoints correspondentes do backend. Para testar esses fluxos, o backend precisa estar disponível e configurado. O frontend não confirma o pagamento por conta própria; a confirmação exibida depende do estado consultado na API.
