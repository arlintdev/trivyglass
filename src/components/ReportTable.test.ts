import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ReportTable from './ReportTable.svelte';

// Mock sample report data
const mockReports = [
	{
		metadata: {
			name: 'test-report-1',
			namespace: 'default',
			uid: '123'
		},
		Summary: 'Test Summary 1',
		Critical: 5,
		High: 10,
		Medium: 15,
		Low: 20
	},
	{
		metadata: {
			name: 'test-report-2',
			namespace: 'kube-system',
			uid: '456'
		},
		Summary: 'Test Summary 2',
		Critical: 2,
		High: 4,
		Medium: 6,
		Low: 8
	},
	{
		metadata: {
			name: 'test-report-3',
			uid: '789'
		},
		Summary: 'Test Summary 3',
		Critical: 0,
		High: 3,
		Medium: 7,
		Low: 12
	}
];

// Mock columns
const mockColumns = [
	{ name: 'Summary', jsonPath: 'Summary' },
	{ name: 'Critical', jsonPath: 'Critical' },
	{ name: 'High', jsonPath: 'High' },
	{ name: 'Medium', jsonPath: 'Medium' },
	{ name: 'Low', jsonPath: 'Low' }
];

// Mock document.createElement and element.click
const mockAnchorElement = {
	href: '',
	download: '',
	click: vi.fn()
};
const originalCreateElement = document.createElement.bind(document);

describe('ReportTable Component', () => {
	let createElementSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockAnchorElement.href = '';
		mockAnchorElement.download = '';
		mockAnchorElement.click.mockReset();

		// Set up mocks that get cleared by global resetAllMocks
		URL.createObjectURL = vi.fn().mockReturnValue('mock-url');
		URL.revokeObjectURL = vi.fn();
		createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
			if (tag === 'a') return mockAnchorElement as unknown as HTMLElement;
			return originalCreateElement(tag);
		});
	});

	afterEach(() => {
		createElementSpy?.mockRestore();
	});

	it('renders the report table with data', () => {
		render(ReportTable, {
			props: {
				reports: mockReports,
				reportType: 'vulnerability',
				columns: mockColumns
			}
		});

		// Check if table headers are rendered
		expect(screen.getByText('Namespace / Name')).toBeInTheDocument();
		expect(screen.getByText('Summary')).toBeInTheDocument();
		expect(screen.getByText('Critical')).toBeInTheDocument();
		expect(screen.getByText('High')).toBeInTheDocument();

		// Check if report data is rendered (getAllByText since desktop table + mobile cards both render)
		expect(screen.getAllByText('default').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('test-report-1').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('kube-system').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('test-report-2').length).toBeGreaterThanOrEqual(1);
		expect(screen.getAllByText('test-report-3').length).toBeGreaterThanOrEqual(1);
	});

	it('displays a message when no reports are found', () => {
		render(ReportTable, {
			props: {
				reports: [],
				reportType: 'vulnerability',
				columns: mockColumns
			}
		});

		expect(screen.getByText('No vulnerability reports found.')).toBeInTheDocument();
	});

	it('filters reports based on search term', async () => {
		render(ReportTable, {
			props: {
				reports: mockReports,
				reportType: 'vulnerability',
				columns: mockColumns
			}
		});

		// Get the search input (placeholder changed to "Search reports...")
		const searchInput = document.querySelector(
			'input[placeholder="Search reports..."]'
		) as HTMLInputElement;
		expect(searchInput).not.toBeNull();

		// Search for a specific report
		await fireEvent.input(searchInput, { target: { value: 'test-report-1' } });

		// Check if only the matching report is displayed (in both desktop and mobile views)
		expect(screen.getAllByText('test-report-1').length).toBeGreaterThanOrEqual(1);
		expect(screen.queryByText('test-report-2')).not.toBeInTheDocument();
		expect(screen.queryByText('test-report-3')).not.toBeInTheDocument();
	});

	it('sorts reports when clicking on column headers', async () => {
		render(ReportTable, {
			props: {
				reports: mockReports,
				reportType: 'vulnerability',
				columns: mockColumns
			}
		});

		// Click on the Critical column header to sort
		const criticalHeader = screen.getByText('Critical');
		await fireEvent.click(criticalHeader);

		// Check if sorting indicator is displayed (Unicode triangle)
		expect(criticalHeader.textContent).toContain('\u25B2');

		// Click again to reverse sort order
		await fireEvent.click(criticalHeader);
		expect(criticalHeader.textContent).toContain('\u25BC');
	});

	it('exports data in CSV format', async () => {
		render(ReportTable, {
			props: {
				reports: mockReports,
				reportType: 'vulnerability',
				columns: mockColumns
			}
		});

		// Button text changed to "Export CSV"
		const csvButton = screen.getByText('Export CSV');
		await fireEvent.click(csvButton);

		// Check if download was triggered
		expect(mockAnchorElement.click).toHaveBeenCalled();
		expect(mockAnchorElement.download).toContain('vulnerability_reports.csv');
		expect(URL.createObjectURL).toHaveBeenCalled();
		expect(URL.revokeObjectURL).toHaveBeenCalled();
	});

	it('exports data in Markdown format', async () => {
		render(ReportTable, {
			props: {
				reports: mockReports,
				reportType: 'vulnerability',
				columns: mockColumns
			}
		});

		// Button text changed to "Export MD"
		const mdButton = screen.getByText('Export MD');
		await fireEvent.click(mdButton);

		// Check if download was triggered
		expect(mockAnchorElement.click).toHaveBeenCalled();
		expect(mockAnchorElement.download).toContain('vulnerability_reports.md');
	});

	it('exports data in JSON format', async () => {
		render(ReportTable, {
			props: {
				reports: mockReports,
				reportType: 'vulnerability',
				columns: mockColumns
			}
		});

		// Button text changed to "Export JSON"
		const jsonButton = screen.getByText('Export JSON');
		await fireEvent.click(jsonButton);

		// Check if download was triggered
		expect(mockAnchorElement.click).toHaveBeenCalled();
		expect(mockAnchorElement.download).toContain('vulnerability_reports.json');
	});

	it('generates correct links for reports', () => {
		render(ReportTable, {
			props: {
				reports: mockReports,
				reportType: 'vulnerability',
				columns: mockColumns
			}
		});

		// Find all Details links (now <a> tags instead of buttons)
		const detailsLinks = screen.getAllByText('Details');

		// Check if the links are correctly generated
		expect(detailsLinks[0].getAttribute('href')).toBe(
			'/vulnerability/namespace/default/test-report-1'
		);
		expect(detailsLinks[1].getAttribute('href')).toBe(
			'/vulnerability/namespace/kube-system/test-report-2'
		);
		expect(detailsLinks[2].getAttribute('href')).toBe('/vulnerability/cluster/test-report-3');
	});
});
