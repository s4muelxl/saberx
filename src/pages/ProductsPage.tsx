import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Filter,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Product, ProductInput } from '../types/product';
import { localStore, DEMO_ORG_ID } from '../lib/storage';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

export const ProductsPage: React.FC = () => {
  const { user, role } = useAuth();
  const { success, error } = useNotification();
  const [products, setProducts] = useState<Product[]>(() => localStore.getProducts());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('TODAS');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState<ProductInput>({
    codigo_mpr: '',
    sku: '',
    description: '',
    category: 'Aço Carbono',
    subcategory: '',
    material: 'AISI 1020',
    standard: '',
    dimensions: '',
    stock_unit: 'barra',
    purchase_unit: 'kg',
    weight_unit_kg: 0,
    length_unit_meters: 6.0,
    reference_price: 0,
    min_stock: 0,
    is_active: true,
    notes: '',
  });

  const categories = ['TODAS', 'Aço Carbono', 'Aço Inox', 'Tubos Redondos', 'Cantoneiras', 'Vigas', 'Perfis'];

  const filteredProducts = products.filter((p) => {
    const term = search.toLowerCase();
    const matchesSearch =
      p.codigo_mpr.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      (p.material && p.material.toLowerCase().includes(term)) ||
      (p.dimensions && p.dimensions.toLowerCase().includes(term)) ||
      (p.sku && p.sku.toLowerCase().includes(term));

    const matchesCategory = categoryFilter === 'TODAS' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      codigo_mpr: '',
      sku: '',
      description: '',
      category: 'Aço Carbono',
      subcategory: '',
      material: 'AISI 1020',
      standard: '',
      dimensions: '',
      stock_unit: 'barra',
      purchase_unit: 'kg',
      weight_unit_kg: 0,
      length_unit_meters: 6.0,
      reference_price: 0,
      min_stock: 0,
      is_active: true,
      notes: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      codigo_mpr: p.codigo_mpr,
      sku: p.sku || '',
      description: p.description,
      category: p.category,
      subcategory: p.subcategory || '',
      material: p.material || 'AISI 1020',
      standard: p.standard || '',
      dimensions: p.dimensions || '',
      stock_unit: p.stock_unit,
      purchase_unit: p.purchase_unit,
      weight_unit_kg: p.weight_unit_kg,
      length_unit_meters: p.length_unit_meters,
      reference_price: p.reference_price || 0,
      min_stock: p.min_stock || 0,
      is_active: p.is_active,
      notes: p.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.codigo_mpr.trim()) {
      error('O Código MPR é obrigatório.');
      return;
    }
    if (!formData.description.trim()) {
      error('A descrição do produto é obrigatória.');
      return;
    }

    // Verifica unicidade de Código MPR
    const isDuplicate = products.some(
      (p) =>
        p.codigo_mpr.trim().toUpperCase() === formData.codigo_mpr.trim().toUpperCase() &&
        p.id !== editingProduct?.id
    );

    if (isDuplicate) {
      error('Já existe um produto com este Código MPR cadastrado.');
      return;
    }

    if (editingProduct) {
      const updated = localStore.saveProduct({
        ...editingProduct,
        ...formData,
      });
      localStore.logAudit({
        organization_id: DEMO_ORG_ID,
        user_id: user?.id,
        user_name: user?.full_name,
        action: 'PRODUTO_ATUALIZADO',
        entity: 'products',
        entity_id: editingProduct.id,
        new_data: updated as any,
        reason: 'Edição cadastral de especificações'
      });
      success('Produto atualizado com sucesso!');
    } else {
      const created = localStore.saveProduct({
        id: `prod-${Date.now()}`,
        organization_id: DEMO_ORG_ID,
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      localStore.logAudit({
        organization_id: DEMO_ORG_ID,
        user_id: user?.id,
        user_name: user?.full_name,
        action: 'PRODUTO_CRIADO',
        entity: 'products',
        entity_id: created.id,
        new_data: created as any,
        reason: 'Cadastro de novo produto'
      });
      success('Produto cadastrado com sucesso!');
    }

    setProducts(localStore.getProducts());
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir este produto?')) {
      localStore.deleteProduct(id);
      setProducts(localStore.getProducts());
      success('Produto removido.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-500" />
            Banco de Produtos
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Catálogo técnico padronizado por Código MPR com dimensões e especificações de aço
          </p>
        </div>

        {(role === 'ADMIN' || role === 'COMPRAS') && (
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>
            + Novo Produto
          </Button>
        )}
      </div>

      {/* Filter and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full">
            <Input
              placeholder="Pesquisar por Código MPR, SKU, Descrição, Material ou Dimensão..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="w-full md:w-auto flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 w-full md:w-48"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Table List */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <th className="py-3 px-4">Código MPR</th>
                <th className="py-3 px-4">Descrição Técnica</th>
                <th className="py-3 px-4">Dimensões / Norma</th>
                <th className="py-3 px-4">Material</th>
                <th className="py-3 px-4 text-center">Peso Barra (kg)</th>
                <th className="py-3 px-4 text-center">Comprimento (m)</th>
                <th className="py-3 px-4 text-right">Preço Ref. (R$/kg)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Nenhum produto encontrado para estes filtros.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">
                      {p.codigo_mpr}
                      {p.sku && <div className="text-[10px] text-slate-500 font-normal">SKU: {p.sku}</div>}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {p.description}
                      <div className="text-[10px] text-slate-400 font-normal">{p.category}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{p.dimensions || '-'}</div>
                      <div className="text-[10px] text-slate-400">{p.standard || '-'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono">
                      {p.material || 'AISI 1020'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-200">
                      {p.weight_unit_kg.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-200">
                      {p.length_unit_meters.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      R$ {p.reference_price ? p.reference_price.toFixed(2) : '0.00'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {p.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                          <XCircle className="w-3.5 h-3.5" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Adicionar / Editar Produto */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
        subtitle="O Código MPR deve ser único dentro da organização"
        maxWidth="2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>Salvar Produto</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Código MPR (Único) *"
              placeholder="Ex: MPR-CAI-2000-0188-1020"
              value={formData.codigo_mpr}
              onChange={(e) => setFormData({ ...formData, codigo_mpr: e.target.value })}
              required
            />
            <Input
              label="SKU Interno"
              placeholder="Ex: SKU-CAI-20"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />
          </div>

          <Input
            label="Descrição do Produto *"
            placeholder="Ex: CANTONEIRA ABAS IGUAIS 2 x 3/16 - AISI 1020"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase">Categoria</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="Aço Carbono">Aço Carbono</option>
                <option value="Cantoneiras">Cantoneiras</option>
                <option value="Tubos Retangulares">Tubos Retangulares</option>
                <option value="Tubos Redondos">Tubos Redondos</option>
                <option value="Vigas e Perfis">Vigas e Perfis</option>
              </select>
            </div>
            <Input
              label="Material"
              placeholder="Ex: AISI 1020"
              value={formData.material}
              onChange={(e) => setFormData({ ...formData, material: e.target.value })}
            />
            <Input
              label="Dimensões"
              placeholder="Ex: 100 x 40 x 4,75"
              value={formData.dimensions}
              onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="Peso por Barra (kg)"
              type="number"
              step="any"
              value={formData.weight_unit_kg}
              onChange={(e) => setFormData({ ...formData, weight_unit_kg: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="Comprimento Barra (m)"
              type="number"
              step="any"
              value={formData.length_unit_meters}
              onChange={(e) => setFormData({ ...formData, length_unit_meters: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="Preço Ref. (R$/kg)"
              type="number"
              step="any"
              value={formData.reference_price}
              onChange={(e) => setFormData({ ...formData, reference_price: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="Estoque Mínimo"
              type="number"
              value={formData.min_stock}
              onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <Input
            label="Observações Técnicas"
            placeholder="Especificações de aplicação ou tolerâncias"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
};
