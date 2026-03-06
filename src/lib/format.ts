/**
 * Utilidades de formato para moneda COP (Peso Colombiano)
 * Ejemplo: formatCOP(1305687) → "$ 1.305.687"
 * Ejemplo: formatCOP(1305687, true) → "$ 1,3M"
 */

export function formatCOP(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000_000)
      return `$ ${(value / 1_000_000_000).toFixed(1).replace('.', ',')}B`;
    if (value >= 1_000_000)
      return `$ ${(value / 1_000_000).toFixed(1).replace('.', ',')}M`;
    if (value >= 1_000)
      return `$ ${Math.round(value / 1_000)}K`;
  }
  // Formato completo: $ 1.305.687
  return `$ ${Math.round(value).toLocaleString('es-CO')}`;
}

/** Para tooltips y etiquetas: "$ 1.305.687 COP" */
export function formatCOPFull(value: number): string {
  return `$ ${Math.round(value).toLocaleString('es-CO')} COP`;
}

/** Formatea eje Y en gráficos (compacto sin símbolo duplicado) */
export function formatCOPAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return `${value}`;
}
