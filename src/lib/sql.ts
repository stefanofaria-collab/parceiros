/** IDs excluídos no CTE de parceiros (consulta atualizada). */
export const EXCLUDED_IDS_PARCEIROS = `(
  1, 24, 43, 2054, 123242, 216321, 346439, 388198, 196044, 10744,
  11807, 166104, 200440, 177551, 209512, 261147, 463295, 458966, 403472, 226637, 414735,
  361435, 376050, 367178, 263918, 447481, 48142, 438358, 239292, 376338, 479723, 480921,
  481136, 479405, 482279, 124451, 174166, 184848, 186733, 248366, 444241, 462938, 473336,
  476148, 480590, 485458, 487138, 487525, 193364, 267891, 369137, 484832, 3897, 209986,
  334995, 423464, 379294, 278505, 363585, 202297, 487136, 495757, 74618, 448705, 492276,
  493057, 493495, 495367, 495470, 500211, 500213, 500508, 500582, 502764, 497959,
  510928, 514140, 187078, 521671, 224287, 205324, 517101
)`;

/** IDs excluídos em clientes_parceiros. */
export const EXCLUDED_IDS_CLIENTES = `(
  1, 24, 43, 2054, 123242, 216321, 346439, 388198, 196044, 10744,
  11807, 166104, 200440, 177551, 209512, 261147, 463295, 458966, 403472, 226637, 414735,
  361435, 376050, 367178, 263918, 447481, 48142, 438358, 239292, 376338, 479723, 480921,
  481136, 479405, 482279, 124451, 174166, 184848, 186733, 248366, 444241, 462938, 473336,
  476148, 480590, 485458, 487138, 487525, 193364, 267891, 369137, 484832, 3897, 209986,
  334995, 423464, 379294, 278505, 363585, 202297, 487136, 495757, 74618, 448705, 492276,
  493057, 493495, 495367, 495470, 500211, 500213, 500508, 500582, 502764, 497959,
  510928, 514140, 187078, 521671, 224287, 205324, 517101, 545031, 203878
)`;

export const BASE_CTE = `
with parceiros as (
  select
    e.empresa_indicacao_id,
    max(ep.nome_usuario) as parceiro,
    max(e.modalidade) as modalidade,
    max(e.tipo_cobranca) as tipo_cobranca,
    max(nullif(ep.estado, '')) as estado,
    max(nullif(ep.telefone, '')) as telefone,
    max(nullif(l.celular, '')) as celular,
    max(nullif(ep.email, '')) as email
  from
    empresas e
    join empresas_planos ep on e.empresa_indicacao_id = ep.empresa_id and ep.atual = 1
    join lojas l on e.empresa_indicacao_id = l.empresa_id
  where
    e.empresa_indicacao_id <> 1
    and e.empresa_indicacao_id not in ${EXCLUDED_IDS_PARCEIROS}
  group by
    e.empresa_indicacao_id
),
clientes_parceiros as (
  select
    ep.empresa_id,
    e.modalidade,
    e.tipo_cobranca,
    p.tipo_cobranca as tipo_cobranca_parceiro,
    e.cadastrado_em,
    e.ativou_em,
    replace(replace(ep.nome_plano, ' + recursos', ''), '(+) recursos', '') as nome_plano,
    ep.duracao,
    ep.data_vencimento,
    case
      when ep.plano_agregado > ep.valor then ep.plano_agregado
      else ep.valor
    end as valor,
    e.empresa_indicacao_id,
    p.estado,
    p.parceiro,
    p.telefone,
    p.celular,
    p.email
  from
    empresas e
    join empresas_planos ep on e.id = ep.empresa_id
    join parceiros p on e.empresa_indicacao_id = p.empresa_indicacao_id
  where
    e.empresa_indicacao_id <> 1
    and ep.atual = 1
    and e.empresa_indicacao_id not in ${EXCLUDED_IDS_CLIENTES}
  group by
    ep.empresa_id
)
`;
