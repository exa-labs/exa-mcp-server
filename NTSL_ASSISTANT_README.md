# NTSL Assistant - Assistente para Robôs de Trading Profitchart

## Visão Geral

O NTSL Assistant é uma ferramenta MCP (Model Context Protocol) integrada ao exa-mcp-server que auxilia na criação, validação e compreensão de códigos NTSL (Nelogica Trading System Language) para a plataforma Profitchart.

Esta ferramenta foi desenvolvida para auxiliar o **Manus AI** e outros assistentes de IA na automação de estratégias de trading usando NTSL.

## O que é NTSL?

NTSL (Nelogica Trading System Language) é a linguagem de programação usada no Editor de Estratégias do Profitchart, plataforma de trading da Nelogica. A linguagem é baseada em Pascal/EasyLanguage e permite criar robôs de trading automatizados.

## Ferramentas Disponíveis

### 1. `ntsl_generate_code`

Gera código NTSL completo baseado em templates ou descrições customizadas.

**Parâmetros:**
- `strategyType`: Tipo de estratégia (simpleStrategy, rsiStrategy, bollingerBands, breakoutStrategy, trailingStop, timeBasedExit, dailyLimit, custom)
- `customDescription`: Descrição da estratégia (obrigatório para tipo 'custom')
- `parameters`: Parâmetros opcionais (stopLoss, takeProfit, startTime, endTime)

**Exemplo de uso:**
```javascript
{
  "strategyType": "rsiStrategy",
  "parameters": {
    "stopLoss": 50,
    "takeProfit": 100,
    "startTime": "0930",
    "endTime": "1700"
  }
}
```

### 2. `ntsl_documentation`

Retorna documentação completa sobre NTSL, incluindo:
- Estrutura básica de um robô
- Funções de ordem (compra/venda)
- Indicadores técnicos disponíveis
- Gerenciamento de risco
- Sintaxe Pascal-like
- Boas práticas

**Não requer parâmetros.**

### 3. `ntsl_validate`

Valida sintaxe de código NTSL e fornece sugestões de melhorias.

**Parâmetros:**
- `code`: Código NTSL para validar

**Retorna:**
- Problemas críticos encontrados
- Avisos importantes
- Sugestões de melhoria
- Análise estrutural completa

### 4. `ntsl_explain`

Analisa e explica código NTSL em linguagem simples.

**Parâmetros:**
- `code`: Código NTSL para explicar

**Retorna:**
- Análise de parâmetros e variáveis
- Explicação da lógica da estratégia
- Condições de entrada e saída
- Indicadores utilizados
- Avaliação do gerenciamento de risco

## Templates de Estratégia Disponíveis

1. **simpleStrategy**: Cruzamento de médias móveis
2. **rsiStrategy**: Estratégia baseada em RSI
3. **bollingerBands**: Estratégia usando Bandas de Bollinger
4. **breakoutStrategy**: Rompimento de canal
5. **trailingStop**: Sistema de stop loss móvel
6. **timeBasedExit**: Saída baseada em horário
7. **dailyLimit**: Controle de limite diário de operações

## Como Habilitar o NTSL Assistant

### Configuração Local (Claude Desktop)

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": [
        "-y",
        "exa-mcp-server",
        "tools=ntsl_assistant"
      ]
    }
  }
}
```

### Configuração Remota (Cursor, Claude Code)

```json
{
  "mcpServers": {
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp?tools=ntsl_assistant",
      "headers": {}
    }
  }
}
```

### Habilitar Todas as Ferramentas (incluindo NTSL)

```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": [
        "-y",
        "exa-mcp-server",
        "tools=web_search_exa,get_code_context_exa,crawling_exa,company_research_exa,linkedin_search_exa,deep_researcher_start,deep_researcher_check,ntsl_assistant"
      ]
    }
  }
}
```

## Exemplos de Uso com Manus AI

### Exemplo 1: Gerar Estratégia RSI

**Prompt para Manus AI:**
```
"Crie uma estratégia de trading NTSL baseada em RSI para o Profitchart,
com stop loss de 30 ticks e take profit de 80 ticks"
```

**Manus AI usará:**
```javascript
ntsl_generate_code({
  strategyType: "rsiStrategy",
  parameters: {
    stopLoss: 30,
    takeProfit: 80
  }
})
```

### Exemplo 2: Validar Código Existente

**Prompt para Manus AI:**
```
"Valide este código NTSL e me diga se há problemas: [código aqui]"
```

**Manus AI usará:**
```javascript
ntsl_validate({
  code: "[código do usuário]"
})
```

### Exemplo 3: Entender Estratégia

**Prompt para Manus AI:**
```
"Explique o que este robô NTSL faz: [código aqui]"
```

**Manus AI usará:**
```javascript
ntsl_explain({
  code: "[código do usuário]"
})
```

## Fluxo de Trabalho Recomendado

1. **Geração**: Use `ntsl_generate_code` para criar código base
2. **Validação**: Use `ntsl_validate` para verificar o código
3. **Compreensão**: Use `ntsl_explain` para entender a lógica
4. **Documentação**: Use `ntsl_documentation` para consultar funções específicas
5. **Teste**: Copie o código para o Profitchart e teste em simulação
6. **Otimização**: Ajuste parâmetros e re-valide

## Recursos Adicionais

### Documentação Oficial NTSL
- [Manual NTSL da Nelogica](https://downloadserver-cdn.nelogica.com.br/content/profit/manual_ntsl/ManualNTSL.pdf)
- [Documentação NTSL - NeoTraderBot](https://neotraderbot.com/docs/material-iniciantes/plataformas/documentacao-ntsl-nelogica/)
- [Editor de Estratégias - Profitchart](https://ajuda.nelogica.com.br/hc/pt-br/articles/9165042993691)

### Repositórios de Exemplos
- [b2tradingclub/profitchart-estrategias](https://github.com/b2tradingclub/profitchart-estrategias)
- [venozo/profitchart](https://github.com/venozo/profitchart)

### Comunidades
- [Fórum NTSL - NeoTraderBot](https://neotraderbot.com/community/forum-aberto/)

## Avisos Importantes

⚠️ **ATENÇÃO**:
- Este assistente gera código educacional e de exemplo
- SEMPRE teste estratégias em conta simulada antes de usar dinheiro real
- Robôs de trading envolvem risco financeiro
- Entenda completamente qualquer código antes de executá-lo
- Consulte um profissional financeiro certificado
- A Nelogica e os desenvolvedores desta ferramenta não se responsabilizam por perdas financeiras

## Desenvolvimento e Contribuição

Esta ferramenta foi desenvolvida como parte do projeto exa-mcp-server.

**Estrutura do código:**
```
src/tools/ntslAssistant.ts - Implementação principal
src/index.ts - Registro da ferramenta
```

Para contribuir ou reportar problemas:
- [GitHub - exa-mcp-server](https://github.com/exa-labs/exa-mcp-server)

## Licença

Esta ferramenta segue a mesma licença do exa-mcp-server.

---

**Desenvolvido para auxiliar o Manus AI na automação de estratégias NTSL no Profitchart**

Build com ❤️ pela comunidade de desenvolvedores de trading algorítmico
