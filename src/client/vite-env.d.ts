/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Публічний сайткей Turnstile (prod задається в deploy.yml; dev — тестовий dummy). */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}
