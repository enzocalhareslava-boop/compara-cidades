// Acesso à API pública de dados do IBGE (servicodados.ibge.gov.br).
import { normalizar, serieNumerica, resumirCidade } from './utils.js';

const BASE = 'https://servicodados.ibge.gov.br/api';
const CHAVE_CACHE = 'compara-cidades:municipios:v1';

async function pegarJSON(url) {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`O IBGE respondeu com erro ${resposta.status}`);
  return resposta.json();
}

export async function carregarMunicipios() {
  try {
    const salvo = localStorage.getItem(CHAVE_CACHE);
    if (salvo) return JSON.parse(salvo);
  } catch { /* sem localStorage, segue para a rede */ }

  const dados = await pegarJSON(`${BASE}/v1/localidades/municipios?view=nivelado`);
  const lista = dados.map((m) => ({
    id: String(m['municipio-id']),
    nome: m['municipio-nome'],
    uf: m['UF-sigla'],
    regiao: m['regiao-nome'],
    regiaoImediata: m['regiao-imediata-nome'],
    busca: normalizar(`${m['municipio-nome']} ${m['UF-sigla']}`),
  }));

  try { localStorage.setItem(CHAVE_CACHE, JSON.stringify(lista)); } catch { /* cache é opcional */ }
  return lista;
}

function urlAgregado(tabela, periodos, variaveis, ids) {
  const vars = encodeURIComponent(variaveis.join('|'));
  const locais = encodeURIComponent(`N6[${ids.join(',')}]`);
  return `${BASE}/v3/agregados/${tabela}/periodos/${periodos}/variaveis/${vars}?localidades=${locais}`;
}

// Transforma a resposta em { variavel: { municipio: { ano: valor } } }.
function organizar(resposta) {
  const saida = {};
  for (const variavel of resposta) {
    saida[variavel.id] = {};
    for (const s of variavel.resultados[0]?.series ?? []) {
      saida[variavel.id][s.localidade.id] = serieNumerica(s.serie);
    }
  }
  return saida;
}

export async function carregarCidades(ids) {
  const [censo, estimativas, pib, setores] = await Promise.all([
    pegarJSON(urlAgregado(4714, '2022', ['93', '6318', '614'], ids)),
    pegarJSON(urlAgregado(6579, '-40', ['9324'], ids)),
    pegarJSON(urlAgregado(5938, '-3', ['37'], ids)),
    pegarJSON(urlAgregado(5938, '-6', ['513', '517', '6575', '525', '543'], ids)),
  ]);
  const dados = {
    censo: organizar(censo),
    estimativas: organizar(estimativas),
    pib: organizar(pib),
    setores: organizar(setores),
  };
  return ids.map((id) => resumirCidade(id, dados));
}
