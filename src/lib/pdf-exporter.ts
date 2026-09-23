import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QuotationFull } from '../types/quotation';
import { calculateLowestValidPrice } from '../domain/validations';

export function exportQuotationToPdf(quotation: QuotationFull): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Título e Cabeçalho
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text('SABERX | RELATÓRIO EXECUTIVO DE COTAÇÃO', 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`Cotação: ${quotation.quotation_number}   |   Data: ${quotation.quotation_date}   |   Status: ${quotation.status}`, 14, 22);
  doc.text(`Projeto: ${quotation.project_name}   |   Cliente: ${quotation.related_client || 'N/A'}   |   Resp: ${quotation.responsible_user_name || 'N/A'}`, 14, 27);

  // Linha divisória
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 30, 283, 30);

  // Monta tabela comparativa
  const headers = ['Item / MPR', 'Descrição', 'Qtd (Barras/M)'];
  quotation.supplier_quotes.forEach((sq) => {
    headers.push(sq.supplier?.trade_name || sq.supplier?.company_name || 'Fornecedor');
  });
  headers.push('Menor Preço Válido');

  const bodyData = quotation.items.map((item, idx) => {
    const row: string[] = [
      `#${idx + 1} ${item.product?.codigo_mpr || ''}`,
      item.product?.description || '',
      `${item.quantity_bars} br (${item.quantity_meters} m)`
    ];

    const quoteItemsForThisProduct: any[] = [];

    quotation.supplier_quotes.forEach((sq) => {
      const sqItem = sq.items?.find((i) => i.quotation_item_id === item.id);
      if (sqItem) {
        quoteItemsForThisProduct.push(sqItem);
        if (sqItem.validation_status === 'VALIDA') {
          row.push(`R$ ${sqItem.calculated_total.toFixed(2)}\n(${sqItem.quoted_quantity} ${sqItem.price_unit} @ R$ ${sqItem.unit_price.toFixed(2)})`);
        } else {
          row.push(`[INVÁLIDO]\nR$ ${sqItem.calculated_total.toFixed(2)}\n(${sqItem.validation_status})`);
        }
      } else {
        row.push('Não cotado');
      }
    });

    const analysis = calculateLowestValidPrice(quoteItemsForThisProduct, item);
    if (analysis.hasValidQuotes && analysis.lowestValidTotal !== null) {
      row.push(`R$ ${analysis.lowestValidTotal.toFixed(2)}`);
    } else {
      row.push('Sem cotação válida');
    }

    return row;
  });

  // Linha de totais por fornecedor
  const totalsRow = ['SUBTOTAL CALCULADO', '', ''];
  quotation.supplier_quotes.forEach((sq) => {
    totalsRow.push(`R$ ${sq.calculated_subtotal.toFixed(2)}`);
  });
  totalsRow.push('');
  bodyData.push(totalsRow);

  autoTable(doc, {
    startY: 33,
    head: [headers],
    body: bodyData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Slate-900
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    styles: {
      overflow: 'linebreak',
      cellPadding: 2
    }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 160;

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Documento gerado automaticamente pelo Sistema SaberX em ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}.`,
    14,
    Math.min(finalY + 12, 195)
  );

  doc.save(`${quotation.quotation_number}_Relatorio_Executivo.pdf`);
}
