import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, Ban, Trophy } from 'lucide-react';
import { QuotationStatus, QuoteItemValidationStatus, PurchaseOrderStatus, SalesQuoteStatus } from '../../types/database';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  status?: QuotationStatus | QuoteItemValidationStatus | PurchaseOrderStatus | SalesQuoteStatus | string;
  isLowestValid?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  status,
  isLowestValid,
  className = '',
  size = 'md'
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  if (isLowestValid) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm ${sizeClasses} ${className}`}>
        <Trophy className="w-3.5 h-3.5 text-emerald-400" />
        {children || 'Menor Preço Válido'}
      </span>
    );
  }

  // Se passou status de validação de item de cotação
  if (status === 'VALIDA') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${sizeClasses} ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        {children || 'VÁLIDA'}
      </span>
    );
  }

  if (status === 'QUANTIDADE_INSUFICIENTE') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/40 ${sizeClasses} ${className}`}>
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
        {children || 'QTD. INSUFICIENTE'}
      </span>
    );
  }

  if (status === 'PRODUTO_DIVERGENTE') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/40 ${sizeClasses} ${className}`}>
        <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
        {children || 'PRODUTO DIVERGENTE'}
      </span>
    );
  }

  if (status === 'NAO_COTADO') {
    return (
      <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-slate-800 text-slate-400 border border-slate-700 ${sizeClasses} ${className}`}>
        <MinusCircle className="w-3.5 h-3.5 text-slate-500" />
        {children || 'NÃO COTADO'}
      </span>
    );
  }

  if (status === 'PRECO_AUSENTE') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 ${sizeClasses} ${className}`}>
        <XCircle className="w-3.5 h-3.5 text-rose-400" />
        {children || 'SEM PREÇO'}
      </span>
    );
  }

  if (status === 'EXCLUIDA_MANUALMENTE') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30 ${sizeClasses} ${className}`}>
        <Ban className="w-3.5 h-3.5 text-purple-400" />
        {children || 'DESCONSIDERADA'}
      </span>
    );
  }

  // Status de Cotação Geral
  if (status === 'APROVADA' || status === 'FINALIZADA') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ${sizeClasses} ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5" />
        {children || status}
      </span>
    );
  }

  if (status === 'EM_COTACAO') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30 ${sizeClasses} ${className}`}>
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
        {children || 'EM COTAÇÃO'}
      </span>
    );
  }

  if (status === 'AGUARDANDO_APROVACAO') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 ${sizeClasses} ${className}`}>
        <AlertTriangle className="w-3.5 h-3.5" />
        {children || 'AGUARDANDO APROVAÇÃO'}
      </span>
    );
  }

  if (status === 'REJEITADA' || status === 'CANCELADA') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 ${sizeClasses} ${className}`}>
        <XCircle className="w-3.5 h-3.5" />
        {children || status}
      </span>
    );
  }

  if (status === 'RASCUNHO') {
    return (
      <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-slate-800 text-slate-300 border border-slate-700 ${sizeClasses} ${className}`}>
        {children || 'RASCUNHO'}
      </span>
    );
  }

  // Fallback por variantes manuais
  const variantStyles = {
    default: 'bg-slate-800 text-slate-300 border border-slate-700',
    success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    info: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-md ${variantStyles[variant || 'default']} ${sizeClasses} ${className}`}>
      {children}
    </span>
  );
};
