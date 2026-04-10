<script lang="ts">
	interface Manifest {
		kind: string;
		metadata: {
			namespace?: string;
			name: string;
		};
	}

	interface Props {
		data: { manifest: Manifest };
	}

	let { data }: Props = $props();

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

<div style="text-align: right; margin-bottom: var(--space-lg);">
	<button class="nd-btn nd-btn-secondary nd-btn-sm" onclick={downloadReport}>
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="7 10 12 15 17 10" />
			<line x1="12" y1="15" x2="12" y2="3" />
		</svg>
		Download
	</button>
</div>
