// Global type declarations for CRM
declare global {
  interface Window {
    __GITHUB_CRM_CONFIG__?: {
      owner: string;
      repo: string;
      pat: string;
      branch: string;
    };
    __CRM_MOCK__?: (url: string) => string | null;
    __origFetch?: typeof fetch;
  }
}

export {};