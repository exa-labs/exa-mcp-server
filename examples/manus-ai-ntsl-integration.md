# Exemplos de Integração Manus AI + NTSL Assistant

Este documento contém exemplos práticos de como o **Manus AI** pode usar o NTSL Assistant para criar, validar e executar estratégias de trading automatizadas no Profitchart.

## Cenário 1: Criar Estratégia Simples de Cruzamento de Médias

### Prompt do Usuário para Manus AI:
```
"Crie uma estratégia de trading que compre quando a média móvel de 9 períodos
cruzar acima da média de 21 períodos, e venda no cruzamento inverso.
Use stop loss de 50 ticks e take profit de 100 ticks."
```

### Chamada MCP que Manus AI fará:
```javascript
// 1. Gerar código NTSL
ntsl_generate_code({
  strategyType: "simpleStrategy",
  parameters: {
    stopLoss: 50,
    takeProfit: 100
  }
})
```

### Resposta Esperada:
O assistente retornará código NTSL completo pronto para uso no Profitchart, incluindo:
- Estrutura completa do robô
- Configuração de médias móveis (9 e 21 períodos)
- Lógica de entrada (cruzamento)
- Gerenciamento de stop loss e take profit
- Instruções de como usar

---

## Cenário 2: Criar Estratégia RSI com Horário Restrito

### Prompt do Usuário:
```
"Quero uma estratégia RSI que só opere entre 9:30 e 16:45.
Compra quando RSI está abaixo de 30 (sobrevendido) e
vende quando está acima de 70 (sobrecomprado).
Stop de 40 ticks, alvo de 120 ticks."
```

### Sequência de Chamadas Manus AI:
```javascript
// 1. Gerar código base
ntsl_generate_code({
  strategyType: "rsiStrategy",
  parameters: {
    stopLoss: 40,
    takeProfit: 120,
    startTime: "0930",
    endTime: "1645"
  }
})

// 2. Validar o código gerado
ntsl_validate({
  code: "[código gerado na etapa anterior]"
})
```

### Fluxo de Trabalho Manus AI:
1. Gera código NTSL baseado na estratégia RSI
2. Valida automaticamente o código
3. Se houver avisos, sugere melhorias
4. Apresenta código final ao usuário com explicação

---

## Cenário 3: Analisar Código Existente

### Prompt do Usuário:
```
"Analise este código NTSL e me diga o que ele faz:

Inputs
  cPeriodoRSI(14);

Vars
  fRSI(0);

Begin
  fRSI := RSI(cPeriodoRSI, 0);

  if fRSI < 30 and NOT IsBought then
    BuyAtMarket;

  if fRSI > 70 and NOT IsSold then
    SellShortAtMarket;
End;
"
```

### Chamadas Manus AI:
```javascript
// 1. Primeiro, explica o código
ntsl_explain({
  code: `[código fornecido pelo usuário]`
})

// 2. Depois, valida e sugere melhorias
ntsl_validate({
  code: `[código fornecido pelo usuário]`
})
```

### Resposta que Manus AI Fornecerá:
1. **Explicação detalhada**: "Esta estratégia usa RSI com período 14..."
2. **Avisos identificados**: "⚠️ Nenhum stop loss detectado..."
3. **Sugestões**: "💡 Considere adicionar gerenciamento de risco..."

---

## Cenário 4: Criar Estratégia Customizada Complexa

### Prompt do Usuário:
```
"Preciso de uma estratégia que:
1. Use Bandas de Bollinger (20 períodos, 2 desvios)
2. Opere apenas entre 10:00 e 17:00
3. Tenha stop loss de 35 ticks
4. Tenha take profit de 90 ticks
5. Feche todas as posições às 17:30
6. Máximo de 5 operações por dia"
```

### Fluxo Completo Manus AI:

```javascript
// Etapa 1: Gerar código base Bollinger Bands
const baseCode = await ntsl_generate_code({
  strategyType: "bollingerBands",
  parameters: {
    stopLoss: 35,
    takeProfit: 90,
    startTime: "1000",
    endTime: "1700"
  }
})

// Etapa 2: Manus AI reconhece necessidade de templates adicionais
const timeExitCode = await ntsl_generate_code({
  strategyType: "timeBasedExit",
  customDescription: "Fechar posições às 17:30"
})

const dailyLimitCode = await ntsl_generate_code({
  strategyType: "dailyLimit",
  customDescription: "Máximo 5 operações por dia"
})

// Etapa 3: Manus AI combina os códigos (usando sua inteligência)
// e cria versão integrada

// Etapa 4: Validar código final
await ntsl_validate({
  code: "[código combinado]"
})

// Etapa 5: Explicar ao usuário
await ntsl_explain({
  code: "[código combinado]"
})
```

---

## Cenário 5: Debugging e Correção

### Prompt do Usuário:
```
"Este código está dando erro no Profitchart. O que está errado?

Begin
  if Close > Average(Close, 20)
    BuyAtMarket;

  if Close < Average(Close, 20)
    SellAtMarket;
End;
"
```

### Processo Manus AI:

```javascript
// 1. Validar código
const validation = await ntsl_validate({
  code: `[código com erro]`
})

// 2. Identificar problemas
// Resposta: "❌ Falta estrutura Begin...End; para blocos if"
//          "⚠️ SellAtMarket não existe, use SellShortAtMarket"

// 3. Gerar código corrigido
const fixedCode = `
Vars
  fMedia(0);

Begin
  fMedia := Average(Close, 20);

  if Close > fMedia and NOT IsBought then
  Begin
    BuyAtMarket;
  End;

  if Close < fMedia and NOT IsSold then
  Begin
    SellShortAtMarket;
  End;
End;
`

// 4. Explicar as correções
await ntsl_explain({ code: fixedCode })
```

---

## Cenário 6: Otimização de Estratégia Existente

### Prompt do Usuário:
```
"Tenho esta estratégia funcionando, mas quero adicionar trailing stop
e proteção de breakeven. Como faço?

[código da estratégia atual]
"
```

### Fluxo Manus AI:

```javascript
// 1. Analisar código atual
await ntsl_explain({
  code: "[código atual do usuário]"
})

// 2. Buscar template de trailing stop
const trailingTemplate = await ntsl_generate_code({
  strategyType: "trailingStop"
})

// 3. Manus AI usa sua inteligência para:
//    - Identificar onde inserir trailing stop no código existente
//    - Manter a lógica original intacta
//    - Adicionar variáveis necessárias
//    - Integrar trailing stop com stop loss existente

// 4. Validar código combinado
await ntsl_validate({
  code: "[código otimizado]"
})

// 5. Explicar mudanças
// "Adicionei as seguintes melhorias ao seu código:
//  - Sistema de trailing stop que ajusta automaticamente
//  - Proteção breakeven quando atingir 30 ticks de lucro
//  - Mantive sua lógica de entrada original..."
```

---

## Cenário 7: Documentação e Aprendizado

### Prompt do Usuário:
```
"Quero aprender a programar em NTSL. Me explique as funções básicas."
```

### Chamada Manus AI:
```javascript
// Buscar documentação completa
const docs = await ntsl_documentation()

// Manus AI então:
// 1. Apresenta documentação de forma didática
// 2. Destaca funções mais importantes para iniciantes
// 3. Sugere começar com templates simples
// 4. Oferece criar exemplo prático
```

---

## Cenário 8: Workflow Completo de Desenvolvimento

### Prompt do Usuário:
```
"Quero desenvolver um robô de trading completo do zero"
```

### Processo Guiado pelo Manus AI:

```javascript
// FASE 1: PLANEJAMENTO
// Manus AI faz perguntas ao usuário:
// - Qual indicador quer usar?
// - Qual horário de operação?
// - Quanto de risco aceita?
// - Quantas operações por dia?

// FASE 2: GERAÇÃO
const strategy = await ntsl_generate_code({
  strategyType: "[escolhido pelo usuário]",
  parameters: {
    // preenchido com respostas
  }
})

// FASE 3: VALIDAÇÃO
const validation = await ntsl_validate({
  code: strategy
})

// FASE 4: EXPLICAÇÃO
const explanation = await ntsl_explain({
  code: strategy
})

// FASE 5: DOCUMENTAÇÃO
const docs = await ntsl_documentation()

// FASE 6: ITERAÇÃO
// Manus AI pergunta: "Quer ajustar algo?"
// Se sim, volta para FASE 2 com ajustes
// Se não, fornece código final com:
// - Arquivo .txt para importar no Profitchart
// - Checklist de testes recomendados
// - Parâmetros sugeridos para otimização
// - Avisos de risco
```

---

## Integração com Pipeline Manus AI

### Arquitetura Sugerida:

```
Usuário
  ↓
Manus AI (Agente Principal)
  ↓
┌─────────────────────────────────┐
│  Decision Layer (Manus)         │
│  - Interpreta intenção         │
│  - Escolhe ferramentas         │
│  - Orquestra workflow          │
└─────────────────────────────────┘
  ↓
┌─────────────────────────────────┐
│  NTSL Assistant (MCP Tools)     │
│  - ntsl_generate_code          │
│  - ntsl_validate               │
│  - ntsl_explain                │
│  - ntsl_documentation          │
└─────────────────────────────────┘
  ↓
Código NTSL Pronto
  ↓
Profitchart (Execução)
```

---

## Boas Práticas para Manus AI

### 1. Sempre Validar Antes de Apresentar
```javascript
// ❌ NÃO FAZER
const code = await ntsl_generate_code(...)
return code // enviar direto ao usuário

// ✅ FAZER
const code = await ntsl_generate_code(...)
const validation = await ntsl_validate({ code })
if (validation.hasIssues) {
  // corrigir ou avisar usuário
}
return code
```

### 2. Explicar em Linguagem Simples
```javascript
// Sempre que gerar código complexo
const code = await ntsl_generate_code(...)
const explanation = await ntsl_explain({ code })

// Apresentar ambos ao usuário:
// - Código técnico
// - Explicação em português claro
```

### 3. Educar o Usuário
```javascript
// Incluir avisos de segurança
console.log(`
⚠️ IMPORTANTE: Este código é educacional.
SEMPRE teste em conta simulada antes de usar dinheiro real.
`)
```

### 4. Workflow Incremental
```javascript
// Não sobrecarregar o usuário
// Ir passo a passo:
// 1. Gerar código base simples
// 2. Testar e validar
// 3. Adicionar complexidade gradualmente
// 4. Validar a cada iteração
```

---

## Métricas de Sucesso

O Manus AI deve rastrear:
- ✅ Códigos gerados com sucesso
- ✅ Códigos que passaram na validação
- ⚠️ Avisos comuns encontrados
- ❌ Erros frequentes
- 🔄 Iterações médias até código final
- 📚 Consultas à documentação

Isso permite melhorar continuamente a experiência do usuário.

---

## Exemplo de Conversa Completa

```
Usuário: "Quero criar um robô de trading"

Manus AI: "Ótimo! Vou te ajudar a criar um robô NTSL para o Profitchart.
         Para começar, me diga:

         1. Qual indicador você quer usar?
            (médias móveis, RSI, Bollinger, outro...)
         2. Em qual horário quer operar?
         3. Quanto de stop loss e take profit?"

Usuário: "Quero usar RSI, operar das 10h às 17h, stop de 50 e alvo de 100"

Manus AI: [Chama ntsl_generate_code com parâmetros]

         "Pronto! Criei sua estratégia. Veja o código:

         [mostra código NTSL]

         Esta estratégia faz o seguinte:
         [mostra explicação do ntsl_explain]

         Validei o código e está tudo certo ✅

         Para usar:
         1. Abra o Profitchart
         2. Vá em Ferramentas > Editor de Estratégias
         3. Cole este código
         4. Teste em simulação primeiro!

         Quer ajustar algo?"

Usuário: "Perfeito! Obrigado!"

Manus AI: "De nada! Lembre-se:
         - Teste bem antes de usar dinheiro real
         - Ajuste os parâmetros conforme sua tolerância ao risco
         - Monitore as operações regularmente

         Boa sorte! 🚀"
```

---

**Desenvolvido para integração Manus AI + NTSL Assistant + Profitchart**
