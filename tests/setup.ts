import { vi, beforeEach, afterEach } from 'vitest';

// Configurar variaveis de ambiente ANTES de qualquer import de modulo
process.env.JWT_SECRET = 'fallback_secret_for_development_only';
process.env.NODE_ENV = 'test';

// Mock de fetch global para evitar chamadas reais a URLs externas
global.fetch = vi.fn();

// Mock de console para evitar ruido nos testes
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => ({}));
vi.spyOn(console, 'info').mockImplementation(() => ({}));
vi.spyOn(console, 'log').mockImplementation(() => {});

// Reset de modulos antes de cada teste de integracao para garantir
// que as variaveis de ambiente estao disponiveis nos modulos recarregados
beforeEach(() => {
  // Os mocks do banco são configurados por cada suíte de integração.
});

// Helper para resetar mocks entre testes
afterEach(() => {
  vi.clearAllMocks();
});