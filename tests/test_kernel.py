import ast
import copy
import hashlib
import itertools
import json
from fractions import Fraction
from pathlib import Path
import re
from types import SimpleNamespace
import pytest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'contracts/DimensionalTermKernel.py'
HELPERS = [n for n in ast.parse(SOURCE.read_text()).body if isinstance(n, (ast.Assign, ast.FunctionDef))]
COORD = 'stoneforger10/dimensional-term-kernel/' + 'a' * 40 + '/examples/units.txt'
NAMES = ['SPAN', 'BEAT', 'RATE', 'HOT', 'COLD', 'DELTA']


def namespace(gl=None):
    ns = {'hashlib': hashlib, 'json': json, 're': re, 'gl': gl}
    exec(compile(ast.Module(body=HELPERS, type_ignores=[]), str(SOURCE), 'exec'), ns)
    return ns


NS = namespace()


def row(name, dim, scale=(1, 1), offset=(0, 1), kind='LINEAR'):
    return dict(symbol=name, kind=kind, dimension=dim, scale=list(scale), offset=list(offset))


TABLE = {'units': [row('SPAN', [1, 0, 0, 0], (1, 100)), row('BEAT', [0, 1, 0, 0], (120, 1)),
    row('RATE', [1, -1, 0, 0]), row('HOT', [0, 0, 0, 1], offset=(5463, 20), kind='POINT'),
    row('COLD', [0, 0, 0, 1], kind='POINT'), row('DELTA', [0, 0, 0, 1])]}


def setup(vm, deploy, sender, nonce='main', bad=False, unknown=False):
    c = deploy(str(SOURCE))
    vm.sender = sender
    name = 'ambiguous' if unknown else 'units'
    data = (ROOT / 'examples' / (name + '.txt')).read_bytes()
    vm.mock_web(r'.*raw\.githubusercontent\.com.*', {'response': {'status': 200, 'headers': {}, 'body': data}, 'method': 'GET'})
    table = {'units': [dict(symbol=s, kind='UNKNOWN', dimension=[], scale=[], offset=[]) for s in NAMES[:2]]} if unknown else TABLE
    vm.mock_llm('.*DIMENSIONAL_TERM_V1.*', json.dumps(table))
    names = NAMES[:2] if unknown else NAMES
    root = c.interpret(nonce, COORD.replace('units.txt', name + '.txt'), 'f' * 64 if bad else hashlib.sha256(data).hexdigest(), ','.join(names))
    return c, root, c.get_module(root)


def test_source_interpretation_changes_exact_typed_results(direct_vm, direct_deploy, direct_alice):
    c, key, m = setup(direct_vm, direct_deploy, direct_alice)
    assert m['status'] == 'READY'
    assert m['report']['definitions'] == TABLE
    assert m['root'] == NS['digest']({k: v for k, v in m.items() if k != 'root'})
    speed = c.evaluate(key, m['root'], '150@SPAN 2@BEAT /', 'RATE')
    assert speed == dict(value=[1, 160], dimension=[1, -1, 0, 0], kind='LINEAR', target='RATE')
    assert c.evaluate(key, m['root'], '20@HOT 5@DELTA +', 'COLD')['value'] == [5963, 20]
    assert c.evaluate(key, m['root'], '30@HOT 20@HOT -', 'DELTA')['value'] == [10, 1]
    assert c.evaluate(key, m['root'], '5863/20@COLD', 'HOT')['value'] == [20, 1]


def test_bound_calculation_identity_replay_and_module_immutability(direct_vm, direct_deploy, direct_alice, direct_bob):
    c, key, m = setup(direct_vm, direct_deploy, direct_alice)
    calc = c.record_calculation('speed', key, m['root'], '150@SPAN 2@BEAT /', 'RATE')
    saved = c.get_calculation(calc)
    assert saved['expression'] == '150@SPAN 2@BEAT /' and saved['result']['value'] == [1, 160]
    assert saved['root'] == NS['digest']({k: v for k, v in saved.items() if k != 'root'})
    with direct_vm.expect_revert('Calculation nonce used'):
        c.record_calculation('speed', key, m['root'], '1@SPAN', 'SPAN')
    with direct_vm.expect_revert('Nonce already used'):
        c.interpret('main', COORD, m['report']['spec']['source']['sha256'], ','.join(NAMES))
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert('Definition set already examined'):
        c.interpret('new', COORD, m['report']['spec']['source']['sha256'], ','.join(NAMES))
    second = c.record_calculation('speed', key, m['root'], '1@SPAN', 'SPAN')
    assert second != calc and c.get_calculation(second)['actor'] != saved['actor']
    assert c.get_module(key) == m and c.get_calculation(calc) == saved
    with direct_vm.expect_revert('Module root mismatch'):
        c.evaluate(key, 'f' * 64, '1@SPAN', 'SPAN')
    with direct_vm.expect_revert('Unknown calculation'):
        c.get_calculation('f' * 64)


@pytest.mark.parametrize('case', ['hash', 'unknown'])
def test_failed_or_uncertain_definitions_never_usable(case, direct_vm, direct_deploy, direct_alice):
    c, key, m = setup(direct_vm, direct_deploy, direct_alice, bad=case == 'hash', unknown=case == 'unknown')
    assert m['status'] == 'HELD'
    if case == 'hash':
        assert m['report']['source']['status'] == 'HASH_MISMATCH' and m['report']['definitions'] == {'units': []}
    with direct_vm.expect_revert('Definitions held'):
        c.record_calculation('denied', key, m['root'], '1@SPAN', 'SPAN')


@pytest.mark.parametrize('expression,target,message', [
    ('20@HOT 10@HOT +', '_', 'Invalid point arithmetic'),
    ('5@DELTA 20@HOT -', '_', 'Invalid point arithmetic'),
    ('20@HOT 2@DELTA *', '_', 'Cannot multiply/divide points'),
    ('20@HOT 2@BEAT /', '_', 'Cannot multiply/divide points'),
    ('1@SPAN 1@BEAT +', '_', 'Dimension mismatch'),
    ('1@SPAN 0@BEAT /', '_', 'Invalid rational'),
    ('1@SPAN', 'BEAT', 'Target type mismatch'),
    ('1@HOT', 'DELTA', 'Target type mismatch'),
    ('1@DELTA', 'COLD', 'Target type mismatch'),
    ('1@SPAN 1@SPAN', '_', 'Incomplete expression'),
    ('+', '_', 'Stack underflow'),
    ('1@NONE', '_', 'Invalid quantity/unit'),
    ('1/0@SPAN', '_', 'Invalid quantity/unit'),
    ('1@SPAN  ', '_', 'Expression bounds/spacing'),
])
def test_type_and_grammar_rejections(expression, target, message):
    with pytest.raises(ValueError, match=re.escape(message)):
        NS['evaluate_terms'](TABLE, expression, target)


def test_exact_rational_arithmetic_against_fraction_oracle():
    for n, d, p, q in itertools.product(range(-3, 4), range(1, 5), range(-2, 3), range(1, 4)):
        a, b = [n, d], [p, q]
        for op, truth in [('add', Fraction(n, d) + Fraction(p, q)), ('mul', Fraction(n, d) * Fraction(p, q))]:
            assert NS[op](a, b) == [truth.numerator, truth.denominator]
        if p:
            truth = Fraction(n, d) / Fraction(p, q)
            assert NS['div'](a, b) == [truth.numerator, truth.denominator]


def test_semantic_coefficients_are_consequential_not_decorative():
    changed = copy.deepcopy(TABLE)
    changed['units'][0]['scale'] = [1, 50]
    assert NS['evaluate_terms'](changed, '150@SPAN 2@BEAT /', 'RATE')['value'] == [1, 80]
    assert NS['evaluate_terms'](TABLE, '150@SPAN 2@BEAT /', 'RATE')['value'] == [1, 160]


@pytest.mark.parametrize('mutation', ['boolean', 'zero_denominator', 'point_dimension', 'linear_offset', 'negative_scale', 'extra', 'unknown_coefficients'])
def test_malformed_definition_rows_rejected(mutation):
    table = copy.deepcopy(TABLE)
    r = table['units'][0]
    if mutation == 'boolean': r['scale'] = [True, 100]
    if mutation == 'zero_denominator': r['scale'] = [1, 0]
    if mutation == 'point_dimension': r['kind'] = 'POINT'
    if mutation == 'linear_offset': r['offset'] = [1, 1]
    if mutation == 'negative_scale': r['scale'] = [-1, 100]
    if mutation == 'extra': r['confidence'] = 1
    if mutation == 'unknown_coefficients': r['kind'] = 'UNKNOWN'
    with pytest.raises(ValueError): NS['definitions'](table, NAMES)


def test_canonicalization_and_duplicate_json_keys():
    raw = copy.deepcopy(TABLE)
    raw['units'][3]['offset'] = [27315, 100]
    assert NS['definitions'](raw, NAMES) == TABLE
    with pytest.raises(ValueError, match='Duplicate JSON'):
        NS['definitions']('{"units":[],"units":[]}', NAMES)
    for n, d in [(True, 1), (1, False), (1, 0), (10 ** 37, 1)]:
        with pytest.raises(ValueError): NS['rational'](n, d)


def test_independent_validator_refetches_and_rejects_material_scale_substitution():
    class Return:
        def __init__(self, calldata): self.calldata = calldata
    calls = {'web': 0, 'model': 0}
    data = (ROOT / 'examples/units.txt').read_bytes()
    spec = dict(contract='0x' + '1' * 40, policy=NS['POLICY'], source=NS['source_spec'](COORD, hashlib.sha256(data).hexdigest()), symbols=NAMES)
    def web(url):
        calls['web'] += 1
        return SimpleNamespace(status=200, body=data)
    def model(prompt, **kwargs):
        calls['model'] += 1
        assert json.dumps(data.decode(), separators=(',', ':')) in prompt
        return json.dumps(TABLE)
    def run(observe, validator):
        leader = observe()
        assert validator(Return(leader))
        forged = copy.deepcopy(leader)
        forged['definitions']['units'][0]['scale'] = [1, 50]
        assert NS['validate_report'](forged, spec)
        assert not validator(Return(forged))
        foreign = copy.deepcopy(leader)
        foreign['spec']['contract'] = 'other'
        assert not validator(Return(foreign)) and not validator(object())
        return leader
    gl = SimpleNamespace(vm=SimpleNamespace(Return=Return, run_nondet_unsafe=run, UserError=ValueError), nondet=SimpleNamespace(web=SimpleNamespace(get=web), exec_prompt=model))
    result = namespace(gl)['consensus_definitions'](spec)
    assert result['definitions'] == TABLE and calls == dict(web=3, model=3)


@pytest.mark.parametrize('body,status', [(b'', 'SIZE_ERROR'), (b'x' * 4097, 'SIZE_ERROR'), (b'\xff', 'ENCODING_ERROR')])
def test_full_bytes_no_truncation_or_lossy_decode(body, status):
    gl = SimpleNamespace(nondet=SimpleNamespace(web=SimpleNamespace(get=lambda url: SimpleNamespace(status=200, body=body))))
    ns = namespace(gl)
    spec = NS['source_spec'](COORD, hashlib.sha256(body).hexdigest())
    fetched = ns['fetch_source'](spec)
    assert fetched['status'] == status and not ns['source_ok'](spec, fetched)


@pytest.mark.parametrize('coordinate', [COORD.replace('a' * 40, 'main'), COORD.replace('examples/', '../'), COORD.replace('units.txt', 'units.txt?x=1'), 'http://localhost'])
def test_unsafe_coordinates_rejected(coordinate):
    with pytest.raises(ValueError): NS['source_spec'](coordinate, 'a' * 64)


def test_per_principal_storage_caps(direct_vm, direct_deploy, direct_alice):
    c, key, m = setup(direct_vm, direct_deploy, direct_alice)
    for i in range(64):
        c.record_calculation('n' + str(i), key, m['root'], '1@SPAN', 'SPAN')
    with direct_vm.expect_revert('Calculation limit'):
        c.record_calculation('excess', key, m['root'], '1@SPAN', 'SPAN')
    for i in range(15):
        c.interpret('n' + str(i), COORD.replace('units.txt', 'units-' + str(i) + '.txt'), m['report']['spec']['source']['sha256'], ','.join(NAMES))
    with direct_vm.expect_revert('Creator limit'):
        c.interpret('excess', COORD.replace('units.txt', 'units-excess.txt'), m['report']['spec']['source']['sha256'], ','.join(NAMES))


@pytest.mark.parametrize('mutation', ['body', 'hash', 'boolean_status', 'url'])
def test_fake_evidence_is_not_a_definition_proof(mutation):
    data = (ROOT / 'examples/units.txt').read_bytes()
    spec = NS['source_spec'](COORD, hashlib.sha256(data).hexdigest())
    record = dict(url=spec['url'], http=200, status='OK', body=data.decode(), hash=spec['sha256'])
    if mutation == 'body': record['body'] += 'substituted'
    if mutation == 'hash': record['hash'] = 'f' * 64
    if mutation == 'boolean_status': record['http'] = True
    if mutation == 'url': record['url'] = 'https://other.invalid/'
    with pytest.raises(ValueError): NS['source_ok'](spec, record)


def test_malformed_model_and_post_consensus_forgery_fail_closed():
    data = (ROOT / 'examples/units.txt').read_bytes()
    spec = dict(contract='contract', policy=NS['POLICY'], source=NS['source_spec'](COORD, hashlib.sha256(data).hexdigest()), symbols=NAMES)
    gl = SimpleNamespace(vm=SimpleNamespace(UserError=ValueError, run_nondet_unsafe=lambda observe, validator: observe()),
                         nondet=SimpleNamespace(web=SimpleNamespace(get=lambda url: SimpleNamespace(status=200, body=data)), exec_prompt=lambda *a, **kw: '{}'))
    with pytest.raises(ValueError, match='LLM_ERROR'): namespace(gl)['consensus_definitions'](spec)
    gl.vm.run_nondet_unsafe = lambda *a: dict(spec={'contract': 'foreign'}, source={}, definitions=TABLE)
    with pytest.raises(ValueError, match='Report context'): namespace(gl)['consensus_definitions'](spec)
