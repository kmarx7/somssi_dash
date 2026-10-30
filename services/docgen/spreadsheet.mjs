import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const input = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(input.template));
const sheet = wb.worksheets.getItemAt(0);
sheet.getRange('A6:J26').values = Array.from({length:21},(_,i)=> input.rows[i] ?? [i+1,'수도권(서울창경)',null,null,null,null,null,null,null,null]);
wb.recalculate();
const total = sheet.getRange('I27').values[0][0];
if (total !== input.total) throw new Error('거래 합계와 원본 수식 결과가 다릅니다');
await (await SpreadsheetFile.exportXlsx(wb)).save(input.candidate);
try {
 const preview = await wb.render({sheetName:sheet.name,range:'A1:J29',scale:1.5,format:'png'});
 await fs.writeFile(input.preview,new Uint8Array(await preview.arrayBuffer()));
} catch (error) { throw new Error('Excel 미리보기 실패: '+error.message); }
console.log(JSON.stringify({total}));
