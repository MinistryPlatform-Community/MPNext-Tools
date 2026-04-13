import type { EditorConfig } from 'grapesjs';

export const STORAGE_KEY = 'mp-template-editor';

export const DEFAULT_MJML_TEMPLATE = `<mjml>
  <mj-body background-color="#f4f4f4">
    <mj-section background-color="#ffffff" padding="20px">
      <mj-column>
        <mj-text font-size="14px" color="#333333" font-family="Arial, sans-serif">
          <p>Start building your email by dragging blocks from the right panel.</p>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

export function createEditorConfig(): EditorConfig {
  return {
    fromElement: false,

    // Canvas height managed by parent container
    height: '100%',
    width: 'auto',

    // Storage: localStorage for Phase 1
    storageManager: {
      type: 'local',
      autosave: true,
      autoload: true,
      stepsBeforeSave: 1,
      options: {
        local: {
          key: STORAGE_KEY,
        },
      },
    },

    // Device manager for desktop/mobile preview
    deviceManager: {
      devices: [
        {
          name: 'Desktop',
          width: '600px',
        },
        {
          name: 'Mobile',
          width: '320px',
          widthMedia: '480px',
        },
      ],
    },

    // Disable default panels — we use a custom React toolbar
    panels: { defaults: [] },

    // Asset manager — URL input only for Phase 1
    assetManager: {
      autoAdd: true,
    },

    // Canvas config
    canvas: {
      styles: [
        'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap',
      ],
    },

    // Undo manager
    undoManager: {
      trackSelection: false,
    },
  };
}
