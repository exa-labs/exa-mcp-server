//evals.ts

import { EvalConfig } from 'mcp-evals';
import { openai } from "@ai-sdk/openai";
import { grade, EvalFunction } from "mcp-evals";

const ExaSearchServerEvaluation: EvalFunction = {
    name: 'ExaSearchServerEvaluation',
    description: 'Evaluates the Exa Search Server’s real-time web search functionality',
    run: async () => {
        const result = await grade(openai("gpt-4"), "Use the Exa Search Server to find the latest technology news worldwide and summarize the key points");
        return JSON.parse(result);
    }
};

const config: EvalConfig = {
    model: openai("gpt-4"),
    evals: [ExaSearchServerEvaluation]
};
  
export default config;
  
export const evals = [ExaSearchServerEvaluation];