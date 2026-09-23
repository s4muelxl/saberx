import React, { useState } from 'react';
import { Truck, Plus, Search, Edit2, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Supplier, SupplierInput } from '../types/supplier';
import { localStore, DEMO_ORG_ID } from '../lib/storage';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export const SuppliersPage: React.FC = () => {
  const { user, role } = useAuth();
  const { success, error } = useNotification();
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => localStore.getSuppliers());
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState<SupplierInput>({
    company_name: '',
    trade_name: '',
    cnpj: '',
    state_registration: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    state: 'SP',
    contact_person: '',
    payment_terms: '28 DDL',
    default_lead_time_days: 7,
    notes: '',
    is_active: true
  });

  const filteredSuppliers = suppliers.filter((s) => {
    const term = search.toLowerCase();
    return (
      s.company_name.toLowerCase().includes(term) ||
      (s.trade_name && s.trade_name.toLowerCase().includes(term)) ||
      (s.cnpj && s.cnpj.toLowerCase().includes(term)) ||
      (s.city && s.city.toLowerCase().includes(term))
    );
  });

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({
      company_name: '',
      trade_name: '',
      cnpj: '',
      state_registration: '',
      email: '',
      phone: '',
      whatsapp: '',
      address: '',
      city: '',
      state: 'SP',
      contact_person: '',
      payment_terms: '28 DDL',
      default_lead_time_days: 7,
      notes: '',
      is_active: true
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData({
      company_name: s.company_name,
      trade_name: s.trade_name || '',
      cnpj: s.cnpj || '',
      state_registration: s.state_registration || '',
      email: s.email || '',
      phone: s.phone || '',
      whatsapp: s.whatsapp || '',
      address: s.address || '',
      city: s.city || '',
      state: s.state || 'SP',
      contact_person: s.contact_person || '',
      payment_terms: s.payment_terms || '28 DDL',
      default_lead_time_days: s.default_lead_time_days || 7,
      notes: s.notes || '',
      is_active: s.is_active
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.company_name.trim()) {
      error('A Razão Social é obrigatória.');
      return;
    }

    if (editingSupplier) {
      localStore.saveSupplier({
        ...editingSupplier,
        ...formData
      });
      success('Fornecedor atualizado com sucesso.');
    } else {
      localStore.saveSupplier({
        id: `sup-${Date.now()}`,
        organization_id: DEMO_ORG_ID,
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      success('Fornecedor cadastrado com sucesso.');
    }

    setSuppliers(localStore.getSuppliers());
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja excluir este fornecedor?')) {
      localStore.deleteSupplier(id);
      setSuppliers(localStore.getSuppliers());
      success('Fornecedor removido.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-500" />
            Fornecedores Siderúrgicos
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cadastro de usinas, distribuidores e parceiros comerciais de perfis e tubos
          </p>
        </div>

        {(role === 'ADMIN' || role === 'COMPRAS') && (
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>
            + Novo Fornecedor
          </Button>
        )}
      </div>

      {/* Search */}
      <Card className="p-4">
        <Input
          placeholder="Pesquisar fornecedor por Nome, Razão Social, CNPJ ou Cidade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </Card>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSuppliers.map((s) => (
          <Card key={s.id} className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-white text-base">
                  {s.trade_name || s.company_name}
                </h3>
                <p className="text-xs text-slate-400">{s.company_name}</p>
                <div className="text-[11px] font-mono text-blue-400 mt-1">CNPJ: {s.cnpj || 'Não informado'}</div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleOpenEdit(s)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{s.phone || s.whatsapp || '-'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{s.email || '-'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{s.city ? `${s.city}/${s.state}` : '-'}</span>
              </div>
              <div>
                <span className="text-slate-400">Condição:</span> <strong>{s.payment_terms}</strong>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal Fornecedor */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSupplier ? 'Editar Fornecedor' : 'Cadastrar Fornecedor'}
        maxWidth="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>Salvar Fornecedor</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Razão Social *"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              required
            />
            <Input
              label="Nome Fantasia"
              value={formData.trade_name}
              onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="CNPJ"
              placeholder="00.000.000/0000-00"
              value={formData.cnpj}
              onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
            />
            <Input
              label="Inscrição Estadual"
              value={formData.state_registration}
              onChange={(e) => setFormData({ ...formData, state_registration: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="E-mail"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Telefone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="WhatsApp"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Cidade"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="Estado (UF)"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
            <Input
              label="Condição de Pagamento Padrão"
              value={formData.payment_terms}
              onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
