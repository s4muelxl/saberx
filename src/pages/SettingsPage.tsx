import React, { useState } from 'react';
import { Settings, Shield, Sliders, CheckCircle2, Building, DollarSign } from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useSettings } from '../context/SettingsContext';
import { useNotification } from '../context/NotificationContext';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, toggleIpi, toggleIcms } = useSettings();
  const { success } = useNotification();

  const [deliveryDays, setDeliveryDays] = useState(settings.default_delivery_days || 10);
  const [salesMargin, setSalesMargin] = useState(settings.default_sales_margin_percent || 25.0);

  const handleSavePreferences = () => {
    updateSettings({
      default_delivery_days: deliveryDays,
      default_sales_margin_percent: salesMargin,
    });
    success('Preferências e regras fiscais atualizadas com sucesso!');
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
          Parâmetros organizacionais, regras fiscais de IPI/ICMS e preferências de cálculo
        </p>
      </div>

      {/* Regras de Cálculo & Impostos (Seção 14 & 37) */}
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
