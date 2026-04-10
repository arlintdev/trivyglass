<script lang="ts">
	import { toastStore } from '$lib/stores/toastStore';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { SvelteSet } from 'svelte/reactivity';

	type TagType = 'critical' | 'high' | 'medium' | 'low' | 'pass' | 'fail' | 'unknown' | 'info';

	interface Metadata {
		namespace?: string;
		name: string;
		uid?: string;
	}

	interface Report {
		metadata: Metadata;
		[key: string]: unknown;
	}

	interface Props {
		reports?: Report[];
		reportType: string;
		showNamespace?: boolean;
		columns?: Column[];
	}

	interface Column {
		name: string;
		jsonPath: string;
	}

	interface TableColumn {
		header: string;
		value: string;
		tag?: TagType;
	}

	let { reports = [], reportType, showNamespace = true, columns = [] }: Props = $props();

	function getTag(header: string): TagType | undefined {
		const lowerHeader = header.toLowerCase();
		if (lowerHeader.includes('fail')) return 'fail';
		if (lowerHeader.includes('pass')) return 'pass';
		if (lowerHeader.includes('unknown')) return 'unknown';
		if (lowerHeader.includes('critical')) return 'critical';
		if (lowerHeader.includes('high')) return 'high';
		if (lowerHeader.includes('medium')) return 'medium';
		if (lowerHeader.includes('low')) return 'low';
		if (lowerHeader.includes('none')) return 'unknown';
		return undefined;
	}

	let tableColumns: TableColumn[] = $derived.by(() => {
		if (columns.length > 0) {
			return columns.map((col: Column) => ({
				header: col.name,
				value: col.jsonPath,
				tag: getTag(col.name)
			}));
		}
		const allKeys = new SvelteSet<string>();
		reports.forEach((report: Report) => {
			Object.keys(report).forEach((key: string) => {
				if (key !== 'metadata') allKeys.add(key);
			});
		});
		return Array.from(allKeys).map((key: string) => ({
			header: key,
			value: key,
			tag: getTag(key)
		}));
	});

	let selectedReport = $state<Report | null>(null);
	let showModal = $state(false);
	let isRefreshing = $state(false);

	async function refreshReports() {
		try {
			isRefreshing = true;
			// Collect unique CRD plurals from reports, or fall back to reportType
			const crdPlurals = new SvelteSet<string>();
			reports.forEach((r) => {
				const crd = (r as Record<string, unknown>)._crdPlural;
				if (typeof crd === 'string') crdPlurals.add(crd);
			});
			if (crdPlurals.size === 0) crdPlurals.add(reportType);

			const results = await Promise.all(
				Array.from(crdPlurals).map((crd) =>
					fetch(`/api/reports/invalidate/${crd}`, { method: 'POST' })
				)
			);
			const failed = results.filter((r) => !r.ok);
			if (failed.length > 0) {
				throw new Error('Failed to refresh some report types');
			}
			toastStore.addToast(`Successfully refreshed ${reportType} data`, 'success');
			goto($page.url.pathname, { invalidateAll: true });
		} catch (error) {
			console.error('Error refreshing reports:', error);
			toastStore.addToast(
				`Failed to refresh reports: ${error instanceof Error ? error.message : 'Unknown error'}`,
				'error'
			);
		} finally {
			isRefreshing = false;
		}
	}

	function get(obj: Record<string, unknown>, path: string): unknown {
		if (!obj || !path) return undefined;
		if (path.startsWith('.')) path = path.slice(1);
		return path.split('.').reduce<unknown>((acc, part) => {
			if (acc && typeof acc === 'object' && acc !== null) {
				return (acc as Record<string, unknown>)[part];
			}
			return undefined;
		}, obj);
	}

	async function downloadReport(report: Report) {
		const date = new Date().toISOString().split('T')[0];
		const namespace = report.metadata.namespace ? `${report.metadata.namespace}_` : '';
		const crdPlural = (
			typeof (report as Record<string, unknown>)._crdPlural === 'string'
				? (report as Record<string, unknown>)._crdPlural
				: reportType
		) as string;
		const filename = `${date}_${crdPlural}_${namespace}${report.metadata.name}.json`;

		try {
			let apiUrl;
			if (report.metadata.namespace) {
				apiUrl = `/api/reports/namespace/${report.metadata.namespace}/${crdPlural}/${report.metadata.name}`;
			} else {
				apiUrl = `/api/reports/cluster/${crdPlural}/${report.metadata.name}`;
			}
			const response = await fetch(apiUrl);
			if (!response.ok) throw new Error(`Failed to fetch report: ${response.statusText}`);
			const fullReportData = await response.json();
			const jsonStr = JSON.stringify(fullReportData, null, 2);
			const blob = new Blob([jsonStr], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			a.click();
			URL.revokeObjectURL(url);
		} catch (error: unknown) {
			if (error instanceof Error) {
				console.error('Error downloading report:', error);
				alert(`Failed to download report: ${error.message}`);
			} else {
				alert('Failed to download report: An unknown error occurred.');
			}
		}
	}

	function viewReportJson(report: Report) {
		selectedReport = report;
		showModal = true;
	}

	function closeModal() {
		selectedReport = null;
		showModal = false;
	}

	let searchTerm = $state('');
	let sortColumn = $state('');
	let sortDirection = $state<'asc' | 'desc'>('asc');

	function compareValues(a: Report, b: Report, column: string, direction: 'asc' | 'desc') {
		let valueA: unknown, valueB: unknown;
		if (column === 'Namespace / Name') {
			valueA = `${a.metadata?.namespace || ''}:${a.metadata?.name || ''}`;
			valueB = `${b.metadata?.namespace || ''}:${b.metadata?.name || ''}`;
		} else {
			const col = tableColumns.find((c) => c.header === column);
			if (col) {
				valueA = col.value.includes('.') ? get(a, col.value) : a[col.value];
				valueB = col.value.includes('.') ? get(b, col.value) : b[col.value];
			} else {
				return 0;
			}
		}
		if (valueA === undefined || valueA === null) valueA = '';
		if (valueB === undefined || valueB === null) valueB = '';
		const isNumericA = !isNaN(Number(valueA)) && typeof valueA !== 'boolean';
		const isNumericB = !isNaN(Number(valueB)) && typeof valueB !== 'boolean';
		if (isNumericA && isNumericB) {
			return direction === 'asc'
				? Number(valueA) - Number(valueB)
				: Number(valueB) - Number(valueA);
		} else {
			const strA = String(valueA).toLowerCase();
			const strB = String(valueB).toLowerCase();
			return direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
		}
	}

	let filteredReports = $derived(
		reports
			.filter((report) => {
				if (!searchTerm) return true;
				const term = searchTerm.toLowerCase();
				let values: unknown[] = [];
				if (showNamespace && report.metadata?.namespace) values.push(report.metadata.namespace);
				if (report.metadata?.name) values.push(report.metadata.name);
				tableColumns.forEach((column) => {
					const value = column.value.includes('.')
						? get(report, column.value)
						: report[column.value];
					if (value !== undefined && value !== null) values.push(value);
				});
				return values.some((val) => String(val).toLowerCase().includes(term));
			})
			.sort((a, b) => {
				if (!sortColumn) return 0;
				return compareValues(a, b, sortColumn, sortDirection);
			})
	);

	function getHeadItems(): string[] {
		const headers = ['Namespace / Name'];
		headers.push(...tableColumns.map((column) => column.header));
		headers.push('Actions');
		return headers;
	}

	function toggleSort(column: string) {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column;
			sortDirection = 'asc';
		}
	}

	function escapeCsvValue(value: unknown): string {
		if (
			typeof value === 'string' &&
			(value.includes(',') || value.includes('"') || value.includes('\n'))
		) {
			return `"${value.replace(/"/g, '""')}"`;
		}
		return String(value);
	}

	function generateCsv(): string {
		const headers = ['Namespace', 'Name', ...tableColumns.map((col) => col.header)];
		const rows = filteredReports.map((report) => [
			report.metadata.namespace || '',
			report.metadata.name,
			...tableColumns.map((col) => get(report, col.value) || '')
		]);
		return [
			headers.map(escapeCsvValue).join(','),
			...rows.map((row) => row.map(escapeCsvValue).join(','))
		].join('\n');
	}

	function generateMarkdown(): string {
		const headers = ['Namespace', 'Name', ...tableColumns.map((col) => col.header)];
		const rows = filteredReports.map((report) => [
			report.metadata.namespace || '',
			report.metadata.name,
			...tableColumns.map((col) => get(report, col.value) || '')
		]);
		return [
			'| ' + headers.join(' | ') + ' |',
			'| ' + headers.map(() => '---').join(' | ') + ' |',
			...rows.map((row) => '| ' + row.join(' | ') + ' |')
		].join('\n');
	}

	function generateJson(): string {
		const data = filteredReports.map((report) => ({
			Namespace: report.metadata.namespace || '',
			Name: report.metadata.name,
			...Object.fromEntries(tableColumns.map((col) => [col.header, get(report, col.value) || '']))
		}));
		return JSON.stringify(data, null, 2);
	}

	function downloadFile(content: string, filename: string, mimeType: string) {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

	function exportData(format: string) {
		const date = new Date().toISOString().split('T')[0];
		let content: string, filename: string, mimeType: string;
		switch (format) {
			case 'csv':
				content = generateCsv();
				filename = `${date}_${reportType}_reports.csv`;
				mimeType = 'text/csv';
				break;
			case 'markdown':
				content = generateMarkdown();
				filename = `${date}_${reportType}_reports.md`;
				mimeType = 'text/markdown';
				break;
			case 'json':
				content = generateJson();
				filename = `${date}_${reportType}_reports.json`;
				mimeType = 'application/json';
				break;
			default:
				return;
		}
		downloadFile(content, filename, mimeType);
	}

	function generateLink(report: Report) {
		if (report.metadata.namespace) {
			return `/${reportType}/namespace/${report.metadata.namespace}/${report.metadata.name}`;
		} else {
			return `/${reportType}/cluster/${report.metadata.name}`;
		}
	}
</script>

{#if reports.length === 0}
	<p style="text-align: center; color: var(--nd-text-secondary);">No {reportType} reports found.</p>
{:else}
	<div style="max-width: 100%;">
		<!-- Toolbar -->
		<div
			style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-md); gap: var(--space-md); flex-wrap: wrap;"
		>
			<div style="display: flex; gap: var(--space-xs); flex-wrap: wrap;">
				<button class="nd-btn nd-btn-secondary nd-btn-sm" onclick={() => exportData('csv')}
					>Export CSV</button
				>
				<button class="nd-btn nd-btn-secondary nd-btn-sm" onclick={() => exportData('markdown')}
					>Export MD</button
				>
				<button class="nd-btn nd-btn-secondary nd-btn-sm" onclick={() => exportData('json')}
					>Export JSON</button
				>
			</div>
			<button
				class="nd-btn nd-btn-secondary nd-btn-sm"
				onclick={refreshReports}
				disabled={isRefreshing}
			>
				{isRefreshing ? '[REFRESHING...]' : 'Hard Refresh'}
			</button>
		</div>

		<!-- Search -->
		<div style="margin-bottom: var(--space-md);">
			<input
				class="nd-input-bordered"
				type="text"
				placeholder="Search reports..."
				bind:value={searchTerm}
				style="width: 100%; max-width: 400px;"
			/>
		</div>

		<!-- Desktop: Table -->
		<div class="nd-table-desktop" style="overflow-x: auto;">
			<table class="nd-table">
				<thead>
					<tr>
						{#each getHeadItems() as header}
							<th onclick={() => toggleSort(header)}>
								{header}
								{#if sortColumn === header}
									{sortDirection === 'asc' ? ' \u25B2' : ' \u25BC'}
								{/if}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#if filteredReports.length === 0}
						<tr>
							<td
								colspan={getHeadItems().length}
								style="text-align: center; color: var(--nd-text-secondary);"
							>
								No matching {reportType} reports found.
							</td>
						</tr>
					{:else}
						{#each filteredReports as report (report.metadata.uid)}
							<tr>
								<td>
									<span class="nd-caption">{report?.metadata?.namespace || 'N/A'}</span>
									<br />
									<span style="font-size: var(--body-sm);" title={report.metadata.name}>
										{report.metadata.name}
									</span>
								</td>
								{#each tableColumns as column}
									{@const val = column.value.includes('.')
										? get(report, column.value)
										: report[column.value]}
									<td>
										{#if column.tag}
											<span class="nd-tag nd-tag-{column.tag}">{String(val ?? 'N/A')}</span>
										{:else}
											<span title={String(val ?? 'N/A')}>{String(val ?? 'N/A')}</span>
										{/if}
									</td>
								{/each}
								<td>
									<div style="display: flex; gap: var(--space-xs); flex-wrap: wrap;">
										<a href={generateLink(report)} class="nd-btn nd-btn-secondary nd-btn-xs"
											>Details</a
										>
										<button
											class="nd-btn nd-btn-ghost nd-btn-xs"
											onclick={() => {
												downloadReport(report).catch((err) => console.error('Error:', err));
											}}
											title="Download full report as JSON"
										>
											Download
										</button>
										<button
											class="nd-btn nd-btn-ghost nd-btn-xs"
											onclick={() => viewReportJson(report)}
											title="View full report JSON"
										>
											View JSON
										</button>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>

		<!-- Mobile: Card layout -->
		<div class="nd-report-card">
			{#if filteredReports.length === 0}
				<p style="text-align: center; color: var(--nd-text-secondary);">
					No matching {reportType} reports found.
				</p>
			{:else}
				<div style="display: flex; flex-direction: column; gap: var(--space-sm);">
					{#each filteredReports as report (report.metadata.uid)}
						<a
							href={generateLink(report)}
							class="nd-card"
							style="text-decoration: none; display: block;"
						>
							<!-- Name / Namespace -->
							<div style="margin-bottom: var(--space-sm);">
								{#if report.metadata.namespace}
									<span class="nd-caption" style="color: var(--nd-text-disabled);"
										>{report.metadata.namespace}</span
									>
								{/if}
								<div
									style="font-size: var(--body-sm); color: var(--nd-text-primary); word-break: break-all;"
								>
									{report.metadata.name}
								</div>
							</div>
							<!-- Severity / column tags inline -->
							<div style="display: flex; flex-wrap: wrap; gap: var(--space-xs);">
								{#each tableColumns as column}
									{@const val = column.value.includes('.')
										? get(report, column.value)
										: report[column.value]}
									{#if column.tag}
										<span class="nd-tag nd-tag-{column.tag}" style="font-size: var(--caption);">
											{column.header}: {String(val ?? '0')}
										</span>
									{:else if val !== null && val !== undefined && String(val) !== 'N/A'}
										<span style="font-size: var(--caption); color: var(--nd-text-secondary);">
											{column.header}: {String(val)}
										</span>
									{/if}
								{/each}
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- Modal for viewing JSON -->
{#if showModal}
	<div
		class="nd-modal-backdrop"
		onclick={closeModal}
		onkeydown={(e) => e.key === 'Escape' && closeModal()}
		role="dialog"
		tabindex="-1"
	>
		<div class="nd-modal nd-modal-xl" onclick={(e) => e.stopPropagation()} role="document">
			<div class="nd-modal-header">
				<span class="nd-modal-title">Report JSON</span>
				<button class="nd-modal-close" onclick={closeModal}>[ X ]</button>
			</div>
			{#if selectedReport}
				<pre class="nd-code" style="max-height: 70vh; overflow: auto;">{JSON.stringify(
						selectedReport,
						null,
						2
					)}</pre>
			{/if}
		</div>
	</div>
{/if}
