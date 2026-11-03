// Gráfico de linhas em SVG puro, sem biblioteca.
import { formatarPercentual, formatarInteiro } from './utils.js';

function escalaBonita(min, max, passos = 4) {
  const bruto = (max - min) / passos || 1;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto);
  const inicio = Math.floor(min / passo) * passo;
  const fim = Math.ceil(max / passo) * passo;
  const marcas = [];
  for (let v = inicio; v <= fim + passo / 2; v += passo) marcas.push(Math.round(v * 1000) / 1000);
  return { inicio, fim, marcas };
}

// series: [{ nome, classe, pontos: [{ ano, valor, absoluto }] }]
export function graficoLinhas(series) {
  const L = 680;
  const A = 280;
  const m = { topo: 16, dir: 16, base: 32, esq: 56 };

  const todos = series.flatMap((s) => s.pontos);
  if (!todos.length) return '<p class="vazio">Sem dados de população para desenhar.</p>';

  const anos = todos.map((p) => p.ano);
  const x0 = Math.min(...anos);
  const x1 = Math.max(...anos);
  const y = escalaBonita(Math.min(0, ...todos.map((p) => p.valor)), Math.max(...todos.map((p) => p.valor)));

  const px = (ano) => m.esq + ((ano - x0) / (x1 - x0 || 1)) * (L - m.esq - m.dir);
  const py = (v) => A - m.base - ((v - y.inicio) / (y.fim - y.inicio || 1)) * (A - m.topo - m.base);

  const grade = y.marcas.map((v) => `
    <line class="grade" x1="${m.esq}" x2="${L - m.dir}" y1="${py(v)}" y2="${py(v)}"/>
    <text class="eixo" x="${m.esq - 8}" y="${py(v) + 4}" text-anchor="end">${v}%</text>`).join('');

  const anosEixo = [];
  for (let a = Math.ceil(x0 / 5) * 5; a <= x1; a += 5) anosEixo.push(a);
  const eixoX = anosEixo.map((a) => `
    <text class="eixo" x="${px(a)}" y="${A - 10}" text-anchor="middle">${a}</text>`).join('');

  const linhas = series.map((s) => {
    const d = s.pontos.map((p, i) => `${i ? 'L' : 'M'}${px(p.ano).toFixed(1)},${py(p.valor).toFixed(1)}`).join(' ');
    const pontos = s.pontos.map((p) => `
      <circle class="ponto ${s.classe}" cx="${px(p.ano)}" cy="${py(p.valor)}" r="3.5">
        <title>${s.nome}, ${p.ano}: ${formatarInteiro(p.absoluto)} habitantes (${formatarPercentual(p.valor)})</title>
      </circle>`).join('');
    return `<path class="linha ${s.classe}" d="${d}"/>${pontos}`;
  }).join('');

  return `
    <svg viewBox="0 0 ${L} ${A}" role="img" aria-label="Crescimento da população ao longo dos anos">
      ${grade}
      <line class="zero" x1="${m.esq}" x2="${L - m.dir}" y1="${py(0)}" y2="${py(0)}"/>
      ${eixoX}
      ${linhas}
    </svg>`;
}
