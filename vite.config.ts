import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	resolve: {
		conditions: ['browser']
	},
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./vitest-setup-client.ts'],
		include: ['src/**/*.{test,spec}.{js,ts,svelte}'],
		coverage: {
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules/', '.svelte-kit/']
		},
		// Suppress unhandled errors from jsdom inline scripts (e.g. Flowbite DarkMode matchMedia)
		onUnhandledError(error) {
			if (error instanceof TypeError && error.message.includes('matchMedia')) {
				return;
			}
			throw error;
		}
	}
});
