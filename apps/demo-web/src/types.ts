export interface FormField {
    key:         string;
    label:       string;
    type:        'text' | 'date' | 'number' | 'email' | 'textarea' | 'money';
    placeholder?: string;
    required?:   boolean;
    group?:      string; // section grouping label
    /** 'half' = two fields per row; 'full' = one per row (default) */
    width?:      'full' | 'half';
  }
  
  export interface DocTypeConfig {
    id:          string;
    label:       string;
    description: string;
    scenario:    string; // B2B, B2G, G2G
    fields:      FormField[];
    buildData:   (values: Record<string, string>) => Record<string, unknown>;
    schema:      Record<string, unknown>;
    issuer:      string;
    issuerId?:   string;
    recipient?:  string;
    recipientId?: string;
    schemaId?:   string;
    /** Canonical document_type for meta.json (e.g. gov_tax_declaration). Defaults to id when omitted. */
    documentType?: string;
  }
  
  export type GenerateState =
    | { status: 'idle' }
    | { status: 'generating' }
    | { status: 'done'; filename: string }
    | { status: 'error'; message: string }