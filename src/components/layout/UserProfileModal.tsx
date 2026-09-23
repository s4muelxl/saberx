import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { User, Mail, Building, Briefcase, Shield, CheckCircle2, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const { success } = useNotification();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [position, setPosition] = useState(user?.position || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const handleSave = async () => {
    await updateProfile({
      full_name: fullName,
      position,
      department,
      phone
    });
    success('Perfil atualizado com sucesso!');
    onClose();
  };

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Identificação do Usuário & Perfil"
      subtitle="Dados de acesso e credenciais da organização corporativa"
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave}>Salvar Alterações</Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        {/* User Card Header */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-blue-500/20">
            {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-white text-base truncate">{user.full_name}</h4>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold text-[10px] border border-blue-500/30">
                {user.role}
              </span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Sessão Ativa
              </span>
            </div>
          </div>
        </div>

        {/* Inputs */}
        <Input
          label="Nome Completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          leftIcon={<User className="w-4 h-4" />}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Cargo"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            leftIcon={<Briefcase className="w-4 h-4" />}
          />
          <Input
            label="Setor"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
        </div>

        <Input
          label="Telefone / Ramal"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(11) 98888-0000"
        />

        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-400">
          <div className="font-semibold text-slate-200">Segurança da Organização:</div>
          <div className="flex justify-between">
            <span>ID da Organização:</span>
            <span className="font-mono text-slate-300">{user.organization_id.substring(0, 18)}...</span>
          </div>
          <div className="flex justify-between">
            <span>Permissões no Banco:</span>
            <span className="text-emerald-400 font-semibold">PostgreSQL RLS Habilitado</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
