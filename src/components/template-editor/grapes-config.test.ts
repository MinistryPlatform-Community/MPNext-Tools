import { describe, it, expect } from 'vitest';
import { createEditorConfig, DEFAULT_MJML_TEMPLATE, STORAGE_KEY } from './grapes-config';

describe('grapes-config', () => {
  it('exports the shared storage key', () => {
    expect(STORAGE_KEY).toBe('mp-template-editor');
  });

  it('exports a default MJML template that is well-formed enough to contain mjml/mj-body tags', () => {
    expect(DEFAULT_MJML_TEMPLATE).toContain('<mjml>');
    expect(DEFAULT_MJML_TEMPLATE).toContain('<mj-body');
    expect(DEFAULT_MJML_TEMPLATE).toContain('</mjml>');
  });

  it('createEditorConfig returns a config wired to the shared storage key', () => {
    const config = createEditorConfig();

    expect(config.fromElement).toBe(false);
    expect(config.height).toBe('100%');
    expect(config.storageManager).toMatchObject({
      type: 'local',
      autosave: true,
      autoload: true,
      stepsBeforeSave: 1,
      options: {
        local: {
          key: STORAGE_KEY,
        },
      },
    });
  });

  it('createEditorConfig includes Desktop and Mobile devices', () => {
    const config = createEditorConfig();
    const devices = config.deviceManager?.devices ?? [];
    const names = devices.map((d) => d.name);
    expect(names).toEqual(['Desktop', 'Mobile']);
  });

  it('createEditorConfig disables default panels (custom React toolbar is used instead)', () => {
    const config = createEditorConfig();
    expect(config.panels).toEqual({ defaults: [] });
  });

  it('createEditorConfig returns a fresh object on each call', () => {
    const first = createEditorConfig();
    const second = createEditorConfig();
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });
});
