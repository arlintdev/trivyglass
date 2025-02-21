<script lang="ts">
	import ReportHeader from '../../components/ReportHeader.svelte';
	import ReportTable from '../../components/ReportTable.svelte';

	// data now includes the dynamic columns from the CRD
	export let data: {
		reports: any[];
		clusterName: string;
		resource: string;
		columns: { name: string; jsonPath: string; type: string; description?: string; priority?: number }[];
	};

	let summaryCounts = {
		criticalCount: 0,
		highCount: 0,
		mediumCount: 0,
		lowCount: 0,
		noneCount: 0,
		unknownCount: 0
	};

	let showSummary = false;

	// Calculate summary counts (if these fields are still relevant)
	for (const report of data.reports) {
		if (report.report?.summary === undefined) {
			continue;
		}
		showSummary = true;
		summaryCounts.criticalCount += report.report.summary.criticalCount;
		summaryCounts.highCount += report.report.summary.highCount;
		summaryCounts.mediumCount += report.report.summary.mediumCount;
		summaryCounts.lowCount += report.report.summary.lowCount;
		summaryCounts.noneCount += report.report.summary.noneCount;
		summaryCounts.unknownCount += report.report.summary.unknownCount;
	}
</script>

<ReportHeader title={data.resource} summaryCounts={summaryCounts} showSummary={showSummary} />

<!-- Pass the dynamic columns directly -->
<ReportTable
	reports={data.reports}
	reportType={data.resource}
	columns={data.columns}
/>
