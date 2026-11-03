import { carregarMunicipios, carregarCidades } from './ibge.js';
import {
  buscarMunicipios, vencedor, resumoEmTexto,
  formatarInteiro, formatarDecimal, formatarReais, formatarPercentual,
} from './utils.js';
import { graficoLinhas } from './grafico.js';

const PADRAO = { a: '3552205', b: '3509502' }; // Sorocaba x Campinas
const estado = { municipios: [], porId: new Map(), a: null, b: null, pedido: 0 };

const $ = (seletor) => document.querySelector(seletor);
const esc = (texto) => String(texto).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const rotulo = (m) => `${m.nome} (${m.uf})`;

function mostrarStatus(texto, erro = false) {
  const el = $('#status');
  el.textContent = texto;
  el.classList.toggle('erro', erro);
}

function configurarBusca(lado) {
  const input = $(`#busca-${lado}`);
  const lista = $(`#lista-${lado}`);
  let opcoes = [];
  let ativo = -1;

  const fechar = () => {
    lista.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    ativo = -1;
  };

  const desenhar = () => {
    lista.innerHTML = opcoes.map((m, i) => `
      <li id="op-${lado}-${i}" role="option" data-i="${i}" aria-selected="${i === ativo}">
        <span>${esc(m.nome)}</span><small>${m.uf}</small>
      </li>`).join('');
    lista.hidden = !opcoes.length;
    input.setAttribute('aria-expanded', String(opcoes.length > 0));
    if (ativo >= 0) input.setAttribute('aria-activedescendant', `op-${lado}-${ativo}`);
  };

  const escolher = (m) => {
    input.value = rotulo(m);
    fechar();
    estado[lado] = m.id;
    atualizar();
  };

  input.addEventListener('input', () => {
    opcoes = buscarMunicipios(estado.municipios, input.value);
    ativo = opcoes.length ? 0 : -1;
    desenhar();
  });

  input.addEventListener('keydown', (e) => {
    if (lista.hidden || !opcoes.length) return;
    if (e.key === 'ArrowDown') ativo = (ativo + 1) % opcoes.length;
    else if (e.key === 'ArrowUp') ativo = (ativo - 1 + opcoes.length) % opcoes.length;
    else if (e.key === 'Enter') return escolher(opcoes[ativo]);
    else if (e.key === 'Escape') return fechar();
    else return;
    e.preventDefault();
    desenhar();
  });

  input.addEventListener('focus', () => input.select());

  // Se a pessoa sair do campo sem escolher, volta a mostrar a cidade atual.
  input.addEventListener('blur', () => setTimeout(() => {
    fechar();
    const atual = estado.porId.get(estado[lado]);
    if (atual) input.value = rotulo(atual);
  }, 150));

  lista.addEventListener('mousedown', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    e.preventDefault();
    escolher(opcoes[Number(li.dataset.i)]);
  });
}

const LINHAS = [
  { nome: 'População estimada', valor: (c) => c.popAtual?.valor, nota: (c) => c.popAtual?.ano, formato: formatarInteiro },
  { nome: 'População no Censo 2022', valor: (c) => c.pop2022, formato: formatarInteiro },
  { nome: 'Área (km²)', valor: (c) => c.area, formato: formatarInteiro },
  { nome: 'Habitantes por km²', valor: (c) => c.densidade, formato: formatarDecimal },
  { nome: 'PIB', valor: (c) => c.pib?.valor, nota: (c) => c.pib?.ano, formato: (v) => formatarReais(v, { compactar: true }) },
  {
    nome: 'PIB por habitante',
    valor: (c) => c.pibPerCapita,
    nota: (c) => c.pib && `PIB ${c.pib.ano} ÷ pop. ${c.anoPopPerCapita}`,
    formato: formatarReais,
  },
  {
    nome: 'Crescimento da população',
    valor: (c) => c.crescimento?.valor,
    nota: (c) => c.crescimento && `desde ${c.crescimento.desde}`,
    formato: formatarPercentual,
  },
];

function celula(c, linha, maior, lado) {
  const v = linha.valor(c) ?? null;
  const nota = linha.nota?.(c);
  const largura = v !== null && maior > 0 ? Math.max(2, (Math.abs(v) / maior) * 100) : 0;
  return `
    <td class="${lado}">
      <strong>${linha.formato(v)}</strong>
      ${nota ? `<small>${esc(nota)}</small>` : ''}
      <span class="barra" style="--largura:${largura}%"></span>
    </td>`;
}

function tabela(ca, cb, na, nb) {
  const corpo = LINHAS.map((linha) => {
    const va = linha.valor(ca) ?? null;
    const vb = linha.valor(cb) ?? null;
    const maior = Math.max(Math.abs(va ?? 0), Math.abs(vb ?? 0));
    const quem = vencedor(va, vb);
    return `
      <tr data-maior="${quem ?? ''}">
        <th scope="row">${linha.nome}</th>
        ${celula(ca, linha, maior, 'a')}
        ${celula(cb, linha, maior, 'b')}
      </tr>`;
  }).join('');
  return `
    <table>
      <thead><tr><th scope="col">Indicador</th><th scope="col" class="a">${esc(na)}</th><th scope="col" class="b">${esc(nb)}</th></tr></thead>
      <tbody>${corpo}</tbody>
    </table>`;
}

function seriePara(c, nome, classe) {
  const anos = Object.keys(c.populacao).map(Number).sort((x, y) => x - y);
  const base = c.populacao[anos[0]];
  return {
    nome,
    classe,
    pontos: anos.map((ano) => ({
      ano,
      absoluto: c.populacao[ano],
      valor: ((c.populacao[ano] - base) / base) * 100,
    })),
  };
}

function economia(c, nome, classe) {
  if (!c.economia) return `<div class="economia ${classe}"><h3>${esc(nome)}</h3><p class="vazio">Sem dados.</p></div>`;
  const total = c.economia.partes.reduce((s, p) => s + p.valor, 0) || 1;
  const fatias = c.economia.partes.map((p) => ({ ...p, pct: (p.valor / total) * 100 }));
  return `
    <div class="economia ${classe}">
      <h3>${esc(nome)}</h3>
      <div class="pilha" role="img" aria-label="Composição da economia de ${esc(nome)}">
        ${fatias.map((p) => `<span class="fatia ${p.chave}" style="flex-basis:${p.pct}%" title="${p.nome}: ${formatarDecimal(p.pct)}%"></span>`).join('')}
      </div>
      <ul>
        ${fatias.map((p) => `
          <li><i class="${p.chave}"></i>${p.nome}<b>${formatarDecimal(p.pct)}%</b><small>${formatarReais(p.valor, { compactar: true })}</small></li>`).join('')}
      </ul>
    </div>`;
}

function desenharResultado(ca, cb) {
  const ma = estado.porId.get(ca.id);
  const mb = estado.porId.get(cb.id);
  const iguais = ca.id === cb.id;

  $('#placar').innerHTML = [ma, mb].map((m, i) => `
    <div class="cidade ${i ? 'b' : 'a'}">
      <h2>${esc(m.nome)}</h2>
      <p>${m.uf} · ${esc(m.regiao)} · Região imediata de ${esc(m.regiaoImediata)}</p>
    </div>`).join('<span class="vs" aria-hidden="true">vs</span>');

  $('#resumo').textContent = iguais
    ? 'Você escolheu a mesma cidade nos dois lados. Troque uma delas para comparar.'
    : resumoEmTexto(ma.nome, ca, mb.nome, cb);

  $('#tabela').innerHTML = tabela(ca, cb, ma.nome, mb.nome);

  $('#legenda').innerHTML = `
    <span class="a">${esc(ma.nome)}</span>
    ${iguais ? '' : `<span class="b">${esc(mb.nome)}</span>`}`;
  const series = [seriePara(ca, ma.nome, 'a')];
  if (!iguais) series.push(seriePara(cb, mb.nome, 'b'));
  $('#grafico').innerHTML = graficoLinhas(series);

  const anoEconomia = ca.economia?.ano ?? cb.economia?.ano;
  $('#ano-economia').textContent = anoEconomia ? `Dados de ${anoEconomia}, o ano mais recente com a divisão por setor.` : '';
  $('#economias').innerHTML = economia(ca, ma.nome, 'a') + (iguais ? '' : economia(cb, mb.nome, 'b'));

  $('#resultado').hidden = false;
}

async function atualizar() {
  const { a, b, porId } = estado;
  $('#busca-a').value = rotulo(porId.get(a));
  $('#busca-b').value = rotulo(porId.get(b));

  const url = new URL(location.href);
  url.searchParams.set('a', a);
  url.searchParams.set('b', b);
  history.replaceState(null, '', url);

  const pedido = ++estado.pedido;
  mostrarStatus('Buscando os dados no IBGE...');
  document.body.classList.add('carregando');
  try {
    const cidades = await carregarCidades(a === b ? [a] : [a, b]);
    if (pedido !== estado.pedido) return; // chegou uma resposta antiga
    desenharResultado(cidades[0], cidades[1] ?? cidades[0]);
    mostrarStatus('');
  } catch (erro) {
    if (pedido === estado.pedido) {
      mostrarStatus(`Não foi possível falar com o IBGE agora (${erro.message}). Tente de novo em instantes.`, true);
    }
  } finally {
    if (pedido === estado.pedido) document.body.classList.remove('carregando');
  }
}

async function iniciar() {
  mostrarStatus('Carregando a lista de municípios...');
  try {
    estado.municipios = await carregarMunicipios();
  } catch (erro) {
    mostrarStatus(`Não foi possível carregar os municípios (${erro.message}). Recarregue a página.`, true);
    return;
  }
  estado.porId = new Map(estado.municipios.map((m) => [m.id, m]));

  const params = new URLSearchParams(location.search);
  estado.a = estado.porId.has(params.get('a')) ? params.get('a') : PADRAO.a;
  estado.b = estado.porId.has(params.get('b')) ? params.get('b') : PADRAO.b;

  configurarBusca('a');
  configurarBusca('b');

  $('#trocar').addEventListener('click', () => {
    [estado.a, estado.b] = [estado.b, estado.a];
    atualizar();
  });

  const botao = $('#copiar');
  botao.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      botao.textContent = 'Link copiado';
    } catch {
      botao.textContent = 'Copie o endereço da barra do navegador';
    }
    setTimeout(() => { botao.textContent = 'Copiar link desta comparação'; }, 2500);
  });

  atualizar();
}

iniciar();
