<script lang="ts">
	interface Property {
		name: string;
		value: string;
	}

	interface Supplier {
		name: string;
	}

	interface Component {
		name: string;
		'bom-ref': string;
		type: 'application' | 'library' | 'operating-system';
		version?: string;
		purl?: string;
		supplier?: Supplier;
		properties?: Property[];
	}

	interface ComponentsData {
		bomFormat: string;
		components: Component[];
	}

	interface Props {
		components: ComponentsData;
		text?: string;
	}

	let { components, text = $bindable('') }: Props = $props();

	function typeTag(t: string): string {
		switch (t) {
			case 'application':
				return 'active';
			case 'library':
				return 'info';
			default:
				return 'unknown';
		}
	}

	const filteredComponents = $derived(
		components.components.filter((c) => {
			const term = text.toLowerCase();
			return (
				c.name?.toLowerCase().includes(term) ||
				c['bom-ref']?.toLowerCase().includes(term) ||
				c.type?.toLowerCase().includes(term) ||
				c.version?.toLowerCase().includes(term) ||
				c.purl?.toLowerCase().includes(term) ||
				c.supplier?.name?.toLowerCase().includes(term) ||
				c.properties?.some(
					(p) => p.name.toLowerCase().includes(term) || p.value.toLowerCase().includes(term)
				)
			);
		})
	);
</script>

<div style="padding: var(--space-lg) 0;">
	<div style="margin-bottom: var(--space-lg);">
		<input
			class="nd-input-bordered"
			type="text"
			bind:value={text}
			placeholder="Search components..."
			style="width: 100%; max-width: 500px; margin-bottom: var(--space-md);"
		/>
		<h2 class="nd-heading">
			Components
			<span class="nd-caption" style="margin-left: var(--space-sm);"
				>({filteredComponents.length} found)</span
			>
			<span class="nd-caption" style="margin-left: var(--space-md);"
				>FORMAT: {components.bomFormat}</span
			>
		</h2>
	</div>

	<div
		style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--space-md);"
	>
		{#each filteredComponents as component}
			<div class="nd-card" style="display: flex; flex-direction: column; gap: var(--space-sm);">
				<div
					style="display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-sm);"
				>
					<span
						class="nd-body-sm"
						style="color: var(--nd-text-display); font-weight: 500;"
						title={component.name}
					>
						{component.name}
					</span>
					<span class="nd-tag nd-tag-{typeTag(component.type)}">{component.type}</span>
				</div>
				<div style="display: flex; flex-direction: column; gap: var(--space-xs);">
					<p class="nd-caption" style="word-break: break-all;">
						ID: <span style="color: var(--nd-text-primary);">{component['bom-ref']}</span>
					</p>
					{#if component.version}
						<p class="nd-caption">
							VERSION: <span style="color: var(--nd-text-primary);">{component.version}</span>
						</p>
					{/if}
					{#if component.purl}
						<p class="nd-caption" style="word-break: break-all;">
							PURL: <span style="color: var(--nd-text-primary);">{component.purl}</span>
						</p>
					{/if}
				</div>
				{#if component.properties?.length}
					<div style="border-top: 1px solid var(--nd-border); padding-top: var(--space-sm);">
						<p class="nd-label" style="margin-bottom: var(--space-xs);">Properties</p>
						{#each component.properties as prop}
							<p class="nd-caption" style="word-break: break-all;">
								{prop.name}: <span style="color: var(--nd-text-disabled);">{prop.value}</span>
							</p>
						{/each}
					</div>
				{/if}
				{#if component.supplier?.name}
					<p class="nd-caption">
						SUPPLIER: <span style="color: var(--nd-text-primary);">{component.supplier.name}</span>
					</p>
				{/if}
			</div>
		{/each}
	</div>
</div>
