export interface ReceiptLine {
  name: string;
  qty: number;
  price: number;
}

export interface ReceiptData {
  shopName: string;
  address?: string;
  phone?: string;
  footer?: string;
  width?: '58' | '80';
  receiptNo: string;
  lines: ReceiptLine[];
  subtotal: number;
  discount: number;
  total: number;
  paid?: number;
  change?: number;
  provider?: string;
  cashier?: string;
  tableName?: string;
  dateTime: string;
}

const money = (n: number): string => Math.round(n).toLocaleString('ru-RU');

/**
 * Open a print window with an 80mm-styled receipt and trigger the browser
 * print dialog. Works with any OS-configured printer (thermal or A4).
 */
export function printReceipt(d: ReceiptData): void {
  const rows = d.lines
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.name)}</td><td class="c">${l.qty}</td><td class="r">${money(
          l.price * l.qty,
        )}</td></tr>`,
    )
    .join('');

  const widthPx = d.width === '58' ? 210 : 280;
  const head = [d.address, d.phone].filter((x): x is string => !!x).map(escapeHtml).join('<br>');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Chek ${d.receiptNo}</title>
  <style>
    * { font-family: 'Courier New', monospace; }
    body { width: ${widthPx}px; margin: 0 auto; color: #000; }
    h2 { text-align: center; margin: 8px 0; font-size: 16px; }
    .muted { text-align: center; font-size: 11px; color: #333; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
    td { padding: 2px 0; }
    .c { text-align: center; } .r { text-align: right; }
    hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    .tot { font-size: 14px; font-weight: bold; }
    .foot { text-align: center; font-size: 11px; margin-top: 10px; }
  </style></head><body>
    <h2>${escapeHtml(d.shopName)}</h2>
    ${head ? `<div class="muted">${head}</div>` : ''}
    <div class="muted">Chek #${escapeHtml(d.receiptNo)}<br>${escapeHtml(d.dateTime)}${
      d.cashier ? `<br>Kassir: ${escapeHtml(d.cashier)}` : ''
    }${d.tableName ? `<br>${escapeHtml(d.tableName)}` : ''}</div>
    <hr>
    <table><tr><td><b>Tovar</b></td><td class="c"><b>Soni</b></td><td class="r"><b>Summa</b></td></tr>${rows}</table>
    <hr>
    <table>
      <tr><td>Oraliq:</td><td class="r">${money(d.subtotal)}</td></tr>
      ${d.discount > 0 ? `<tr><td>Chegirma:</td><td class="r">-${money(d.discount)}</td></tr>` : ''}
      <tr class="tot"><td>JAMI:</td><td class="r">${money(d.total)} so‘m</td></tr>
      ${d.provider ? `<tr><td>To‘lov:</td><td class="r">${d.provider === 'CASH' ? 'Naqd' : d.provider === 'CARD' ? 'Karta' : d.provider}</td></tr>` : ''}
      ${d.paid !== undefined ? `<tr><td>Berildi:</td><td class="r">${money(d.paid)}</td></tr>` : ''}
      ${d.change !== undefined && d.change > 0 ? `<tr><td>Qaytim:</td><td class="r">${money(d.change)}</td></tr>` : ''}
    </table>
    <hr>
    <div class="foot">${escapeHtml(d.footer ?? 'Xaridingiz uchun rahmat!')}</div>
    <script>window.onload=function(){window.print();setTimeout(function(){window.close()},300)}</script>
  </body></html>`;

  const w = window.open('', '_blank', 'width=320,height=600');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
}
