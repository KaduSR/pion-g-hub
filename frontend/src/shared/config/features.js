/**
 * Feature flags simples (não é um sistema de configuração remota — só uma
 * constante editada no código quando o comportamento precisa mudar).
 *
 * qrCredentialReader (Sprint 3.8 — DESCONTINUADA): a integração com o QR
 *   Code de credencial da feira foi descartada por impossibilidade técnica
 *   junto à organizadora. Desligada de propósito — o componente
 *   CredentialScanner.jsx e a permissão selfservice.credential_scan (que
 *   existiam no catálogo/seed do banco) foram removidos/descontinuados;
 *   esta flag continua aqui só para o botão "Ler credencial" não reaparecer
 *   sozinho caso algum código ainda o referencie.
 * qrCredentialAutoFill: preenchimento automático do lead a partir do QR —
 *   já estava desligado; segue desligado junto com o recurso inteiro.
 */
export const FEATURES = {
  qrCredentialReader: false,
  qrCredentialAutoFill: false,
}
