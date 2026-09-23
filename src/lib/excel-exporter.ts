import * as XLSX from 'xlsx';
import { QuotationFull } from '../types/quotation';
import { calculateLowestValidPrice } from '../domain/validations';

export function exportQuotationToExcel(quotation: QuotationFull): void {
  const wb = XLSX.utils.book_new();

  // Cabeçalho da cotação
  const headerData = [
    ['SABERX - MAPA DE COTAÇÃO E COMPARATIVO DE PREÇOS'],
    ['Número da Cotação:', quotation.quotation_number],
    ['Projeto:', quotation.project_name],
    ['Cliente Relacionado:', quotation.related_client || 'N/A'],
    ['Responsável:', quotation.responsible_user_name || 'N/A'],
    ['Data:', quotation.quotation_date],
    ['Status:', quotation.status],
    []
  ];

  // Monta tabela comparativa de itens
  const tableHeaders = [
    'Item',
    'Código MPR',
    'Descrição',
    'Qtd. Barras',
    'Qtd. Metros'
  ];

  // Adiciona colunas para cada fornecedor
  quotation.supplier_quotes.forEach((sq) => {
    const name = sq.supplier?.trade_name || sq.supplier?.company_name || 'Fornecedor';
    tableHeaders.push(
      `${name} (Qtd)`,
      `${name} (Preço)`,
      `${name} (Unid)`,
      `${name} (Total)`,
      `${name} (Status)`
    );
  });

  tableHeaders.push('Menor Preço Válido (R$)', 'Status / Alerta');

  const rows: any[] = [];

  quotation.items.forEach((item, index) => {
    const row: any[] = [
      index + 1,
      item.product?.codigo_mpr || '',
      item.product?.description || '',
      item.quantity_bars,
      item.quantity_meters
    ];

    const quoteItemsForThisProduct: any[] = [];

    quotation.supplier_quotes.forEach((sq) => {
      const sqItem = sq.items?.find((i) => i.quotation_item_id === item.id);
      if (sqItem) {
        quoteItemsForThisProduct.push(sqItem);
        row.push(
          sqItem.quoted_quantity,
          sqItem.unit_price,
          sqItem.price_unit,
          sqItem.calculated_total,
          sqItem.validation_status
        );
      } else {
        row.push('-', '-', '-', '-', 'NAO_COTADO');
      }
    });

    const analysis = calculateLowestValidPrice(quoteItemsForThisProduct, item);
    row.push(analysis.lowestValidTotal ? `R$ ${analysis.lowestValidTotal.toFixed(2)}` : 'N/A');
    if (analysis.lowestInvalidAlert) {
      row.push(`ALERTA: Mais barato desclassificado (${analysis.lowestInvalidAlert.reason})`);
    } else {
      row.push(analysis.hasValidQuotes ? 'VÁLIDO' : 'SEM COTAÇÃO VÁLIDA');
    }

    rows.push(row);
  });

  // Linha de Subtotais dos Fornecedores
  const subtotalRow: any[] = ['SUBTOTAL', '', '', '', ''];
  quotation.supplier_quotes.forEach((sq) => {
    subtotalRow.push('', '', '', `R$ ${sq.calculated_subtotal.toFixed(2)}`, '');
  });
  subtotalRow.push('', '');
  rows.push([]);
  rows.push(subtotalRow);

  const fullData = [...headerData, tableHeaders, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(fullData);

  // Ajuste de largura das colunas
  const colWidths = tableHeaders.map((_, i) => ({ wch: i === 2 ? 40 : 18 }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Mapa de Cotação');
  XLSX.writeFile(wb, `${quotation.quotation_number}_Mapa_Cotacao.xlsx`);
}
