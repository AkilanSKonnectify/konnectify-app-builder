export function createWorkerBlobUrl(): string {
  const workerSource = `
      // Worker sandbox
      globalThis.__connector = null;
      globalThis.__capabilities = { fetch: false, logger: false };
  
      // Enhanced console forwarding with logger proxy
      const baseConsole = {
        log: (...args) => self.postMessage({ type: 'console', level: 'info', args }),
        info: (...args) => self.postMessage({ type: 'console', level: 'info', args }),
        warn: (...args) => self.postMessage({ type: 'console', level: 'warn', args }),
        error: (...args) => self.postMessage({ type: 'console', level: 'error', args }),
        debug: (...args) => self.postMessage({ type: 'console', level: 'debug', args }),
      };
      globalThis.console = baseConsole;

      // Logger proxy for connector context
      function createLoggerProxy(name) {
        return {
          info: (...args) => self.postMessage({ type: 'log', level: 'info', args, logger: name }),
          warn: (...args) => self.postMessage({ type: 'log', level: 'warn', args, logger: name }),
          error: (...args) => self.postMessage({ type: 'log', level: 'error', args, logger: name }),
          debug: (...args) => self.postMessage({ type: 'log', level: 'debug', args, logger: name }),
        };
      }
  
      // Enhanced proxiedFetch with better error handling
      async function proxiedFetch(url, options = {}) {
        const id = Math.random().toString(36).slice(2);
        return new Promise((resolve, reject) => {
          function onMessage(e) {
            const msg = e.data;
            if (!msg || msg.type !== 'networkResponse' || msg.id !== id) return;
            self.removeEventListener('message', onMessage);
            if (msg.error) reject(new Error(msg.error));
            else {
              // reconstruct response-like object
              resolve({
                ok: msg.response.ok,
                status: msg.response.status,
                statusText: msg.response.statusText,
                headers: msg.response.headers || {},
                text: async () => msg.response.text,
                json: async () => { 
                  try { 
                    return JSON.parse(msg.response.text); 
                  } catch(e){ 
                    throw new Error('Invalid JSON response: ' + e.message); 
                  } 
                },
                blob: async () => new Blob([msg.response.text]),
                arrayBuffer: async () => new ArrayBuffer(msg.response.text.length),
              });
            }
          }
          self.addEventListener('message', onMessage);
          self.postMessage({ 
            type: 'networkRequest', 
            id, 
            url, 
            options: {
              method: options.method || 'GET',
              headers: options.headers || {},
              body: options.body,
              mode: options.mode || 'cors',
              credentials: options.credentials || 'omit',
            }
          });
        });
      }

      // Utility functions for connector context
      function createContext(authData, payload, operationData = {}) {
        const context = {
          auth: authData || {},
          payload: payload || {},
          logger: createLoggerProxy(operationData.appId || 'Connector'),
          fetch: globalThis.__capabilities.fetch ? proxiedFetch : fetch,
          moment: null, // Will be polyfilled if needed
          lodash: null, // Will be polyfilled if needed
          btoa: (input) => btoa(input),
          config: operationData.config || {},
          webhookEndpoint: operationData.webhookEndpoint,
          engineEndpoint: operationData.engineEndpoint,
          operationKey: operationData.operationKey || operationData.triggerKey || '',
        };
        return context;
      }
  
      function getByPath(root, path) {
        if (!path) return root;
        return path.split('.').reduce((acc, p) => (acc ? acc[p] : undefined), root);
      }

      // Helper to find connector functions dynamically
      function findConnectorFunction(methodPath) {
        const root = globalThis.__connector;
        if (!root) return null;

        // Direct path lookup
        let fn = getByPath(root, methodPath);
        if (fn && typeof fn === 'function') return fn;

        // Try common patterns for different function types
        const patterns = [
          methodPath,
          methodPath.replace('connection.auth.', 'connection.auth.'),
          methodPath.replace('triggers.', 'triggers.'),
          methodPath.replace('actions.', 'actions.'),
        ];

        for (const pattern of patterns) {
          fn = getByPath(root, pattern);
          if (fn && typeof fn === 'function') return fn;
        }

        return null;
      }
  
      self.onmessage = async (e) => {
        const msg = e.data;
        if (!msg || !msg.type) return;
        
        try {
          if (msg.type === 'setup') {
            // Setup capabilities
            globalThis.__capabilities = { ...globalThis.__capabilities, ...msg.capabilities };
            self.postMessage({ type: 'setup_complete' });
          } else if (msg.type === 'load') {
            // Load connector code
            eval(msg.code);
            
            // Try to resolve connector from various export patterns
            if (typeof exports !== 'undefined' && exports.default) {
              globalThis.__connector = exports.default;
            } else if (typeof module !== 'undefined' && module && module.exports) {
              globalThis.__connector = module.exports.default ?? module.exports;
            } else if (globalThis.default) {
              globalThis.__connector = globalThis.default;
            } else if (typeof exports !== 'undefined') {
              globalThis.__connector = exports;
            }
            
            self.postMessage({ type: 'loaded' });
          } else if (msg.type === 'run') {
            const { methodPath, context = {}, requestId, proxyFetch, operationData = {} } = msg;
            
            // Create enhanced context
            const enhancedContext = createContext(context.auth, context.payload, operationData);
            if (proxyFetch && globalThis.__capabilities.fetch) {
              enhancedContext.fetch = proxiedFetch;
            }
            
            const root = globalThis.__connector;
            if (!root) {
              self.postMessage({ type: 'error', requestId, error: 'Connector not loaded' });
              return;
            }
            
            const fn = findConnectorFunction(methodPath);
            if (!fn) {
              self.postMessage({ 
                type: 'error', 
                requestId, 
                error: 'Function not found: ' + methodPath + '. Available methods: ' + JSON.stringify(Object.keys(root)) 
              });
              return;
            }
            
            try {
              const result = await fn(enhancedContext);
              self.postMessage({ type: 'result', requestId, result });
            } catch (err) {
              self.postMessage({ 
                type: 'error', 
                requestId, 
                error: String(err), 
                stack: err && err.stack,
                message: err && err.message 
              });
            }
          }
        } catch (err) {
          self.postMessage({ 
            type: 'error', 
            error: String(err),
            stack: err && err.stack 
          });
        }
      };
    `;
  const blob = new Blob([workerSource], { type: "application/javascript" });
  return URL.createObjectURL(blob);
}
