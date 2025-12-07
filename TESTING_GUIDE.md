# App Builder Testing Functionality

This document explains how to use the enhanced testing functionality in the app-builder UI for testing connectors.

## Overview

The app-builder now includes comprehensive testing capabilities for connectors with three main testing modes:

1. **Connection Testing** - Test authentication and connection validation
2. **Trigger Testing** - Test trigger polling functionality
3. **Action Testing** - Test action execution functionality

## How It Works

### Architecture

- **Sandbox Worker**: Code execution happens in a secure web worker sandbox
- **ESBuild**: TypeScript code is compiled to JavaScript using esbuild-wasm
- **Monaco Integration**: Current editor content is automatically passed to the worker
- **Local Storage**: All data is stored locally, no backend required

### Testing Flow

1. Write your connector code in the Monaco editor
2. Switch to the appropriate testing tab (Connection/Trigger/Actions)
3. Provide test data as JSON input
4. Click the test button to execute the connector function
5. View results and logs in the UI

## Testing Components

### Connection Tester

Tests the `connection.auth.validate` function of your connector.

**Input Fields:**

- **Auth Data (JSON)**: Authentication credentials (e.g., API keys, tokens)

**Example Auth Data:**

```json
{
  "api_key": "your_api_key_here",
  "client_id": "your_client_id",
  "access_token": "your_access_token"
}
```

### Trigger Tester

Tests trigger polling functions (e.g., `triggers.new_record.poll`).

**Input Fields:**

- **Select Trigger**: Choose which trigger to test (auto-detected from connector)
- **Auth Data (JSON)**: Authentication credentials
- **Trigger Data (JSON)**: Polling parameters (since, till, cursor)
- **Config Fields (JSON)**: Configuration data for the trigger

**Example Trigger Data:**

```json
{
  "since": "2024-01-01T00:00:00Z",
  "till": "2024-12-31T23:59:59Z",
  "cursor": null
}
```

**Example Config Fields:**

```json
{
  "module": "Contact",
  "table": "contacts"
}
```

### Action Tester

Tests action execution functions (e.g., `actions.create_record.execute`).

**Input Fields:**

- **Select Action**: Choose which action to test (auto-detected from connector)
- **Auth Data (JSON)**: Authentication credentials
- **Action Data (JSON)**: Data to be processed by the action
- **Config Fields (JSON)**: Configuration data for the action

**Example Action Data:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890"
}
```

## Connector Structure

Your connector should follow this structure:

```typescript
export const myApp: App = {
  id: "my-app",
  name: "My App",
  // ... other app metadata

  connection: {
    auth: {
      validate: async (context: AppContext): Promise<boolean> => {
        // Test connection logic here
        return true;
      },
    },
  },

  triggers: {
    my_trigger: {
      poll: async (context: AppContext): Promise<PollResponse> => {
        // Polling logic here
        return {
          since: context.payload.data.since,
          till: context.payload.data.till,
          records: [],
          hasMore: false,
          cursor: null,
        };
      },
    },
  },

  actions: {
    my_action: {
      execute: async (context: AppContext): Promise<ExecutionPayload> => {
        // Action execution logic here
        return {
          success: true,
          data: {},
        };
      },
    },
  },
};
```

## Context Object

The testing framework provides a context object with:

- `auth`: Authentication data from your input
- `payload.data`: Test data from your input
- `payload.config_fields`: Configuration data from your input
- `logger`: Logging functions (info, error, warn, debug)
- `fetch`: HTTP client for API calls
- `btoa`: Base64 encoding utility

## Example Usage

1. **Load Example Connector**: Copy the `example-connector.ts` file content into the Monaco editor
2. **Test Connection**:
   - Go to Connection tab
   - Enter `{"api_key": "test_key"}` in Auth Data
   - Click "Test Connection"
3. **Test Trigger**:
   - Go to Trigger tab
   - Select "new_item" trigger
   - Enter auth data and trigger data
   - Click "Test Trigger"
4. **Test Action**:
   - Go to Actions tab
   - Select "create_item" action
   - Enter auth data and action data
   - Click "Test Action"

## Features

- **Auto-Detection**: Automatically detects available triggers and actions from your connector
- **Real-time Logging**: See logs from your connector code in real-time
- **Error Handling**: Comprehensive error reporting with stack traces
- **Network Proxying**: HTTP requests are proxied through the main thread for security
- **Timeout Protection**: Tests automatically timeout after 30 seconds
- **JSON Validation**: Input validation for JSON fields

## Security

- Code execution is sandboxed in a web worker
- Network requests are proxied through the main thread
- No persistent storage of sensitive data
- All data stays in the browser

## Troubleshooting

**Common Issues:**

1. **"Function not found"**: Make sure your connector exports the expected structure
2. **"Connector not loaded"**: Check for syntax errors in your TypeScript code
3. **"Invalid JSON"**: Validate your JSON input data
4. **Network errors**: Check your API endpoints and authentication

**Debug Tips:**

- Use the logger in your connector code: `context.logger.info("Debug message")`
- Check the browser console for additional error details
- Verify your connector structure matches the expected format
