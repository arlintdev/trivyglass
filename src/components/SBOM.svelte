<script lang="ts">
  import { Card, Input } from 'svelte-5-ui-lib';
  
  // Props to receive components and bindable text
  let { 
    components,
    text = $bindable('')
  } = $props();
  
  // Type order for sorting
  const typeOrder = {
    'application': 3,
    'library': 2,
    'operating-system': 1
  };
  
  // Type color mapping
  const typeColors = {
    'application': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'library': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'operating-system': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  };
  
  // Filter components using $derived
  const filteredComponents = $derived(
    components.components.filter(component => {
      const term = text.toLowerCase();
      return (
        component.name?.toLowerCase().includes(term) ||
        component['bom-ref']?.toLowerCase().includes(term) ||
        component.type?.toLowerCase().includes(term) ||
        component.version?.toLowerCase().includes(term) ||
        component.purl?.toLowerCase().includes(term) ||
        component.supplier?.name?.toLowerCase().includes(term) ||
        component.properties?.some(prop => 
          prop.name.toLowerCase().includes(term) || 
          prop.value.toLowerCase().includes(term)
        )
      );
    })
  );
</script>

<div class="p-6 min-h-screen">
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
        class="border border-gray-200 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 
               dark:border-gray-700 overflow-hidden transform hover:-translate-y-1"
      >
        <div class="flex flex-col h-full">
          <!-- Header with type color -->
          <div class="{typeColors[component.type]} p-4">
            <h3 class="text-lg font-semibold truncate" title={component.name}>
              {component.name}
            </h3>
          </div>

          <!-- Content -->
          <div class="p-4 space-y-3 text-gray-700 dark:text-gray-300 flex-1">
            <div class="space-y-2 text-sm">
              <p class="whitespace-normal break-words"><strong>ID:</strong> {component['bom-ref']}</p>
              <p>
                <strong>Type:</strong>
                <span class="inline-block px-2 py-1 rounded-full text-xs font-medium 
                            {typeColors[component.type]}">
                  {component.type}
                </span>
              </p>
              {#if component.version}
                <p class="whitespace-normal break-words"><strong>Version:</strong> {component.version}</p>
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
                  <p class="text-xs whitespace-normal break-words">
                    {prop.name}: <span class="text-gray-500 dark:text-gray-400">{prop.value}</span>
                  </p>
                {/each}
              </div>
            {/if}

            <!-- Supplier (if available) -->
            {#if component.supplier?.name}
              <div class="space-y-1 text-sm">
                <p class="whitespace-normal break-words"><strong>Supplier:</strong> {component.supplier.name}</p>
              </div>
            {/if}
          </div>
        </div>
      </Card>
    {/each}
  </div>
</div>