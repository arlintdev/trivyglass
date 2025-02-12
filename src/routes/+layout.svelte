<script lang="ts">
	let { children } = $props();
	import '../app.css';
	import NavBar from '../components/NavBar.svelte';
	import { ChartOutline, GridSolid, MailBoxSolid, UserSolid } from 'flowbite-svelte-icons';
</script>

<div class="flex flex-col h-screen">


	<NavBar ></NavBar>
	<div class="flex flex-1">
            <aside class="w-64 bg-gray-100 dark:bg-gray-900 p-4">
                <ul>
                    <li><a href="/" class="block py-2">Home</a></li>
                    <li><a href="/about" class="block py-2">About</a></li>
                    <li><a href="/contact" class="block py-2">Contact</a></li>
                </ul>
            </aside>
		<div class="flex-1 overflow-auto px-4">
			<div class="rounded-lg border-2 border-dashed border-gray-200 p-4 dark:border-gray-700">
				{@render children()}
			</div>
		</div>
	</div>
</div>
