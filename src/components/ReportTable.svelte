<script lang="ts">
	import {
		TableSearch,
		TableHead,
		TableBody,
		TableBodyRow,
		TableBodyCell,
		Badge,
		Button,
		P,
		Modal,
		uiHelpers,
		ButtonGroup
	} from 'svelte-5-ui-lib';
	import { toastStore } from '$lib/stores/toastStore';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	// Define types for Badge color
	type BadgeColorType = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'gray';

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
		color?: BadgeColorType;
	}

	let { reports = [], reportType, showNamespace = true, columns = [] }: Props = $props();

	let tableColumns = $state<TableColumn[]>([]);

	function getColor(header: string): BadgeColorType | undefined {
		const lowerHeader = header.toLowerCase();
		if (lowerHeader.includes('fail')) return 'red';
		if (lowerHeader.includes('pass')) return 'green';
		if (lowerHeader.includes('unknown')) return 'gray';
		if (lowerHeader.includes('critical')) return 'red';
		if (lowerHeader.includes('high')) return 'orange';
		if (lowerHeader.includes('medium')) return 'yellow';
		if (lowerHeader.includes('low')) return 'green';
		if (lowerHeader.includes('none')) return 'gray';
		return undefined;
	}

	if (columns.length > 0) {
		tableColumns = columns.map((col: Column) => ({
			header: col.name,
			value: col.jsonPath,
			color: getColor(col.name)
		}));
	} else {
		const allKeys = new Set<string>();
		reports.forEach((report: Report) => {
			Object.keys(report).forEach((key: string) => {
				if (key !== 'metadata') {
					allKeys.add(key);
				}
			});
		});
		tableColumns = Array.from(allKeys).map((key: string) => ({
			header: key,
			value: key,
			color: getColor(key)
		}));
	}

	const modalExample = uiHelpers();
	let modalStatus = $state(false);
	const closeModal = modalExample.close;
	$effect(() => {
		modalStatus = modalExample.isOpen;
	});

	let selectedReport = $state<Report | null>(null);

	// State for tracking refresh status
	let isRefreshing = $state(false);

	/**
	 * Refreshes the report data by invalidating the cache and reloading the page
	 * This forces a fresh fetch from Kubernetes
	 */
	async function refreshReports() {
		try {
			isRefreshing = true;

			// Call the API to invalidate the cache
			const response = await fetch(`/api/reports/invalidate/${reportType}`, {
				method: 'POST'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to refresh reports');
			}

			// Show success toast
			toastStore.addToast(`Successfully refreshed ${reportType} data`, 'success');

			// Reload the current page to fetch fresh data
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
		if (path.startsWith('.')) {
			path = path.slice(1);
		}

		return path.split('.').reduce<unknown>((acc, part) => {
			if (acc && typeof acc === 'object' && acc !== null) {
				return (acc as Record<string, unknown>)[part];
			}
			return undefined;
		}, obj);
	}

	/**
	 * Downloads a single report as a formatted JSON file
	 * Fetches the full report data from the server before downloading
	 * The filename includes the date, report type, namespace (if available), and report name
	 * @param report The report object to download
	 */
	async function downloadReport(report: Report) {
		// Create a filename with date, report type, namespace (if available), and report name
		const date = new Date().toISOString().split('T')[0];
		const namespace = report.metadata.namespace ? `${report.metadata.namespace}_` : '';
		const filename = `${date}_${reportType}_${namespace}${report.metadata.name}.json`;

		try {
			// Construct the API endpoint URL for the full report
			let apiUrl;
			if (report.metadata.namespace) {
				// Namespaced resource
				apiUrl = `/api/reports/namespace/${report.metadata.namespace}/${reportType}/${report.metadata.name}`;
			} else {
				// Cluster-scoped resource
				apiUrl = `/api/reports/cluster/${reportType}/${report.metadata.name}`;
			}

			// Fetch the full report data from the server
			const response = await fetch(apiUrl);
			if (!response.ok) {
				throw new Error(`Failed to fetch report: ${response.statusText}`);
			}

			// Get the full report data
			const fullReportData = await response.json();

			// Convert report to formatted JSON string
			const jsonStr = JSON.stringify(fullReportData, null, 2);

			// Create and trigger download
			const blob = new Blob([jsonStr], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			a.click();
			URL.revokeObjectURL(url); // Clean up to avoid memory leaks
		} catch (error: unknown) {
			if (error instanceof Error) {
				console.error('Error downloading report:', error);
				alert(`Failed to download report: ${error.message}`);
			} else {
				console.error('Unknown error occurred:', error);
				alert('Failed to download report: An unknown error occurred.');
			}
		}
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
			const numA = Number(valueA);
			const numB = Number(valueB);
			return direction === 'asc' ? numA - numB : numB - numA;
		} else {
			const strA = String(valueA).toLowerCase();
			const strB = String(valueB).toLowerCase();
			return direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
		}
	}

	// Filter and sort the reports
	let filteredReports = $derived(
		reports
			.filter((report) => {
				if (!searchTerm) return true;
				const term = searchTerm.toLowerCase();
				let values: unknown[] = [];

				if (showNamespace && report.metadata?.namespace) {
					values.push(report.metadata.namespace);
				}
				if (report.metadata?.name) {
					values.push(report.metadata.name);
				}

				tableColumns.forEach((column) => {
					const value = column.value.includes('.')
						? get(report, column.value)
						: report[column.value];
					if (value !== undefined && value !== null) {
						values.push(value);
					}
				});

				return values.some((val) => String(val).toLowerCase().includes(term));
			})
			.sort((a, b) => {
				if (!sortColumn) return 0;
				return compareValues(a, b, sortColumn, sortDirection);
			})
	);

	// Using a function instead of a derived store to avoid the error
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

	const tightTableClasses = {
		wrapper: 'max-w-full overflow-x-auto',
		table: 'w-full table-compact',
		cell: 'px-2 py-1 text-sm whitespace-nowrap overflow-hidden text-ellipsis',
		badge: 'py-0.5 px-1 text-xs',
		button: 'py-1 px-2 text-xs'
	};

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

	/**
	 * Helper function to trigger a file download in the browser
	 * @param content The content of the file to download
	 * @param filename The name of the file to download
	 * @param mimeType The MIME type of the file (e.g., 'text/csv', 'application/json')
	 */
	function downloadFile(content: string, filename: string, mimeType: string) {
		// Create a blob with the content and MIME type
		const blob = new Blob([content], { type: mimeType });

		// Create a temporary URL for the blob
		const url = URL.createObjectURL(blob);

		// Create and trigger a download link
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();

		// Clean up to avoid memory leaks
		URL.revokeObjectURL(url);
	}

	/**
	 * Exports all filtered reports in the specified format (CSV, Markdown, or JSON)
	 * The filename includes the date and report type
	 * @param format The format to export ('csv', 'markdown', or 'json')
	 */
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

		// Trigger download of the generated file
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
	<P class="text-center">No {reportType} reports found.</P>
{:else}
	<div class={tightTableClasses.wrapper}>
		<div class="mb-4 flex justify-between">
			<div class="flex flex-col">
				<ButtonGroup>
					<Button onclick={() => exportData('csv')}>Export All as CSV</Button>
					<Button onclick={() => exportData('markdown')}>Export All as Markdown</Button>
					<Button onclick={() => exportData('json')}>Export All as JSON</Button>
				</ButtonGroup>
				<span class="mt-1 text-xs text-gray-500"
					>Export all filtered reports in the selected format</span
				>
			</div>

			<!-- Add the refresh button -->
			<div>
				<Button color="blue" onclick={refreshReports} disabled={isRefreshing}>
					{#if isRefreshing}
						<span class="mr-2 inline-block animate-spin">↻</span>Refreshing...
					{:else}
						<span class="mr-2">↻</span>Hard Refresh
					{/if}
				</Button>
				<span class="mt-1 block text-xs text-gray-500">
					Clears cache and fetches fresh data from Kubernetes
				</span>
			</div>
		</div>
		<TableSearch placeholder="Search reports" hoverable={true} bind:inputValue={searchTerm}>
			<TableHead>
				{#each getHeadItems() as header}
					<th
						onclick={() => toggleSort(header)}
						class="cursor-pointer bg-gray-100 px-2 py-1 text-sm transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
					>
						<div class="flex items-center gap-1">
							{header}
							{#if sortColumn === header}
								{sortDirection === 'asc' ? '▲' : '▼'}
							{/if}
						</div>
					</th>
				{/each}
			</TableHead>
			<TableBody class={tightTableClasses.table}>
				{#if filteredReports.length === 0}
					<TableBodyRow>
						<TableBodyCell colspan={getHeadItems().length} class={tightTableClasses.cell}>
							<P class="text-center">No matching {reportType} reports found.</P>
						</TableBodyCell>
					</TableBodyRow>
				{:else}
					{#each filteredReports as report (report.metadata.uid)}
						<TableBodyRow class="cursor-pointer">
							<TableBodyCell class={tightTableClasses.cell}>
								<span>
									{report?.metadata?.namespace || 'N/A'}
								</span>
								<br />
								<span title={report.metadata.name}>
									{report.metadata.name}
								</span>
							</TableBodyCell>
							{#each tableColumns as column}
								<TableBodyCell class={tightTableClasses.cell}>
									{#if column.value.includes('.')}
										{#if column.color}
											<Badge color={column.color} class={tightTableClasses.badge}>
												{String(get(report, column.value) ?? 'N/A')}
											</Badge>
										{:else}
											<span title={String(get(report, column.value) ?? 'N/A')}>
												{String(get(report, column.value) ?? 'N/A')}
											</span>
										{/if}
									{:else if column.color}
										<Badge color={column.color} class={tightTableClasses.badge}>
											{String(report[column.value] ?? 'N/A')}
										</Badge>
									{:else}
										<span title={String(report[column.value] ?? 'N/A')}>
											{String(report[column.value] ?? 'N/A')}
										</span>
									{/if}
								</TableBodyCell>
							{/each}
							<TableBodyCell class={tightTableClasses.cell}>
								<div class="flex flex-wrap gap-1">
									<Button
										href={generateLink(report)}
										color="blue"
										size="sm"
										class={tightTableClasses.button}
									>
										Details
									</Button>
									<Button
										color="green"
										size="sm"
										class={tightTableClasses.button}
										onclick={() => {
											downloadReport(report).catch((err) => {
												console.error('Error in download handler:', err);
											});
										}}
										title="Download full report as a JSON file"
									>
										Download JSON
									</Button>
								</div>
							</TableBodyCell>
						</TableBodyRow>
					{/each}
				{/if}
			</TableBody>
		</TableSearch>
	</div>
{/if}
<Modal
	title="Report JSON"
	{modalStatus}
	{closeModal}
	size="xl"
	outsideClose={false}
	params={{ duration: 500 }}
>
	{#if selectedReport}
		<pre
			class="max-h-[70vh] overflow-auto whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
      {JSON.stringify(selectedReport, null, 2)}
    </pre>
	{/if}
</Modal>
