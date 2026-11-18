"""Build the public daily summaries from the two local exports."""

import argparse
from collections import Counter, defaultdict
from contextlib import closing
import csv
from datetime import date, datetime, timedelta, timezone
import io
from itertools import groupby
import json
import os
from pathlib import Path, PurePosixPath
import re
import sqlite3
import sys
import tempfile
from zipfile import BadZipFile, ZipFile
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


METRICS = ('steps', 'sleep_minutes', 'heart_rate_bpm')
STAGE_FIELDS = ('sleep_deep_minutes', 'sleep_rem_minutes', 'sleep_light_minutes', 'sleep_awake_minutes')
HEART_BOUNDS = ('heart_rate_min_bpm', 'heart_rate_max_bpm')
PUBLIC_FIELDS = ('date', *METRICS, *STAGE_FIELDS, *HEART_BOUNDS)
EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)
DAY_MS = 86_400_000
SAMSUNG = 'com.sec.android.app.shealth'
DEEP, REM, LIGHT, AWAKE = STAGE_FIELDS
SAMSUNG_STAGES = {40001: AWAKE, 40002: LIGHT, 40003: DEEP, 40004: REM}
CONNECT_STAGES = {1: AWAKE, 3: AWAKE, 4: LIGHT, 5: DEEP, 6: REM, 7: AWAKE}


class ValidationError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise ValidationError(message)


def eastern_day(ms, eastern):
    return (EPOCH + timedelta(milliseconds=ms)).astimezone(eastern).date()


def export_time(value):
    # Samsung's timestamp columns are UTC. day_time is a calendar date at midnight.
    require(bool(re.fullmatch(r'\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}', value)),
            'Unexpected Samsung timestamp format.')
    return datetime.fromisoformat(value).replace(tzinfo=timezone.utc)


def samsung_ms(value):
    delta = export_time(value) - EPOCH
    return delta.days * DAY_MS + delta.seconds * 1000 + delta.microseconds // 1000


def samsung_rows(archive, names, table, fields):
    pattern = re.compile(re.escape(table) + r'\.\d+\.csv')
    files = [name for name in names if pattern.fullmatch(PurePosixPath(name).name)]
    require(len(files) == 1, f'Expected one Samsung {table} CSV.')
    with archive.open(files[0]) as raw, io.TextIOWrapper(raw, encoding='utf-8-sig', newline='') as stream:
        first = next(stream, '').split(',')[0]
        rows = csv.DictReader(stream, strict=True)
        require(first == table and set(fields) <= set(rows.fieldnames or []),
                f'Unexpected Samsung {table} columns.')
        for row in rows:
            # The exported rows carry one trailing delimiter beyond the header.
            require(row.get(None) in (None, ['']) and all(row[field] is not None for field in rows.fieldnames),
                    f'Incomplete Samsung {table} row.')
            yield tuple(row[field] for field in fields)


def read_samsung(path, eastern):
    with ZipFile(path) as archive:
        # Read the relevant CSVs. Ignore archive members containing unrelated health data.
        csv_names = [name for name in archive.namelist() if name.endswith('.csv')]
        revisions = {}
        for source, day_time, updated, count in samsung_rows(
                archive, csv_names, 'com.samsung.shealth.step_daily_trend',
                ('source_type', 'day_time', 'update_time', 'count')):
            # Source -2 is the merged all-device series, confirmed against Health Connect.
            if source != '-2':
                continue
            day = export_time(day_time).date()
            revision = (export_time(updated), int(count))
            prior = revisions.get(day)
            require(revision[1] >= 0, 'Negative Samsung step total.')
            require(not prior or prior[0] != revision[0] or prior == revision,
                    'Conflicting Samsung step revisions.')
            if prior is None or revision[0] > prior[0]:
                revisions[day] = revision
        steps = {day: count for day, (_, count) in revisions.items()}

        # The base sleep table contains the individual intervals, including the
        # components of each sleep_combined record. A combined envelope can span gaps.
        sleep_prefix = 'com.samsung.health.sleep.'
        session_fields = ('datauuid', 'start_time', 'end_time')
        sessions = {key: (samsung_ms(start), samsung_ms(end)) for key, start, end in samsung_rows(
            archive, csv_names, 'com.samsung.shealth.sleep', tuple(sleep_prefix + field for field in session_fields))}
        sleep = list(sessions.values())
        for key, start, end in samsung_rows(archive, csv_names, 'com.samsung.shealth.sleep_combined', session_fields):
            sessions[key] = (samsung_ms(start), samsung_ms(end))
        stages = []
        for key, start, end, code in samsung_rows(archive, csv_names, 'com.samsung.health.sleep_stage',
                                                ('sleep_id', 'start_time', 'end_time', 'stage')):
            start_ms, end_ms = samsung_ms(start), samsung_ms(end)
            require(start_ms < end_ms, 'Invalid Samsung sleep-stage interval.')
            if key in sessions and (field := SAMSUNG_STAGES.get(int(code))):
                # Orphan stages have no wake date. Clip stages with a parent to its bounds.
                left, right = sessions[key]
                start_ms, end_ms = max(left, start_ms), min(right, end_ms)
                if start_ms < end_ms:
                    stages.append((start_ms, end_ms, field))

        readings = {}
        heart_prefix = 'com.samsung.health.heart_rate.'
        heart_fields = ('start_time', 'end_time', 'heart_rate', 'min', 'max')
        for start, end, bpm, low, high in samsung_rows(archive, csv_names, 'com.samsung.shealth.tracker.heart_rate',
                                                       tuple(heart_prefix + field for field in heart_fields)):
            start_ms, end_ms, bpm = samsung_ms(start), samsung_ms(end), float(bpm)
            low, high = float(low or 0) or bpm, float(high or 0) or bpm
            require(start_ms <= end_ms and 0 < bpm <= 300, 'Invalid Samsung heart-rate summary.')
            require(0 < low <= bpm <= high <= 300, 'Invalid Samsung heart-rate bounds.')
            key = (start_ms, end_ms, bpm)
            prior_low, prior_high = readings.get(key, (low, high))
            readings[key] = (min(low, prior_low), max(high, prior_high))
        heart = daily_heart(((start, bpm, *readings[start, end, bpm])
                             for start, end, bpm in sorted(readings)), eastern)
    require(steps and sleep and stages and heart, 'Samsung export is missing a required series.')
    return steps, sleep, stages, heart


def read_health_connect(path, eastern):
    with ZipFile(path) as archive, closing(sqlite3.connect(':memory:')) as db:
        require(archive.namelist() == ['health_connect_export.db'], 'Unexpected Health Connect ZIP layout.')
        # Keep the SQLite snapshot in memory. ZIP reads verify the member CRC.
        db.deserialize(archive.read('health_connect_export.db'))
        db.execute('PRAGMA query_only = ON')
        db.execute('PRAGMA trusted_schema = OFF')
        require(db.execute('PRAGMA quick_check').fetchall() == [('ok',)], 'Damaged Health Connect database.')

        steps = {}
        for stored_day, start, end, count in db.execute('''
            SELECT local_date, start_time, end_time, count FROM steps_record_table
            JOIN application_info_table AS app ON app.row_id = app_info_id
            WHERE app.package_name = ?
        ''', (SAMSUNG,)):
            require(isinstance(count, int) and count >= 0 and 22 * 3600_000 < end - start <= 25 * 3600_000,
                    'Unexpected Samsung daily step record in Health Connect.')
            day = (EPOCH.date() + timedelta(days=stored_day) if stored_day is not None
                   else eastern_day(start, eastern))
            require(day not in steps or steps[day] == count, 'Conflicting Health Connect step totals.')
            steps[day] = count

        sleep = db.execute('SELECT start_time, end_time FROM sleep_session_record_table').fetchall()
        stages = []
        for start, end, code, left, right in db.execute('''
            SELECT stage_start_time, stage_end_time, stage_type, start_time, end_time
            FROM sleep_stages_table LEFT JOIN sleep_session_record_table ON parent_key = row_id
        '''):
            require(left is not None and right is not None and left <= start < end <= right,
                    'Invalid Health Connect sleep-stage interval.')
            if field := CONNECT_STAGES.get(code):
                stages.append((start, end, field))
        invalid = db.execute('''
            SELECT 1 FROM heart_rate_record_series_table AS samples
            LEFT JOIN heart_rate_record_table AS records ON records.row_id = samples.parent_key
            WHERE records.row_id IS NULL OR epoch_millis IS NULL OR beats_per_minute IS NULL
               OR epoch_millis < records.start_time OR epoch_millis > records.end_time
               OR beats_per_minute <= 0 OR beats_per_minute > 300
            UNION ALL
            SELECT 1 FROM heart_rate_record_table AS records
            WHERE records.start_time IS NULL OR records.end_time IS NULL
               OR NOT EXISTS (SELECT 1 FROM heart_rate_record_series_table WHERE parent_key = records.row_id)
            LIMIT 1
        ''').fetchone()
        require(invalid is None, 'Incomplete or invalid Health Connect heart-rate readings.')
        # Each instant counts once. If distinct readings share an instant, average them.
        heart = daily_heart(db.execute('''
            SELECT epoch_millis, AVG(DISTINCT beats_per_minute), MIN(beats_per_minute), MAX(beats_per_minute)
            FROM heart_rate_record_series_table GROUP BY epoch_millis ORDER BY epoch_millis
        '''), eastern)
    require(steps and sleep and heart, 'Health Connect export is missing at least one metric.')
    return steps, sleep, stages, heart


def daily_heart(readings, eastern):
    days = defaultdict(lambda: [0, 0, 301, 0])
    for ms, bpm, low, high in readings:
        aggregate = days[eastern_day(ms, eastern)]
        aggregate[0] += bpm
        aggregate[1] += 1
        aggregate[2] = min(low, aggregate[2])
        aggregate[3] = max(high, aggregate[3])
    return {day: (round(total / count, 1), round(low, 1), round(high, 1))
            for day, (total, count, low, high) in days.items()}


def merged_sessions(sessions):
    merged = []
    for start, end in sorted(sessions):
        require(0 < end - start <= DAY_MS, 'Invalid sleep interval.')
        if merged and start < merged[-1][1]:
            left, right = merged[-1]
            merged[-1] = (left, max(end, right))
        else:
            merged.append((start, end))
    return merged


def daily_sleep(sessions, eastern):
    totals = defaultdict(int)
    for start, end in sessions:
        totals[eastern_day(end, eastern)] += end - start
    return {day: round(ms / 60_000, 2) for day, ms in totals.items()}


def daily_stages(sessions, samsung, connect, eastern):
    # Sweep the union of session and stage bounds. Each slice can contribute to
    # one stage only. Prefer Health Connect when both sources classify it.
    events = []
    for start, end in sessions:
        day = eastern_day(end, eastern)
        events.extend(((start, 1, 0, day), (end, -1, 0, day)))
    for source, stages in enumerate((samsung, connect), 1):
        for start, end, field in set(stages):
            events.extend(((start, 1, source, field), (end, -1, source, field)))

    totals = defaultdict(Counter)
    active = {1: Counter(), 2: Counter()}
    prior_time = wake_date = None
    for time, changes in groupby(sorted(events), key=lambda event: event[0]):
        selected = active[2] or active[1]
        if wake_date and len(selected) == 1:
            totals[wake_date][next(iter(selected))] += time - prior_time
        for _, delta, source, field in changes:
            if source == 0:
                wake_date = field if delta > 0 else None
            else:
                active[source][field] += delta
                if active[source][field] == 0:
                    del active[source][field]
        prior_time = time
    return {day: {field: round(minutes[field] / 60_000, 2) for field in STAGE_FIELDS}
            for day, minutes in totals.items()}


def validated_rows(rows):
    require(isinstance(rows, list) and bool(rows), 'Expected a nonempty array of daily summaries.')
    prior_day = date.min
    present = set()
    for row in rows:
        require(isinstance(row, dict) and 'date' in row and bool(set(row).intersection(METRICS))
                and set(row) <= set(PUBLIC_FIELDS), 'Unexpected public summary field.')
        day = date.fromisoformat(row['date'])
        require(day.isoformat() == row['date'] and prior_day < day <= date.today() + timedelta(days=1),
                'Invalid, future, repeated, or unsorted summary date.')
        prior_day = day
        for metric in set(row) - {'date'}:
            value = row[metric]
            require(type(value) in (int, float), 'Expected a numeric summary value.')
            if metric == 'steps':
                require(type(value) is int and 0 <= value <= 250_000, 'Invalid public step count.')
            elif metric.endswith('_bpm'):
                require(0 < value <= 300, 'Invalid public heart rate.')
            else:
                require(0 <= value <= 3000, 'Invalid public sleep duration.')
        if set(row).intersection(STAGE_FIELDS):
            require(all(field in row for field in ('sleep_minutes', *STAGE_FIELDS))
                    and sum(row[field] for field in STAGE_FIELDS) <= row['sleep_minutes'] + 0.03,
                    'Public sleep stages exceed or lack a session total.')
        if set(row).intersection(HEART_BOUNDS):
            require(all(field in row for field in ('heart_rate_bpm', *HEART_BOUNDS))
                    and row[HEART_BOUNDS[0]] <= row['heart_rate_bpm'] <= row[HEART_BOUNDS[1]],
                    'Invalid public heart-rate range.')
        present.update(row)
    require(set(METRICS) <= present, 'At least one public metric is missing.')
    return rows


def unique_fields(pairs):
    row = dict(pairs)
    require(len(row) == len(pairs), 'Repeated public summary field.')
    return row


def signature(path):
    info = path.stat()
    return info.st_size, info.st_mtime_ns


def import_exports(samsung_path, connect_path, previous):
    eastern = ZoneInfo('America/New_York')
    source_paths = (samsung_path, connect_path)
    before = tuple(map(signature, source_paths))
    old_steps, old_sessions, samsung_stages, old_heart = read_samsung(samsung_path, eastern)
    steps, sessions, connect_stages, heart = read_health_connect(connect_path, eastern)
    require(tuple(map(signature, source_paths)) == before, 'Exports changed during import. Try after sync completes.')

    old_windows = merged_sessions(old_sessions)
    all_windows = merged_sessions(old_sessions + sessions)
    old_sleep = daily_sleep(old_windows, eastern)
    connect_sleep = daily_sleep(merged_sessions(sessions), eastern)
    all_sleep = daily_sleep(all_windows, eastern)
    old_stage_days = daily_stages(old_windows, samsung_stages, (), eastern)
    all_stage_days = daily_stages(all_windows, samsung_stages, connect_stages, eastern)
    # Include the combined sources wherever a Health Connect interval participated.
    # An interval that overlaps midnight can move to the later wake date after union.
    sleep = {day: minutes for day, minutes in all_sleep.items()
             if day in connect_sleep or minutes != old_sleep.get(day)}
    # A Samsung interval that now belongs to a later wake date must only be
    # counted in the merged result. Keep prior Health Connect-only history.
    removed_sleep_dates = old_sleep.keys() - all_sleep.keys()
    days = {date.fromisoformat(row['date']): dict(row) for row in previous}
    for day in removed_sleep_dates:
        row = days.get(day)
        if row and row.get('sleep_minutes') == old_sleep[day]:
            del row['sleep_minutes']
            for field in STAGE_FIELDS:
                row.pop(field, None)
            if len(row) == 1:
                del days[day]
    old_sleep = {day: minutes for day, minutes in old_sleep.items() if day not in removed_sleep_dates}
    old_average = {day: values[0] for day, values in old_heart.items()}
    recent_average = {day: values[0] for day, values in heart.items()}
    for metric, backfill, recent in zip(METRICS, (old_steps, old_sleep, old_average), (steps, sleep, recent_average)):
        first, last = min(recent), max(recent)
        for day, row in days.items():
            require(not (first < day < last and metric in row and day not in recent
                         and row[metric] != backfill.get(day)),
                    f'Health Connect {metric} has a gap where it previously had data.')
        for day, value in backfill.items():
            days.setdefault(day, {'date': day.isoformat()}).setdefault(metric, value)
        for day, value in recent.items():
            row = days.setdefault(day, {'date': day.isoformat()})
            if metric == 'sleep_minutes':
                if day in all_stage_days or row.get(metric) != value:
                    for field in STAGE_FIELDS:
                        row.pop(field, None)
                    row.update(all_stage_days.get(day, {}))
            row[metric] = value

    for day, row in days.items():
        if day not in sleep and day in old_stage_days and STAGE_FIELDS[0] not in row:
            if row.get('sleep_minutes') == old_sleep.get(day):
                row.update(old_stage_days[day])
        summary = heart.get(day)
        if summary is None and HEART_BOUNDS[0] not in row and row.get('heart_rate_bpm') == old_average.get(day):
            summary = old_heart.get(day)
        if summary is not None:
            row.update(zip(HEART_BOUNDS, summary[1:]))
    return validated_rows([days[day] for day in sorted(days)])


def write_summary(path, rows):
    canonical = ({field: row[field] for field in PUBLIC_FIELDS if field in row} for row in rows)
    content = '[\n' + ',\n'.join('  ' + json.dumps(row, separators=(',', ':')) for row in canonical) + '\n]\n'
    if path.exists() and path.read_bytes() == content.encode('utf-8'):
        print('Daily summaries are unchanged.')
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    output = tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', newline='\n', dir=path.parent,
                                         suffix='.tmp', delete=False)
    temporary = Path(output.name)
    try:
        with output:
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)
    print('Wrote validated daily summaries.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--health-connect', type=Path)
    parser.add_argument('--samsung', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--check', action='store_true', help='Validate an existing public JSON file.')
    args = parser.parse_args()
    if not args.check and (args.health_connect is None or args.samsung is None):
        parser.error('both export paths are required for import')
    try:
        previous = []
        if args.output.exists():
            previous = validated_rows(json.loads(args.output.read_text(encoding='utf-8'), object_pairs_hook=unique_fields))
        if args.check:
            require(previous, 'Public summary file is missing.')
            rows = previous
        else:
            rows = import_exports(args.samsung, args.health_connect, previous)
            write_summary(args.output, rows)
        for metric in METRICS:
            dates = [row['date'] for row in rows if metric in row]
            print(f'{metric}: {dates[0]} to {dates[-1]} ({len(dates):,} recorded days)')
    except (BadZipFile, csv.Error, OSError, OverflowError, sqlite3.Error, TypeError, ValueError,
            ZoneInfoNotFoundError) as error:
        # Avoid logging source paths, SQL contents, or malformed health values.
        detail = str(error) if isinstance(error, ValidationError) else type(error).__name__
        print(f'Daily summary validation failed. {detail}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
