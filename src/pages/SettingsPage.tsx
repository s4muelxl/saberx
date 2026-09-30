import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Sliders,
  CheckCircle2,
  Building,
  DollarSign,
  Cloud,
  Database,
  RefreshCw,
  Download,
  Upload,
  AlertCircle,
  Monitor,
  Activity,
  Trash2
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useSettings } from '../context/SettingsContext';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import {
  getSupabaseUrl,
  getSupabaseAnonKey,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  ConnectionTestResult,
  isCloudSyncEnabled
} from '../lib/supabase';
import { isTauriEnvironment, getPlatformInfo } from '../lib/tauri';
import { localStore } from '../lib/storage';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, toggleIpi, toggleIcms } = useSettings();
  const { success, error, info } = useNotification();
  const { cloudSync, setCloudSync } = useAuth();

  const [deliveryDays, setDeliveryDays] = useState(settings.default_delivery_days || 10);
  const [salesMargin, setSalesMargin] = useState(settings.default_sales_margin_percent || 25.0);

  // Supabase connection state
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const platform = getPlatformInfo();

  useEffect(() => {
    setSupabaseUrl(getSupabaseUrl());
    setSupabaseKey(getSupabaseAnonKey());
  }, []);

  const handleSavePreferences = () => {
    updateSettings({
      default_delivery_days: deliveryDays,
      default_sales_margin_percent: salesMargin,
    });
    success('Preferências e regras fiscais atualizadas com sucesso!');
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(supabaseUrl, supabaseKey);
      setTestResult(res);
      if (res.success) {
        success('Conexão Supabase OK', res.message);
      } else {
        error('Falha no Teste', res.message);
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Erro inesperado' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveSupabaseConfig = () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      error('Campos Incompletos', 'Informe tanto a URL quanto a Anon Key do Supabase.');
      return;
    }
    saveSupabaseConfig(supabaseUrl, supabaseKey);
    setCloudSync(true);
    success('Configuração Salva!', 'Credenciais do Supabase atualizadas e modo nuvem ativado.');
  };

  const handleResetToLocalMode = () => {
    clearSupabaseConfig();
    setCloudSync(false);
    setSupabaseUrl('');
    setSupabaseKey('');
    setTestResult(null);
    success('Modo Local Ativado', 'O sistema agora está operando no armazenamento local resiliente offline-first.');
  };

  const handleExportBackup = () => {
    try {
      const backupData = {
        products: localStore.getProducts(),
        suppliers: localStore.getSuppliers(),
        customers: localStore.getCustomers(),
        quotations: localStore.getQuotations(),
        purchaseOrders: localStore.getPurchaseOrders(),
        salesQuotes: localStore.getSalesQuotes(),
        exported_at: new Date().toISOString(),
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `saberx_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      success('Backup Exportado', 'Arquivo JSON com todos os dados baixado com sucesso!');
    } catch (e: any) {
      error('Erro ao Exportar', e.message);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (parsed.products && Array.isArray(parsed.products)) {
          localStorage.setItem('saberx_products', JSON.stringify(parsed.products));
        }
        if (parsed.suppliers && Array.isArray(parsed.suppliers)) {
          localStorage.setItem('saberx_suppliers', JSON.stringify(parsed.suppliers));
        }
        if (parsed.quotations && Array.isArray(parsed.quotations)) {
          localStorage.setItem('saberx_quotations', JSON.stringify(parsed.quotations));
        }
        if (parsed.purchaseOrders && Array.isArray(parsed.purchaseOrders)) {
          localStorage.setItem('saberx_purchase_orders', JSON.stringify(parsed.purchaseOrders));
        }

        success('Backup Restaurado!', 'Os dados foram importados com sucesso. Recarregando...');
        setTimeout(() => window.location.reload(), 1000);
      } catch (err: any) {
        error('Falha na Importação', 'Arquivo JSON inválido ou corrompido.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetFactoryData = () => {
    if (window.confirm('Tem certeza de que deseja restaurar os dados iniciais de fábrica? Isso recarregará o mapa de cotação padrão da planilha.')) {
      localStorage.clear();
      localStore.init();
      success('Dados Restaurados!', 'Ambiente inicial reinicializado com sucesso.');
      setTimeout(() => window.location.reload(), 800);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-500" />
          Configurações do Sistema
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Parâmetros organizacionais, regras fiscais de IPI/ICMS, conexão Supabase e ambiente
        </p>
      </div>

      {/* Ambiente de Execução & Tauri */}
      <Card>
        <CardHeader
          title="Ambiente de Execução da Aplicação"
          subtitle="Status da plataforma atual e capacidades instaladas"
        />
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{platform.label}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  {platform.type}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isTauriEnvironment()
                  ? 'Executando em modo Desktop Nativo Tauri com acesso direto a recursos locais e alta performance.'
                  : 'Executando em modo Web moderno com suporte PWA offline e empacotamento pronto para Tauri v2.'}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] font-mono text-slate-500">v1.0.0 Enterprise</span>
          </div>
        </div>
      </Card>

      {/* Conexão com a Nuvem / Supabase */}
      <Card>
        <CardHeader
          title="Conexão com Banco de Dados Nuvem (Supabase)"
          subtitle="Configure seu projeto Supabase remoto ou opere em modo local resiliente"
        />

        <div className="space-y-4">
          {/* Status Atual */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <Database className={`w-4 h-4 ${cloudSync ? 'text-blue-400' : 'text-amber-400'}`} />
              <div>
                <span className="text-xs font-semibold text-white">Status da Operação: </span>
                <span className={`text-xs font-bold ${cloudSync ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {cloudSync ? 'Sincronização em Nuvem Ativada' : 'Modo Local Resiliente (Offline-First)'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setCloudSync(!cloudSync)}
              className="text-xs text-blue-400 hover:text-blue-300 font-bold underline"
            >
              {cloudSync ? 'Alternar para Local' : 'Alternar para Nuvem'}
            </button>
          </div>

          <div className="space-y-3">
            <Input
              label="URL do Projeto Supabase"
              placeholder="https://seu-projeto.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
            />
            <Input
              label="Anon Public API Key"
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
            />
          </div>

          {/* Test connection result display */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              loading={testingConnection}
              icon={<Activity className="w-4 h-4" />}
              onClick={handleTestConnection}
            >
              Testar Conexão em Tempo Real
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetToLocalMode}
              >
                Limpar & Usar Modo Local
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveSupabaseConfig}
              >
                Salvar Credenciais
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Regras Fiscais & Motor de Cálculo */}
      <Card>
        <CardHeader
          title="Regras Fiscais & Motor de Cálculo"
          subtitle="Controle de inclusão de impostos no valor total das cotações (compatibilidade com planilha original)"
        />

        <div className="space-y-4">
          {/* IPI Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <div className="text-sm font-bold text-white">Incluir IPI no Total Calculado</div>
              <p className="text-xs text-slate-400 mt-0.5">
                Por padrão: <strong className="text-amber-400">DESATIVADO</strong>. O IPI fica registrado como informação fiscal e não altera o valor base, reproduzindo a planilha original.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.include_ipi_in_total}
                onChange={toggleIpi}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* ICMS Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <div className="text-sm font-bold text-white">Incluir ICMS no Total Calculado</div>
              <p className="text-xs text-slate-400 mt-0.5">
                Por padrão: <strong className="text-amber-400">DESATIVADO</strong>. O ICMS fica registrado como informação fiscal de apoio.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.include_icms_in_total}
                onChange={toggleIcms}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <Input
              label="Prazo Padrão Desejado de Entrega (Dias)"
              type="number"
              value={deliveryDays}
              onChange={(e) => setDeliveryDays(parseInt(e.target.value) || 7)}
            />
            <Input
              label="Margem Padrão de Vendas (%)"
              type="number"
              step="any"
              value={salesMargin}
              onChange={(e) => setSalesMargin(parseFloat(e.target.value) || 25.0)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={handleSavePreferences}>
              Salvar Parâmetros
            </Button>
          </div>
        </div>
      </Card>

      {/* Backup & Restauração de Dados */}
      <Card>
        <CardHeader
          title="Backup & Restauração de Dados"
          subtitle="Exporte ou importe a base de dados corporativa completa em JSON"
        />

        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div>
            <div className="text-sm font-bold text-white">Segurança & Portabilidade dos Dados</div>
            <p className="text-xs text-slate-400 mt-0.5">
              Gere cópias de segurança instantâneas contendo cotações, produtos e fornecedores.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-4 h-4 text-emerald-400" />}
              onClick={handleExportBackup}
            >
              Exportar Backup JSON
            </Button>

            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors">
              <Upload className="w-4 h-4 text-blue-400" />
              <span>Importar Backup</span>
              <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
            </label>

            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={handleResetFactoryData}
            >
              Resetar Fábrica
            </Button>
          </div>
        </div>
      </Card>

      {/* Dados da Empresa */}
      <Card>
        <CardHeader
          title="Dados da Organização"
          subtitle="Identificação da matriz para cabeçalhos de pedidos e exportações em PDF"
        />

        <div className="space-y-4">
          <Input label="Razão Social" value="Indústria Metalúrgica SaberX S.A." readOnly />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nome Fantasia" value="SaberX Metais" readOnly />
            <Input label="CNPJ" value="12.345.678/0001-90" readOnly />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Telefone" value="(11) 3456-7890" readOnly />
            <Input label="E-mail Corporativo" value="compras@saberx.com.br" readOnly />
          </div>
        </div>
      </Card>
    </div>
  );
};
