#!/usr/bin/env python3
"""Build one auditable MYS dataset from an explicit manifest of local snapshots. No network."""
from pathlib import Path
import argparse,hashlib,json,sys
from stats_html import parse_snapshot

def combine(manifest_path):
    manifest_path=Path(manifest_path).resolve();base=manifest_path.parent
    data=json.loads(manifest_path.read_text(encoding='utf-8'))
    entries=data.get('snapshots') if isinstance(data,dict) else None
    if not isinstance(entries,list) or not entries:raise ValueError('Manifest requiere snapshots no vacío')
    if len(entries)>1000:raise ValueError('Máximo1000 snapshots por lote')
    scopes=[];warnings=[];provenance=[];seen_files=set();seen_scopes=set()
    for i,item in enumerate(entries,1):
        if not isinstance(item,dict):raise ValueError(f'Entrada{i}: debe ser objeto')
        filename=item.get('file');tipster=item.get('tipster');at=item.get('asOf');url=item.get('url')
        if not isinstance(filename,str) or not filename:raise ValueError(f'Entrada{i}: file obligatorio')
        file=(base/filename).resolve()
        if not file.is_relative_to(base) or file.suffix.lower() not in {'.html','.htm'}:raise ValueError(f'Entrada{i}: solo HTML dentro de la carpeta del manifest')
        if file in seen_files:raise ValueError(f'Entrada{i}: archivo duplicado')
        seen_files.add(file)
        if file.stat().st_size>20_000_000:raise ValueError(f'Entrada{i}: HTML supera20 MB')
        raw=file.read_bytes();digest=hashlib.sha256(raw).hexdigest()
        expected=item.get('sha256')
        if expected and (not isinstance(expected,str) or expected.lower()!=digest):raise ValueError(f'Entrada{i}: SHA256 no coincide')
        if not isinstance(tipster,str) or not isinstance(at,str):raise ValueError(f'Entrada{i}: tipster y asOf obligatorios')
        result=parse_snapshot(raw.decode('utf-8'),tipster,at,url)
        for scope in result['scopes']:
            key=(scope['tipster'],scope['scope'],scope['access'])
            if key in seen_scopes:raise ValueError(f'Entrada{i}: muestra repetida en lote; elige un único snapshot por tipster/muestra/acceso')
            seen_scopes.add(key)
            scope['snapshotSHA256']=digest
            scope['source']='Snapshot local SHA256 '+digest+'; '+scope['source']
            scopes.append(scope)
        warnings.extend(f"{tipster}: {w}" for w in result['warnings'])
        provenance.append({'tipster':tipster,'asOf':at,'url':result['scopes'][0].get('url'),'sha256':digest,'samples':len(result['scopes'])})
    return {'format':'mys-scopes-v1','scopes':scopes,'warnings':warnings+['Los hashes identifican los archivos aportados, no autentican su origen ni acreditan acceso actual.'],'provenance':provenance}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('manifest',type=Path);p.add_argument('--out',required=True,type=Path);a=p.parse_args()
    try:
        result=combine(a.manifest)
        if a.out.resolve()==a.manifest.resolve() or a.out.suffix.lower()!='.json':raise ValueError('La salida debe ser JSON distinto del manifest y de los snapshots')
        if a.out.exists():raise ValueError('La salida ya existe; elige otro nombre para no reemplazar evidencia')
        # Parse all files first. A failed entry never leaves a partial report.
        a.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(f"{len(result['scopes'])} muestras de{len(result['provenance'])} snapshots. No se copió HTML al informe.")
    except (ValueError,OSError,UnicodeError) as e:print('Error: '+str(e),file=sys.stderr);return 1
    return 0
if __name__=='__main__':sys.exit(main())
