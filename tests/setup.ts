import { vi } from 'vitest';

// Mock de fetch global para evitar chamadas reais a URLs externas
global.fetch = vi.fn();

// Mock de console para evitar ruído nos testes
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => ({}));
vi.spyOn(console, 'info').mockImplementation(() => ({}));

// Helper para resetar mocks entre testes
afterEach(() => {
  vi.clearAllMocks();
});