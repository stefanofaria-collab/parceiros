# Dashboard de Parceiros

Aplicação local (Next.js) conectada ao MySQL da empresa para acompanhar parceiros, leads, faturamento, churn e vencimentos.

## Pré-requisitos

- Node.js 18+
- Acesso de rede ao RDS MySQL

## Configuração

As credenciais ficam em `.env` (já criado e ignorado pelo Git):

```
DB_HOST=...
DB_PORT=3306
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
```

## Como rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Páginas

- **Visão geral** — KPIs, conversão, churn, ativações, planos e evolução de leads
- **Parceiros** — tabela detalhada por parceiro
- **Vencimentos futuros** — calendário, rankings e lista de empresas
- **Leads ativos** — foco em plano `Teste` com vencimento ≥ hoje

## Regras de negócio

- **Lead ativo:** `nome_plano = Teste` e `data_vencimento >= hoje`
- **Cliente ativo:** `ativou_em` preenchido e `data_vencimento >= hoje`
- **Churn:** último vencimento há **60 dias ou mais**

## Diagnóstico de dados em produção

Na mesma origem (host e porta) da aplicação, acesse `/api/health`. A rota testa a configuração de ambiente, a conexão com o MySQL e uma amostra da consulta de parceiros, sem retornar registros ou credenciais.

- `stage: "configuration"`: faltam variáveis de ambiente indicadas em `missing`.
- `stage: "connection"`: configuração presente, mas o MySQL não respondeu; `code` ajuda a distinguir rede, autenticação e DNS.
- `stage: "query"`: conexão funcionou, mas a consulta SQL falhou; consulte os logs do processo Node/PM2 para detalhes.
- `stage: "ready", ok: true`: conexão e consulta funcionando. `hasRows` indica se a consulta retornou ao menos uma linha.

Se a aplicação roda com PM2, verifique `pm2 list` e `pm2 logs <nome-do-processo> --lines 100`. Ao atualizar o código, faça `npm ci`, `npm run build` e reinicie **somente** o processo desta aplicação (`pm2 restart <nome-do-processo> --update-env`). Não compartilhe valores de `.env` ou senhas nos logs.
