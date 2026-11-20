/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL da API Rails (padrão: http://localhost:3000). */
  readonly VITE_API_BASE_URL?: string;
  /** Client ID OAuth do Google (público). Sem ele, só o login de desenvolvimento aparece (em npm run dev). */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_FACEBOOK_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
