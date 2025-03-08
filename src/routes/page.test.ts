import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

// Mock $app/stores
vi.mock('$app/stores', () => {
	return {
		page: {
			subscribe: vi.fn((callback) => {
				callback({ url: { pathname: '/' } });
				return () => {};
			})
		},
		navigating: { subscribe: vi.fn() },
		updated: { subscribe: vi.fn() }
	};
});

describe('Main Page Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the main page with heading', () => {
		render(Page);
		expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
	});
});
