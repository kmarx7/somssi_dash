"""Read-only OOXML inventory. Never saves/repackages an Office file."""
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as E
import hashlib, json, shutil
ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('/Users/kapital/Downloads')
FILES = {
 'activity_evidence.docx': '02_활동비 증빙 양식.docx',
 'meeting_minutes.docx': '03_회의록 양식.docx',
 'purchase_justification.docx': '04_물품 구매 사유서.docx',
 'team_participation.docx': '05_팀원 참여 확인서.docx',
 'fund_usage_details.xlsx': '[첨부3] 2기 창업활동자금 세부내역 엑셀.xlsx',
}
W={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
S={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
records=[]
for target, name in FILES.items():
 p=SOURCE/name
 dst=ROOT/'original-templates'/target
 shutil.copyfile(p,dst)
 digest=hashlib.sha256(p.read_bytes()).hexdigest()
 assert digest==hashlib.sha256(dst.read_bytes()).hexdigest()
 r={'file':target,'source_name':name,'sha256':digest,'bytes':p.stat().st_size}
 with ZipFile(p) as z:
  r['package_parts']=len(z.namelist())
  if p.suffix=='.docx':
   xml=E.fromstring(z.read('word/document.xml'))
   r['tables']=[]
   for ti,t in enumerate(xml.findall('.//w:tbl',W)):
    rows=[]
    for ri,row in enumerate(t.findall('w:tr',W)):
     rows.append({'row':ri,'cells':[{'cell':ci,'text':''.join(t.text or '' for t in c.findall('.//w:t',W)), 'gridSpan':[v.attrib for v in c.findall('w:tcPr/w:gridSpan',W)],'vMerge':[v.attrib for v in c.findall('w:tcPr/w:vMerge',W)]} for ci,c in enumerate(row.findall('w:tc',W))]})
    r['tables'].append({'index':ti,'rows':rows})
   r['section_properties']=[E.tostring(v,encoding='unicode') for v in xml.findall('.//w:sectPr',W)]
  else:
   wb=E.fromstring(z.read('xl/workbook.xml'))
   r['sheets']=[v.attrib for v in wb.findall('s:sheets/s:sheet',S)]
   r['defined_names']=[{'attributes':v.attrib,'value':v.text} for v in wb.findall('s:definedNames/s:definedName',S)]
   strings=[]
   if 'xl/sharedStrings.xml' in z.namelist():
    strings=[''.join(t.text or '' for t in si.findall('.//s:t',S)) for si in E.fromstring(z.read('xl/sharedStrings.xml'))]
   r['worksheets']=[]
   for n in z.namelist():
    if n.startswith('xl/worksheets/sheet') and n.endswith('.xml'):
     xml=E.fromstring(z.read(n)); cells=[]
     for c in xml.findall('.//s:sheetData/s:row/s:c',S):
      v=c.find('s:v',S); f=c.find('s:f',S)
      value=v.text if v is not None else ''.join(t.text or '' for t in c.findall('.//s:t',S))
      if c.get('t')=='s' and value: value=strings[int(value)]
      if value or f is not None: cells.append({'address':c.get('r'),'style':c.get('s'),'value':value,'formula':f.text if f is not None else None})
     r['worksheets'].append({'part':n,'cells':cells,'merges':[v.get('ref') for v in xml.findall('s:mergeCells/s:mergeCell',S)],'page_setup':[v.attrib for v in xml.findall('s:pageSetup',S)],'validations':[v.attrib for v in xml.findall('s:dataValidations/s:dataValidation',S)]})
 records.append(r)
(ROOT/'docs'/'original-inventory.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
for r in records:
 print(r['file'],r['sha256'],f"tables={len(r.get('tables',[]))}",f"sheets={len(r.get('sheets',[]))}")
 if 'tables' in r:
  for t in r['tables']:
   for row in t['rows']: print(t['index'],row['row'],[(c['cell'],c['text'][:140]) for c in row['cells']])
 else:
  for s in r['worksheets']:
   print(s['part'],'merges',s['merges'])
   for c in s['cells']: print(c['address'],c['value'],c['formula'])
