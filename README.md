# Compara Cidades

Compare dois municípios brasileiros lado a lado com dados oficiais do IBGE.

**Acesse:** https://enzocalhareslava-boop.github.io/compara-cidades/

Digite qualquer um dos 5.570 municípios do Brasil e veja, lado a lado:

- população estimada e população do Censo 2022
- área e habitantes por km²
- PIB e PIB por habitante
- crescimento da população desde 2001 (gráfico)
- de onde vem a economia da cidade: indústria, serviços, agropecuária, setor público e impostos

Toda comparação gera um link próprio (por exemplo `?a=3552205&b=3509502`), que pode ser compartilhado.

## Como funciona

A página é estática (HTML, CSS e JavaScript puro, sem framework e sem build) e busca os dados direto da [API de dados do IBGE](https://servicodados.ibge.gov.br/api/docs/):

| Dado | Tabela do IBGE |
| --- | --- |
| Lista de municípios | API de Localidades |
| População, área e densidade (Censo 2022) | Agregado 4714 |
| População estimada por ano | Agregado 6579 |
| PIB e valor adicionado por setor | Agregado 5938 |

Alguns cuidados que o código toma:

- O IBGE usa `...`, `-` e `X` para dado indisponível. Esses valores viram `null` e aparecem como "—", sem quebrar a página.
- Anos de censo não têm estimativa de população, então o Censo 2022 entra na série histórica.
- O PIB mais recente nem sempre tem população do mesmo ano. O PIB por habitante usa a população do ano mais próximo e mostra na tela quais anos foram usados.
- A divisão do PIB por setor sai depois do PIB total, então a página usa o ano mais recente que tem esse dado.
- Se a pessoa troca de cidade rápido, respostas antigas da API são descartadas para não mostrar dados misturados.

## Estrutura

```
index.html        página
style.css         visual (com modo escuro automático)
src/app.js        interface: busca com autocompletar, tabela, gráfico
src/ibge.js       chamadas à API do IBGE
src/utils.js      funções puras: busca sem acento, tratamento dos dados, formatação
src/grafico.js    gráfico de linhas em SVG, sem biblioteca
tests/            testes automatizados
```

## Rodando no computador

Precisa de um servidor local, porque os módulos JavaScript não funcionam abrindo o arquivo direto:

```bash
python -m http.server 8000
# abra http://localhost:8000
```

Testes (Node.js 18 ou mais novo):

```bash
npm test
```

## Autor

Enzo Calhares Lava, estudante de Análise e Desenvolvimento de Sistemas na Facens.
[LinkedIn](https://www.linkedin.com/in/enzo-calhares-lava-a7b8ab39a)

Desenvolvido com apoio de IA (Claude Code) para programar e revisar o código.
