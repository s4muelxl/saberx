# SaberX - Sistema Web de Cotação, Compras e Vendas

Sistema web completo, moderno e pronto para produção para gestão integrada de produtos de aço/metalurgia, fornecedores, cotações com motor de cálculo automatizado, pedidos de compra, orçamentos de vendas, auditoria e relatórios.

Desenvolvido para substituir e automatizar planilhas de "Mapa de Cotação", mantendo fidelidade estrita às regras de cálculo originais e transformando-as em um sistema com banco de dados, usuários, permissões e histórico.

---

## 🚀 Tecnologias

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts
- **Planilhas & Relatórios**: SheetJS (XLSX), jsPDF, jsPDF-AutoTable
- **Backend & Database**: Supabase (PostgreSQL 15, Supabase Auth, Storage)
- **Segurança**: Row Level Security (RLS) multi-tenant por organização
- **Hospedagem / Deploy**: Vercel

---

## ⚙️ Regras do Motor de Cálculo e Validação

- **Unidades Suportadas**: `kg`, `pç`, `barra`, `metro`, `tonelada`, `unidade`
- **Cálculo por kg**: $\text{Total} = \text{Peso (kg)} \times \text{Preço Unitário}$
- **Cálculo por pç/barra/metro**: $\text{Total} = \text{Quantidade Cotada} \times \text{Preço Unitário}$
- **Status de Validação**:
  - `VALIDA`
  - `QUANTIDADE_INSUFICIENTE` (cotado < necessário)
  - `PRODUTO_DIVERGENTE` (produto cotado difere do especificado)
  - `NAO_COTADO`
  - `PRECO_AUSENTE`
  - `EXCLUIDA_MANUALMENTE`
- **Menor Preço Válido 🏆**: Calculado estritamente entre as cotações com status `VALIDA`.
- **Alerta de Menor Preço Inválido ⚠️**: Exibe aviso caso exista cotação com valor nominal inferior que foi desclassificada.

---

## 📦 Como Executar

### 1. Instalação das dependências
```bash
npm install
```

### 2. Executar em modo de desenvolvimento
```bash
npm run dev
```

### 3. Executar a suíte de testes unitários automatizados
```bash
npm test
```

### 4. Compilar para produção
```bash
npm run build
```

---

## 🗄️ Estrutura do Banco de Dados (Supabase)

Scripts SQL completos disponíveis na pasta `supabase/`:
- `supabase/schema.sql`: Definição de tabelas, índices e triggers.
- `supabase/migrations/02_rls_policies.sql`: Políticas de Row Level Security (RLS).
- `supabase/seed.sql`: Carga demonstrativa inicial.
