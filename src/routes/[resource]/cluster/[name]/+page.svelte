<script lang="ts">
	import ReportPage from '../../../../components/ReportPage.svelte';
	// Props to receive report data
	const { data } = $props();
</script>

<ReportPage {data} />
