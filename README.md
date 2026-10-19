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
