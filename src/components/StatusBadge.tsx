import clsx from "clsx";

export function StatusBadge({
  situacao,
}: {
  situacao: "Ativo" | "Vencido" | "Churn";
}) {
  return (
    <span
      className={clsx(
        "badge",
        situacao === "Ativo" && "bg-emerald-50 text-emerald-700",
        situacao === "Vencido" && "bg-amber-50 text-amber-700",
        situacao === "Churn" && "bg-red-50 text-red-700"
      )}
    >
      {situacao}
    </span>
  );
}
