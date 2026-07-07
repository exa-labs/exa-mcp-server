export const agentSchemaTemplates = {
  companyList: {
    type: "object",
    properties: {
      companies: {
        type: "array",
        maxItems: 50,
        items: {
          type: "object",
          properties: {
            companyName: { type: "string" },
            website: { type: "string", format: "uri" },
            segment: { type: "string" },
            whyItQualifies: { type: "string" },
            evidenceUrl: { type: "string", format: "uri" },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["companyName", "website", "whyItQualifies", "evidenceUrl"],
        },
      },
      coverageNotes: { type: "string" },
      knownGaps: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["companies", "coverageNotes"],
  },
} as const;
