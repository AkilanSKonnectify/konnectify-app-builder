export function createWorkerBlobUrl(): string {
  const workerSource = `
      // Worker sandbox
      globalThis.__connector = null;
  
      // forward console to main thread
      const baseConsole = {
        log: (...args) => self.postMessage({ type: 'console', level: 'info', args }),
        info: (...args) => self.postMessage({ type: 'console', level: 'info', args }),
        warn: (...args) => self.postMessage({ type: 'console', level: 'warn', args }),
        error: (...args) => self.postMessage({ type: 'console', level: 'error', args }),
      };
      globalThis.console = baseConsole;
  
      // proxiedFetch: sends networkRequest to main thread
      async function proxiedFetch(url, options) {
        const id = Math.random().toString(36).slice(2);
        return new Promise((resolve, reject) => {
          function onMessage(e) {
            const msg = e.data;
            if (!msg || msg.type !== 'networkResponse' || msg.id !== id) return;
            self.removeEventListener('message', onMessage);
            if (msg.error) reject(msg.error);
            else {
              // reconstruct minimal response-like object
              resolve({
                ok: msg.response.ok,
                status: msg.response.status,
                statusText: msg.response.statusText,
                text: async () => msg.response.text,
                json: async () => { try { return JSON.parse(msg.response.text); } catch(e){ throw e; } },
              });
            }
          }
          self.addEventListener('message', onMessage);
          self.postMessage({ type: 'networkRequest', id, url, options });
        });
      }
  
      function getByPath(root, path) {
        if (!path) return root;
        return path.split('.').reduce((acc, p) => (acc ? acc[p] : undefined), root);
      }
  
      self.onmessage = async (e) => {
        const msg = e.data;
        if (!msg || !msg.type) return;
        try {
          if (msg.type === 'load') {
            // msg.code is JS string already wrapped as IIFE/compat
            eval(msg.code);
            // try resolve connector: exports.default, module.exports, global default...
            if (typeof exports !== 'undefined' && exports.default) globalThis.__connector = exports.default;
            else if (typeof module !== 'undefined' && module && module.exports) globalThis.__connector = module.exports.default ?? module.exports;
            else if (globalThis.default) globalThis.__connector = globalThis.default;
            self.postMessage({ type: 'loaded' });
          } else if (msg.type === 'run') {
            const { methodPath, context = {}, requestId, proxyFetch } = msg;
            if (proxyFetch) context.fetch = proxiedFetch;
            const root = globalThis.__connector;
            if (!root) {
              self.postMessage({ type: 'error', requestId, error: 'Connector not loaded' });
              return;
            }
            const fn = getByPath(root, methodPath);
            if (!fn || typeof fn !== 'function') {
              self.postMessage({ type: 'error', requestId, error: 'Method not found: ' + methodPath });
              return;
            }
            try {
              const result = await fn(context);
              self.postMessage({ type: 'result', requestId, result });
            } catch (err) {
              self.postMessage({ type: 'error', requestId, error: String(err), stack: err && err.stack });
            }
          }
        } catch (err) {
          self.postMessage({ type: 'error', error: String(err) });
        }
      };
    `;
  const blob = new Blob([workerSource], { type: "application/javascript" });
  return URL.createObjectURL(blob);
}
