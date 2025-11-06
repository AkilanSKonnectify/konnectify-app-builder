import moment from "moment/moment";
import _ from "lodash";

export interface Operation {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  description: string;
  help: string;
  display_priority: number;
  batch: boolean;
  batch_size: number; //used only when batch is true
  bulk: boolean;
  deprecated: boolean;
  cursor_enabled: true;
  has_config_fields: boolean;
  config_fields: ObjectDefinitions[string];
  sample: Methods[string] | Record<string, any>;
  input_schema: ObjectDefinitions[string];
  output_schema: ObjectDefinitions[string];
  default_input_schema?: ObjectDefinitions[string];
  default_output_schema?: ObjectDefinitions[string];
}

export interface Streams {
  [key: string]: () => [string, boolean];
}

export interface AppContext {
  webhookEndpoint: string;
  engineEndpoint: string;
  operationKey: string;
  moment: typeof moment;
  lodash: typeof _;
  btoa: (input: string) => string;
  auth: Record<string, unknown>;
  payload: {
    config_fields: Record<string, unknown>;
    data: Record<string, unknown>;
  };
  params: {
    input?: Field[];
    config_fields?: Field[];
    output?: Field[];
    payload?: DataPayload;
  };
  config: {
    [key: string]: any;
  };
  fetch: typeof fetch;
  logger: {
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
  };
}

export interface PickLists {
  [key: string]: (context: AppContext) => Promise<PickListValue[]> | PickListValue[];
}

export type PickListValue = {
  label: string;
  value: string;
};

export interface PollTrigger extends Trigger {
  poll: (context: AppContext) => Promise<PollResponse>;
}

export type PollResponse = {
  since: string;
  till: string;
  hasMore: boolean;
  cursor: object;
  records: Record<string, unknown>[];
};

export type WebhookSubscribeOutput = Record<string, unknown>;

export interface WebhookTrigger extends Trigger {
  hook_type: "per_event" | "per_connection" | "per_konnector";
  webhook_key: (context: AppContext, input: Record<string, unknown>) => string;
  webhook_response_type: WebhookResponseType;
  webhook_response_body: string;
  webhook_response_headers: string;
  webhook_response_status: number;
  webhook_payload_type: WebhookPayloadType;
  webhook_subscribe: (
    context: AppContext,
    url: string,
    input: Field[]
  ) => Promise<WebhookSubscribeOutput | [WebhookSubscribeOutput, string]>;
  addEvent: (
    context: AppContext,
    url: string,
    input: Field[]
  ) => Promise<WebhookSubscribeOutput | [WebhookSubscribeOutput, string]>;
  removeEvent: (
    context: AppContext,
    url: string,
    input: Field[]
  ) => Promise<WebhookSubscribeOutput | [WebhookSubscribeOutput, string]>;
  webhook_refresh: (
    context: AppContext,
    webhookSubscribeOutput: WebhookSubscribeOutput
  ) => Promise<[WebhookSubscribeOutput, string]>;
  webhook_unsubscribe: (context: AppContext, webhookSubscribeOutput: WebhookSubscribeOutput) => Promise<null>;
  webhook_notification: (
    context: AppContext,
    input: Field[],
    payload: DataPayload,
    headers: Record<string, string>,
    params: Record<string, string>,
    webhookSubscribeOutput: WebhookSubscribeOutput
  ) => DataPayload | DataPayload[];
}

export interface StaticWebhookTrigger extends Trigger {
  webhook_key: (context: AppContext, input: Field[]) => string;
  webhook_payload_type: WebhookPayloadType;
  webhook_notification: (
    context: AppContext,
    input: Field[],
    payload: DataPayload,
    headers: Record<string, string>,
    params: Record<string, string>,
    webhookSubscribeOutput: WebhookSubscribeOutput
  ) => DataPayload | DataPayload[];
}

export interface DataPayload {
  [key: string]: unknown;
}

export interface ExecutionPayload {
  data?: Record<string, unknown>;
  error?: string;
  statusCode: number;
}

export interface WebhookExecutionPayload {
  data?: Record<string, unknown>;
  outputSchema?: Field[];
  error?: string;
  statusCode: number;
}

export type TriggerType = "poll" | "static_webhook" | "webhook";

export type WebhookResponseType = "text/plain" | "application/json";

export type WebhookPayloadType = "raw" | "json";

export type RequestMethods = "GET" | "HEAD" | "PUT" | "DELETE" | "POST" | "PATCH";

export interface Trigger extends Operation {
  type: TriggerType;
  dedup: (record: DataPayload) => string;
}

export type ResponseCodes = 400 | 401 | 403 | 404 | 405 | 409 | 500 | 501 | 502 | 503 | 504;

export interface Action extends Operation {
  execute: (context: AppContext) => Promise<ExecutionPayload>;
  retry_on_response: ResponseCodes[];
  retry_on_request: RequestMethods[];
  max_retries: number;
}

export type FieldType = "string" | "number" | "date" | "date_time" | "boolean" | "array" | "object";

export type ControlType =
  | "text"
  | "text-area"
  | "plain-text"
  | "plain-text-area"
  | "password"
  | "number"
  | "url"
  | "select"
  | "checkbox"
  | "multiselect"
  | "date"
  | "datetime"
  | "datetime_local"
  | "time"
  | "tel"
  | "email"
  | "subdomain"
  | "schema-designer"
  | "key_value";

export type FieldListMode = "static" | "dynamic";

export type SampleDataType = "csv" | "xml" | "json_input";

export type Field = {
  name: string;
  label?: string;
  optional?: boolean;
  type?: FieldType;
  hint?: string;
  of?: FieldType;
  properties?: Field[];
  control_type?: ControlType;
  default?: string;
  pick_list?: PickLists[string];
  delimiter?: string;
  sticky?: boolean;
  change_on_blur?: boolean;
  support_pills?: boolean;
  custom?: boolean;
  extends_schema?: boolean;
  list_mode?: FieldListMode;
  list_mode_toggle?: boolean;
  item_label?: string;
  add_field_label?: string;
  empty_schema_message?: string;
  sample_data_type?: SampleDataType;
  ngIf?: string;
  pattern?: Pattern;
};

export type Pattern = {
  value: string;
  message: string;
  flags?: string;
};

export type Required = {
  value: boolean;
  message: string;
};

export type ConnectionField = {
  name: string;
  type: FieldType;
  pattern?: Pattern;
  control_type?: ControlType;
  required?: Required;
  placeholder?: string;
  label?: string;
};

export interface Connection {
  fields: ConnectionField[];
  auth: OAuth2Auth | CredentialsAuth;
  authUrl?: string;
  credentials?: ConnectionField[];
}

export interface CredentialsAuth {
  type: "credentials";
  validate: Methods["validate"];
}

export interface ObjectDefinition {
  fields: (context: AppContext) => Promise<Field[]>;
}

export interface Methods {
  test: (context: AppContext) => Promise<boolean>;
  authorize: (context: AppContext) => Promise<Record<string, unknown>>;
  refresh: (context: AppContext) => Promise<Record<string, unknown>>;
  identity: (context: AppContext) => Promise<Record<string, unknown>>;
  validate: (context: AppContext) => Promise<Record<string, unknown>>;
  pkce: (context: AppContext) => Promise<Record<string, unknown>>;
  [key: string]: (context: AppContext) => Promise<any>;
}

export interface Actions {
  [key: string]: Action;
}

export interface Triggers {
  [key: string]: StaticWebhookTrigger | WebhookTrigger | PollTrigger;
}

export interface ObjectDefinitions {
  [key: string]: ObjectDefinition;
}

export interface App {
  id: string;
  appType?: "App" | "Tool";
  category?: string[];
  tags?: string[];
  iconUrl: string;
  visibility?: "public" | "private" | "beta";
  name: string;
  description: string;
  version: string;
  secure_tunnel: boolean;
  has_custom_action: boolean;
  has_triggers: boolean;
  has_actions: boolean;
  custom_action_help?: CustomActionHelp;
  connection: Connection;
  test: Methods["test"];
  actions: Actions;
  triggers: Triggers;
  object_definitions: ObjectDefinitions;
  pick_lists: PickLists;
  methods: Methods;
  webhook_keys?: (context: AppContext, payload: DataPayload) => string;
  streams: Streams;
}

export interface OAuth2Auth {
  type: "oauth2";
  client_id: string;
  client_secret: string;
  authorization_url: string;
  token_url: string;
  authorize: Methods["authorize"];
  refresh: Methods["refresh"];
  identity: Methods["identity"];
  pkce?: Methods["pkce"];
  noopener: boolean;
}

export interface CustomActionHelp {
  url_text?: string;
  url?: string;
  body?: string;
}

export interface SchemaOptions {
  requiredFields?: string[];
  fieldLabels?: Record<string, string>;
  fieldHints?: Record<string, string>;
  fieldTypes?: Record<string, FieldType>;
  controlTypes?: Record<string, ControlType>;
  pickLists?: Record<string, PickLists[string]>;
  defaults?: Record<string, string>;
  customFields?: Record<string, Partial<Field>>;
}
