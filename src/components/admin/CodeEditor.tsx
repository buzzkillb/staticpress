import { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { json } from '@codemirror/lang-json';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

export type CodeLanguage = 'css' | 'html' | 'json';

interface CodeEditorProps {
  value: string;
  language: CodeLanguage;
  onChange: (value: string) => void;
  className?: string;
  readOnly?: boolean;
}

const languages = [
  { id: 'css' as const, label: 'CSS' },
  { id: 'html' as const, label: 'HTML' },
  { id: 'json' as const, label: 'JSON' },
];

const languageCompartment = new Compartment();
const readOnlyCompartment = new Compartment();

const baseTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '14px',
  },
  '.cm-content': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    padding: '12px 0',
  },
  '.cm-gutters': {
    backgroundColor: 'inherit',
    borderRight: 'none',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 16px',
    minWidth: '48px',
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
});

const lightTheme = EditorView.theme({
  '&': {
    backgroundColor: '#ffffff',
    color: '#1f2937',
  },
  '.cm-gutters': {
    backgroundColor: '#f9fafb',
    color: '#9ca3af',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#f3f4f6',
  },
  '.cm-activeLine': {
    backgroundColor: '#f9fafb',
  },
  '.cm-cursor': {
    borderLeftColor: '#1f2937',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: '#dbeafe',
  },
  '.cm-line': {
    padding: '0 16px',
  },
}, { dark: false });

const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#1f2937',
    color: '#f3f4f6',
  },
  '.cm-gutters': {
    backgroundColor: '#111827',
    color: '#6b7280',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#1f2937',
  },
  '.cm-activeLine': {
    backgroundColor: '#111827',
  },
  '.cm-cursor': {
    borderLeftColor: '#f3f4f6',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: '#374151',
  },
  '.cm-line': {
    padding: '0 16px',
  },
}, { dark: true });

function getLanguageExtension(lang: CodeLanguage) {
  switch (lang) {
    case 'css':
      return css();
    case 'html':
      return html();
    case 'json':
      return json();
  }
}

export function CodeEditor({
  value,
  language,
  onChange,
  className = '',
  readOnly = false,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const isInternalUpdate = useRef(false);

  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        baseTheme,
        lightTheme,
        darkTheme,
        languageCompartment.of(getLanguageExtension(language)),
        readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !isInternalUpdate.current) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    isInternalUpdate.current = true;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: value,
        },
      });
    }
    isInternalUpdate.current = false;
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: languageCompartment.reconfigure(getLanguageExtension(language)),
    });
  }, [language]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)),
    });
  }, [readOnly]);

  const handleLanguageChange = (lang: CodeLanguage) => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();

    view.dispatch({
      effects: languageCompartment.reconfigure(getLanguageExtension(lang)),
    });

    onChangeRef.current(currentDoc);
  };

  return (
    <div className={`flex flex-col h-full rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {languages.map((lang) => (
          <button
            key={lang.id}
            onClick={() => handleLanguageChange(lang.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors duration-150
              ${language === lang.id
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-t-2 border-t-blue-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
          >
            {lang.label}
          </button>
        ))}
      </div>
      <div
        ref={containerRef}
        className="flex-1 min-h-[200px] overflow-hidden"
      />
    </div>
  );
}

export default CodeEditor;
