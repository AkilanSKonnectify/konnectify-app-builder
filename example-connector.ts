import {
  App,
  AppContext,
  PollResponse,
  ExecutionPayload,
  Field,
  FieldType,
  ControlType,
  DataPayload,
} from "../src/dsl/konnectify-dsl";

// Example connector for testing
export const exampleApp: App = {
  id: "example",
  iconUrl: "",
  name: "Example Connector",
  description: "A simple example connector for testing",
  version: "1.0.0",
  secure_tunnel: false,
  has_custom_action: true,
  has_triggers: true,
  has_actions: true,
  connection: {
    fields: [],
    credentials: [
      {
        label: "API Key",
        name: "api_key",
        pattern: {
          flags: "gm",
          message: "Invalid API Key format",
          value: ".+",
        },
        placeholder: "Enter your API key",
        type: "string",
        required: { message: "API Key is required", value: true },
      },
    ],
    auth: {
      api_key: "",
      type: "api_key",
      validate: async (context: AppContext): Promise<boolean> => {
        try {
          // Simulate API validation
          const response = await context.fetch("https://httpbin.org/get", {
            headers: {
              Authorization: `Bearer ${context.auth.api_key}`,
            },
          });

          if (response.ok) {
            context.logger?.info("Connection validation successful");
            return true;
          }
          return false;
        } catch (error) {
          context.logger?.error("Connection validation failed:", error);
          return false;
        }
      },
    },
  },
  test: async function (context: AppContext): Promise<boolean> {
    try {
      const response = await context.fetch("https://httpbin.org/get");
      return response.ok;
    } catch {
      return false;
    }
  },
  actions: {
    create_item: {
      retry_on_response: [],
      retry_on_request: [],
      max_retries: 0,
      id: "create_item",
      name: "create_item",
      title: "Create Item",
      subtitle: "Create a new item",
      description: "Creates a new item in the system",
      help: "This action creates a new item with the provided data",
      display_priority: 0,
      batch: false,
      bulk: false,
      deprecated: false,
      has_config_fields: false,
      sample: (context) => ({
        name: "Sample Item",
        description: "This is a sample item",
        status: "active",
      }),
      input_schema: {
        fields: (context): Field[] => [
          {
            name: "name",
            label: "Name",
            type: FieldType.STRING,
            control_type: ControlType.TEXT,
            optional: false,
          },
          {
            name: "description",
            label: "Description",
            type: FieldType.STRING,
            control_type: ControlType.TEXTAREA,
            optional: true,
          },
          {
            name: "status",
            label: "Status",
            type: FieldType.STRING,
            control_type: ControlType.SELECT,
            optional: false,
            pick_list_values: [
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ],
          },
        ],
      },
      output_schema: {
        fields: (context): Field[] => [
          {
            name: "id",
            label: "ID",
            type: FieldType.STRING,
            control_type: ControlType.TEXT,
            optional: false,
          },
          {
            name: "name",
            label: "Name",
            type: FieldType.STRING,
            control_type: ControlType.TEXT,
            optional: false,
          },
          {
            name: "created_at",
            label: "Created At",
            type: FieldType.DATETIME,
            control_type: ControlType.DATETIME,
            optional: false,
          },
        ],
      },
      execute: async (context: AppContext): Promise<ExecutionPayload> => {
        try {
          const { name, description, status } = context.payload.data;

          context.logger?.info("Creating item:", { name, description, status });

          // Simulate API call
          const response = await context.fetch("https://httpbin.org/post", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${context.auth.api_key}`,
            },
            body: JSON.stringify({
              name,
              description,
              status,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            return {
              success: true,
              data: {
                id: `item_${Date.now()}`,
                name,
                description,
                status,
                created_at: new Date().toISOString(),
              },
            };
          } else {
            throw new Error(`API call failed with status: ${response.status}`);
          }
        } catch (error) {
          context.logger?.error("Action execution failed:", error);
          throw error;
        }
      },
    },
  },
  triggers: {
    new_item: {
      type: "poll",
      id: "new_item",
      name: "new_item",
      title: "New Item",
      subtitle: "Triggers when a new item is created",
      description: "This trigger fires when a new item is created in the system",
      help: "Monitors newly created items",
      display_priority: 1,
      batch: false,
      bulk: false,
      deprecated: false,
      has_config_fields: false,
      dedup: (record: DataPayload) => `item_${record.id}_${record.created_at}`,
      sample: (context) => ({
        id: "item_123",
        name: "Sample Item",
        description: "This is a sample item",
        status: "active",
        created_at: "2024-01-01T00:00:00Z",
      }),
      input_schema: {
        fields: (context): Field[] => [
          {
            name: "since",
            label: "Since",
            type: FieldType.DATETIME,
            control_type: ControlType.DATETIME,
            optional: false,
          },
          {
            name: "till",
            label: "Till",
            type: FieldType.DATETIME,
            control_type: ControlType.DATETIME,
            optional: false,
          },
        ],
      },
      output_schema: {
        fields: (context): Field[] => [
          {
            name: "id",
            label: "ID",
            type: FieldType.STRING,
            control_type: ControlType.TEXT,
            optional: false,
          },
          {
            name: "name",
            label: "Name",
            type: FieldType.STRING,
            control_type: ControlType.TEXT,
            optional: false,
          },
          {
            name: "created_at",
            label: "Created At",
            type: FieldType.DATETIME,
            control_type: ControlType.DATETIME,
            optional: false,
          },
        ],
      },
      poll: async (context: AppContext): Promise<PollResponse> => {
        try {
          const { since, till, cursor } = context.payload.data;

          context.logger?.info("Polling for new items:", { since, till });

          // Simulate API call to get items
          const response = await context.fetch("https://httpbin.org/get", {
            headers: {
              Authorization: `Bearer ${context.auth.api_key}`,
            },
          });

          if (response.ok) {
            // Simulate some mock data
            const mockItems = [
              {
                id: "item_1",
                name: "Item 1",
                created_at: "2024-01-01T10:00:00Z",
              },
              {
                id: "item_2",
                name: "Item 2",
                created_at: "2024-01-01T11:00:00Z",
              },
            ];

            return {
              since: since as string,
              till: till as string,
              records: mockItems,
              hasMore: false,
              cursor: null,
            };
          } else {
            throw new Error(`Polling failed with status: ${response.status}`);
          }
        } catch (error) {
          context.logger?.error("Polling failed:", error);
          throw error;
        }
      },
    },
  },
};
