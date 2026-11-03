// Funções puras: não acessam rede nem DOM, por isso são fáceis de testar.

export function normalizar(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Primeiro os nomes que começam com o termo, depois os que só contêm.
export function buscarMunicipios(lista, termo, limite = 8) {
  const t = normalizar(termo);
  if (t.length < 2) return [];
  const comeca = [];
  const contem = [];
  for (const m of lista) {
    if (m.busca.startsWith(t)) comeca.push(m);
    else if (m.busca.includes(t)) contem.push(m);
  }
  return [...comeca, ...contem].slice(0, limite);
}

// O IBGE usa "...", "-" e "X" para dado indisponível ou sigiloso.
export function numeroIBGE(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

export function serieNumerica(serie = {}) {
  const saida = {};
  for (const [ano, valor] of Object.entries(serie)) {
    const n = numeroIBGE(valor);
    if (n !== null) saida[ano] = n;
  }
  return saida;
}

export function ultimoAnoComDado(serie = {}) {
  const anos = Object.keys(serie).map(Number).sort((a, b) => a - b);
  if (!anos.length) return null;
  const ano = anos[anos.length - 1];
  return { ano, valor: serie[ano] };
}

// Em caso de empate, fica com o ano anterior.
export function anoMaisProximo(anos, alvo) {
  let melhor = null;
  for (const ano of anos.map(Number)) {
    if (melhor === null) { melhor = ano; continue; }
    const d = Math.abs(ano - alvo);
    const dm = Math.abs(melhor - alvo);
    if (d < dm || (d === dm && ano < melhor)) melhor = ano;
  }
  return melhor;
}

export function crescimentoPercentual(inicial, final) {
  if (!inicial || final === null || final === undefined) return null;
  return ((final - inicial) / inicial) * 100;
}

// Retorna 'a', 'b' ou null (empate ou dado faltando).
export function vencedor(a, b, maiorEhMelhor = true) {
  if (a === null || b === null || a === undefined || b === undefined || a === b) return null;
  return (a > b) === maiorEhMelhor ? 'a' : 'b';
}

const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

export function formatarInteiro(n) {
  return n === null || n === undefined ? '—' : inteiro.format(n);
}

export function formatarDecimal(n) {
  return n === null || n === undefined ? '—' : decimal.format(n);
}

export function formatarReais(n, { compactar = false } = {}) {
  if (n === null || n === undefined) return '—';
  return 'R$ ' + (compactar ? compacto.format(n) : inteiro.format(n));
}

export function formatarPercentual(n) {
  if (n === null || n === undefined) return '—';
  return (n > 0 ? '+' : '') + decimal.format(n) + '%';
}

// Uma frase curta com as duas diferenças mais importantes.
export function resumoEmTexto(nomeA, a, nomeB, b) {
  const partes = [];

  if (a.popAtual && b.popAtual) {
    const razao = a.popAtual.valor / b.popAtual.valor;
    if (razao >= 1.05) partes.push(`${nomeA} tem ${formatarDecimal(razao)} vezes a população de ${nomeB}`);
    else if (razao <= 1 / 1.05) partes.push(`${nomeB} tem ${formatarDecimal(1 / razao)} vezes a população de ${nomeA}`);
    else partes.push('as duas têm população parecida');
  }

  if (a.pibPerCapita && b.pibPerCapita) {
    const diferenca = (a.pibPerCapita / b.pibPerCapita - 1) * 100;
    if (Math.abs(diferenca) < 5) partes.push('o PIB por habitante é parecido');
    else if (diferenca > 0) partes.push(`o PIB por habitante de ${nomeA} é ${formatarInteiro(diferenca)}% maior`);
    else partes.push(`o PIB por habitante de ${nomeB} é ${formatarInteiro((b.pibPerCapita / a.pibPerCapita - 1) * 100)}% maior`);
  }

  if (!partes.length) return '';
  const frase = partes.join(', e ');
  return frase.charAt(0).toUpperCase() + frase.slice(1) + '.';
}

// Junta as respostas das tabelas do IBGE em um resumo de um município.
// Tabelas: 4714 (Censo 2022), 6579 (estimativas), 5938 (PIB dos municípios).
export function resumirCidade(id, { censo, estimativas, pib, setores }) {
  const daCidade = (tabela, variavel) => tabela?.[variavel]?.[id] ?? {};

  const pop2022 = daCidade(censo, '93')['2022'] ?? null;
  const area = daCidade(censo, '6318')['2022'] ?? null;
  const densidade = daCidade(censo, '614')['2022'] ?? null;

  // Anos de censo não têm estimativa, então o Censo 2022 entra na série.
  const populacao = { ...daCidade(estimativas, '9324') };
  if (pop2022 !== null) populacao['2022'] = pop2022;

  const popAtual = ultimoAnoComDado(populacao);
  const anosPop = Object.keys(populacao).map(Number).sort((a, b) => a - b);
  const popInicial = anosPop.length ? { ano: anosPop[0], valor: populacao[anosPop[0]] } : null;

  const pibMil = daCidade(pib, '37');
  const pibAtual = ultimoAnoComDado(pibMil);
  let pibPerCapita = null;
  let anoPopPerCapita = null;
  if (pibAtual && anosPop.length) {
    anoPopPerCapita = anoMaisProximo(anosPop, pibAtual.ano);
    pibPerCapita = (pibAtual.valor * 1000) / populacao[anoPopPerCapita];
  }

  const industria = daCidade(setores, '517');
  const anoSetores = ultimoAnoComDado(industria)?.ano ?? null;
  const valorSetor = (variavel) => (anoSetores ? daCidade(setores, variavel)[anoSetores] ?? 0 : 0);
  const economia = anoSetores
    ? {
        ano: anoSetores,
        partes: [
          { chave: 'agro', nome: 'Agropecuária', valor: valorSetor('513') * 1000 },
          { chave: 'industria', nome: 'Indústria', valor: valorSetor('517') * 1000 },
          { chave: 'servicos', nome: 'Serviços', valor: valorSetor('6575') * 1000 },
          { chave: 'publico', nome: 'Administração pública', valor: valorSetor('525') * 1000 },
          { chave: 'impostos', nome: 'Impostos', valor: valorSetor('543') * 1000 },
        ],
      }
    : null;

  return {
    id,
    pop2022,
    area,
    densidade,
    populacao,
    popAtual,
    crescimento: popInicial && popAtual
      ? { desde: popInicial.ano, valor: crescimentoPercentual(popInicial.valor, popAtual.valor) }
      : null,
    pib: pibAtual ? { ano: pibAtual.ano, valor: pibAtual.valor * 1000 } : null,
    pibPerCapita,
    anoPopPerCapita,
    economia,
  };
}
