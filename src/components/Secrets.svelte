<script lang="ts">
	const { secrets } = $props();
</script>

<div style="padding: var(--space-lg) 0;">
	<h2 class="nd-heading" style="margin-bottom: var(--space-lg);">Secrets</h2>
	<div
		style="display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: var(--space-md);"
	>
		{#each secrets as secret}
			<div class="nd-card" style="display: flex; flex-direction: column; gap: var(--space-sm);">
				<span class="nd-subheading" style="color: var(--nd-text-display);">{secret.title}</span>
				<div style="display: flex; flex-direction: column; gap: var(--space-xs);">
					<p class="nd-caption">
						CATEGORY: <span style="color: var(--nd-text-primary);">{secret.category}</span>
					</p>
					<p class="nd-caption" style="word-break: break-all;">
						MATCH: <span style="color: var(--nd-text-primary);">{secret.match}</span>
					</p>
					<p class="nd-caption">
						RULE ID: <span style="color: var(--nd-text-primary);">{secret.ruleID}</span>
					</p>
					<p class="nd-caption">
						SEVERITY: <span
							class="nd-tag nd-tag-{secret.severity?.toLowerCase() === 'critical'
								? 'critical'
								: secret.severity?.toLowerCase() === 'high'
									? 'high'
									: secret.severity?.toLowerCase() === 'medium'
										? 'medium'
										: 'low'}">{secret.severity}</span
						>
					</p>
					<p class="nd-caption">
						TARGET: <span style="color: var(--nd-text-primary);">{secret.target}</span>
					</p>
				</div>
			</div>
		{/each}
	</div>
</div>
