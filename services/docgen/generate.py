"""Patch supplied OOXML packages; never rebuild official templates from scratch."""
import sys,json,hashlib,copy,zipfile,subprocess,os,re,shutil
from pathlib import Path
from lxml import etree as E
W='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
S='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
NS={'w':W,'s':S}
FILES={'meeting':'meeting_minutes.docx','activity':'activity_evidence.docx','purchase':'purchase_justification.docx','details':'fund_usage_details.xlsx'}
def digest(data):return hashlib.sha256(data).hexdigest()
def parts(path):
 with zipfile.ZipFile(path) as z:return {n:z.read(n) for n in z.namelist()}
def write_package(original,target,edits):
 with zipfile.ZipFile(original) as src,zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as dst:
  for i in src.infolist():dst.writestr(i,edits.get(i.filename,src.read(i.filename)))
 os.chmod(target,0o600)
 before,after=parts(original),parts(target)
 assert before.keys()==after.keys(),'원본 패키지 파트가 변경됨'
 assert all(before[n]==after[n] for n in before if n not in edits),'편집 외 파트 변경'
def text(el):return ''.join(el.xpath('.//w:t/text()',namespaces=NS))
def fill_p(p,value):
 prop=copy.deepcopy(p.find('w:pPr',NS));visible=[r for r in p.findall('w:r',NS) if text(r).strip()];runprop=(visible[0].find('w:rPr',NS) if visible else p.find('.//w:rPr',NS));runprop=copy.deepcopy(runprop)
 for c in list(p):p.remove(c)
 if prop is not None:p.append(prop)
 run=E.SubElement(p,'{'+W+'}r')
 if runprop is not None:run.append(runprop)
 for i,line in enumerate(str(value).split('\n')):
  if i:E.SubElement(run,'{'+W+'}br')
  t=E.SubElement(run,'{'+W+'}t');t.set('{http://www.w3.org/XML/1998/namespace}space','preserve');t.text=line

def fill_cell(c,value):
 ps=c.findall('w:p',NS)
 if not ps:ps=[E.SubElement(c,'{'+W+'}p')]
 fill_p(ps[0],value)
 for p in ps[1:]:fill_p(p,'')
def row(t,n):return t.findall('w:tr',NS)[n].findall('w:tc',NS)
def shape(root):
 return [E.tostring(x) for x in root.xpath('.//w:sectPr|.//w:tblGrid|.//w:trPr|.//w:tcPr',namespaces=NS)]
def day(d):return (d or '날짜 확인 필요').replace('-','.')
def value(p,k):return p.get(k) or '확인 필요'
def currency(n):return f'{n:,}원'
def meeting_number(p):
 if p.get('meetingNumber'):return int(p['meetingNumber'])
 match=re.search(r'제(\d+)차',p.get('title',''))
 return int(match.group(1)) if match else None

def append_meeting_details(root,p,prior,amount):
 # Add an explicitly labelled attachment after the intact original form.
 body=root.find('w:body',NS);section=body.find('w:sectPr',NS)
 def paragraph(value,bold=False,first=False):
  node=E.Element('{'+W+'}p');prop=E.SubElement(node,'{'+W+'}pPr')
  E.SubElement(prop,'{'+W+'}ind',{'{'+W+'}left':'1080','{'+W+'}right':'1080'})
  E.SubElement(prop,'{'+W+'}spacing',{'{'+W+'}after':'70','{'+W+'}line':'260','{'+W+'}lineRule':'auto'})
  if bold:E.SubElement(prop,'{'+W+'}keepNext')
  run=E.SubElement(node,'{'+W+'}r');rp=E.SubElement(run,'{'+W+'}rPr')
  E.SubElement(rp,'{'+W+'}rFonts',{'{'+W+'}ascii':'맑은 고딕','{'+W+'}eastAsia':'맑은 고딕','{'+W+'}hAnsi':'맑은 고딕'})
  E.SubElement(rp,'{'+W+'}sz',{'{'+W+'}val':'28' if first else '22'})
  if bold:E.SubElement(rp,'{'+W+'}b')
  E.SubElement(run,'{'+W+'}t').text=value
  body.insert(list(body).index(section),node)
 def section_text(title,content):
  paragraph(title,True)
  for line in str(content or '확인 필요').splitlines():
   if line.strip():paragraph(line.strip())
 spacer=E.Element('{'+W+'}p');sp=E.SubElement(spacer,'{'+W+'}pPr');E.SubElement(sp,'{'+W+'}pageBreakBefore');E.SubElement(sp,'{'+W+'}spacing',{'{'+W+'}line':'800','{'+W+'}lineRule':'exact'})
 E.SubElement(E.SubElement(spacer,'{'+W+'}r'),'{'+W+'}t').text=' '
 body.insert(list(body).index(section),spacer)
 number=meeting_number(p)
 paragraph(f'별첨 제{number}차 회의 상세 기록' if number else '별첨 회의 상세 기록',True,True)
 paragraph('업무 기록을 근거로 작성한 검토용 초안입니다. 실제 회의 발언·의결·참석자 확인과 구분합니다.')
 paragraph('회의일 '+day(p.get('date'))+' / 참석자 '+value(p,'attendees'))
 if prior:
  q=prior['payload'];section_text('이전 회의 후속 확인','이전 회의: '+day(q.get('date'))+' / '+q['title'])
  section_text('이전 초안의 검토 과제',q.get('decisions'))
  section_text('이후 기록에서 확인된 내용과 미확인 사항',p.get('previousReview'))
 elif p.get('previousReview'):section_text('이전 회의 후 확인사항',p['previousReview'])
 section_text('업무 기록 및 세부 검토안',p.get('content'))
 section_text('후속 실행안 및 확정이 필요한 사항',p.get('decisions'))
 section_text('지출 및 증빙 대조',f'선택한 회의비 영수증 합계 {currency(amount)}. 영수증은 결제 사실의 근거이며 참석자·회의 목적·집행 적격성은 별도 확인이 필요합니다.')
 section_text('작성 근거',p.get('source'))
 return [''.join(x.split()) for x in [p.get('content'),p.get('decisions'),p.get('previousReview')] if x]

def generate_doc(template,out,p,expenses,estimate,seq,prior=None):
 data=parts(template);root=E.fromstring(data['word/document.xml']);baseline=shape(root);ts=root.findall('.//w:tbl',NS);main=ts[3]
 warnings=[]
 kind=p['template'];dates=day(p.get('date'))
 period=f"{p['startTime']}~{p['endTime']}" if p.get('startTime') and p.get('endTime') else '시간 확인 필요'
 for key,label in [('purpose','목적'),('date','날짜'),('venue','장소')]:
  if not p.get(key) or '확인 필요' in str(p.get(key)):warnings.append(label+' 확인 필요')
 amount=sum(e['payload']['amountWon'] for e in expenses)
 if kind=='meeting':
  fill_cell(row(main,0)[1],str(meeting_number(p) or '확인 필요'));fill_cell(row(main,0)[3],dates+'\n'+period);fill_cell(row(main,0)[5],value(p,'venue'))
  fill_cell(row(main,1)[1],value(p,'purpose'))
  c=row(main,2)[1];ps=c.findall('w:p',NS)
  if len(ps)<5 or not text(ps[2]).lstrip().startswith('※'):raise ValueError('회의 내용 원본 슬롯 구조 불일치')
  detailed=len(str(p.get('content') or ''))>100 or bool(p.get('previousReview'))
  fill_p(ps[0],'상세내용 별첨 참조\n결정 확인 필요' if detailed else value(p,'content')+'\n결정: '+value(p,'decisions'))
  fill_p(ps[1],'참석자: '+value(p,'attendees')+f' / 영수증 {currency(amount)} ({p["receiptStatus"]})')
  # Paragraphs2~4 are the original policy, including a separate continuation line.
  fill_cell(row(main,3)[1],'회의 현장사진 확인 필요 (영수증은 별도 증빙)')
  for n in [5,6]:
   for c in row(main,n):fill_cell(c,'성명 확인 필요 (서명)' if n==5 else '(추가 참석자 해당 시 서명)')
  warnings+=['실제 참석자·시간·논의·결정 확인','회의 현장사진·본인 서명 필요']
 elif kind=='activity':
  fill_cell(row(main,0)[1],str(seq));fill_cell(row(main,0)[3],value(p,'purpose'))
  fill_cell(row(main,1)[1],dates+'\n'+period);fill_cell(row(main,1)[3],value(p,'venue'))
  fill_cell(row(main,2)[1],f'총 집행 금액 : {amount:,} 원\n집행 적격성·회의 연계 검토 필요')
  nested=ts[4]
  if len(expenses)>3:raise ValueError('활동비 원본 3행 용량 초과: 분리 작성 필요')
  for i in range(3):
   vals=['','','','']
   if i<len(expenses):
    q=expenses[i]['payload'];detail='주차료 (비목 확인)' if '주차' in q['title'] else q['title'].split(' (')[0];vals=[q['category'],day(q['spentAt']),detail,f'{q["amountWon"]:,}']
   for c,v in zip(row(nested,i+1),vals):fill_cell(c,v)
  fill_cell(row(main,3)[1],'활동 현장사진 확인 필요 (영수증 PDF 별도 첨부)')
  warnings+=['활동 목적·실제 장소·현장사진 확인','활동비 세부 비목/집행 적격성 운영기관 확인']
 elif kind=='purchase':
  for c,k in [(row(main,0)[1],'applicant'),(row(main,0)[3],'institution'),(row(main,1)[1],'birthDate'),(row(main,1)[3],'phone'),(row(main,2)[1],'idea')]:fill_cell(c,value(p,k))
  q=ts[4];fill_cell(row(q,0)[1],value(p,'itemName'))
  quoted=estimate['payload']['amountWon'] if estimate else None
  fill_cell(row(q,0)[3],currency(amount) if expenses else (f'{quoted:,}원\n결제 확인 필요' if quoted is not None else '확인 필요'))
  fill_cell(row(q,1)[1],value(p,'content'));fill_cell(row(q,2)[1],'물품 실물사진 2장 확인 필요')
  fill_cell(row(ts[5],0)[0],value(p,'rentalReason'))
  # Preserve original address/footer and empty personal signature slot.
  warnings+=['실제 결제·물품 사진2장·임차 불가 근거·서명 확인','거래명세표는 결제 증빙과 구분']
 if p.get('photoIds'):warnings.append('선택 사진은 별도 증빙으로 보관: 원본 사진 칸에 수동 삽입 필요')
 if kind=='meeting' and detailed:append_meeting_details(root,p,prior,amount)
 assert shape(root)==baseline,'표/병합/행/페이지 구조 변경'
 write_package(template,out,{'word/document.xml':E.tostring(root,xml_declaration=True,encoding='UTF-8',standalone=True)})
 return warnings

def patch_xlsx(template,candidate,target,total):
 before=parts(template);after=parts(candidate);root=E.fromstring(before['xl/worksheets/sheet1.xml']);other=E.fromstring(after['xl/worksheets/sheet1.xml'])
 strings=[]
 if 'xl/sharedStrings.xml' in after:
  strings=[''.join(x.itertext()) for x in E.fromstring(after['xl/sharedStrings.xml'])]
 targets={c.get('r'):c for c in root.findall('.//s:c',NS)}
 source={c.get('r'):c for c in other.findall('.//s:c',NS)}
 for rn in range(6,27):
  for col in 'ABCDEFGHIJ':
   key=f'{col}{rn}';old=targets[key];new=source.get(key)
   for c in list(old):old.remove(c)
   old.attrib.pop('t',None)
   if new is None:continue
   typ=new.get('t');v=new.find('s:v',NS)
   if typ=='s' and v is not None:
    old.set('t','inlineStr');t=E.SubElement(E.SubElement(old,'{'+S+'}is'),'{'+S+'}t');t.text=strings[int(v.text)]
   elif typ=='inlineStr':old.set('t','inlineStr');old.append(copy.deepcopy(new.find('s:is',NS)))
   else:
    if typ:old.set('t',typ)
    for c in new:old.append(copy.deepcopy(c))
 totalcell=targets['I27'];assert totalcell.find('s:f',NS).text=='SUM(I6:I26)'
 v=totalcell.find('s:v',NS)
 if v is None:v=E.SubElement(totalcell,'{'+S+'}v')
 v.text=str(total)
 for tag in ['mergeCells','dataValidations','cols','sheetFormatPr','pageMargins','pageSetup','printOptions']:
  a=E.fromstring(before['xl/worksheets/sheet1.xml']).find('s:'+tag,NS);b=root.find('s:'+tag,NS)
  assert (E.tostring(a) if a is not None else None)==(E.tostring(b) if b is not None else None),tag+' 변경'
 write_package(template,target,{'xl/worksheets/sheet1.xml':E.tostring(root,xml_declaration=True,encoding='UTF-8',standalone=True)})

def main():
 inp=json.loads(Path(sys.argv[1]).read_text());cfg=json.loads(Path(sys.argv[2]).read_text());out=Path(inp['outputDir']);templates=Path(inp['templatesDir'])
 refs={r['id']:r for r in inp['records']};template_manifest=json.loads((templates/'manifest.json').read_text());outputs=[];allwarnings=[];sequences={}
 env=os.environ.copy();env['PATH']=str(Path(cfg['python']).parent)+os.pathsep+cfg['runtimeBin']+os.pathsep+env.get('PATH','')
 if cfg.get('fontConfig'):env['FONTCONFIG_FILE']=cfg['fontConfig']
 for seq,did in enumerate(inp['draftIds'],1):
  rec=refs[did];p=rec['payload'];kind=p['template'];sequences[kind]=sequences.get(kind,0)+1;seq=sequences[kind];template=templates/FILES[kind]
  assert digest(template.read_bytes())==template_manifest[FILES[kind]]['sha256'],'원본 해시 불일치'
  expenses=[refs[i] for i in p['expenseIds']]
  if any(e['kind']!='expenses' or e['payload']['fund']!='1r' for e in expenses):raise ValueError('1R 실제 지출만 선택하세요')
  chosen={e['id'] for e in expenses}
  if any(e['payload'].get('correctionOfId') and e['payload']['correctionOfId'] not in chosen for e in expenses):raise ValueError('정정과 원거래를 함께 선택하세요')
  name=f"{kind}_{(p.get('date') or 'undated').replace('-','')}_{did}";extension='xlsx' if kind=='details' else 'docx';target=out/f'{name}.{extension}';pages=None
  if kind=='details':
   if len(expenses)>21:raise ValueError('원본 Excel21행 용량 초과')
   rows=[]
   for i,e in enumerate(expenses,1):
    q=e['payload'];vendor=q['vendor'];short_vendor=vendor if len(vendor)<=6 else vendor[:5]+'…'
    receipt=re.search(r'PDF p(\d+)',str(q.get('source','')))
    note=('PDF p'+receipt.group(1) if receipt else '영수증')+' · 연계 검토'
    if short_vendor!=vendor:note=vendor
    rows.append([i,'수도권(서울창경)',p.get('applicant') or '확인 필요','활동비' if q['category']!='소모품비' else '시제품제작',q['category'],q['title'].split(' (')[0],short_vendor,day(q['spentAt']),q['amountWon'],note])
   candidate=out/(name+'.candidate.xlsx');spec=out/(name+'.input.json');preview=out/(name+'.png')
   spec.write_text(json.dumps({'template':str(template),'candidate':str(candidate),'preview':str(preview),'rows':rows,'total':sum(e['payload']['amountWon'] for e in expenses)},ensure_ascii=False))
   runner=out.parent.parent/'spreadsheet-runtime.mjs';shutil.copyfile(Path(__file__).with_name('spreadsheet.mjs'),runner)
   link=runner.parent/'node_modules'
   if not link.exists():link.symlink_to(cfg['artifactModules'],target_is_directory=True)
   subprocess.run([cfg['node'],str(runner),str(spec)],check=True,capture_output=True,timeout=90,env=env)
   total=sum(e['payload']['amountWon'] for e in expenses);patch_xlsx(template,candidate,target,total);candidate.unlink();spec.unlink();warnings=['집행 적격성·개인정보·증빙/회의 연계 검토 필요']
  else:
   warnings=generate_doc(template,target,p,expenses,refs.get(p.get('estimateId')),seq,refs.get(p.get('previousDraftId')))
   render=out/(name+'-render')
   subprocess.run([cfg['python'],cfg['renderer'],str(target),'--output_dir',str(render),'--emit_pdf'],check=True,capture_output=True,timeout=90,env=env)
   pages=len(list(render.glob('page-*.png')))
   detailed=kind=='meeting' and (len(str(p.get('content') or ''))>100 or bool(p.get('previousReview')))
   if not (2<=pages<=4 if detailed else pages==1):raise ValueError(f'원본 및 별첨 결과{pages}쪽: 입력을 줄이거나 별도 문서로 분리하세요')
   visible_text=''.join(__import__('pypdf').PdfReader(next(render.glob('*.pdf'))).pages[0].extract_text().split())
   if kind=='meeting' and not all(x in visible_text for x in ['10,000','30,000','주류']):raise ValueError('회의록 고정 영역에서 안내문이 가려졌습니다. 본문을 줄여 주세요')
   if detailed:
    alltext=''.join(''.join(pg.extract_text().split()) for pg in __import__('pypdf').PdfReader(next(render.glob('*.pdf'))).pages[1:])
    for key in ['content','decisions','previousReview']:
     if p.get(key) and ''.join(p[key].split()) not in alltext:raise ValueError('상세 기록이 렌더에서 누락되었습니다: '+key)
   if kind in ('meeting','activity') and p.get('purpose') and ''.join(p['purpose'].split()) not in visible_text:raise ValueError('목적 칸의 글자가 가려졌습니다. 입력을 짧게 줄여 주세요')
  labels={'meeting':'회의록','activity':'활동비_증빙','purchase':'물품_구매_사유서','details':'창업활동자금_세부내역'}
  number=meeting_number(p) if kind=='meeting' else None
  download_name='SOMSSI_'+labels[kind]+(f'_제{number}차' if number else '')+'_'+(p.get('date') or '날짜미입력')+'.'+extension
  outputs.append({'downloadName':download_name,'filename':target.name,'title':p['title'],'sha256':digest(target.read_bytes()),'size':target.stat().st_size,'pages':pages,'warnings':warnings,'templateSha256':digest(template.read_bytes())});allwarnings.extend(warnings)
 # Keep the supplied receipt PDF separate from field/photo evidence.
 receipt=templates/'receipts.pdf'
 if receipt.exists():
  assert digest(receipt.read_bytes())==template_manifest['receipts.pdf']['sha256'],'영수증 원본 해시 불일치'
  dest=out/'receipt_source.pdf';shutil.copyfile(receipt,dest);os.chmod(dest,0o600)
  outputs.append({'downloadName':'SOMSSI_영수증_원본.pdf','filename':dest.name,'title':'사용자 제공 영수증 원본','sha256':digest(dest.read_bytes()),'size':dest.stat().st_size,'pages':len(__import__('pypdf').PdfReader(receipt).pages),'warnings':['PDF내 중복 영수증을 중복 청구하지 않음']})
 checklist=out/'review_checklist.txt';checklist.write_text('제출 전 확인사항\n'+'\n'.join(sorted(set(allwarnings)))+'\n공식 제출/정산 승인 완료를 의미하지 않습니다.\n');os.chmod(checklist,0o600)
 archive=out/'SOMSSI_documents.zip'
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
  for item in outputs:z.write(out/item['filename'],item['downloadName'])
  z.write(checklist,'제출전_확인사항.txt')
 os.chmod(archive,0o600);outputs.append({'downloadName':'SOMSSI_작성서류_전체.zip','filename':archive.name,'title':'전체 작성 서류 묶음','sha256':digest(archive.read_bytes()),'size':archive.stat().st_size,'pages':None,'warnings':['입력 누락·현장사진·서명 확인 후 제출']})
 manifest={'status':'검토 필요','files':outputs,'warnings':sorted(set(allwarnings)),'structurePreserved':True,'rendered':True,'layoutTextChecked':True}
 (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2));os.chmod(out/'manifest.json',0o600)
 print(json.dumps({'files':len(outputs),'status':'검토 필요'}))
if __name__=='__main__':main()
