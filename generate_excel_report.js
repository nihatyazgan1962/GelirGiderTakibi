const fs = require('fs');
const path = require('path');

// 2026 Eylül KK Örnek Verileri (Görsellerdeki birebir veriler)
const sampleTxs = [
  { id: '1', type: 'gider', title: 'K.KARTI', amount: 4310, date: '2026-09-04', note: 'Kango yakıt' },
  { id: '2', type: 'gider', title: 'K.KARTI', amount: 53.98, date: '2026-09-05', note: 'Onur kahvaltı' },
  { id: '3', type: 'gider', title: 'K.KARTI', amount: 893, date: '2026-09-05', note: 'Onur kahvaltı' },
  { id: '4', type: 'gider', title: 'K.KARTI', amount: 76.24, date: '2026-09-05', note: 'Onur kahvaltı' },
  { id: '5', type: 'gider', title: 'K.KARTI', amount: 300, date: '2026-09-06', note: 'Onur kahvaltı' },
  { id: '6', type: 'gider', title: 'K.KARTI', amount: 775.13, date: '2026-09-08', note: 'P. Konak tamır' },
  { id: '7', type: 'gider', title: 'K.KARTI', amount: 3010, date: '2026-09-10', note: 'B. Konak havlu' },
  { id: '8', type: 'gider', title: 'K.KARTI', amount: 525, date: '2026-09-11', note: 'Dus hortomu' },
  { id: '9', type: 'gider', title: 'K.KARTI', amount: 43.73, date: '2026-09-12', note: 'Onur kahvaltı' },
  { id: '10', type: 'gider', title: 'K.KARTI', amount: 1245.42, date: '2026-09-12', note: 'Onur kahvaltı' },
  { id: '11', type: 'gider', title: 'K.KARTI', amount: 750, date: '2026-09-13', note: 'Onur kahvaltı' },
  { id: '12', type: 'gider', title: 'K.KARTI', amount: 195, date: '2026-09-13', note: 'Onur kahvaltı' },
  { id: '13', type: 'gider', title: 'K.KARTI', amount: 518, date: '2026-09-18', note: 'B. Konak deterjan' },
  { id: '14', type: 'gider', title: 'K.KARTI', amount: 173.35, date: '2026-09-19', note: 'Onur kahvaltı' },
  { id: '15', type: 'gider', title: 'K.KARTI', amount: 856, date: '2026-09-19', note: 'Onur kahvaltı' },
  { id: '16', type: 'gider', title: 'K.KARTI', amount: 751.75, date: '2026-09-25', note: 'Telefon faturam' },
  { id: '17', type: 'gider', title: 'K.KARTI', amount: 3557.45, date: '2026-09-25', note: 'B. Konak temizlik' },
  { id: '18', type: 'gider', title: 'K.KARTI', amount: 1875, date: '2026-09-25', note: 'B. Konak Bardak vesaire' },
];

const MONTHS_TR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
function formatReportDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}`;
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateExcelXml(transactions) {
  const cur = 'TL';
  const incomeTxs = transactions.filter(t => t.type === 'gelir');
  const expenseTxs = transactions.filter(t => t.type === 'gider');

  const totalIncome = incomeTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const totalExpense = expenseTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const balance = totalIncome - totalExpense;

  const renderXmlRows = (txList) => {
    return txList.map(t => {
      const turLabel = escapeXml(t.title || 'K.KARTI');
      const dateStr = escapeXml(formatReportDate(t.date));
      const amt = parseFloat(t.amount) || 0;
      const noteStr = escapeXml(t.note || '');
      return `
   <Row>
    <Cell><Data ss:Type="String">${turLabel}</Data></Cell>
    <Cell><Data ss:Type="Number">${amt}</Data></Cell>
    <Cell><Data ss:Type="String">${dateStr}</Data></Cell>
    <Cell><Data ss:Type="String">${noteStr}</Data></Cell>
   </Row>`;
    }).join('');
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:CharSet="162" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="HeaderBold">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#000000"/>
  </Style>
 </Styles>

 <!-- 1. SAYFA: Bakiye -->
 <Worksheet ss:Name="Bakiye">
  <Table>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Column ss:Width="110"/>
   <Row ss:StyleID="HeaderBold">
    <Cell><Data ss:Type="String">Gelir (${cur})</Data></Cell>
    <Cell><Data ss:Type="String">Gider (${cur})</Data></Cell>
    <Cell><Data ss:Type="String">Bakiye (${cur})</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="Number">${totalIncome}</Data></Cell>
    <Cell><Data ss:Type="Number">${totalExpense}</Data></Cell>
    <Cell><Data ss:Type="Number">${balance}</Data></Cell>
   </Row>
  </Table>
 </Worksheet>

 <!-- 2. SAYFA: Gelir Tablosu -->
 <Worksheet ss:Name="Gelir Tablosu">
  <Table>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="110"/>
   <Column ss:Width="220"/>
   <Row ss:StyleID="HeaderBold">
    <Cell><Data ss:Type="String">Tür</Data></Cell>
    <Cell><Data ss:Type="String">Miktar (${cur})</Data></Cell>
    <Cell><Data ss:Type="String">Tarih</Data></Cell>
    <Cell><Data ss:Type="String">Not</Data></Cell>
   </Row>${renderXmlRows(incomeTxs)}
  </Table>
 </Worksheet>

 <!-- 3. SAYFA: Gider Tablosu -->
 <Worksheet ss:Name="Gider Tablosu">
  <Table>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="110"/>
   <Column ss:Width="220"/>
   <Row ss:StyleID="HeaderBold">
    <Cell><Data ss:Type="String">Tür</Data></Cell>
    <Cell><Data ss:Type="String">Miktar (${cur})</Data></Cell>
    <Cell><Data ss:Type="String">Tarih</Data></Cell>
    <Cell><Data ss:Type="String">Not</Data></Cell>
   </Row>${renderXmlRows(expenseTxs)}
  </Table>
 </Worksheet>
</Workbook>`;
}

const xml = generateExcelXml(sampleTxs);
const outPath = path.join(__dirname, '2026 EYLÜL KK_1 Eyl 2026-26 Eyl 2026.xls');
fs.writeFileSync(outPath, xml, 'utf8');
console.log('Olusturulan Excel Dosyasi:', outPath);
