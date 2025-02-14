<script lang="ts">
	import ReportHeader from '../../components/ReportHeader.svelte';
	import ReportTable from '../../components/ReportTable.svelte';

	export let data: {
		reports: any[];
		clusterName: string;
	};

	let summaryCounts = {
		criticalCount: 0,
		highCount: 0,
		mediumCount: 0,
		lowCount: 0,
		noneCount: 0,
		unknownCount: 0
	};
</script>

<ReportHeader
	title="Cluster Compliance Reports"
	clusterName={data.clusterName}
	showSummary={false}
/>
<ReportTable
	reports={data.reports}
	reportType="clustercompliancereports"
	columns={[
		{ header: 'Fail Count', value: 'status.summary.failCount', color: 'red' },
		{ header: 'Pass Count', value: 'status.summary.passCount', color: 'green' }
	]}
	showSummary={false}
	showNamespace={false}
/>
