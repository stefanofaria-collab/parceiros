"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FilterParams } from "@/lib/types";
import { Search, Filter, X } from "lucide-react";

type FiltersProps = {
  value: FilterParams;
  onChange: (next: FilterParams) => void;
  onApply: () => void;
  showMonth?: boolean;
};

const empty: FilterParams = {
  parceiro: "",
  empresaIndicacaoId: "",
  nomePlano: "",
  duracao: "",
  cadastroDe: "",
  cadastroAte: "",
  ativacaoDe: "",
  ativacaoAte: "",
  vencimentoDe: "",
  vencimentoAte: "",
  ultimaIndicacaoDe: "",
  ultimaIndicacaoAte: "",
  ultimaAtivacaoDe: "",
  ultimaAtivacaoAte: "",
  minIndicacoes: "",
  maxIndicacoes: "",
  minAtivacoes: "",
  maxAtivacoes: "",
  responsavelPagamento: "Todos",
  leadsAtivos: "Todos",
  clientesAtivos: "Todos",
};

export function Filters({ value, onChange, onApply, showMonth }: FiltersProps) {
  const [suggestions, setSuggestions] = useState<{ id: number; nome: string }[]>(
    []
  );
  const [plans, setPlans] = useState<string[]>([]);
  const [openSuggest, setOpenSuggest] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const set = (patch: Partial<FilterParams>) =>
    onChange({ ...value, ...patch });

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.items || []))
      .catch(() => setPlans([]));
  }, []);

  useEffect(() => {
    const q = value.parceiro?.trim();
    if (!q || q.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/partners/suggest?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setSuggestions(d.items || []))
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(t);
  }, [value.parceiro]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpenSuggest(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const activeCount = useMemo(() => {
    let n = 0;
    if (value.parceiro) n++;
    if (value.empresaIndicacaoId) n++;
    if (value.nomePlano) n++;
    if (value.duracao) n++;
    if (value.cadastroDe || value.cadastroAte) n++;
    if (value.ativacaoDe || value.ativacaoAte) n++;
    if (value.vencimentoDe || value.vencimentoAte) n++;
    if (value.ultimaIndicacaoDe || value.ultimaIndicacaoAte) n++;
    if (value.ultimaAtivacaoDe || value.ultimaAtivacaoAte) n++;
    if (value.minIndicacoes || value.maxIndicacoes) n++;
    if (value.minAtivacoes || value.maxAtivacoes) n++;
    if (value.responsavelPagamento && value.responsavelPagamento !== "Todos")
      n++;
    if (value.leadsAtivos && value.leadsAtivos !== "Todos") n++;
    if (value.clientesAtivos && value.clientesAtivos !== "Todos") n++;
    if (showMonth && value.mes) n++;
    return n;
  }, [value, showMonth]);

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-brand" />
          <h2 className="text-sm font-semibold text-[#122033]">Filtros</h2>
          {activeCount > 0 && (
            <span className="badge bg-brand/10 text-brand">{activeCount} ativos</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              onChange({
                ...empty,
                mes: value.mes,
                page: 1,
                pageSize: value.pageSize || 50,
              });
            }}
          >
            <X className="h-4 w-4" />
            Limpar
          </button>
          <button type="button" className="btn-primary" onClick={onApply}>
            <Search className="h-4 w-4" />
            Aplicar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div ref={boxRef} className="relative">
          <label className="label">Nome do parceiro</label>
          <input
            className="input"
            placeholder="Digite para autocompletar…"
            value={value.parceiro || ""}
            onChange={(e) => {
              set({ parceiro: e.target.value });
              setOpenSuggest(true);
            }}
            onFocus={() => setOpenSuggest(true)}
          />
          {openSuggest && suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[#e5eaf0] bg-white shadow-card">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-brand/5"
                    onClick={() => {
                      set({
                        parceiro: s.nome,
                        empresaIndicacaoId: String(s.id),
                      });
                      setOpenSuggest(false);
                    }}
                  >
                    <span className="font-medium text-[#122033]">{s.nome}</span>
                    <span className="text-xs text-[#6b7280]">ID {s.id}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="label">ID do parceiro</label>
          <input
            className="input"
            type="number"
            placeholder="empresa_indicacao_id"
            value={value.empresaIndicacaoId || ""}
            onChange={(e) => set({ empresaIndicacaoId: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Nome do plano</label>
          <input
            className="input"
            list="planos-list"
            placeholder="Ex.: Ouro, Prata, Teste…"
            value={value.nomePlano || ""}
            onChange={(e) => set({ nomePlano: e.target.value })}
          />
          <datalist id="planos-list">
            {plans.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="label">Duração do plano</label>
          <select
            className="input"
            value={value.duracao || ""}
            onChange={(e) => set({ duracao: e.target.value })}
          >
            <option value="">Todas</option>
            <option value="M">Mensal (M)</option>
            <option value="A">Anual (A)</option>
            <option value="S">Semestral (S)</option>
            <option value="T">Trimestral (T)</option>
          </select>
        </div>

        <div>
          <label className="label">Cadastro de</label>
          <input
            className="input"
            type="date"
            value={value.cadastroDe || ""}
            onChange={(e) => set({ cadastroDe: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Cadastro até</label>
          <input
            className="input"
            type="date"
            value={value.cadastroAte || ""}
            onChange={(e) => set({ cadastroAte: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Ativação de</label>
          <input
            className="input"
            type="date"
            value={value.ativacaoDe || ""}
            onChange={(e) => set({ ativacaoDe: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Ativação até</label>
          <input
            className="input"
            type="date"
            value={value.ativacaoAte || ""}
            onChange={(e) => set({ ativacaoAte: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Vencimento de</label>
          <input
            className="input"
            type="date"
            value={value.vencimentoDe || ""}
            onChange={(e) => set({ vencimentoDe: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Vencimento até</label>
          <input
            className="input"
            type="date"
            value={value.vencimentoAte || ""}
            onChange={(e) => set({ vencimentoAte: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Última indicação de</label>
          <input
            className="input"
            type="date"
            value={value.ultimaIndicacaoDe || ""}
            onChange={(e) => set({ ultimaIndicacaoDe: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Última indicação até</label>
          <input
            className="input"
            type="date"
            value={value.ultimaIndicacaoAte || ""}
            onChange={(e) => set({ ultimaIndicacaoAte: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Última ativação de</label>
          <input
            className="input"
            type="date"
            value={value.ultimaAtivacaoDe || ""}
            onChange={(e) => set({ ultimaAtivacaoDe: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Última ativação até</label>
          <input
            className="input"
            type="date"
            value={value.ultimaAtivacaoAte || ""}
            onChange={(e) => set({ ultimaAtivacaoAte: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Mínimo de indicações</label>
          <input
            className="input"
            type="number"
            min={0}
            placeholder="Ex.: 10"
            value={value.minIndicacoes || ""}
            onChange={(e) => set({ minIndicacoes: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Máximo de indicações</label>
          <input
            className="input"
            type="number"
            min={0}
            placeholder="Ex.: 500"
            value={value.maxIndicacoes || ""}
            onChange={(e) => set({ maxIndicacoes: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Mínimo de ativações</label>
          <input
            className="input"
            type="number"
            min={0}
            placeholder="Ex.: 5"
            value={value.minAtivacoes || ""}
            onChange={(e) => set({ minAtivacoes: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Máximo de ativações</label>
          <input
            className="input"
            type="number"
            min={0}
            placeholder="Ex.: 200"
            value={value.maxAtivacoes || ""}
            onChange={(e) => set({ maxAtivacoes: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Responsável pelo pagamento</label>
          <select
            className="input"
            value={value.responsavelPagamento || "Todos"}
            onChange={(e) =>
              set({
                responsavelPagamento: e.target
                  .value as FilterParams["responsavelPagamento"],
              })
            }
          >
            <option value="Todos">Todos</option>
            <option value="Cliente">Cliente</option>
            <option value="Parceiro">Parceiro</option>
          </select>
        </div>

        <div>
          <label className="label">Somente leads ativos</label>
          <select
            className="input"
            value={value.leadsAtivos || "Todos"}
            onChange={(e) =>
              set({
                leadsAtivos: e.target.value as FilterParams["leadsAtivos"],
              })
            }
          >
            <option value="Todos">Todos</option>
            <option value="Sim">Sim</option>
            <option value="Nao">Não</option>
          </select>
        </div>

        <div>
          <label className="label">Somente clientes ativos</label>
          <select
            className="input"
            value={value.clientesAtivos || "Todos"}
            onChange={(e) =>
              set({
                clientesAtivos: e.target.value as FilterParams["clientesAtivos"],
              })
            }
          >
            <option value="Todos">Todos</option>
            <option value="Sim">Sim</option>
            <option value="Nao">Não</option>
          </select>
        </div>

        {showMonth && (
          <div>
            <label className="label">Mês de vencimento</label>
            <input
              className="input"
              type="month"
              value={value.mes || ""}
              onChange={(e) => set({ mes: e.target.value })}
            />
          </div>
        )}
      </div>
    </section>
  );
}
