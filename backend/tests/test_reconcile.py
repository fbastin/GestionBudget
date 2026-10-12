"""reconcile.py: reading the sources, comparing with the app and applying through the API."""
import csv
import json
from datetime import date

import openpyxl
import pytest

import reconcile
from helpers import balances, create

WEALTHSIMPLE_HEADER = ['Account Name', 'Account Type', 'Account Classification', 'Account Number', 'Symbol',
                       'Market Value', 'Market Value Currency']


def write_spreadsheet(path, sheet='2026', rows=()):
    workbook = openpyxl.Workbook()
    worksheet = workbook.active
    worksheet.title = sheet
    worksheet.append(['Dettes', 'Somme'])
    for row in rows:
        worksheet.append(list(row))
    workbook.save(path)
    return path


def write_holdings(directory, day, rows):
    path = directory / f'holdings-report-{day}.csv'
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(WEALTHSIMPLE_HEADER)
        writer.writerows(rows)
        writer.writerow([f'As of {day} 16:00 GMT-04:00'])
    return path


def test_read_debts_stops_at_the_first_row_without_a_name(tmp_path):
    path = write_spreadsheet(tmp_path / 'debts.xlsx', rows=[
        ('Visa', 120.5), ('Loan', 'n/a'), ('Car', 0), (None, 999), ('After the block', 5)])
    assert reconcile.read_debts(path, '2026') == [('Visa', 120.5), ('Loan', None), ('Car', 0.0)]


def test_read_debts_with_other_columns_and_first_row(tmp_path):
    workbook = openpyxl.Workbook()
    worksheet = workbook.active
    worksheet.title = 'Debts'
    for row in (['notes'], ['title'], [None, None, 'Visa', None, 42]):
        worksheet.append(row)
    workbook.save(tmp_path / 'debts.xlsx')
    assert reconcile.read_debts(tmp_path / 'debts.xlsx', 'Debts', 'C', 'E', 3) == [('Visa', 42.0)]


def test_holdings_values_converted_to_the_base_currency(tmp_path):
    write_holdings(tmp_path, '2026-01-01', [['Old', 'TFSA', 'Trade', '1', 'X', '1', 'CAD']])
    path = write_holdings(tmp_path, '2026-02-01', [
        ['TFSA', 'TFSA', 'Trade', '1', 'XEQT', '100', 'CAD'],
        ['TFSA', 'TFSA', 'Trade', '1', 'VTI', '10', 'USD'],
        ['RRSP', 'RRSP', 'Managed', '2', 'VCN', '50', ''],
    ])
    found, day = reconcile.holdings_file(tmp_path, 'holdings-report-*.csv')
    assert (found, day) == (str(path), date(2026, 2, 1))

    columns = reconcile.DEFAULT_CONFIG['holdings']['columns']
    rows = reconcile.read_holdings(found, columns)
    assert len(rows) == 3  # the closing "As of" line is not a position
    rates = reconcile.exchange_rates(['CAD', 'USD', 'CAD'], 'CAD', {'USD': 1.5}, day)
    totals, positions = reconcile.account_values(rows, columns, rates, 'CAD')
    assert totals == {'TFSA|TFSA|Trade': 115.0, 'RRSP|RRSP|Managed': 50.0}
    assert positions == {'TFSA|TFSA|Trade': 2, 'RRSP|RRSP|Managed': 1}


def test_unknown_rate_outside_cad_must_be_configured():
    with pytest.raises(SystemExit):
        reconcile.exchange_rates(['USD', 'EUR'], 'USD', {}, date(2026, 1, 1))


def test_compare_matches_by_name_mapping_and_ignore(client):
    visa = create(client, '/liabilities', name='Visa', type='Carte')
    mortgage = create(client, '/liabilities', name='Hypothèque', type='Prêt')
    create(client, '/liabilities', name='Old loan', type='Prêt')
    create(client, '/snapshots', date='2026-01-31', liability_id=visa['id'], amount=100)
    create(client, '/snapshots', date='2026-01-31', liability_id=mortgage['id'], amount=1000)

    rows, alone = reconcile.compare(
        [('VISA ', 100.004), ('Maison', 990), ('Unknown', 5), ('Skipped', 1)],
        {'Maison': 'Hypothèque'}, ['Skipped'], reconcile.latest_snapshots('liabilities'))

    by_name = {name: (item and item[1], gap) for name, item, _, gap in rows}
    assert by_name['VISA '][0] == 'Visa' and abs(by_name['VISA '][1]) < reconcile.TOLERANCE
    assert by_name['Maison'] == ('Hypothèque', -10)
    assert by_name['Unknown'] == (None, None)
    assert 'Skipped' not in by_name
    assert [item[1] for item in alone] == ['Old loan']
    assert [row[0] for row in rows if reconcile.has_gap(row)] == ['Maison']


def test_apply_records_only_the_gaps_and_the_chosen_names(client):
    visa = create(client, '/liabilities', name='Visa', type='Carte')
    loan = create(client, '/liabilities', name='Loan', type='Prêt')
    create(client, '/snapshots', date='2026-01-31', liability_id=visa['id'], amount=100)
    create(client, '/snapshots', date='2026-01-31', liability_id=loan['id'], amount=500)
    rows, _ = reconcile.compare([('Visa', 100), ('Loan', 450)], {}, [], reconcile.latest_snapshots('liabilities'))
    send = lambda payload: create(client, '/snapshots', **payload)

    assert reconcile.apply(rows, 'debts', date(2026, 2, 15), {'Visa'}, send) == []
    assert reconcile.apply(rows, 'debts', date(2026, 2, 15), set(), send) == ['Loan']
    assert balances(client, 'liabilities', loan['id']) == {'2026-01-31': 500, '2026-02-15': 450}
    assert balances(client, 'liabilities', visa['id']) == {'2026-01-31': 100}


def test_main_writes_the_report_and_applies_accounts(client, tmp_path):
    rrsp = create(client, '/assets', name='REER autogéré', type='Actions')
    create(client, '/snapshots', date='2026-01-31', asset_id=rrsp['id'], amount=1000)
    write_holdings(tmp_path, '2026-02-01', [['RRSP', 'RRSP', 'Trade', '1', 'XEQT', '1200', 'CAD'],
                                            ['Crypto', 'Crypto', 'Trade', '3', 'BTC', '10', 'CAD']])
    config = tmp_path / 'config.json'
    config.write_text(json.dumps({'holdings': {'directory': str(tmp_path)},
                                  'accounts': {'RRSP|RRSP|Trade': 'REER autogéré'}}))
    report = tmp_path / 'report.md'
    send = lambda payload: create(client, '/snapshots', **payload)

    reconcile.main(['--config', str(config), '--report', str(report), '--apply', 'accounts'], send=send)

    text = report.read_text(encoding='utf-8')
    assert 'RRSP · RRSP · Trade | REER autogéré' in text
    assert 'Crypto · Crypto · Trade | **aucune correspondance**' in text
    assert '## Dettes' not in text  # no spreadsheet configured
    assert balances(client, 'assets', rrsp['id']) == {'2026-01-31': 1000, '2026-02-01': 1200}


def test_missing_configuration_is_created_from_the_example(tmp_path):
    config = tmp_path / 'config.json'
    with pytest.raises(SystemExit):
        reconcile.main(['--config', str(config)])
    assert json.loads(config.read_text(encoding='utf-8'))['spreadsheet']['name_column'] == 'A'
