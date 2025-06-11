import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./vitest-setup-client.ts'],
		include: ['src/**/*.{test,spec}.{js,ts,svelte}'],
		coverage: {
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules/', '.svelte-kit/']
		},
		// Add these options to fix Svelte component testing
		server: {
			deps: {
				inline: [/svelte/]
			}
		}
	}
});
