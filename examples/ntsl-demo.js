/**
 * Demonstração do NTSL Assistant
 *
 * Este script demonstra como usar as ferramentas NTSL Assistant
 * através do MCP (Model Context Protocol)
 *
 * Nota: Este é um exemplo conceitual para mostrar como o Manus AI
 * faria as chamadas. Para uso real, use através do MCP client.
 */

// Exemplo 1: Gerar código NTSL para estratégia RSI
console.log("=== EXEMPLO 1: Gerar Estratégia RSI ===\n");

const exemplo1 = {
  tool: "ntsl_generate_code",
  params: {
    strategyType: "rsiStrategy",
    parameters: {
      stopLoss: 50,
      takeProfit: 100,
      startTime: "0930",
      endTime: "1700"
    }
  }
};

console.log("Chamada MCP:");
console.log(JSON.stringify(exemplo1, null, 2));
console.log("\nResultado esperado:");
console.log("- Código NTSL completo com estratégia RSI");
console.log("- Stop loss de 50 ticks");
console.log("- Take profit de 100 ticks");
console.log("- Opera entre 09:30 e 17:00");
console.log("- Instruções de uso no Profitchart\n");

// Exemplo 2: Validar código NTSL
console.log("=== EXEMPLO 2: Validar Código NTSL ===\n");

const codigoExemplo = `
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
`;

const exemplo2 = {
  tool: "ntsl_validate",
  params: {
    code: codigoExemplo
  }
};

console.log("Chamada MCP:");
console.log(JSON.stringify(exemplo2, null, 2));
console.log("\nResultado esperado:");
console.log("✅ Estrutura Begin/End: OK");
console.log("⚠️ Avisos:");
console.log("  - Nenhum stop loss detectado");
console.log("  - Nenhum take profit detectado");
console.log("💡 Sugestões:");
console.log("  - Adicionar gerenciamento de risco");
console.log("  - Considere restrições de horário\n");

// Exemplo 3: Explicar código NTSL
console.log("=== EXEMPLO 3: Explicar Código NTSL ===\n");

const exemplo3 = {
  tool: "ntsl_explain",
  params: {
    code: codigoExemplo
  }
};

console.log("Chamada MCP:");
console.log(JSON.stringify(exemplo3, null, 2));
console.log("\nResultado esperado:");
console.log("# Análise de Código NTSL");
console.log("");
console.log("## Parâmetros Configuráveis");
console.log("- cPeriodoRSI(14): Período do RSI");
console.log("");
console.log("## Lógica da Estratégia");
console.log("- Compra quando RSI < 30 (sobrevendido)");
console.log("- Vende quando RSI > 70 (sobrecomprado)");
console.log("");
console.log("## Indicadores Utilizados");
console.log("- RSI (Índice de Força Relativa)");
console.log("");
console.log("## Gerenciamento de Risco");
console.log("❌ Stop Loss não detectado");
console.log("⚠️ Take Profit não implementado\n");

// Exemplo 4: Buscar documentação
console.log("=== EXEMPLO 4: Buscar Documentação NTSL ===\n");

const exemplo4 = {
  tool: "ntsl_documentation",
  params: {}
};

console.log("Chamada MCP:");
console.log(JSON.stringify(exemplo4, null, 2));
console.log("\nResultado esperado:");
console.log("- Estrutura básica de um robô NTSL");
console.log("- Funções de ordem (compra/venda)");
console.log("- Indicadores técnicos disponíveis");
console.log("- Gerenciamento de risco");
console.log("- Sintaxe Pascal-like");
console.log("- Boas práticas\n");

// Exemplo 5: Workflow completo do Manus AI
console.log("=== EXEMPLO 5: Workflow Completo Manus AI ===\n");

console.log("Usuário: 'Crie uma estratégia de médias móveis'");
console.log("");
console.log("Manus AI executa:");
console.log("1. ntsl_generate_code(strategyType: 'simpleStrategy')");
console.log("2. ntsl_validate(code: [gerado])");
console.log("3. ntsl_explain(code: [gerado])");
console.log("4. Apresenta resultado ao usuário com:");
console.log("   - Código completo");
console.log("   - Explicação em português");
console.log("   - Status de validação");
console.log("   - Instruções de uso");
console.log("   - Avisos de segurança\n");

// Exemplo 6: Templates disponíveis
console.log("=== EXEMPLO 6: Templates Disponíveis ===\n");

const templates = [
  { id: "simpleStrategy", desc: "Cruzamento de médias móveis" },
  { id: "rsiStrategy", desc: "Estratégia baseada em RSI" },
  { id: "bollingerBands", desc: "Bandas de Bollinger" },
  { id: "breakoutStrategy", desc: "Rompimento de canal" },
  { id: "trailingStop", desc: "Stop loss móvel" },
  { id: "timeBasedExit", desc: "Saída por horário" },
  { id: "dailyLimit", desc: "Limite diário de operações" }
];

console.log("Templates pré-construídos:");
templates.forEach((t, i) => {
  console.log(`${i + 1}. ${t.id}: ${t.desc}`);
});
console.log("");
console.log("Uso:");
console.log("ntsl_generate_code({ strategyType: 'rsiStrategy' })\n");

// Resumo
console.log("=== RESUMO ===\n");
console.log("O NTSL Assistant fornece 4 ferramentas MCP:");
console.log("");
console.log("1. ntsl_generate_code");
console.log("   - Gera código NTSL completo");
console.log("   - 7 templates pré-construídos");
console.log("   - Parâmetros personalizáveis");
console.log("");
console.log("2. ntsl_validate");
console.log("   - Valida sintaxe e estrutura");
console.log("   - Detecta problemas de risco");
console.log("   - Sugere melhorias");
console.log("");
console.log("3. ntsl_explain");
console.log("   - Explica código em português");
console.log("   - Analisa lógica da estratégia");
console.log("   - Identifica indicadores usados");
console.log("");
console.log("4. ntsl_documentation");
console.log("   - Referência completa NTSL");
console.log("   - Sintaxe e funções");
console.log("   - Boas práticas");
console.log("");
console.log("Ideal para integração com Manus AI! 🤖\n");
