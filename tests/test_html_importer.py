import unittest,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'importers'))
from stats_html import parse_snapshot,number

def table(kind='free',section='categories',label='Liga A',picks='100',yield_='+11%',extra=''):
 return f'<div id="{kind}-{section}-StatsTabContent"><table><thead><tr><th>Categories</th><th>Picks</th><th>Yield</th></tr></thead><tbody><tr><td><i class="sport-icon" title="Football"></i><span>{label}</span>{extra}</td><td>{picks}</td><td>{yield_}</td></tr></tbody></table></div>'
def parse(html,**kw):return parse_snapshot(html,'fixture','2026-10-30T12:00:00Z',**kw)
class Tests(unittest.TestCase):
 def test_free_exact(self):
  r=parse(table())['scopes'][0];self.assertEqual((r['picks'],r['yield'],r['access'],r['scope']),(100,11,'free','Football - Liga A'))
 def test_all_unknown_not_inferred(self):self.assertEqual(parse(table(kind='alltime'))['scopes'][0]['access'],'unknown')
 def test_paid_and_private_preserved(self):self.assertEqual([r['access'] for r in parse(table(kind='paid')+table(kind='private'))['scopes']],['paid','private'])
 def test_hidden_timestamp_ignored(self):self.assertNotIn('99999999',parse(table(extra='<span class="hidden">99999999</span>'))['scopes'][0]['scope'])
 def test_numbers(self):
  for s,v in [('1,200',1200),('11,5%',11.5),('−12%',-12),('+11.25%',11.25),('NaN',None),('',None),('1.000,2',None)]:self.assertEqual(number(s),v)
 def test_invalid_rows_not_zero(self):
  r=parse(table()+table(kind='paid',picks='NaN'));self.assertEqual(len(r['scopes']),1);self.assertTrue(r['warnings'])
 def test_no_header_fallback(self):self.assertRaises(ValueError,parse,'<div id="header-picks-val">10000</div>')
 def test_unloaded_table(self):self.assertRaises(ValueError,parse,'<div id="free-categories-StatsTabContent"></div>')
 def test_same_scope_access_duplicates(self):
  r=parse(table()+table());self.assertEqual(len(r['scopes']),1);self.assertTrue(r['warnings'])
 def test_same_name_different_sport_not_merged(self):
  r=parse(table()+table().replace('Football','Tennis'));self.assertEqual(len(r['scopes']),2)
 def test_no_arbitrary_halving_names(self):self.assertIn('Long League Name',parse(table(label='Long League Name'))['scopes'][0]['scope'])
 def test_html_entities(self):self.assertIn('A & B',parse(table(label='A &amp; B'))['scopes'][0]['scope'])
 def test_no_network_or_script_execution(self):self.assertEqual(len(parse(table()+'<script>fetch("https://example.invalid")</script>')['scopes']),1)
 def test_source_url_guard(self):self.assertRaises(ValueError,parse,table(),source_url='http://attacker.invalid/')
 def test_timestamp_timezone(self):self.assertRaises(ValueError,parse_snapshot,table(),'a','2026-10-30T12:00:00')
 def test_rounded_precision_preserved(self):
  s=parse(table(yield_='11.00%'))['scopes'][0];self.assertTrue(s['yieldIsRounded']);self.assertEqual(s['yieldDecimals'],2)
 def test_hidden_attribute_and_scripts_not_part_of_label(self):
  s=parse(table(extra='<span hidden>bad text</span><script>not a league</script>'))['scopes'][0];self.assertEqual(s['scope'],'Football - Liga A')
 def test_source_query_and_fragment_not_exported(self):
  s=parse(table(),source_url='https://fixture.blogabet.com/statistics?token=not-a-secret-fixture#free')['scopes'][0];self.assertEqual(s['url'],'https://fixture.blogabet.com/statistics')
if __name__=='__main__':unittest.main()
