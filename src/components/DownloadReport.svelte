<script lang="ts">
	export let data: any;
	import { Button } from 'svelte-5-ui-lib';

	import { DownloadSolid } from 'flowbite-svelte-icons';
	function downloadReport() {
		const date = new Date().toISOString().split('T')[0].replace(/-/g, '.');
		const kind = data.manifest.kind.toLowerCase();
		const namespace = data.manifest.metadata.namespace
			? `${data.manifest.metadata.namespace}_`
			: '';
		const name = data.manifest.metadata.name;
		const filename = `${date}_${kind}_${namespace}${name}.json`;
		const jsonStr = JSON.stringify(data, null, 2);
		const blob = new Blob([jsonStr], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<header class="mb-8 text-right">
	<Button onclick={downloadReport} class="btn btn-primary">
		<DownloadSolid />
	</Button>
</header>
