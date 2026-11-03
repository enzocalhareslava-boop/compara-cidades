import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizar, buscarMunicipios, numeroIBGE, serieNumerica, ultimoAnoComDado,
  anoMaisProximo, crescimentoPercentual, vencedor, resumirCidade, resumoEmTexto,
} from '../src/utils.js';

const municipios = [
  { id: '1', nome: 'São Paulo', uf: 'SP' },
  { id: '2', nome: 'Sorocaba', uf: 'SP' },
  { id: '3', nome: 'Paulínia', uf: 'SP' },
  { id: '4', nome: 'São Paulo do Potengi', uf: 'RN' },
].map((m) => ({ ...m, busca: normalizar(`${m.nome} ${m.uf}`) }));

test('normalizar tira acentos e maiúsculas', () => {
  assert.equal(normalizar('  São PAULO '), 'sao paulo');
});

test('busca ignora acento e põe primeiro quem começa com o termo', () => {
  const nomes = buscarMunicipios(municipios, 'paul').map((m) => m.nome);
  assert.deepEqual(nomes, ['Paulínia', 'São Paulo', 'São Paulo do Potengi']);
});

test('busca aceita nome com UF e exige 2 letras', () => {
  assert.deepEqual(buscarMunicipios(municipios, 'sao paulo rn').map((m) => m.id), []);
  assert.deepEqual(buscarMunicipios(municipios, 'sorocaba sp').map((m) => m.id), ['2']);
  assert.deepEqual(buscarMunicipios(municipios, 's'), []);
});

test('valores especiais do IBGE viram null', () => {
  assert.equal(numeroIBGE('...'), null);
  assert.equal(numeroIBGE('-'), null);
  assert.equal(numeroIBGE('X'), null);
  assert.equal(numeroIBGE(''), null);
  assert.equal(numeroIBGE('449.872'), 449.872);
  assert.deepEqual(serieNumerica({ 2021: '10', 2022: '...' }), { 2021: 10 });
});

test('último ano e ano mais próximo', () => {
  assert.deepEqual(ultimoAnoComDado({ 2019: 1, 2024: 5, 2021: 3 }), { ano: 2024, valor: 5 });
  assert.equal(ultimoAnoComDado({}), null);
  assert.equal(anoMaisProximo([2021, 2022, 2024], 2023), 2022); // empate fica com o anterior
  assert.equal(anoMaisProximo([2001, 2010], 2030), 2010);
});

test('crescimento e vencedor', () => {
  assert.equal(crescimentoPercentual(100, 150), 50);
  assert.equal(crescimentoPercentual(0, 10), null);
  assert.equal(vencedor(2, 1), 'a');
  assert.equal(vencedor(1, 2), 'b');
  assert.equal(vencedor(1, 1), null);
  assert.equal(vencedor(null, 1), null);
});

test('resumirCidade junta censo, estimativas e PIB', () => {
  const id = '2';
  const c = resumirCidade(id, {
    censo: { 93: { 2: { 2022: 700 } }, 6318: { 2: { 2022: 10 } }, 614: { 2: { 2022: 70 } } },
    estimativas: { 9324: { 2: { 2001: 500, 2021: 690, 2024: 750 } } },
    pib: { 37: { 2: { 2023: 14000 } } },
    setores: { 517: { 2: { 2021: 4 } }, 513: { 2: { 2021: 1 } }, 6575: { 2: { 2021: 3 } }, 525: { 2: { 2021: 1 } }, 543: { 2: { 2021: 1 } } },
  });
  assert.deepEqual(c.popAtual, { ano: 2024, valor: 750 });
  assert.equal(c.populacao[2022], 700);
  assert.equal(c.crescimento.desde, 2001);
  assert.equal(c.crescimento.valor, 50);
  assert.equal(c.anoPopPerCapita, 2022);
  assert.equal(c.pibPerCapita, 20000); // 14.000 mil reais / 700 pessoas
  assert.equal(c.economia.ano, 2021);
  assert.equal(c.economia.partes.find((p) => p.chave === 'industria').valor, 4000);
});

test('resumirCidade não quebra quando faltam dados', () => {
  const c = resumirCidade('9', { censo: {}, estimativas: {}, pib: {}, setores: {} });
  assert.equal(c.popAtual, null);
  assert.equal(c.pibPerCapita, null);
  assert.equal(c.economia, null);
});

test('resumo em texto', () => {
  const a = { popAtual: { valor: 1000 }, pibPerCapita: 50000 };
  const b = { popAtual: { valor: 500 }, pibPerCapita: 40000 };
  assert.equal(
    resumoEmTexto('A', a, 'B', b),
    'A tem 2,0 vezes a população de B, e o PIB por habitante de A é 25% maior.',
  );
});
