import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createRequestLogger } from "../utils/logger.js";

/**
 * NTSL (Nelogica Trading System Language) code templates and helpers
 * For use with Profitchart platform
 */

const NTSL_TEMPLATES = {
  simpleStrategy: `// Estratégia Simples de Cruzamento de Médias
Inputs
  cPeriodoRapida(9),
  cPeriodoLenta(21),
  cStopEmTicks(50),
  cAlvoEmTicks(100);

Vars
  fMediaRapida(0),
  fMediaLenta(0),
  fPrecoStop(0),
  fPrecoAlvo(0);

Begin
  // Calcula as médias móveis
  fMediaRapida := Average(Close, cPeriodoRapida);
  fMediaLenta := Average(Close, cPeriodoLenta);

  // Condição de Compra: Média rápida cruza acima da média lenta
  if CrossOver(fMediaRapida, fMediaLenta) and NOT IsBought then
  Begin
    BuyAtMarket;
  End;

  // Condição de Venda: Média rápida cruza abaixo da média lenta
  if CrossUnder(fMediaRapida, fMediaLenta) and NOT IsSold then
  Begin
    SellShortAtMarket;
  End;

  // Gerenciamento de Stop Loss e Take Profit para posição comprada
  if IsBought then
  Begin
    fPrecoStop := BuyPrice - cStopEmTicks * MinPriceIncrement;
    fPrecoAlvo := BuyPrice + cAlvoEmTicks * MinPriceIncrement;
    SellToCoverStop(fPrecoStop);
    SellToCoverLimit(fPrecoAlvo);
  End;

  // Gerenciamento de Stop Loss e Take Profit para posição vendida
  if IsSold then
  Begin
    fPrecoStop := SellShortPrice + cStopEmTicks * MinPriceIncrement;
    fPrecoAlvo := SellShortPrice - cAlvoEmTicks * MinPriceIncrement;
    BuyToCoverStop(fPrecoStop);
    BuyToCoverLimit(fPrecoAlvo);
  End;
End;`,

  rsiStrategy: `// Estratégia RSI (Índice de Força Relativa)
Inputs
  cPeriodoRSI(14),
  cSobrecomprado(70),
  cSobrevendido(30),
  cStopEmTicks(50),
  cAlvoEmTicks(100);

Vars
  fRSI(0),
  fPrecoStop(0),
  fPrecoAlvo(0);

Begin
  // Calcula o RSI
  fRSI := RSI(cPeriodoRSI, 0);

  // Compra quando RSI está sobrevendido
  if fRSI < cSobrevendido and NOT IsBought and NOT IsSold then
  Begin
    BuyAtMarket;
  End;

  // Vende quando RSI está sobrecomprado
  if fRSI > cSobrecomprado and NOT IsSold and NOT IsBought then
  Begin
    SellShortAtMarket;
  End;

  // Stop Loss e Take Profit
  if IsBought then
  Begin
    fPrecoStop := BuyPrice - cStopEmTicks * MinPriceIncrement;
    fPrecoAlvo := BuyPrice + cAlvoEmTicks * MinPriceIncrement;
    SellToCoverStop(fPrecoStop);
    SellToCoverLimit(fPrecoAlvo);
  End;

  if IsSold then
  Begin
    fPrecoStop := SellShortPrice + cStopEmTicks * MinPriceIncrement;
    fPrecoAlvo := SellShortPrice - cAlvoEmTicks * MinPriceIncrement;
    BuyToCoverStop(fPrecoStop);
    BuyToCoverLimit(fPrecoAlvo);
  End;
End;`,

  bollingerBands: `// Estratégia Bandas de Bollinger
Inputs
  cPeriodo(20),
  cDesvioPadrao(2),
  cStopEmTicks(50),
  cAlvoEmTicks(100);

Vars
  fBandaSuperior(0),
  fMediaCentral(0),
  fBandaInferior(0),
  fPrecoStop(0),
  fPrecoAlvo(0);

Begin
  // Calcula as Bandas de Bollinger
  fMediaCentral := Average(Close, cPeriodo);
  fBandaSuperior := fMediaCentral + cDesvioPadrao * StdDevs(Close, cPeriodo);
  fBandaInferior := fMediaCentral - cDesvioPadrao * StdDevs(Close, cPeriodo);

  // Compra quando preço toca banda inferior
  if Close <= fBandaInferior and NOT IsBought and NOT IsSold then
  Begin
    BuyAtMarket;
  End;

  // Vende quando preço toca banda superior
  if Close >= fBandaSuperior and NOT IsSold and NOT IsBought then
  Begin
    SellShortAtMarket;
  End;

  // Stop Loss e Take Profit
  if IsBought then
  Begin
    fPrecoStop := BuyPrice - cStopEmTicks * MinPriceIncrement;
    fPrecoAlvo := BuyPrice + cAlvoEmTicks * MinPriceIncrement;
    SellToCoverStop(fPrecoStop);
    SellToCoverLimit(fPrecoAlvo);
  End;

  if IsSold then
  Begin
    fPrecoStop := SellShortPrice + cStopEmTicks * MinPriceIncrement;
    fPrecoAlvo := SellShortPrice - cAlvoEmTicks * MinPriceIncrement;
    BuyToCoverStop(fPrecoStop);
    BuyToCoverLimit(fPrecoAlvo);
  End;
End;`,

  breakoutStrategy: `// Estratégia de Rompimento (Breakout)
Inputs
  cPeriodoCanal(20),
  cStopEmTicks(50),
  cAlvoEmTicks(150);

Vars
  fMaxima(0),
  fMinima(0),
  fPrecoStop(0),
  fPrecoAlvo(0);

Begin
  // Identifica máxima e mínima do período
  fMaxima := Highest(High, cPeriodoCanal)[1];
  fMinima := Lowest(Low, cPeriodoCanal)[1];

  // Compra no rompimento da máxima
  if Close > fMaxima and NOT IsBought and NOT IsSold then
  Begin
    BuyAtMarket;
  End;

  // Vende no rompimento da mínima
  if Close < fMinima and NOT IsSold and NOT IsBought then
  Begin
    SellShortAtMarket;
  End;

  // Stop Loss e Take Profit
  if IsBought then
  Begin
    fPrecoStop := BuyPrice - cStopEmTicks * MinPriceIncrement;
    fPrecoAlvo := BuyPrice + cAlvoEmTicks * MinPriceIncrement;
    SellToCoverStop(fPrecoStop);
    SellToCoverLimit(fPrecoAlvo);
  End;

  if IsSold then
  Begin
    fPrecoStop := SellShortPrice + cStopEmTicks * MinPriceIncrement;
    fPrecoAlvo := SellShortPrice - cAlvoEmTicks * MinPriceIncrement;
    BuyToCoverStop(fPrecoStop);
    BuyToCoverLimit(fPrecoAlvo);
  End;
End;`,

  trailingStop: `// Sistema de Trailing Stop
Inputs
  cBreakevenEmTicks(30),
  cTrailingEmTicks(20);

Vars
  fPrecoStopAtual(0),
  fBreakevenAtingido(false);

Begin
  // Trailing Stop para posição comprada
  if IsBought then
  Begin
    // Ativa breakeven quando atingir lucro mínimo
    if NOT fBreakevenAtingido and Close >= (BuyPrice + cBreakevenEmTicks * MinPriceIncrement) then
    Begin
      fPrecoStopAtual := BuyPrice;
      fBreakevenAtingido := true;
    End;

    // Ajusta trailing stop
    if fBreakevenAtingido and Close > (fPrecoStopAtual + cTrailingEmTicks * MinPriceIncrement) then
    Begin
      fPrecoStopAtual := Close - cTrailingEmTicks * MinPriceIncrement;
    End;

    // Aplica stop
    if fBreakevenAtingido then
      SellToCoverStop(fPrecoStopAtual);
  End
  else
  Begin
    fBreakevenAtingido := false;
  End;

  // Trailing Stop para posição vendida
  if IsSold then
  Begin
    if NOT fBreakevenAtingido and Close <= (SellShortPrice - cBreakevenEmTicks * MinPriceIncrement) then
    Begin
      fPrecoStopAtual := SellShortPrice;
      fBreakevenAtingido := true;
    End;

    if fBreakevenAtingido and Close < (fPrecoStopAtual - cTrailingEmTicks * MinPriceIncrement) then
    Begin
      fPrecoStopAtual := Close + cTrailingEmTicks * MinPriceIncrement;
    End;

    if fBreakevenAtingido then
      BuyToCoverStop(fPrecoStopAtual);
  End
  else
  Begin
    fBreakevenAtingido := false;
  End;
End;`,

  timeBasedExit: `// Sistema de Saída Baseada em Horário
Inputs
  cHorarioInicio(0930),
  cHorarioFim(1645),
  cHorarioSaida(1730);

Begin
  // Verifica se está no horário de operação
  if Time >= cHorarioInicio and Time < cHorarioFim then
  Begin
    // Suas condições de entrada aqui
    // Exemplo: if CondicaoCompra then BuyAtMarket;
  End;

  // Fecha posições no horário de saída
  if Time >= cHorarioSaida then
  Begin
    if HasPosition then
      ClosePosition;
  End;
End;`,

  dailyLimit: `// Sistema de Limite Diário de Operações
Inputs
  cMaxOperacoesDia(3),
  cStopLossDiario(-500),
  cLucroDiario(1000);

Vars
  fResultadoDia(0),
  fOperacoesHoje(0);

Begin
  // Calcula resultado do dia
  fResultadoDia := DailyResult();

  // Conta operações realizadas
  if IsBought[1] = false and IsBought = true then
    fOperacoesHoje := fOperacoesHoje + 1;

  if IsSold[1] = false and IsSold = true then
    fOperacoesHoje := fOperacoesHoje + 1;

  // Reseta contador em novo dia
  if Date <> Date[1] then
    fOperacoesHoje := 0;

  // Verifica limites
  if fResultadoDia >= cLucroDiario then
  Begin
    if HasPosition then
      ClosePosition;
    // Não abre novas posições
    Exit;
  End;

  if fResultadoDia <= cStopLossDiario then
  Begin
    if HasPosition then
      ClosePosition;
    // Não abre novas posições
    Exit;
  End;

  if fOperacoesHoje >= cMaxOperacoesDia then
  Begin
    // Não abre novas posições
    Exit;
  End;

  // Suas condições de entrada aqui
  // Exemplo: if CondicaoCompra then BuyAtMarket;
End;`
};

const NTSL_DOCUMENTATION = `
# NTSL - Nelogica Trading System Language - Guia Completo

## Estrutura Básica de um Robô NTSL

\`\`\`
Inputs
  // Parâmetros configuráveis

Vars
  // Variáveis da estratégia

Begin
  // Lógica da estratégia
End;
\`\`\`

## Funções de Ordem Principais

### Compra
- **BuyAtMarket**: Compra a mercado
- **BuyLimit(Preco)**: Compra limitada ao preço especificado
- **BuyStop(Preco)**: Compra quando preço atinge stop
- **BuyPosition**: Verifica quantidade de contratos comprados

### Venda
- **SellShortAtMarket**: Vende a mercado
- **SellShortLimit(Preco)**: Venda limitada
- **SellShortStop(Preco)**: Venda quando preço atinge stop

### Fechamento de Posições
- **SellToCoverAtMarket**: Fecha posição comprada a mercado
- **SellToCoverStop(Preco)**: Stop loss para posição comprada
- **SellToCoverLimit(Preco)**: Take profit para posição comprada
- **BuyToCoverAtMarket**: Fecha posição vendida a mercado
- **BuyToCoverStop(Preco)**: Stop loss para posição vendida
- **BuyToCoverLimit(Preco)**: Take profit para posição vendida
- **ClosePosition**: Fecha todas as posições

## Estado de Posições

- **IsBought**: Retorna true se está comprado
- **IsSold**: Retorna true se está vendido
- **HasPosition**: Retorna true se tem posição aberta
- **BuyPrice**: Preço de compra da posição atual
- **SellShortPrice**: Preço de venda da posição atual

## Indicadores Técnicos Principais

### Médias Móveis
- **Average(Dado, Periodo)**: Média móvel simples
- **XAverage(Dado, Periodo)**: Média móvel exponencial
- **WAverage(Dado, Periodo)**: Média móvel ponderada

### Osciladores
- **RSI(Periodo, Tipo)**: Índice de Força Relativa
- **MACD(RapidaPeriodo, LentaPeriodo, SignalPeriodo)**: MACD
- **Stochastic(Periodo)**: Estocástico
- **ADX(Periodo)**: Average Directional Index

### Bandas e Canais
- **StdDevs(Dado, Periodo)**: Desvio padrão
- **Highest(Dado, Periodo)**: Máxima do período
- **Lowest(Dado, Periodo)**: Mínima do período

### Volume
- **Volume**: Volume da barra atual
- **OBV()**: On Balance Volume

## Funções de Tempo

- **Time**: Horário da barra atual (formato HHMM)
- **Date**: Data da barra atual
- **DayOfWeek(Data)**: Dia da semana (0=Domingo, 6=Sábado)
- **CurrentDate()**: Data atual do sistema

## Funções Matemáticas

- **Sqrt(Numero)**: Raiz quadrada
- **Abs(Numero)**: Valor absoluto
- **Max(A, B)**: Retorna o maior valor
- **Min(A, B)**: Retorna o menor valor
- **Round(Numero)**: Arredonda para inteiro
- **Floor(Numero)**: Arredonda para baixo

## Funções de Cruzamento

- **CrossOver(Serie1, Serie2)**: True quando Serie1 cruza acima de Serie2
- **CrossUnder(Serie1, Serie2)**: True quando Serie1 cruza abaixo de Serie2

## Dados de Preço

- **Open**: Abertura da barra
- **High**: Máxima da barra
- **Low**: Mínima da barra
- **Close**: Fechamento da barra
- **MinPriceIncrement**: Tick mínimo do ativo

## Gerenciamento de Risco

- **DailyResult()**: Resultado financeiro do dia
- **Position()**: Quantidade de contratos na posição

## Sintaxe Pascal-like

### Condicionais
\`\`\`
if Condicao then
Begin
  // código
End;

if Condicao then
  ComandoUnico;

if Condicao1 then
  Comando1
else if Condicao2 then
  Comando2
else
  Comando3;
\`\`\`

### Loops
\`\`\`
for i := 1 to 10 do
Begin
  // código
End;

while Condicao do
Begin
  // código
End;
\`\`\`

### Operadores
- Comparação: =, <>, <, >, <=, >=
- Lógicos: AND, OR, NOT
- Aritméticos: +, -, *, /, :=

## Referência a Barras Anteriores

Use colchetes para acessar valores de barras passadas:
- Close[1]: Fechamento da barra anterior
- High[2]: Máxima de 2 barras atrás
- fVariavel[1]: Valor anterior da variável

## Boas Práticas

1. **Sempre defina Stop Loss e Take Profit**
2. **Limite operações por dia**
3. **Use horários de operação apropriados**
4. **Teste com dados históricos tick-a-tick**
5. **Valide em diferentes condições de mercado**
6. **Documente sua estratégia com comentários**
7. **Use Inputs para parâmetros configuráveis**
`;

export function registerNTSLAssistantTool(server: McpServer, config?: { exaApiKey?: string }): void {
  // Tool 1: Generate NTSL code
  server.tool(
    "ntsl_generate_code",
    "Gera código NTSL (Nelogica Trading System Language) para robôs de trading no Profitchart. Use esta ferramenta para criar estratégias de trading automatizadas baseadas em descrições em linguagem natural. Suporta estratégias baseadas em indicadores técnicos, gerenciamento de risco, e mais.",
    {
      strategyType: z.enum([
        "simpleStrategy",
        "rsiStrategy",
        "bollingerBands",
        "breakoutStrategy",
        "trailingStop",
        "timeBasedExit",
        "dailyLimit",
        "custom"
      ]).describe("Tipo de estratégia: simpleStrategy (cruzamento de médias), rsiStrategy (RSI), bollingerBands (Bandas de Bollinger), breakoutStrategy (rompimento), trailingStop (stop móvel), timeBasedExit (saída por horário), dailyLimit (limite diário), custom (personalizada)"),
      customDescription: z.string().optional().describe("Descrição detalhada da estratégia customizada (obrigatório se strategyType = 'custom')"),
      parameters: z.object({
        stopLoss: z.number().optional().describe("Stop loss em ticks"),
        takeProfit: z.number().optional().describe("Take profit em ticks"),
        startTime: z.string().optional().describe("Horário de início (formato HHMM)"),
        endTime: z.string().optional().describe("Horário de fim (formato HHMM)")
      }).optional()
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ strategyType, customDescription, parameters }) => {
      const requestId = `ntsl_generate-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'ntsl_generate_code');

      logger.start(`Generating NTSL code for strategy: ${strategyType}`);

      try {
        let code = "";
        let description = "";

        if (strategyType === "custom" && customDescription) {
          description = `Estratégia Customizada: ${customDescription}`;
          code = generateCustomStrategy(customDescription, parameters);
        } else if (strategyType in NTSL_TEMPLATES) {
          code = NTSL_TEMPLATES[strategyType as keyof typeof NTSL_TEMPLATES];
          description = `Template de estratégia: ${strategyType}`;
        } else {
          logger.log("Invalid strategy type");
          return {
            content: [{
              type: "text" as const,
              text: "Tipo de estratégia inválido. Use um dos tipos pré-definidos ou 'custom' com uma descrição."
            }],
            isError: true
          };
        }

        // Apply parameters if provided
        if (parameters) {
          if (parameters.stopLoss) {
            code = code.replace(/cStopEmTicks\(\d+\)/, `cStopEmTicks(${parameters.stopLoss})`);
          }
          if (parameters.takeProfit) {
            code = code.replace(/cAlvoEmTicks\(\d+\)/, `cAlvoEmTicks(${parameters.takeProfit})`);
          }
          if (parameters.startTime) {
            code = code.replace(/cHorarioInicio\(\d+\)/, `cHorarioInicio(${parameters.startTime})`);
          }
          if (parameters.endTime) {
            code = code.replace(/cHorarioFim\(\d+\)/, `cHorarioFim(${parameters.endTime})`);
          }
        }

        const result = `# ${description}

## Código NTSL Gerado

\`\`\`pascal
${code}
\`\`\`

## Como Usar

1. Abra o Profitchart da Nelogica
2. Acesse: Menu > Ferramentas > Editor de Estratégias
3. Crie uma nova estratégia
4. Cole o código acima
5. Compile e teste em modo de simulação
6. Ajuste os parâmetros conforme necessário

## Próximos Passos

- Teste a estratégia com dados históricos
- Valide em diferentes condições de mercado
- Ajuste os parâmetros de risco (stop loss, take profit)
- Execute testes com dados tick-a-tick
- Use o módulo de otimização para encontrar melhores parâmetros

## Avisos Importantes

⚠️ **ATENÇÃO**: Esta estratégia é apenas um ponto de partida. SEMPRE:
- Teste extensivamente antes de usar com dinheiro real
- Entenda completamente a lógica da estratégia
- Ajuste o gerenciamento de risco para seu perfil
- Monitore as operações regularmente
- Considere condições de mercado e volatilidade

Para mais informações sobre NTSL, use a ferramenta 'ntsl_documentation'.
`;

        logger.complete();
        return {
          content: [{
            type: "text" as const,
            text: result
          }]
        };
      } catch (error) {
        logger.error(error);
        return {
          content: [{
            type: "text" as const,
            text: `Erro ao gerar código NTSL: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool 2: NTSL Documentation
  server.tool(
    "ntsl_documentation",
    "Retorna documentação completa sobre NTSL (Nelogica Trading System Language), incluindo sintaxe, funções, indicadores, e boas práticas para desenvolvimento de robôs de trading no Profitchart.",
    {},
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    async () => {
      const requestId = `ntsl_docs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'ntsl_documentation');

      logger.start("Retrieving NTSL documentation");
      logger.complete();

      return {
        content: [{
          type: "text" as const,
          text: NTSL_DOCUMENTATION
        }]
      };
    }
  );

  // Tool 3: Validate NTSL syntax
  server.tool(
    "ntsl_validate",
    "Valida sintaxe de código NTSL e fornece sugestões de melhorias. Verifica estrutura básica, uso correto de funções, e boas práticas.",
    {
      code: z.string().describe("Código NTSL para validar")
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ code }) => {
      const requestId = `ntsl_validate-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'ntsl_validate');

      logger.start("Validating NTSL code");

      try {
        const issues: string[] = [];
        const warnings: string[] = [];
        const suggestions: string[] = [];

        // Basic syntax checks
        if (!code.includes("Begin") || !code.includes("End;")) {
          issues.push("❌ Falta estrutura Begin...End;");
        }

        // Check for risk management
        const hasStopLoss = code.includes("Stop") || code.includes("ClosePosition");
        if (!hasStopLoss) {
          warnings.push("⚠️ Nenhum stop loss detectado - considere adicionar gerenciamento de risco");
        }

        const hasTakeProfit = code.includes("Limit") && (code.includes("SellToCover") || code.includes("BuyToCover"));
        if (!hasTakeProfit) {
          warnings.push("⚠️ Nenhum take profit detectado - considere definir alvos de lucro");
        }

        // Check for position verification
        if ((code.includes("BuyAtMarket") || code.includes("SellShortAtMarket")) &&
            !code.includes("IsBought") && !code.includes("IsSold") && !code.includes("HasPosition")) {
          warnings.push("⚠️ Recomendado verificar posição atual antes de abrir novas ordens");
        }

        // Check for inputs
        if (!code.includes("Inputs")) {
          suggestions.push("💡 Considere usar 'Inputs' para tornar parâmetros configuráveis");
        }

        // Check for time restrictions
        if (!code.includes("Time")) {
          suggestions.push("💡 Considere adicionar restrições de horário de operação");
        }

        // Check for daily limits
        if (!code.includes("DailyResult") && !code.includes("Date")) {
          suggestions.push("💡 Considere implementar limites diários de perda/lucro");
        }

        // Check variable declarations
        const hasVars = code.includes("Vars");
        const hasBuyAtMarket = code.includes("BuyAtMarket");
        const hasSellShortAtMarket = code.includes("SellShortAtMarket");

        if ((hasBuyAtMarket || hasSellShortAtMarket) && hasVars) {
          const varsMatch = code.match(/Vars([\s\S]*?)Begin/);
          if (varsMatch && varsMatch[1]) {
            const varsSection = varsMatch[1];
            if (varsSection.includes("fPrecoStop") || varsSection.includes("fPrecoAlvo")) {
              // Good practice detected
            }
          }
        }

        // Generate validation report
        let report = "# Validação de Código NTSL\n\n";

        if (issues.length === 0 && warnings.length === 0) {
          report += "✅ **Código válido!** Nenhum problema crítico encontrado.\n\n";
        } else {
          if (issues.length > 0) {
            report += "## ❌ Problemas Críticos\n\n";
            issues.forEach(issue => report += `${issue}\n`);
            report += "\n";
          }

          if (warnings.length > 0) {
            report += "## ⚠️ Avisos\n\n";
            warnings.forEach(warning => report += `${warning}\n`);
            report += "\n";
          }
        }

        if (suggestions.length > 0) {
          report += "## 💡 Sugestões de Melhoria\n\n";
          suggestions.forEach(suggestion => report += `${suggestion}\n`);
          report += "\n";
        }

        report += "## Análise Estrutural\n\n";
        report += `- Estrutura Begin/End: ${code.includes("Begin") && code.includes("End;") ? "✅" : "❌"}\n`;
        report += `- Declaração de Inputs: ${code.includes("Inputs") ? "✅" : "➖"}\n`;
        report += `- Declaração de Vars: ${code.includes("Vars") ? "✅" : "➖"}\n`;
        report += `- Gerenciamento de Stop Loss: ${hasStopLoss ? "✅" : "❌"}\n`;
        report += `- Gerenciamento de Take Profit: ${hasTakeProfit ? "✅" : "⚠️"}\n`;
        report += `- Verificação de Posição: ${code.includes("IsBought") || code.includes("IsSold") ? "✅" : "⚠️"}\n`;
        report += `- Restrição de Horário: ${code.includes("Time") ? "✅" : "➖"}\n`;

        report += "\n## Próximos Passos\n\n";
        report += "1. Corrija os problemas críticos (❌) se houver\n";
        report += "2. Revise os avisos (⚠️) e implemente melhorias necessárias\n";
        report += "3. Considere as sugestões (💡) para robustez da estratégia\n";
        report += "4. Teste o código no Editor de Estratégias do Profitchart\n";
        report += "5. Execute backtests com dados históricos\n";

        logger.complete();
        return {
          content: [{
            type: "text" as const,
            text: report
          }]
        };
      } catch (error) {
        logger.error(error);
        return {
          content: [{
            type: "text" as const,
            text: `Erro ao validar código NTSL: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Tool 4: Explain NTSL code
  server.tool(
    "ntsl_explain",
    "Analisa e explica código NTSL em linguagem simples, descrevendo a lógica da estratégia, condições de entrada/saída, e gerenciamento de risco.",
    {
      code: z.string().describe("Código NTSL para explicar")
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ code }) => {
      const requestId = `ntsl_explain-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'ntsl_explain');

      logger.start("Analyzing NTSL code");

      try {
        let explanation = "# Análise de Código NTSL\n\n";

        // Extract inputs
        const inputsMatch = code.match(/Inputs([\s\S]*?)(?:Vars|Begin)/);
        if (inputsMatch) {
          explanation += "## Parâmetros Configuráveis (Inputs)\n\n";
          const inputs = inputsMatch[1].trim().split('\n').filter(line => line.trim());
          inputs.forEach(input => {
            const cleaned = input.trim().replace(/[;,]/g, '');
            if (cleaned) {
              explanation += `- ${cleaned}\n`;
            }
          });
          explanation += "\n";
        }

        // Extract variables
        const varsMatch = code.match(/Vars([\s\S]*?)Begin/);
        if (varsMatch) {
          explanation += "## Variáveis da Estratégia\n\n";
          const vars = varsMatch[1].trim().split('\n').filter(line => line.trim());
          vars.forEach(varLine => {
            const cleaned = varLine.trim().replace(/[;,]/g, '');
            if (cleaned) {
              explanation += `- ${cleaned}\n`;
            }
          });
          explanation += "\n";
        }

        // Analyze strategy logic
        explanation += "## Lógica da Estratégia\n\n";

        // Entry conditions
        explanation += "### Condições de Entrada\n\n";
        if (code.includes("BuyAtMarket") || code.includes("Buy ")) {
          explanation += "**Compra (Long):**\n";
          const buyMatches = code.match(/if\s+(.*?)\s+then[\s\S]*?BuyAtMarket/gi);
          if (buyMatches) {
            buyMatches.forEach(match => {
              const condition = match.match(/if\s+(.*?)\s+then/i);
              if (condition) {
                explanation += `- ${condition[1]}\n`;
              }
            });
          }
          explanation += "\n";
        }

        if (code.includes("SellShortAtMarket") || code.includes("SellShort")) {
          explanation += "**Venda (Short):**\n";
          const sellMatches = code.match(/if\s+(.*?)\s+then[\s\S]*?SellShortAtMarket/gi);
          if (sellMatches) {
            sellMatches.forEach(match => {
              const condition = match.match(/if\s+(.*?)\s+then/i);
              if (condition) {
                explanation += `- ${condition[1]}\n`;
              }
            });
          }
          explanation += "\n";
        }

        // Exit conditions
        explanation += "### Condições de Saída\n\n";

        if (code.includes("Stop")) {
          explanation += "**Stop Loss:**\n";
          if (code.includes("SellToCoverStop")) {
            explanation += "- Stop loss para posições compradas\n";
          }
          if (code.includes("BuyToCoverStop")) {
            explanation += "- Stop loss para posições vendidas\n";
          }
          explanation += "\n";
        }

        if (code.includes("Limit")) {
          explanation += "**Take Profit:**\n";
          if (code.includes("SellToCoverLimit")) {
            explanation += "- Take profit para posições compradas\n";
          }
          if (code.includes("BuyToCoverLimit")) {
            explanation += "- Take profit para posições vendidas\n";
          }
          explanation += "\n";
        }

        if (code.includes("ClosePosition")) {
          explanation += "**Fechamento de Posição:**\n";
          explanation += "- Estratégia inclui fechamento forçado de posições\n\n";
        }

        // Indicators used
        explanation += "## Indicadores Técnicos Utilizados\n\n";
        const indicators = [];
        if (code.includes("Average")) indicators.push("Média Móvel Simples (SMA)");
        if (code.includes("XAverage")) indicators.push("Média Móvel Exponencial (EMA)");
        if (code.includes("RSI")) indicators.push("RSI (Índice de Força Relativa)");
        if (code.includes("MACD")) indicators.push("MACD");
        if (code.includes("Bollinger") || code.includes("StdDevs")) indicators.push("Bandas de Bollinger");
        if (code.includes("Stochastic")) indicators.push("Estocástico");
        if (code.includes("ADX")) indicators.push("ADX");
        if (code.includes("Highest")) indicators.push("Máxima do Período");
        if (code.includes("Lowest")) indicators.push("Mínima do Período");
        if (code.includes("Volume")) indicators.push("Volume");

        if (indicators.length > 0) {
          indicators.forEach(indicator => explanation += `- ${indicator}\n`);
        } else {
          explanation += "Nenhum indicador técnico padrão detectado.\n";
        }
        explanation += "\n";

        // Risk management
        explanation += "## Gerenciamento de Risco\n\n";
        const riskFeatures = [];
        if (code.includes("Stop")) riskFeatures.push("✅ Stop Loss implementado");
        else riskFeatures.push("❌ Stop Loss não detectado");

        if (code.includes("Limit") && code.includes("ToCover")) riskFeatures.push("✅ Take Profit implementado");
        else riskFeatures.push("⚠️ Take Profit não implementado");

        if (code.includes("Time") && (code.includes("cHorarioInicio") || code.includes("cHorarioFim"))) {
          riskFeatures.push("✅ Restrição de horário de operação");
        }

        if (code.includes("DailyResult")) {
          riskFeatures.push("✅ Controle de resultado diário");
        }

        if (code.includes("IsBought") || code.includes("IsSold") || code.includes("HasPosition")) {
          riskFeatures.push("✅ Verificação de posição antes de operar");
        }

        riskFeatures.forEach(feature => explanation += `${feature}\n`);
        explanation += "\n";

        // Summary
        explanation += "## Resumo\n\n";
        explanation += "Esta estratégia NTSL ";

        if (code.includes("Average")) {
          explanation += "utiliza médias móveis ";
        }
        if (code.includes("RSI")) {
          explanation += "baseada no indicador RSI ";
        }
        if (code.includes("Bollinger") || code.includes("StdDevs")) {
          explanation += "utiliza Bandas de Bollinger ";
        }

        explanation += "para identificar oportunidades de entrada. ";

        if (code.includes("Stop") && code.includes("Limit")) {
          explanation += "A estratégia implementa tanto stop loss quanto take profit para gerenciamento de risco. ";
        } else if (code.includes("Stop")) {
          explanation += "A estratégia implementa stop loss, mas pode se beneficiar de um take profit definido. ";
        }

        explanation += "\n\n";
        explanation += "**Recomendações:**\n";
        explanation += "- Teste a estratégia com dados históricos extensivos\n";
        explanation += "- Valide em diferentes condições de mercado (tendência, lateral, volátil)\n";
        explanation += "- Ajuste os parâmetros através do módulo de otimização\n";
        explanation += "- Monitore o desempenho em conta simulada antes de operar real\n";

        logger.complete();
        return {
          content: [{
            type: "text" as const,
            text: explanation
          }]
        };
      } catch (error) {
        logger.error(error);
        return {
          content: [{
            type: "text" as const,
            text: `Erro ao explicar código NTSL: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
}

/**
 * Helper function to generate custom strategy based on description
 */
function generateCustomStrategy(description: string, parameters?: any): string {
  const descLower = description.toLowerCase();

  // Detect strategy type from description
  if (descLower.includes("média") || descLower.includes("average") || descLower.includes("ma")) {
    return NTSL_TEMPLATES.simpleStrategy;
  } else if (descLower.includes("rsi") || descLower.includes("força relativa")) {
    return NTSL_TEMPLATES.rsiStrategy;
  } else if (descLower.includes("bollinger") || descLower.includes("banda")) {
    return NTSL_TEMPLATES.bollingerBands;
  } else if (descLower.includes("rompimento") || descLower.includes("breakout") || descLower.includes("canal")) {
    return NTSL_TEMPLATES.breakoutStrategy;
  } else if (descLower.includes("trailing") || descLower.includes("móvel") || descLower.includes("breakeven")) {
    return NTSL_TEMPLATES.trailingStop;
  } else {
    // Default: return simple strategy with custom comment
    return `// ${description}
${NTSL_TEMPLATES.simpleStrategy}`;
  }
}
