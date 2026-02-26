export {};

declare global {
  interface Window {
    konnectify?: {
      init: (config: any) => void;
      track?: (...args: any[]) => void;
      identify?: (...args: any[]) => void;
    };
  }
}
