import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent, waitFor } from '@testing-library/react';
import { forwardRef, useImperativeHandle } from 'react';
import type { ToolParams } from '@/lib/tool-params';
import type { FieldOrderEditorHandle, PageListItem } from '@/components/field-management';

const {
  mockRouterBack,
  mockFetchPageFieldData,
  mockSavePageFieldOrder,
  mockToastSuccess,
  mockToastError,
  mockGetSavePayload,
  mockMoveHiddenToOther,
  mockHideAllSeparators,
  mockOnSelectHolder,
} = vi.hoisted(() => ({
  mockRouterBack: vi.fn(),
  mockFetchPageFieldData: vi.fn(),
  mockSavePageFieldOrder: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockGetSavePayload: vi.fn(),
  mockMoveHiddenToOther: vi.fn(),
  mockHideAllSeparators: vi.fn(),
  mockOnSelectHolder: { current: undefined as ((page: PageListItem) => void) | undefined },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockRouterBack }),
}));

vi.mock('@/components/field-management/actions', () => ({
  fetchPageFieldData: mockFetchPageFieldData,
  savePageFieldOrder: mockSavePageFieldOrder,
}));

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

vi.mock('@/components/tool', () => ({
  ToolContainer: (props: Record<string, unknown>) => (
    <div data-testid="tool-container">
      <div data-testid="footer-extra">{props.footerExtra as React.ReactNode}</div>
      {!props.hideFooter && (
        <button data-testid="save-button" onClick={props.onSave as () => void}>
          {props.saveLabel as string}
        </button>
      )}
      <button data-testid="close-button" onClick={props.onClose as () => void}>
        Close
      </button>
      {props.children as React.ReactNode}
    </div>
  ),
}));

vi.mock('@/components/field-management', () => ({
  PageSearch: ({ onSelect }: { onSelect: (page: PageListItem) => void }) => {
    mockOnSelectHolder.current = onSelect;
    return <div data-testid="page-search" />;
  },
}));

vi.mock('@/components/field-management/field-order-editor', () => ({
  FieldOrderEditor: forwardRef<FieldOrderEditorHandle, { onDirtyChange: (dirty: boolean) => void }>(
    function MockFieldOrderEditor({ onDirtyChange }, ref) {
      useImperativeHandle(ref, () => ({
        getSavePayload: mockGetSavePayload,
        moveHiddenToOther: mockMoveHiddenToOther,
        hideAllSeparators: mockHideAllSeparators,
      }));
      return (
        <div data-testid="field-order-editor">
          <button data-testid="mark-dirty" onClick={() => onDirtyChange(true)}>
            mark dirty
          </button>
        </div>
      );
    }
  ),
}));

import { FieldManagement } from './field-management';

const params: ToolParams = { pageID: 292 };
const page: PageListItem = { Page_ID: 292, Display_Name: 'Contacts', Table_Name: 'Contacts' };

async function selectPage() {
  render(<FieldManagement params={params} />);
  await act(async () => {
    mockOnSelectHolder.current!(page);
  });
}

describe('FieldManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSavePayload.mockReturnValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the page search in step 1', () => {
    render(<FieldManagement params={params} />);
    expect(screen.getByTestId('page-search')).toBeInTheDocument();
  });

  it('loads field data and renders the editor after selecting a page', async () => {
    mockFetchPageFieldData.mockResolvedValueOnce({
      fields: [{ Page_Field_ID: 1 }],
      tableMetadata: null,
    });

    await selectPage();

    await waitFor(() => {
      expect(screen.getByTestId('field-order-editor')).toBeInTheDocument();
    });
    expect(mockFetchPageFieldData).toHaveBeenCalledWith(292, 'Contacts');
    expect(screen.getAllByText('Contacts').length).toBeGreaterThan(0);
  });

  it('shows a loading indicator while field data is being fetched', async () => {
    let resolveFetch: (value: { fields: unknown[]; tableMetadata: null }) => void = () => {};
    mockFetchPageFieldData.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    render(<FieldManagement params={params} />);
    await act(async () => {
      mockOnSelectHolder.current!(page);
    });

    expect(screen.getByText('Loading fields...')).toBeInTheDocument();

    await act(async () => {
      resolveFetch({ fields: [], tableMetadata: null });
    });

    expect(screen.queryByText('Loading fields...')).not.toBeInTheDocument();
  });

  it('shows "No fields found" when fields array is empty', async () => {
    mockFetchPageFieldData.mockResolvedValueOnce({ fields: [], tableMetadata: null });

    await selectPage();

    await waitFor(() => {
      expect(screen.getByText('No fields found for this page.')).toBeInTheDocument();
    });
  });

  it('shows a failure message when fetchPageFieldData rejects', async () => {
    mockFetchPageFieldData.mockRejectedValueOnce(new Error('boom'));

    await selectPage();

    await waitFor(() => {
      expect(screen.getByText('Failed to load field data.')).toBeInTheDocument();
    });
  });

  it('shows column count when tableMetadata has Columns', async () => {
    mockFetchPageFieldData.mockResolvedValueOnce({
      fields: [{ Page_Field_ID: 1 }],
      tableMetadata: { Table_Name: 'Contacts', Columns: [{ Name: 'A' }, { Name: 'B' }] },
    });

    await selectPage();

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('returns to step 1 and clears field data when Back is clicked', async () => {
    mockFetchPageFieldData.mockResolvedValueOnce({
      fields: [{ Page_Field_ID: 1 }],
      tableMetadata: null,
    });

    await selectPage();
    await waitFor(() => expect(screen.getByTestId('field-order-editor')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Back'));

    expect(screen.getByTestId('page-search')).toBeInTheDocument();
  });

  it('calls router.back() when close is triggered', () => {
    render(<FieldManagement params={params} />);
    fireEvent.click(screen.getByTestId('close-button'));
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('shows the "Unsaved changes" badge once the editor reports dirty', async () => {
    mockFetchPageFieldData.mockResolvedValueOnce({
      fields: [{ Page_Field_ID: 1 }],
      tableMetadata: null,
    });

    await selectPage();
    await waitFor(() => expect(screen.getByTestId('field-order-editor')).toBeInTheDocument());

    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mark-dirty'));

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('saves successfully, toasts success, refetches, and clears dirty', async () => {
    mockFetchPageFieldData.mockResolvedValueOnce({
      fields: [{ Page_Field_ID: 1 }],
      tableMetadata: null,
    });
    await selectPage();
    await waitFor(() => expect(screen.getByTestId('field-order-editor')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('mark-dirty'));
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    mockSavePageFieldOrder.mockResolvedValueOnce({ success: true });
    mockFetchPageFieldData.mockResolvedValueOnce({
      fields: [{ Page_Field_ID: 1 }],
      tableMetadata: null,
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('save-button'));
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Field order saved successfully');
    expect(mockFetchPageFieldData).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('toasts the service error message when save reports failure', async () => {
    mockFetchPageFieldData.mockResolvedValueOnce({
      fields: [{ Page_Field_ID: 1 }],
      tableMetadata: null,
    });
    await selectPage();
    await waitFor(() => expect(screen.getByTestId('field-order-editor')).toBeInTheDocument());

    mockSavePageFieldOrder.mockResolvedValueOnce({ success: false, error: 'nope' });

    await act(async () => {
      fireEvent.click(screen.getByTestId('save-button'));
    });

    expect(mockToastError).toHaveBeenCalledWith('nope');
  });

  it('toasts a generic failure message when the result has no error string', async () => {
    mockFetchPageFieldData.mockResolvedValueOnce({
      fields: [{ Page_Field_ID: 1 }],
      tableMetadata: null,
    });
    await selectPage();
    await waitFor(() => expect(screen.getByTestId('field-order-editor')).toBeInTheDocument());

    mockSavePageFieldOrder.mockResolvedValueOnce({ success: false });

    await act(async () => {
      fireEvent.click(screen.getByTestId('save-button'));
    });

    expect(mockToastError).toHaveBeenCalledWith('Failed to save field order');
  });

  it('toasts an unexpected-error message when savePageFieldOrder throws', async () => {
    mockFetchPageFieldData.mockResolvedValueOnce({
      fields: [{ Page_Field_ID: 1 }],
      tableMetadata: null,
    });
    await selectPage();
    await waitFor(() => expect(screen.getByTestId('field-order-editor')).toBeInTheDocument());

    mockSavePageFieldOrder.mockRejectedValueOnce(new Error('down'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('save-button'));
    });

    expect(mockToastError).toHaveBeenCalledWith('An unexpected error occurred while saving');
  });

  it('does not save when there is no selected page (footer hidden in step 1)', () => {
    render(<FieldManagement params={params} />);
    expect(screen.queryByTestId('save-button')).not.toBeInTheDocument();
  });

  it('wires Hide All Separators and Move Hidden to Other buttons to the editor handle', async () => {
    mockFetchPageFieldData.mockResolvedValueOnce({
      fields: [{ Page_Field_ID: 1 }],
      tableMetadata: null,
    });
    await selectPage();
    await waitFor(() => expect(screen.getByTestId('field-order-editor')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Hide All Separators'));
    expect(mockHideAllSeparators).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Move Hidden to Other'));
    expect(mockMoveHiddenToOther).toHaveBeenCalledTimes(1);
  });
});
