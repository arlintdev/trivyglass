<script lang="ts">
	import ReportHeader from '../../components/ReportHeader.svelte';
	import ReportTable from '../../components/ReportTable.svelte';

	// data now includes the dynamic columns from the CRD
	export let data: {
		manifests: any[];
		clusterName: string;
		resource: string;
		
	};

	
	let summaryCounts = {};
	let showSummary = true;

	// Loop through the keys and find summary counts of anything that has a value that is integer
	for ( const manifest of data.manifests ) {
		for ( const key in manifest ) {
			if ( typeof manifest[key] === 'number' ) {
				if ( !summaryCounts[key] ) {
					summaryCounts[key] = 0;
				}
				summaryCounts[key] += manifest[key];
			}
		}
	}
	console.log(summaryCounts);
</script>

<ReportHeader title={data.resource} summaryCounts={summaryCounts} showSummary={showSummary} />

<!-- Pass the dynamic columns directly -->
<ReportTable
	reports={data.manifests}
	reportType={data.resource}
/>
