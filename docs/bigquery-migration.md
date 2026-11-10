# Migração do Parceiros para Google BigQuery

## Situação
Este branch prepara a integração. Ainda não cria recursos na conta Google
Cloud e **não modifica a instalação ativa do Ubuntu**. Para colocar em produção
é necessário configurar as permissões e validar uma primeira sincronização.

## Arquitetura
MySQL corporativo -> Python no Windows -> BigQuery (snapshot) -> Next.js no
Ubuntu -> Nginx -> navegador. A lógica dos indicadores, filtros e paginação
permanece igual; muda somente a origem dos registros.

O computador Windows deve permanecer ligado e com o usuário conectado para
que a tarefa diária execute. Dashboard e tabelas revalidam dados a cada
15 minutos; se a sincronização não ocorreu, continuam exibindo o último
snapshot válido.

## 1. Google Cloud: etapas do administrador

1. Acesse https://console.cloud.google.com/ e crie ou selecione um projeto.
2. Configure o faturamento da conta Google Cloud e estabeleça alertas de
   orçamento. A assinatura do Google Workspace não inclui automaticamente
   recursos ilimitados do Google Cloud.
3. Ative a API BigQuery.
4. Crie o dataset chamado parceiros na localização US (ajustável). A
   localização escolhida deve ser igual para Windows, BigQuery e Ubuntu.
   Os dados incluem e-mail e telefone; valide requisitos de privacidade/LGPD.
5. Crie DUAS contas de serviço diferentes:
   - parceiros-sync: permissão BigQuery Data Editor no dataset e BigQuery Job
     User no projeto.
   - parceiros-reader: BigQuery Data Viewer no dataset e BigQuery Job User
     no projeto.
6. Se a organização permitir chaves JSON de contas de serviço, crie uma chave
   para cada conta e armazene cada uma SOMENTE na máquina correspondente.
   Evite envio de credenciais via GitHub/chat. Se não for possível usar
   chaves JSON, solicite ao administrador uma identidade federada.
7. Verifique que API, dataset e permissões estão ativos.

O script de sincronização pode criar o dataset, caso a conta escritora
tenha permissão extra de criação; por segurança prefira criar previamente
no console e manter as permissões mínimas acima.

## 2. Windows: rotina diária

Pré-requisitos: Python 3.10+ e uma conta de leitura do MySQL funcionando.
A conta usuario_leitura atualmente está bloqueada no MySQL; antes de
sincronizar ela precisa ser desbloqueada pelo administrador ou substituída
por outra credencial MySQL autorizada.

No PowerShell, a partir da cópia do repositório no Windows:

    cd CAMINHO_DA_PASTA_PARCEIROS
    powershell -ExecutionPolicy Bypass -File .\sync\install_windows.ps1

O instalador prepara o ambiente Python, cria o arquivo local
sync/.env.sync e registra a tarefa diária às 07:00.

Preencha sync/.env.sync usando sync/.env.sync.example:
- DB_HOST, DB_PORT, DB_NAME, DB_USER e DB_PASSWORD são os parâmetros MySQL.
- BQ_PROJECT_ID é o ID técnico do projeto Google Cloud.
- BQ_DATASET, BQ_TABLE e BQ_LOCATION identificam o destino.
- GCP_SYNC_CREDENTIALS é o caminho absoluto da chave JSON do parceiro-sync,
  fora do repositório e protegida com permissões locais.

Execute a primeira carga manual:

    powershell -ExecutionPolicy Bypass -File .\sync\run_sync.ps1

Confira a quantidade de registros na tabela do BigQuery ANTES de ativar
o leitor no Ubuntu. A carga passa por uma tabela temporária e só publica
o snapshot após concluir e validar. Falhas preservam a versão anterior.
Logs locais: sync/logs (ignorados pelo Git).

A tarefa diária requer sessão Windows conectada; se estiver desligado ou
desconectado não executa no horário previsto.

## 3. Ubuntu: leitura do BigQuery

No servidor, copie a chave JSON da conta parceiros-reader de forma segura,
por SFTP ou outro canal privado, para:

    /home/pc/.config/parceiros/bigquery-reader.json

Restrinja o acesso:

    mkdir -p /home/pc/.config/parceiros
    chmod 700 /home/pc/.config/parceiros
    chmod 600 /home/pc/.config/parceiros/bigquery-reader.json

Depois de confirmar o primeiro snapshot, acrescente no .env privado do
Next.js os itens do modelo sync/.env.ubuntu.example:
- DATA_SOURCE=bigquery
- BQ_PROJECT_ID, BQ_DATASET, BQ_TABLE e BQ_LOCATION iguais aos do Windows.
- GOOGLE_APPLICATION_CREDENTIALS aponta para a chave protegida.
- BQ_MAX_BYTES_BILLED=1073741824 limita a 1 GiB por consulta.

Se DATA_SOURCE estiver ausente, a fonte permanece MySQL por padrão.
Não comite o arquivo .env.

Recompile e execute um TESTE temporário em porta livre, por exemplo 3201:

    cd /home/pc/parceiros
    npm ci
    npm run build
    node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3201

Em outro terminal:

    curl -sS -i http://127.0.0.1:3201/api/health
    curl -sS -i 'http://127.0.0.1:3201/api/partners?page=1&pageSize=1'

O diagnóstico deve retornar source=bigquery, stage=ready, rows > 0 e
lastSync recente. Então encerre o teste com Ctrl+C. Só após isso
configure o processo permanente e o Nginx, identificando a porta e host
virtual corretos. Não altere outros projetos, especialmente a porta 3100.

## 4. Segurança e recuperação

- Configure alertas de orçamento; limites de uso não substituem alertas.
- O app não expõe a chave da conta Google no navegador.
- O snapshot completo é recriado diariamente e preservado em falha.
- Verifique políticas de acesso, LGPD e localização de armazenamento.
- Se o leitor BigQuery falhar, remover DATA_SOURCE=bigquery e reiniciar
  seleciona o MySQL original. Esse retorno só funciona quando o MySQL
  estiver acessível novamente.
