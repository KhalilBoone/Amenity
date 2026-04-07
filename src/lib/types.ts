export type WorkspaceStatus = "Draft" | "Quoted" | "In Production" | "Delivered";

export interface Workspace {
  id: string;
  userId: string;
  name: string;
  brand: string;
  status: WorkspaceStatus;
  desc: string;
  notes: string;
  references: string;
  chatHistory: ChatMessage[];
  quote: Quote | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  results?: CapabilityResult[];
  timestamp: Date;
}

export interface Quote {
  qty: number;
  targetDelivery: string;
  desc: string;
  reference: string;
}

export interface CapabilityResult {
  name: string;
  subtitle: string;
  match: string;
  tags: string[];
  certs: string[];
  moq: string;
  lead: string;
}
