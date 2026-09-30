import { describe, it, expect, beforeEach } from 'vitest';
import { UserProfile } from '../types/database';

// Polyfill de localStorage para execução no ambiente node
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', { value: storageMock, writable: true });
}

// Import dynamic/lazy to ensure localStorage is polyfilled
import { localStore, DEMO_ORG_ID, INITIAL_PRODUCTS, INITIAL_SUPPLIERS } from './storage';

describe('Storage & Local Database Management', () => {
  beforeEach(() => {
    localStorage.clear();
    localStore.init();
  });

  it('inicializa a base de dados com produtos e fornecedores padrão', () => {
    const products = localStore.getProducts();
    const suppliers = localStore.getSuppliers();
    expect(products.length).toBeGreaterThanOrEqual(INITIAL_PRODUCTS.length);
    expect(suppliers.length).toBeGreaterThanOrEqual(INITIAL_SUPPLIERS.length);
  });

  it('salva e autentica novo usuário local com senha', () => {
    const testUser: UserProfile = {
      id: 'usr-test-1',
      organization_id: DEMO_ORG_ID,
      full_name: 'Usuário de Teste Automatizado',
      email: 'teste@saberx.com.br',
      role: 'ADMIN',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localStore.saveUser(testUser, 'senhaSegura123');

    // Validação correta
    const authOk = localStore.verifyCredentials('teste@saberx.com.br', 'senhaSegura123');
    expect(authOk.success).toBe(true);
    expect(authOk.user?.email).toBe('teste@saberx.com.br');

    // Senha incorreta
    const authFail = localStore.verifyCredentials('teste@saberx.com.br', 'senhaErrada');
    expect(authFail.success).toBe(false);
    expect(authFail.error).toContain('Senha incorreta');

    // E-mail inexistente
    const authNotFound = localStore.verifyCredentials('inexistente@saberx.com.br', '123456');
    expect(authNotFound.success).toBe(false);
  });

  it('persiste e recupera a sessão do usuário atual', () => {
    const user = localStore.getUsers()[0];
    localStore.setCurrentUser(user);
    expect(localStore.getCurrentUser()?.id).toBe(user.id);

    localStore.setCurrentUser(null);
    expect(localStore.getCurrentUser()).toBeNull();
  });

  it('salva e recupera ordens de compra e orçamentos de venda', () => {
    const pos = localStore.getPurchaseOrders();
    expect(pos.length).toBeGreaterThanOrEqual(1);
    expect(pos[0].order_number).toContain('PC-');

    const sales = localStore.getSalesQuotes();
    expect(sales.length).toBeGreaterThanOrEqual(1);
    expect(sales[0].quote_number).toContain('ORC-VND-');
  });

  it('zera todas as informações ao criar nova conta (resetWorkspaceForNewUser)', () => {
    // Verifica que existiam cotações iniciais
    expect(localStore.getQuotations().length).toBeGreaterThan(0);
    expect(localStore.getPurchaseOrders().length).toBeGreaterThan(0);
    expect(localStore.getSalesQuotes().length).toBeGreaterThan(0);

    const newUser: UserProfile = {
      id: 'usr-nova-empresa-01',
      organization_id: 'org-nova-01',
      full_name: 'Novo Diretor',
      email: 'diretor@novaempresa.com',
      role: 'ADMIN',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Zera o workspace para o novo usuário/empresa
    localStore.resetWorkspaceForNewUser('Minha Nova Empresa S.A.', newUser);

    // Todas as transações anteriores devem estar rigorosamente ZERADAS
    expect(localStore.getQuotations()).toEqual([]);
    expect(localStore.getPurchaseOrders()).toEqual([]);
    expect(localStore.getSalesQuotes()).toEqual([]);

    // Trilha de auditoria deve conter o registro de inicialização limpa
    const logs = localStore.getAuditLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('NOVA_CONTA_INICIALIZADA');
    expect(logs[0].reason).toContain('Minha Nova Empresa S.A.');
  });

  it('garante privilégio total ADMIN para todos os usuários cadastrados e logados', () => {
    const compradorUser: UserProfile = {
      id: 'usr-qualquer',
      organization_id: DEMO_ORG_ID,
      full_name: 'Comprador Júnior',
      email: 'junior@empresa.com',
      role: 'COMPRAS' as any,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localStore.saveUser(compradorUser, 'senha123');
    const auth = localStore.verifyCredentials('junior@empresa.com', 'senha123');
    expect(auth.success).toBe(true);
    // Deve garantir acesso ADMIN para todo mundo
    expect(auth.user?.role).toBe('ADMIN');

    localStore.setCurrentUser(auth.user!);
    expect(localStore.getCurrentUser()?.role).toBe('ADMIN');
  });
});
