import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

const MONTHS_TR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

export function formatReportDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}`;
}

export function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── 1. PDF HTML RAPOR ŞABLONU (GÖRSELDEKİ BİREBİR FORMAT) ────────────────────
export function generateReportHtml({ transactions, accounts, accountLabel, startDate, endDate, currencySymbol }) {
  const startFmt = formatReportDate(startDate);
  const endFmt = formatReportDate(endDate);
  const dateRangeStr = `${startFmt}-${endFmt}`;

  const incomeTxs = transactions.filter(t => t.type === 'gelir');
  const expenseTxs = transactions.filter(t => t.type === 'gider');

  const totalIncome = incomeTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const totalExpense = expenseTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const balance = totalIncome - totalExpense;

  const cur = currencySymbol || 'TL';

  const fmtNum = (num) => {
    const val = Number(num);
    if (isNaN(val)) return '0';
    if (Number.isInteger(val)) return val.toString();
    return val.toFixed(2);
  };

  const renderRows = (txList) => {
    if (txList.length === 0) {
      return `
        <tr>
          <td style="padding: 4px 6px; border: 1px solid #000;">-</td>
          <td style="padding: 4px 6px; border: 1px solid #000;">0</td>
          <td style="padding: 4px 6px; border: 1px solid #000;">-</td>
          <td style="padding: 4px 6px; border: 1px solid #000;">Kayıt yok</td>
        </tr>
      `;
    }
    return txList.map(t => {
      const acc = accounts.find(a => a.id === t.accountId);
      const turLabel = t.title || (acc ? acc.name : '-');
      const dateStr = formatReportDate(t.date);
      const amtStr = fmtNum(t.amount);
      const noteStr = t.note || '';
      return `
        <tr>
          <td style="padding: 4px 6px; border: 1px solid #000; font-size: 13px;">${escapeXml(turLabel)}</td>
          <td style="padding: 4px 6px; border: 1px solid #000; font-size: 13px;">${amtStr}</td>
          <td style="padding: 4px 6px; border: 1px solid #000; font-size: 13px;">${dateStr}</td>
          <td style="padding: 4px 6px; border: 1px solid #000; font-size: 13px;">${escapeXml(noteStr)}</td>
        </tr>
      `;
    }).join('');
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Hesabım Raporu</title>
  <style>
    body {
      font-family: "Times New Roman", Times, serif;
      color: #000;
      background: #fff;
      padding: 18px 24px;
      margin: 0;
    }
    .header-line {
      display: flex;
      justify-content: space-between;
      border-bottom: 1.5px solid #000;
      padding-bottom: 2px;
      margin-bottom: 14px;
      font-weight: bold;
      font-size: 14px;
    }
    .header-left {
      text-decoration: underline;
    }
    .header-right {
      text-decoration: underline;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    th, td {
      border: 1px solid #000;
      padding: 4px 6px;
      text-align: left;
      font-size: 13px;
    }
    th {
      font-weight: bold;
      background-color: #fff;
    }
    .table-title {
      font-weight: bold;
      text-decoration: underline;
      margin-top: 14px;
      margin-bottom: 4px;
      font-size: 14px;
    }
  </style>
</head>
<body>

  <!-- Başlık Satırı -->
  <div class="header-line">
    <span class="header-left">Hesabım (${escapeXml(accountLabel)})</span>
    <span class="header-right">${dateRangeStr}</span>
  </div>

  <!-- Özet Tablosu -->
  <table>
    <thead>
      <tr>
        <th style="width: 33.3%;">Gelir (${cur})</th>
        <th style="width: 33.3%;">Gider (${cur})</th>
        <th style="width: 33.3%;">Bakiye (${cur})</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${fmtNum(totalIncome)}</td>
        <td>${fmtNum(totalExpense)}</td>
        <td>${fmtNum(balance)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Gelir Tablosu -->
  <div class="table-title">Gelir Tablosu</div>
  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Tür</th>
        <th style="width: 20%;">Miktar (${cur})</th>
        <th style="width: 22%;">Tarih</th>
        <th style="width: 36%;">Not</th>
      </tr>
    </thead>
    <tbody>
      ${renderRows(incomeTxs)}
    </tbody>
  </table>

  <!-- Gider Tablosu -->
  <div class="table-title">Gider Tablosu</div>
  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Tür</th>
        <th style="width: 20%;">Miktar (${cur})</th>
        <th style="width: 22%;">Tarih</th>
        <th style="width: 36%;">Not</th>
      </tr>
    </thead>
    <tbody>
      ${renderRows(expenseTxs)}
    </tbody>
  </table>

</body>
</html>
  `;
}

// ── 2. EXCEL (XLS / SPREADSHEETML) 3 SAYFALI ÇOKLU TABLO ÜRETİCİ ────────────
export function generateExcelXml({ transactions, accounts, accountLabel, startDate, endDate, currencySymbol }) {
  const cur = currencySymbol || 'TL';
  const incomeTxs = transactions.filter(t => t.type === 'gelir');
  const expenseTxs = transactions.filter(t => t.type === 'gider');

  const totalIncome = incomeTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const totalExpense = expenseTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const balance = totalIncome - totalExpense;

  const renderXmlRows = (txList) => {
    return txList.map(t => {
      const acc = accounts.find(a => a.id === t.accountId);
      const turLabel = escapeXml(t.title || (acc ? acc.name : '-'));
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

// ── DIŞA AKTARMA VE DOSYA KAYDETME YARDIMCILARI ──────────────────────────────
export async function exportReportToPdf(options) {
  try {
    const html = generateReportHtml(options);
    const file = await Print.printToFileAsync({
      html,
      base64: false
    });
    const startFmt = formatReportDate(options.startDate);
    const endFmt = formatReportDate(options.endDate);
    const safeAccountName = (options.accountLabel || 'Rapor').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ_ -]/g, '');
    const fileName = `${safeAccountName}_${startFmt}-${endFmt}.pdf`;
    const targetDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    const namedUri = `${targetDir}${fileName}`;

    await FileSystem.copyAsync({
      from: file.uri,
      to: namedUri
    });
    return namedUri;
  } catch (e) {
    console.error('PDF export error:', e);
    return null;
  }
}

export async function exportReportToExcel(options) {
  try {
    const xml = generateExcelXml(options);
    const startFmt = formatReportDate(options.startDate);
    const endFmt = formatReportDate(options.endDate);
    const safeAccountName = (options.accountLabel || 'Rapor').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ_ -]/g, '');
    const fileName = `${safeAccountName}_${startFmt}-${endFmt}.xls`;
    const targetDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    const fileUri = `${targetDir}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, xml, {
      encoding: FileSystem.EncodingType.UTF8
    });
    return fileUri;
  } catch (e) {
    console.error('Excel export error:', e);
    return null;
  }
}

export async function sharePdfFile(fileUri, dialogTitle = 'Hesabım PDF Raporu') {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle,
        UTI: 'com.adobe.pdf'
      });
      return true;
    }
    return false;
  } catch (e) {
    console.error('Sharing error:', e);
    return false;
  }
}

export async function shareExcelFile(fileUri, dialogTitle = 'Hesabım Excel Raporu (.xls)') {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.ms-excel',
        dialogTitle,
        UTI: 'com.microsoft.excel.xls'
      });
      return true;
    }
    return false;
  } catch (e) {
    console.error('Excel share error:', e);
    return false;
  }
}
