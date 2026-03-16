import { useState, useCallback, useMemo } from 'react';
import { HexColorPicker } from 'react-colorful';
import chroma from 'chroma-js';

export interface ThemeColors {
  primary: string;
  background: string;
  text: string;
  accent: string;
  secondary: string;
}

export interface ThemeFonts {
  heading: string;
  body: string;
}

export interface ThemeConfig {
  colors: ThemeColors;
  fonts: ThemeFonts;
}

interface ThemeBuilderProps {
  theme: ThemeConfig;
  onChange: (theme: ThemeConfig) => void;
}

const GOOGLE_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Playfair Display',
  'Merriweather',
  'Nunito',
  'Raleway',
  'Source Sans Pro',
  'Oswald',
  'Ubuntu',
  'Rubik',
  'Work Sans',
  'Fira Sans',
  'Quicksand',
  'Karla',
  'Libre Baskerville',
  'DM Sans',
];

const DEFAULT_THEME: ThemeConfig = {
  colors: {
    primary: '#3b82f6',
    background: '#ffffff',
    text: '#1f2937',
    accent: '#8b5cf6',
    secondary: '#6b7280',
  },
  fonts: {
    heading: 'Inter',
    body: 'Inter',
  },
};

function getContrastRatio(color1: string, color2: string): number {
  try {
    return chroma.contrast(color1, color2);
  } catch {
    return 1;
  }
}

function getWCAGLabel(ratio: number): { label: string; color: string } {
  if (ratio >= 7) return { label: 'AAA', color: 'text-green-600' };
  if (ratio >= 4.5) return { label: 'AA', color: 'text-green-500' };
  if (ratio >= 3) return { label: 'AA Large', color: 'text-yellow-500' };
  return { label: 'Fail', color: 'text-red-500' };
}

function ColorPickerField({
  label,
  color,
  onChange,
  contrastColor,
}: {
  label: string;
  color: string;
  onChange: (color: string) => void;
  contrastColor?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const contrast = useMemo(() => {
    if (!contrastColor) return null;
    return getContrastRatio(color, contrastColor);
  }, [color, contrastColor]);

  const wcag = useMemo(() => {
    if (contrast === null) return null;
    return getWCAGLabel(contrast);
  }, [contrast]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {wcag && (
          <span className={`text-xs font-medium ${wcag.color}`}>
            {wcag.label} ({contrast?.toFixed(2)})
          </span>
        )}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-10 rounded-lg border border-gray-300 flex items-center gap-3 px-3 hover:border-gray-400 transition-colors"
        >
          <div
            className="w-6 h-6 rounded-md border border-gray-200 shadow-sm"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm text-gray-600 font-mono">{color}</span>
        </button>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full left-0 mt-2 z-20 p-4 bg-white rounded-xl shadow-xl border border-gray-200">
              <HexColorPicker color={color} onChange={onChange} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FontSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (font: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {GOOGLE_FONTS.map((font) => (
          <option key={font} value={font}>
            {font}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function ThemeBuilder({ theme = DEFAULT_THEME, onChange }: ThemeBuilderProps) {
  const [activeTab, setActiveTab] = useState<'colors' | 'fonts' | 'preview'>('colors');
  const [jsonExpanded, setJsonExpanded] = useState(false);

  const handleColorChange = useCallback(
    (key: keyof ThemeColors) => (color: string) => {
      onChange({
        ...theme,
        colors: {
          ...theme.colors,
          [key]: color,
        },
      });
    },
    [theme, onChange]
  );

  const handleFontChange = useCallback(
    (key: keyof ThemeFonts) => (font: string) => {
      onChange({
        ...theme,
        fonts: {
          ...theme.fonts,
          [key]: font,
        },
      });
    },
    [theme, onChange]
  );

  const exportJson = useCallback(() => {
    const json = JSON.stringify(theme, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theme-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [theme]);

  const copyJson = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(theme, null, 2));
  }, [theme]);

  const textContrast = useMemo(() => {
    return getWCAGLabel(getContrastRatio(theme.colors.text, theme.colors.background));
  }, [theme.colors.text, theme.colors.background]);

  const buttonContrast = useMemo(() => {
    return getWCAGLabel(
      getContrastRatio(
        chroma.contrast(theme.colors.primary, '#ffffff') > 4.5 ? '#ffffff' : theme.colors.text,
        theme.colors.primary
      )
    );
  }, [theme.colors.primary, theme.colors.text]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Theme Builder</h1>
            <p className="text-sm text-gray-500 mt-1">
              Customize colors, fonts, and preview your theme in real-time
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setJsonExpanded(!jsonExpanded)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {jsonExpanded ? 'Hide' : 'View'} JSON
            </button>
            <button
              onClick={copyJson}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Copy JSON
            </button>
            <button
              onClick={exportJson}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Export Theme
            </button>
          </div>
        </div>

        {jsonExpanded && (
          <div className="mb-6 p-4 bg-gray-900 rounded-xl overflow-auto max-h-64">
            <pre className="text-sm text-green-400 font-mono">
              {JSON.stringify(theme, null, 2)}
            </pre>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex gap-1 p-1">
              {(['colors', 'fonts', 'preview'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'colors' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ColorPickerField
                  label="Primary Color"
                  color={theme.colors.primary}
                  onChange={handleColorChange('primary')}
                  contrastColor={theme.colors.background}
                />
                <ColorPickerField
                  label="Background Color"
                  color={theme.colors.background}
                  onChange={handleColorChange('background')}
                  contrastColor={theme.colors.text}
                />
                <ColorPickerField
                  label="Text Color"
                  color={theme.colors.text}
                  onChange={handleColorChange('text')}
                  contrastColor={theme.colors.background}
                />
                <ColorPickerField
                  label="Accent Color"
                  color={theme.colors.accent}
                  onChange={handleColorChange('accent')}
                  contrastColor={theme.colors.background}
                />
                <ColorPickerField
                  label="Secondary Color"
                  color={theme.colors.secondary}
                  onChange={handleColorChange('secondary')}
                  contrastColor={theme.colors.background}
                />
              </div>
            )}

            {activeTab === 'fonts' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-xl">
                <FontSelect
                  label="Heading Font"
                  value={theme.fonts.heading}
                  onChange={handleFontChange('heading')}
                />
                <FontSelect
                  label="Body Font"
                  value={theme.fonts.body}
                  onChange={handleFontChange('body')}
                />
              </div>
            )}

            {activeTab === 'preview' && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-500">Accessibility Check</h3>
                  <div className="flex gap-4 text-sm">
                    <span>
                      Text: <span className={textContrast.color}>{textContrast.label}</span>
                    </span>
                    <span>
                      Button: <span className={buttonContrast.color}>{buttonContrast.label}</span>
                    </span>
                  </div>
                </div>
                <div
                  className="p-8 rounded-xl border-2 transition-colors duration-300"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.secondary,
                    fontFamily: theme.fonts.body,
                  }}
                >
                  <div
                    className="mb-6"
                    style={{ fontFamily: theme.fonts.heading }}
                  >
                    <h2
                      className="text-3xl font-bold mb-2"
                      style={{ color: theme.colors.text }}
                    >
                      Welcome to Your Theme
                    </h2>
                    <p
                      className="text-lg"
                      style={{ color: theme.colors.secondary }}
                    >
                      This is a preview of how your content will look with the current theme settings.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div
                      className="p-6 rounded-lg transition-colors duration-300"
                      style={{
                        backgroundColor: chroma(theme.colors.primary).alpha(0.1).toString(),
                        borderLeft: `4px solid ${theme.colors.primary}`,
                      }}
                    >
                      <h3
                        className="font-semibold mb-2"
                        style={{ color: theme.colors.primary }}
                      >
                        Primary Card
                      </h3>
                      <p style={{ color: theme.colors.text }}>
                        This card uses your primary color as an accent. Great for highlighting important content.
                      </p>
                    </div>
                    <div
                      className="p-6 rounded-lg transition-colors duration-300"
                      style={{
                        backgroundColor: chroma(theme.colors.accent).alpha(0.1).toString(),
                        borderLeft: `4px solid ${theme.colors.accent}`,
                      }}
                    >
                      <h3
                        className="font-semibold mb-2"
                        style={{ color: theme.colors.accent }}
                      >
                        Accent Card
                      </h3>
                      <p style={{ color: theme.colors.text }}>
                        This card uses your accent color for visual variety. Perfect for secondary highlights.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      className="px-6 py-2.5 rounded-lg font-medium transition-all duration-200 hover:opacity-90"
                      style={{
                        backgroundColor: theme.colors.primary,
                        color: chroma.contrast(theme.colors.primary, '#ffffff') > 4.5 ? '#ffffff' : theme.colors.text,
                      }}
                    >
                      Primary Button
                    </button>
                    <button
                      className="px-6 py-2.5 rounded-lg font-medium transition-all duration-200 hover:opacity-90"
                      style={{
                        backgroundColor: theme.colors.accent,
                        color: chroma.contrast(theme.colors.accent, '#ffffff') > 4.5 ? '#ffffff' : theme.colors.text,
                      }}
                    >
                      Accent Button
                    </button>
                    <button
                      className="px-6 py-2.5 rounded-lg font-medium transition-all duration-200 border-2"
                      style={{
                        backgroundColor: 'transparent',
                        borderColor: theme.colors.secondary,
                        color: theme.colors.secondary,
                      }}
                    >
                      Secondary Button
                    </button>
                  </div>

                  <div className="mt-6 pt-6 border-t" style={{ borderColor: theme.colors.secondary }}>
                    <p style={{ color: theme.colors.text }}>
                      Body text example: Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                      Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad 
                      minim veniam, quis nostrud exercitation ullamco laboris.
                    </p>
                    <p className="mt-3" style={{ color: theme.colors.secondary }}>
                      Secondary text example: Duis aute irure dolor in reprehenderit in voluptate 
                      velit esse cillum dolore eu fugiat nulla pariatur.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-400">
          <p>Theme builder ready for dnd-kit integration</p>
        </div>
      </div>
    </div>
  );
}
