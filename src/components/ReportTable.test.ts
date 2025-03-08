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

// Mock URL.createObjectURL and URL.revokeObjectURL
URL.createObjectURL = vi.fn().mockReturnValue('mock-url');
URL.revokeObjectURL = vi.fn();

// Mock document.createElement and element.click
const mockAnchorElement = {
	href: '',
	download: '',
	click: vi.fn()
};
vi.spyOn(document, 'createElement').mockImplementation((tag) => {
	if (tag === 'a') return mockAnchorElement as unknown as HTMLElement;
	return document.createElement(tag);
});

describe('ReportTable Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAnchorElement.href = '';
		mockAnchorElement.download = '';
		mockAnchorElement.click.mockReset();
	});

	afterEach(() => {
		vi.resetAllMocks();
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

		// Check if report data is rendered
		expect(screen.getByText('default')).toBeInTheDocument();
		expect(screen.getByText('test-report-1')).toBeInTheDocument();
		expect(screen.getByText('kube-system')).toBeInTheDocument();
		expect(screen.getByText('test-report-2')).toBeInTheDocument();
		expect(screen.getByText('N/A')).toBeInTheDocument(); // For the namespace of test-report-3
		expect(screen.getByText('test-report-3')).toBeInTheDocument();
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

		// Get the search input
		const searchInput = document.querySelector(
			'input[placeholder="Search reports"]'
		) as HTMLInputElement;
		expect(searchInput).not.toBeNull();

		// Search for a specific report
		await fireEvent.input(searchInput, { target: { value: 'test-report-1' } });

		// Check if only the matching report is displayed
		expect(screen.getByText('test-report-1')).toBeInTheDocument();
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

		// Check if sorting indicator is displayed
		expect(criticalHeader.textContent).toContain('▲');

		// Click again to reverse sort order
		await fireEvent.click(criticalHeader);
		expect(criticalHeader.textContent).toContain('▼');
	});

	it('exports data in CSV format', async () => {
		render(ReportTable, {
			props: {
				reports: mockReports,
				reportType: 'vulnerability',
				columns: mockColumns
			}
		});

		// Click on the CSV export button
		const csvButton = screen.getByText('CSV');
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

		// Click on the Markdown export button
		const mdButton = screen.getByText('Markdown');
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

		// Click on the JSON export button
		const jsonButton = screen.getByText('JSON');
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

		// Find all Details buttons
		const detailsButtons = screen.getAllByText('Details');

		// Check if the links are correctly generated
		expect(detailsButtons[0].getAttribute('href')).toBe(
			'/vulnerability/namespace/default/test-report-1'
		);
		expect(detailsButtons[1].getAttribute('href')).toBe(
			'/vulnerability/namespace/kube-system/test-report-2'
		);
		expect(detailsButtons[2].getAttribute('href')).toBe('/vulnerability/cluster/test-report-3');
	});
});
