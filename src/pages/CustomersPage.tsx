import React, { useState } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Phone, Mail, Building } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Customer, CustomerInput } from '../types/customer';
import { localStore, DEMO_ORG_ID } from '../lib/storage';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export const CustomersPage: React.FC = () => {
  const { user, role } = useAuth();
  const { success, error } = useNotification();
  const [customers, setCustomers] = useState<Customer[]>(() => localStore.getCustomers());
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [formData, setFormData] = useState<CustomerInput>({
    company_name: '',
    trade_name: '',
    document: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    state: 'SP',
    contact_person: '',
    notes: '',
    is_active: true
  });

  const filteredCustomers = customers.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.company_name.toLowerCase().includes(term) ||
      (c.trade_name && c.trade_name.toLowerCase().includes(term)) ||
      (c.document && c.document.toLowerCase().includes(term))
    );
  });

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      company_name: '',
      trade_name: '',
      document: '',
      email: '',
      phone: '',
      whatsapp: '',
      address: '',
      city: '',
      state: 'SP',
      contact_person: '',
      notes: '',
      is_active: true
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      company_name: c.company_name,
      trade_name: c.trade_name || '',
      document: c.document || '',
      email: c.email || '',
      phone: c.phone || '',
      whatsapp: c.whatsapp || '',
      address: c.address || '',
      city: c.city || '',
      state: c.state || 'SP',
      contact_person: c.contact_person || '',
      notes: c.notes || '',
      is_active: c.is_active
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.company_name.trim()) {
      error('A Razão Social do cliente é obrigatória.');
      return;
    }

    if (editingCustomer) {
      localStore.saveCustomer({
        ...editingCustomer,
        ...formData
      });
      success('Cliente atualizado com sucesso.');
    } else {
      localStore.saveCustomer({
        id: `cust-${Date.now()}`,
        organization_id: DEMO_ORG_ID,
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      success('Cliente cadastrado com sucesso.');
    }

    setCustomers(localStore.getCustomers());
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja excluir este cliente?')) {
      localStore.deleteCustomer(id);
      setCustomers(localStore.getCustomers());
      success('Cliente removido.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Clientes (Módulo de Vendas)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestão de clientes corporativos, indústrias e construtoras atendidas
          </p>
        </div>

        {(role === 'ADMIN' || role === 'VENDAS') && (
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>
            + Novo Cliente
          </Button>
        )}
      </div>

      <Card className="p-4">
        <Input
          placeholder="Pesquisar por Razão Social, Nome Fantasia ou CNPJ/CPF..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCustomers.map((c) => (
          <Card key={c.id} className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-white text-base">{c.trade_name || c.company_name}</h3>
                <p className="text-xs text-slate-400">{c.company_name}</p>
                <div className="text-[11px] font-mono text-blue-400 mt-1">{c.document || 'Documento não informado'}</div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{c.phone || c.whatsapp || '-'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{c.email || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400">Contato:</span> {c.contact_person || '-'}
              </div>
              <div>
                <span className="text-slate-400">Cidade:</span> {c.city ? `${c.city}/${c.state}` : '-'}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
        maxWidth="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>Salvar Cliente</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Razão Social *"
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nome Fantasia"
              value={formData.trade_name}
              onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
            />
            <Input
              label="CNPJ / CPF"
              value={formData.document}
              onChange={(e) => setFormData({ ...formData, document: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="E-mail Comercial"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Telefone / WhatsApp"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
