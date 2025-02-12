<script lang="ts">
	let { children } = $props();
	import '../app.css';
	import NavBar from '../components/NavBar.svelte';
	import { ChartOutline, GridSolid, MailBoxSolid, UserSolid } from 'flowbite-svelte-icons';
</script>

<div class="flex flex-col h-screen">


	<NavBar ></NavBar>
	<div class="flex flex-1">

		<div class="flex-1 overflow-auto px-4">
			<div class="rounded-lg border-2 border-dashed border-gray-200 p-4 dark:border-gray-700">
				{@render children()}
			</div>
		</div>
	</div>
</div>