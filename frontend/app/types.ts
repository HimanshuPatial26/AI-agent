export interface ModelInfo {
  id:       string;
  label:    string;
  provider: "Google" | "Groq";
}

export interface Source {
  title:   string;
  url:     string;
  content: string;
}

export interface Safety {
  tone:    "urgent" | "caution" | "steady" | "none";
  callout: string;
}

export interface ChatMessage {
  id?:         string | number;
  role:        "user" | "assistant";
  content:     string;
  streaming?:  boolean;
  sources?:    Source[];
  safety?:     Safety;
  vote?:       "up" | "down" | null;
}

export interface ConversationSummary {
  id:         string;
  title:      string;
  updated_at: string;
}

export interface RawHistoryMessage {
  id?:              string | number;
  role:             "user" | "assistant";
  message:          string;
  created_at:       string;
  conversation_id?: string;
}
