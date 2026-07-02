/**
 * Virtual Employee AI Brain (LangChain + OpenAI GPT-4o).
 * 
 * Implements agent reasoning, tool calling, memory retrieval,
 * and multi-agent cooperation structures.
 */

import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { 
  ChatPromptTemplate, 
  MessagesPlaceholder 
} from "@langchain/core/prompts";
import { 
  AIMessage, 
  BaseMessage, 
  HumanMessage, 
  SystemMessage, 
  ToolMessage 
} from "@langchain/core/messages";
import { RunnableSequence } from "@langchain/core/runnables";

// ==========================================
// 1. Tool Definitions (Zod Schemas + Logic)
// ==========================================

// Tool: Gmail / Email Triage
const emailTriageTool = tool(
  async ({ query, maxResults }) => {
    console.log(`[AgentTool] Triage email with query "${query}"`);
    // Placeholder logic - will interface with Google Workspace API
    return JSON.stringify({
      status: "success",
      emails: [
        { id: "msg_123", from: "customer@example.com", subject: "Richiesta Preventivo", date: "2026-07-02" },
        { id: "msg_456", from: "info@studio.it", subject: "Fattura Luglio", date: "2026-07-01" }
      ],
      note: "Questi dati provengono dal mock del server Gmail API. In produzione, usa l'integrazione OAuth2 del Backend Developer."
    });
  },
  {
    name: "gmail_triage",
    description: "Cerca ed effettua il triage delle email importanti su Gmail per conto dell'utente.",
    schema: z.object({
      query: z.string().describe("Query di ricerca per le email, es. 'preventivo' o 'urgente'"),
      maxResults: z.number().optional().default(5).describe("Numero massimo di risultati da recuperare"),
    }),
  }
);

// Tool: Google Calendar Management
const calendarManagementTool = tool(
  async ({ action, title, startTime, endTime }) => {
    console.log(`[AgentTool] Calendar action: ${action} - "${title}"`);
    // Placeholder logic - will interface with Google Calendar API
    return JSON.stringify({
      status: "success",
      action,
      event: {
        id: "evt_987",
        title: title || "Riunione AI",
        start: startTime || "2026-07-03T10:00:00Z",
        end: endTime || "2026-07-03T11:00:00Z",
      },
      note: "Evento inserito/gestito correttamente tramite Google Calendar API."
    });
  },
  {
    name: "calendar_management",
    description: "Crea, aggiorna o elenca eventi sul calendario Google dell'utente.",
    schema: z.object({
      action: z.enum(["create", "update", "list", "delete"]).describe("L'azione da compiere sul calendario"),
      title: z.string().optional().describe("Titolo dell'evento"),
      startTime: z.string().optional().describe("Data/ora di inizio in formato ISO (es. 2026-07-03T10:00:00Z)"),
      endTime: z.string().optional().describe("Data/ora di fine in formato ISO"),
    }),
  }
);

// Tool: Google Drive File Archiving
const fileArchivingTool = tool(
  async ({ fileName, content, category }) => {
    console.log(`[AgentTool] Archiving file: ${fileName} inside folder ${category}`);
    // Placeholder logic - will interface with Google Drive API
    return JSON.stringify({
      status: "success",
      fileId: "drive_file_abc123",
      fileName,
      category,
      webViewLink: "https://drive.google.com/mock/file/abc123",
      note: "File archiviato nella cartella aziendale appropriata su Google Drive."
    });
  },
  {
    name: "file_archiving",
    description: "Archivia documenti, fatture o file di testo importanti all'interno di cartelle specifiche su Google Drive.",
    schema: z.object({
      fileName: z.string().describe("Nome del file da salvare (incluso l'estensione, es. preventivo_rossi.pdf)"),
      content: z.string().describe("Il testo o contenuto da scrivere o archiviare nel file"),
      category: z.string().describe("Categoria/Cartella di archiviazione, es. 'Fatture', 'Preventivi', 'Contratti'"),
    }),
  }
);

// Tool: Trello/Asana Task Integration
const projectManagementTool = tool(
  async ({ boardName, taskTitle, description, dueDate }) => {
    console.log(`[AgentTool] Adding task "${taskTitle}" to board "${boardName}"`);
    return JSON.stringify({
      status: "success",
      taskId: "trello_card_xyz789",
      board: boardName,
      title: taskTitle,
      due: dueDate || "Nessuna scadenza",
      note: "Card creata con successo sulla bacheca Trello dell'ufficio virtuale."
    });
  },
  {
    name: "project_management_integration",
    description: "Crea o aggiorna task e schede operative su Trello o Asana.",
    schema: z.object({
      boardName: z.string().describe("Nome della bacheca o del progetto (es. 'To-Do', 'Marketing')"),
      taskTitle: z.string().describe("Titolo del task/scheda da creare"),
      description: z.string().optional().describe("Descrizione dettagliata delle attività da svolgere"),
      dueDate: z.string().optional().describe("Data di scadenza del task (formato YYYY-MM-DD)"),
    }),
  }
);

// Tool: Social Media Content Generation (DALL-E 3 / GPT-4o)
const socialMediaTool = tool(
  async ({ platform, topic, generateImage }) => {
    console.log(`[AgentTool] Generating social post for ${platform} about "${topic}"`);
    return JSON.stringify({
      status: "success",
      postText: `🚀 Annuncio importante per ${platform}!\n\nParliamo di: ${topic}.\n\n#AI #PersonaleArtificiale #DigitalEmployee`,
      imageUrl: generateImage ? "https://api.enginelabs.ai/mock-dalle3-image.png" : undefined,
      note: "Post social generato con successo. L'immagine è stata elaborata tramite DALL-E 3 API."
    });
  },
  {
    name: "social_media_generator",
    description: "Genera post pubblicitari, testi e immagini (DALL-E 3) per i social media aziendali.",
    schema: z.object({
      platform: z.enum(["LinkedIn", "Facebook", "Instagram", "Twitter"]).describe("Piattaforma social di destinazione"),
      topic: z.string().describe("Argomento o focus principale del post"),
      generateImage: z.boolean().optional().default(false).describe("Indica se generare anche una grafica illustrativa con DALL-E 3"),
    }),
  }
);

// Tool: CRM Lead Updates
const crmUpdateTool = tool(
  async ({ leadName, email, company, notes, status }) => {
    console.log(`[AgentTool] CRM update for lead "${leadName}"`);
    return JSON.stringify({
      status: "success",
      leadId: "crm_lead_555",
      name: leadName,
      email,
      company: company || "Nessuna azienda indicata",
      currentStatus: status || "Prospect",
      note: "Anagrafica cliente aggiornata sul CRM aziendale."
    });
  },
  {
    name: "crm_lead_update",
    description: "Inserisce o aggiorna le informazioni di un lead o cliente potenziale nel CRM aziendale.",
    schema: z.object({
      leadName: z.string().describe("Nome e cognome del contatto"),
      email: z.string().describe("Indirizzo email del contatto"),
      company: z.string().optional().describe("Nome dell'azienda del contatto"),
      notes: z.string().optional().describe("Note o dettagli commerciali raccolti"),
      status: z.enum(["Prospect", "Contacted", "Proposal Sent", "Closed Won", "Closed Lost"]).optional().default("Prospect").describe("Stato del lead nel CRM"),
    }),
  }
);

// Combine all tools
export const AGENT_TOOLS = [
  emailTriageTool,
  calendarManagementTool,
  fileArchivingTool,
  projectManagementTool,
  socialMediaTool,
  crmUpdateTool
];

export const TOOLS_MAP: Record<string, any> = {
  gmail_triage: emailTriageTool,
  calendar_management: calendarManagementTool,
  file_archiving: fileArchivingTool,
  project_management_integration: projectManagementTool,
  social_media_generator: socialMediaTool,
  crm_lead_update: crmUpdateTool
};

// ==========================================
// 2. Configurable Agent Type Definitions
// ==========================================

export type AgentType = "executive_assistant" | "digital_marketer" | "operations_analyst";

export interface AgentTypeDefinition {
  type: AgentType;
  displayName: string;
  defaultRoleDescription: string;
  systemInstruction: string;
  tools: any[];
}

export const AGENT_DEFINITIONS: Record<AgentType, AgentTypeDefinition> = {
  executive_assistant: {
    type: "executive_assistant",
    displayName: "Assistente Esecutivo",
    defaultRoleDescription: "Un assistente esecutivo virtuale preciso, metodico e organizzato, delegato alla gestione amministrativa ed e-mail.",
    systemInstruction: "Sei l'Assistente Esecutivo di Personale Artificiale. Il tuo scopo principale è gestire l'agenda (Google Calendar), filtrare ed organizzare le email (Gmail) e ordinare file, fatture e documenti aziendali (Google Drive). Sii organizzato, formale, efficiente ed estremamente preciso nel pianificare compiti e rispondere alle comunicazioni.",
    tools: [emailTriageTool, calendarManagementTool, fileArchivingTool]
  },
  digital_marketer: {
    type: "digital_marketer",
    displayName: "Marketer Digitale",
    defaultRoleDescription: "Un esperto di marketing creativo e persuasivo, focalizzato sulla crescita dei social media e sulla lead generation.",
    systemInstruction: "Sei il Marketer Digitale di Personale Artificiale. Il tuo scopo principale è produrre post social accattivanti, ideare campagne pubblicitarie, generare grafiche creative (Social Media Generator), analizzare email di potenziali partner (Gmail) e inserire o aggiornare i dettagli dei lead nel CRM aziendale (CRM Lead Updates). Sii creativo, carismatico, persuasivo e focalizzato sui risultati aziendali.",
    tools: [socialMediaTool, emailTriageTool, crmUpdateTool]
  },
  operations_analyst: {
    type: "operations_analyst",
    displayName: "Analista Operativo",
    defaultRoleDescription: "Un analista operativo rigoroso e attento ai flussi di lavoro, focalizzato sul coordinamento dei progetti e bacheche operative.",
    systemInstruction: "Sei l'Analista Operativo di Personale Artificiale. Il tuo scopo principale è coordinare i compiti lavorativi e gestire le bacheche Kanban (Trello/Asana), pianificare scadenze di calendario (Google Calendar) ed elaborare e archiviare report settimanali o documenti di progetto (Google Drive). Sii analitico, metodico, attento ai dettagli e orientato all'ottimizzazione del tempo e delle risorse.",
    tools: [projectManagementTool, calendarManagementTool, fileArchivingTool]
  }
};

// ==========================================
// 3. Memory System (Pinecone/RAG Structure)
// ==========================================

export class LongTermMemory {
  /**
   * Performs semantic search over PDFs, manuals, and customer onboarding files.
   * Scaffolds the Pinecone / Vector DB RAG integration.
   */
  async retrieveContext(query: string, tenantId: string): Promise<string> {
    console.log(`[Memory] Querying vector DB for tenant "${tenantId}" with query: "${query}"`);
    
    // In production, instantiate OpenAIEmbeddings and PineconeStore to perform similarity search:
    // const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });
    // const results = await vectorStore.similaritySearch(query, 3, { tenantId });
    
    // Fallback/Mock Context representing general corporate guidelines
    return `
=== RETRIEVED CONTEXT (Long-Term Memory RAG) ===
- Brand Identity: Personale Artificiale (aiuta freelance e PMI ad automatizzare flussi tramite AI dipendenti virtuali).
- Linee Guida Comunicazione: Cordiale, professionale, focalizzato sull'efficienza e sulla risoluzione dei problemi.
- Pacchetti Disponibili: Assistente Esecutivo (€399 setup + €97/mese), L'Ufficio Digitale (€999 setup + €297/mese).
- Note Operative: Quando crei appuntamenti sul calendario, accertati sempre di inviare una notifica email di conferma.
================================================
`;
  }
}

// ==========================================
// 4. Virtual Employee Agent Implementation
// ==========================================

export interface AgentInput {
  message: string;
  history?: BaseMessage[];
  tenantId: string;
  toneOfVoice?: string;
  roleDescription?: string;
}

export class VirtualEmployeeAgent {
  private model: ChatOpenAI;
  private memory: LongTermMemory;
  private agentType: AgentType;

  constructor(agentType: AgentType = "executive_assistant") {
    this.agentType = agentType;
    const def = AGENT_DEFINITIONS[agentType] || AGENT_DEFINITIONS.executive_assistant;

    this.model = new ChatOpenAI({
      modelName: "gpt-4o",
      temperature: 0.3, // Accurate execution and structured tool calling
      openAIApiKey: process.env.OPENAI_API_KEY || "default_openai_key",
    }).bindTools(def.tools);

    this.memory = new LongTermMemory();
  }

  /**
   * Process an incoming text message, reason, invoke tools, and construct the final reply.
   */
  async run({ message, history = [], tenantId, toneOfVoice = "professionale e cortese", roleDescription }: AgentInput): Promise<string> {
    console.log(`[AgentBrain] Processing message for tenant "${tenantId}" using Agent Type "${this.getAgentType()}"...`);
    
    // 1. Fetch long-term memory context
    const retrievedContext = await this.memory.retrieveContext(message, tenantId);

    // 2. Resolve final role description (default to the type's custom system prompt)
    const activeRole = roleDescription || this.getAgentRoleDefault();

    // 3. Construct Prompt Template
    const systemPrompt = `Sei un dipendente virtuale intelligente basato su AI ("Personale Artificiale"), con il ruolo di: ${activeRole}.
Il tuo stile comunicativo deve essere rigorosamente: ${toneOfVoice}.

Utilizza le informazioni contestuali fornite dalla tua memoria a lungo termine se utili a rispondere:
${retrievedContext}

REGOLE DI COMPORTAMENTO:
1. Rispondi in italiano in modo chiaro e conciso.
2. Hai a disposizione vari strumenti specifici per il tuo ruolo. Usali in modo proattivo quando l'utente ti chiede di fare azioni operative!
3. Se compi un'azione, comunica esplicitamente all'utente l'esito dell'azione e che l'operazione è andata a buon fine.
4. Lavora cooperando con altri colleghi virtuali per completare task complessi.`;

    const promptMessages = [
      new SystemMessage(systemPrompt),
      ...history,
      new HumanMessage(message),
    ];

    // 4. Agent Execution Loop (Reasoning + Tool Calling)
    let currentMessages = [...promptMessages];
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`[AgentBrain] Reasoning turn ${attempts}...`);
      
      const response = await this.model.invoke(currentMessages);
      
      // If the model did not ask for tools, we are done
      if (!response.tool_calls || response.tool_calls.length === 0) {
        return response.content as string;
      }

      console.log(`[AgentBrain] Tool calls received: ${response.tool_calls.map(tc => tc.name).join(", ")}`);
      currentMessages.push(response);

      // Execute each tool call requested by the model
      for (const toolCall of response.tool_calls) {
        const executor = TOOLS_MAP[toolCall.name];
        if (!executor) {
          const errMsg = `Tool ${toolCall.name} not found.`;
          console.error(`[AgentBrain] ${errMsg}`);
          currentMessages.push(new ToolMessage({
            content: JSON.stringify({ error: errMsg }),
            tool_call_id: toolCall.id || "",
          }));
          continue;
        }

        try {
          // Invoke the specific tool
          const resultStr = await executor.invoke(toolCall);
          console.log(`[AgentBrain] Tool ${toolCall.name} execution completed successfully.`);
          
          currentMessages.push(new ToolMessage({
            content: resultStr,
            tool_call_id: toolCall.id || "",
          }));
        } catch (toolError: any) {
          console.error(`[AgentBrain] Error executing tool ${toolCall.name}:`, toolError);
          currentMessages.push(new ToolMessage({
            content: JSON.stringify({ error: toolError.message || "Unknown error during tool execution" }),
            tool_call_id: toolCall.id || "",
          }));
        }
      }
    }

    throw new Error("Agent exceeded maximum reasoning turns without resolving tool calls.");
  }

  public getAgentType(): AgentType {
    return this.agentType;
  }

  private getAgentRoleDefault(): string {
    return AGENT_DEFINITIONS[this.agentType]?.displayName || "Dipendente Virtuale";
  }
}

// ==========================================
// 5. Virtual Employee Agent Factory
// ==========================================

export class VirtualEmployeeAgentFactory {
  /**
   * Constructs a specific Virtual Employee Agent based on type.
   */
  static create(type: AgentType = "executive_assistant"): VirtualEmployeeAgent {
    console.log(`[AgentFactory] Creating AI Agent of type: "${type}"`);
    return new VirtualEmployeeAgent(type);
  }

  /**
   * Identifies the agent type from a textual role description (smart auto-detection).
   */
  static detectTypeFromRole(roleDescription: string): AgentType {
    const lower = roleDescription.toLowerCase();
    if (lower.includes("marketing") || lower.includes("marketer") || lower.includes("vendite") || lower.includes("social")) {
      return "digital_marketer";
    }
    if (lower.includes("analista") || lower.includes("analyst") || lower.includes("operativo") || lower.includes("operations") || lower.includes("trello")) {
      return "operations_analyst";
    }
    return "executive_assistant";
  }
}
