import csvRaw from './Kubernetes_STIG_2026-04-23T1406Z.csv?raw';

export interface StigEntry {
	marking: string;
	cat: string;
	stigId: string;
	groupId: string;
	groupTitle: string;
	ruleId: string;
	ruleTitle: string;
	check: string;
	fix: string;
	discussion: string;
	ccis: string;
}

export interface StigSource {
	filename: string;
	date: string;
	count: number;
	cat1: number;
	cat2: number;
	cat3: number;
}

const CSV_FILENAME = 'Kubernetes_STIG_2026-04-23T1406Z.csv';

function parseCsv(input: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let inQuotes = false;
	let i = 0;
	while (i < input.length) {
		const c = input[i];
		if (inQuotes) {
			if (c === '"') {
				if (input[i + 1] === '"') {
					field += '"';
					i += 2;
					continue;
				}
				inQuotes = false;
				i++;
				continue;
			}
			field += c;
			i++;
			continue;
		}
		if (c === '"') {
			inQuotes = true;
			i++;
			continue;
		}
		if (c === ',') {
			row.push(field);
			field = '';
			i++;
			continue;
		}
		if (c === '\r') {
			i++;
			continue;
		}
		if (c === '\n') {
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
			i++;
			continue;
		}
		field += c;
		i++;
	}
	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}
	return rows;
}

function dateFromFilename(name: string): string {
	const m = name.match(/(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})Z/);
	if (!m) return '';
	return `${m[1]}T${m[2]}:${m[3]}:00Z`;
}

function load(): { entries: StigEntry[]; byId: Map<string, StigEntry>; source: StigSource } {
	const raw = csvRaw.replace(/^\uFEFF/, '');
	const rows = parseCsv(raw).filter((r) => r.some((c) => c.trim().length > 0));
	const [, ...data] = rows;
	const entries: StigEntry[] = data.map((r) => ({
		marking: r[0] ?? '',
		cat: r[1] ?? '',
		stigId: r[2] ?? '',
		groupId: r[3] ?? '',
		groupTitle: r[4] ?? '',
		ruleId: r[5] ?? '',
		ruleTitle: r[6] ?? '',
		check: r[7] ?? '',
		fix: r[8] ?? '',
		discussion: r[9] ?? '',
		ccis: r[10] ?? ''
	}));
	const byId = new Map<string, StigEntry>();
	for (const e of entries) {
		if (e.groupId) byId.set(e.groupId, e);
	}
	const cat1 = entries.filter((e) => e.cat === 'CAT 1').length;
	const cat2 = entries.filter((e) => e.cat === 'CAT 2').length;
	const cat3 = entries.filter((e) => e.cat === 'CAT 3').length;
	return {
		entries,
		byId,
		source: {
			filename: CSV_FILENAME,
			date: dateFromFilename(CSV_FILENAME),
			count: byId.size,
			cat1,
			cat2,
			cat3
		}
	};
}

const cache = load();

export const stigEntries: StigEntry[] = cache.entries;
export const stigById: Map<string, StigEntry> = cache.byId;
export const stigSource: StigSource = cache.source;
