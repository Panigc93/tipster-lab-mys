import unittest,sys,json,tempfile,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'importers'))
from batch_snapshots import combine
from test_html_importer import table
class BatchTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);self.html=table();(self.root/'one.html').write_text(self.html);(self.root/'two.html').write_text(table(label='Otra'));self.manifest=self.root/'manifest.json'
 def tearDown(self):self.tmp.cleanup()
 def run_manifest(self,items):
  self.manifest.write_text(json.dumps({'snapshots':items}));return combine(self.manifest)
 def item(self,**kw):return {'file':'one.html','tipster':'fixture','asOf':'2026-10-30T12:00:00Z','url':'https://fixture.blogabet.com/',**kw}
 def test_hashes_and_no_raw_html(self):
  r=self.run_manifest([self.item()]);self.assertEqual(r['provenance'][0]['sha256'],hashlib.sha256(self.html.encode()).hexdigest());self.assertNotIn('<table',json.dumps(r));self.assertIn('no autentican',r['warnings'][-1])
 def test_multiple_distinct_samples(self):self.assertEqual(len(self.run_manifest([self.item(),self.item(file='two.html')])['scopes']),2)
 def test_hash_guard(self):self.assertRaises(ValueError,self.run_manifest,[self.item(sha256='0'*64)])
 def test_file_guard(self):
  for filename in ['../escape.html','/etc/passwd','one.txt']:self.assertRaises(ValueError,self.run_manifest,[self.item(file=filename)])
 def test_duplicate_file(self):self.assertRaises(ValueError,self.run_manifest,[self.item(),self.item()])
 def test_duplicate_sample_other_snapshot_rejected(self):
  (self.root/'two.html').write_text(self.html);self.assertRaises(ValueError,self.run_manifest,[self.item(),self.item(file='two.html')])
 def test_bad_manifest(self):
  for items in [[],None,[1],[{}]]:self.assertRaises(ValueError,self.run_manifest,items)
 def test_missing_timestamp_and_bad_source_rejected(self):
  self.assertRaises(ValueError,self.run_manifest,[self.item(asOf='2026-10-30')]);self.assertRaises(ValueError,self.run_manifest,[self.item(url='http://example.invalid/')])
if __name__=='__main__':unittest.main()
