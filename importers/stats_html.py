#!/usr/bin/env python3
"""Import a saved Statistics HTML snapshot. Never authenticates or makes network calls."""
from html.parser import HTMLParser
from decimal import Decimal, InvalidOperation
from datetime import datetime
import argparse,json,re,sys
from pathlib import Path

class Element:
    def __init__(self,tag='',attrs=None,parent=None):
        self.tag=tag;self.attrs=dict(attrs or []);self.parent=parent;self.children=[]
    def find(self,predicate):
        out=[]
        for child in self.children:
            if isinstance(child,Element):
                if predicate(child):out.append(child)
                out.extend(child.find(predicate))
        return out
    def text(self):
        if 'hidden' in self.attrs.get('class','').split() or self.attrs.get('aria-hidden')=='true':return ''
        return ' '.join(' '.join(c.text() if isinstance(c,Element) else c for c in self.children).split())

class Parser(HTMLParser):
    def __init__(self):super().__init__(convert_charrefs=True);self.root=Element();self.current=self.root
    def handle_starttag(self,tag,attrs):
        e=Element(tag,attrs,self.current);self.current.children.append(e)
        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:self.current=e
    def handle_startendtag(self,tag,attrs):self.handle_starttag(tag,attrs);self.handle_endtag(tag)
    def handle_endtag(self,tag):
        node=self.current
        while node.parent:
            if node.tag==tag:self.current=node.parent;break
            node=node.parent
    def handle_data(self,text):self.current.children.append(text)

def number(value):
    value=re.sub(r'[%+\s\u00a0]','',value).replace('−','-')
    if re.fullmatch(r'-?\d{1,3}(,\d{3})+(\.\d+)?',value):value=value.replace(',','')
    elif re.fullmatch(r'-?\d+,\d+',value):value=value.replace(',','.')
    if not re.fullmatch(r'-?\d+(\.\d+)?',value):return None
    try:
        d=Decimal(value)
        return float(d) if d.is_finite() else None
    except InvalidOperation:return None

def parse_snapshot(html,tipster,as_of,source_url=None):
    if len(html)>20_000_000:raise ValueError('Snapshot HTML supera 20 MB')
    if not tipster.strip():raise ValueError('tipster no puede estar vacío')
    try:
        d=datetime.fromisoformat(as_of.replace('Z','+00:00'))
        if not d.tzinfo:raise ValueError()
    except (ValueError,TypeError):raise ValueError('as-of requiere timestamp ISO con zona (fecha de captura, no fecha inferida)')
    if source_url and not re.fullmatch(r'https://[a-zA-Z0-9_-]+\.blogabet\.com(?:/[^\s]*)?',source_url):raise ValueError('URL fuente debe ser un perfil HTTPS Blogabet')
    p=Parser();p.feed(html);scopes=[];warnings=[];seen=set()
    roots=p.root.find(lambda e:bool(re.fullmatch(r'(alltime|free|paid|private)-(categories|sports)-StatsTabContent',e.attrs.get('id',''))))
    for root in roots:
        access_type,section=root.attrs['id'].split('-',2)[:2]
        access={'free':'free','paid':'paid','private':'private','alltime':'unknown'}[access_type]
        tables=root.find(lambda e:e.tag=='table')
        if not tables:warnings.append(f"Sin tabla cargada: {root.attrs['id']}");continue
        for table in tables:
            headers=[re.sub(r'[\s_]','',e.text().lower()) for e in table.find(lambda e:e.tag=='th')]
            if 'picks' not in headers or 'yield' not in headers:
                warnings.append(f"Cabeceras no reconocidas: {root.attrs['id']}");continue
            pi,yi=headers.index('picks'),headers.index('yield')
            for tr in table.find(lambda e:e.tag=='tr'):
                cells=[c for c in tr.children if isinstance(c,Element) and c.tag=='td']
                if len(cells)<=max(pi,yi):continue
                count,y=number(cells[pi].text()),number(cells[yi].text())
                if count is None or count<0 or count!=int(count) or y is None:
                    warnings.append(f"Fila omitida por números ambiguos: {root.attrs['id']}");continue
                label=cells[0].text()
                if not label:continue
                icons=cells[0].find(lambda e:'sport-icon' in e.attrs.get('class','').split())
                sport=icons[0].attrs.get('title','').strip() if icons else ''
                leaves=cells[0].find(lambda e:e.tag in {'a','span'} and not any(isinstance(c,Element) for c in e.children) and bool(e.text()))
                labels=[e.text() for e in leaves]
                if labels and len(set(labels))==1:label=labels[0]
                scope='Deporte: '+label if section=='sports' else sport+' - '+label if sport and not label.startswith(sport) else label
                key=(scope,access)
                if key in seen:
                    warnings.append(f'Muestra duplicada omitida: {scope}/{access}');continue
                seen.add(key)
                scopes.append({'tipster':tipster.strip(),'scope':scope,'picks':int(count),'yield':y,'access':access,'source':f"Snapshot HTML {root.attrs['id']}; yield mostrado redondeado",'asOf':as_of,'url':source_url})
    if not scopes:raise ValueError('No hay tablas Statistics compatibles cargadas. No se fabrican muestras a partir del header.')
    if any(s['access']=='unknown' for s in scopes):warnings.append('ALL no demuestra gratuidad. Su acceso queda sin verificar; no se restan estadísticas redondeadas.')
    return {'format':'mys-scopes-v1','scopes':scopes,'warnings':warnings,'snapshot':True}

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('html',type=Path);ap.add_argument('--tipster',required=True);ap.add_argument('--as-of',required=True);ap.add_argument('--source-url');ap.add_argument('--out',required=True,type=Path);args=ap.parse_args()
    try:
        data=parse_snapshot(args.html.read_text(encoding='utf-8'),args.tipster,args.as_of,args.source_url);args.out.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(f"Exportadas {len(data['scopes'])} muestras; {len(data['warnings'])} advertencias.")
    except (ValueError,OSError) as e:print('Error: '+str(e),file=sys.stderr);return 1
    return 0
if __name__=='__main__':sys.exit(main())
