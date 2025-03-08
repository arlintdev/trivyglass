<script lang="ts">
	import { Card, Input } from 'svelte-5-ui-lib';

	// Define types for the component structure
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

	// Type color mapping
	const typeColors: Record<string, string> = {
		application: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
		library: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
		'operating-system': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
	};

	// Filter components using $derived
	const filteredComponents = $derived(
		components.components.filter((component: Component) => {
			const term = text.toLowerCase();
			return (
				component.name?.toLowerCase().includes(term) ||
				component['bom-ref']?.toLowerCase().includes(term) ||
				component.type?.toLowerCase().includes(term) ||
				component.version?.toLowerCase().includes(term) ||
				component.purl?.toLowerCase().includes(term) ||
				component.supplier?.name?.toLowerCase().includes(term) ||
				component.properties?.some(
					(prop: Property) =>
						prop.name.toLowerCase().includes(term) || prop.value.toLowerCase().includes(term)
				)
			);
		})
	);
</script>

<div class="min-h-screen p-6">
	<div class="mb-6">
		<Input
			size="lg"
			bind:value={text}
			placeholder="Search components by name, ID, type, version, etc."
			class="mb-4"
		/>
		<h2 class="text-2xl font-bold text-indigo-800 dark:text-indigo-200">
			Components
			<span class="text-sm font-normal text-gray-500 dark:text-gray-400">
				({filteredComponents.length} found)
			</span>
			BomFormat:
			<span class="text-sm font-normal text-gray-500 dark:text-gray-400">
				{components.bomFormat}
			</span>
		</h2>
	</div>
	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
		{#each filteredComponents as component}
			<Card
				class="transform overflow-hidden rounded-xl border border-gray-200 shadow-sm transition-all 
               duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-700"
			>
				<div class="flex h-full flex-col">
					<!-- Header with type color -->
					<div class="{typeColors[component.type] || ''} p-4">
						<h3 class="truncate text-lg font-semibold" title={component.name}>
							{component.name}
						</h3>
					</div>
					<!-- Content -->
					<div class="flex-1 space-y-3 p-4 text-gray-700 dark:text-gray-300">
						<div class="space-y-2 text-sm">
							<p class="whitespace-normal break-words">
								<strong>ID:</strong>
								{component['bom-ref']}
							</p>
							<p>
								<strong>Type:</strong>
								<span
									class="inline-block rounded-full px-2 py-1 text-xs font-medium
                            {typeColors[component.type] || ''}"
								>
									{component.type}
								</span>
							</p>
							{#if component.version}
								<p class="whitespace-normal break-words">
									<strong>Version:</strong>
									{component.version}
								</p>
							{/if}
							{#if component.purl}
								<p class="whitespace-normal break-words"><strong>PURL:</strong> {component.purl}</p>
							{/if}
						</div>
						<!-- Properties -->
						{#if component.properties?.length}
							<div class="space-y-1 text-sm">
								<p><strong>Properties:</strong></p>
								{#each component.properties as prop}
									<p class="whitespace-normal break-words text-xs">
										{prop.name}: <span class="text-gray-500 dark:text-gray-400">{prop.value}</span>
									</p>
								{/each}
							</div>
						{/if}
						<!-- Supplier (if available) -->
						{#if component.supplier?.name}
							<div class="space-y-1 text-sm">
								<p class="whitespace-normal break-words">
									<strong>Supplier:</strong>
									{component.supplier.name}
								</p>
							</div>
						{/if}
					</div>
				</div>
			</Card>
		{/each}
	</div>
</div>
