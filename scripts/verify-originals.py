from pathlib import Path
import json, hashlib
root=Path(__file__).resolve().parents[1]
for entry in json.loads((root/'docs/original-inventory.json').read_text()):
 p=root/'original-templates'/entry['file']
 assert p.exists(), f'Missing local template: {p.name}'
 assert hashlib.sha256(p.read_bytes()).hexdigest()==entry['sha256'], f'Template changed: {p.name}'
 print('UNCHANGED',p.name)

for entry in json.loads((root/'docs/legacy-source-inventory.json').read_text()):
 p=root/'reference-sources'/entry['file']
 assert p.exists(), f'Missing local source: {p.name}'
 assert hashlib.sha256(p.read_bytes()).hexdigest()==entry['sha256'], f'Legacy source changed: {p.name}'
 print('UNCHANGED',p.name)
