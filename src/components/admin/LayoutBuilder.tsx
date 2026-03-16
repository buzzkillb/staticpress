import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React, { useState, useCallback } from "react";

export type LayoutType = "stack" | "grid" | "sidebar";

export interface Section {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

export interface LayoutSettings {
  layoutType: LayoutType;
  spacing: number;
  maxWidth: number;
}

export interface Layout {
  sections: Section[];
  settings: LayoutSettings;
}

export interface LayoutBuilderProps {
  layout: Layout;
  onChange: (layout: Layout) => void;
}

const DEFAULT_SECTIONS: Section[] = [
  { id: "header", label: "Header", visible: true, order: 0 },
  { id: "sidebar", label: "Sidebar", visible: true, order: 1 },
  { id: "main", label: "Main Content", visible: true, order: 2 },
  { id: "footer", label: "Footer", visible: true, order: 3 },
];

const DEFAULT_SETTINGS: LayoutSettings = {
  layoutType: "stack",
  spacing: 4,
  maxWidth: 1200,
};

interface SortableItemProps {
  id: string;
  label: string;
  visible: boolean;
  onToggle: () => void;
}

function SortableItem({ id, label, visible, onToggle }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-3 p-3 bg-white dark:bg-zinc-800 
        border border-zinc-200 dark:border-zinc-700 rounded-lg
        ${isDragging ? "opacity-50 shadow-lg z-50" : ""}
      `}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        aria-label={`Drag ${label}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="5" r="1" />
          <circle cx="9" cy="12" r="1" />
          <circle cx="9" cy="19" r="1" />
          <circle cx="15" cy="5" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="15" cy="19" r="1" />
        </svg>
      </button>
      <span className="flex-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <button
        type="button"
        onClick={onToggle}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${visible ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-600"}
        `}
        role="switch"
        aria-checked={visible}
        aria-label={`Toggle ${label} visibility`}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${visible ? "translate-x-6" : "translate-x-1"}
          `}
        />
      </button>
    </div>
  );
}

export default function LayoutBuilder({ layout, onChange }: LayoutBuilderProps) {
  const [sections, setSections] = useState<Section[]>(
    layout.sections.length > 0 ? layout.sections : DEFAULT_SECTIONS
  );
  const [settings, setSettings] = useState<LayoutSettings>(
    layout.settings ? { ...DEFAULT_SETTINGS, ...layout.settings } : DEFAULT_SETTINGS
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        setSections((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over.id);
          const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
            ...item,
            order: index,
          }));
          onChange({ sections: newItems, settings });
          return newItems;
        });
      }
    },
    [onChange, settings]
  );

  const handleToggle = useCallback(
    (id: string) => {
      const newSections = sections.map((section) =>
        section.id === id ? { ...section, visible: !section.visible } : section
      );
      setSections(newSections);
      onChange({ sections: newSections, settings });
    },
    [sections, settings, onChange]
  );

  const handleSettingChange = useCallback(
    <K extends keyof LayoutSettings>(key: K, value: LayoutSettings[K]) => {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      onChange({ sections, settings: newSettings });
    },
    [sections, settings, onChange]
  );

  const visibleSections = sections.filter((s) => s.visible).sort((a, b) => a.order - b.order);

  const renderPreview = () => {
    const spacingClass = `gap-${settings.spacing}`;
    const maxWidthClass = `max-w-[${settings.maxWidth}px]`;

    if (settings.layoutType === "sidebar") {
      return (
        <div className={`flex flex-col md:flex-row ${spacingClass} ${maxWidthClass} mx-auto p-4`}>
          {visibleSections.find((s) => s.id === "header") && (
            <div className="w-full md:col-span-2 p-3 bg-blue-100 dark:bg-blue-900 rounded text-center text-sm">
              Header
            </div>
          )}
          {visibleSections.find((s) => s.id === "sidebar") && (
            <div className="w-full md:w-64 p-3 bg-purple-100 dark:bg-purple-900 rounded text-center text-sm">
              Sidebar
            </div>
          )}
          {visibleSections.find((s) => s.id === "main") && (
            <div className="flex-1 p-3 bg-green-100 dark:bg-green-900 rounded text-center text-sm">
              Main Content
            </div>
          )}
          {visibleSections.find((s) => s.id === "footer") && (
            <div className="w-full p-3 bg-orange-100 dark:bg-orange-900 rounded text-center text-sm">
              Footer
            </div>
          )}
        </div>
      );
    }

    if (settings.layoutType === "grid") {
      return (
        <div className={`grid ${spacingClass} ${maxWidthClass} mx-auto p-4`}>
          {visibleSections.find((s) => s.id === "header") && (
            <div className="col-span-2 p-3 bg-blue-100 dark:bg-blue-900 rounded text-center text-sm">
              Header
            </div>
          )}
          {visibleSections.find((s) => s.id === "sidebar") && (
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded text-center text-sm">
              Sidebar
            </div>
          )}
          {visibleSections.find((s) => s.id === "main") && (
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded text-center text-sm">
              Main Content
            </div>
          )}
          {visibleSections.find((s) => s.id === "footer") && (
            <div className="col-span-2 p-3 bg-orange-100 dark:bg-orange-900 rounded text-center text-sm">
              Footer
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={`flex flex-col ${spacingClass} ${maxWidthClass} mx-auto p-4`}>
        {visibleSections.map((section) => (
          <div
            key={section.id}
            className={`
              p-3 rounded text-center text-sm
              ${section.id === "header" ? "bg-blue-100 dark:bg-blue-900" : ""}
              ${section.id === "sidebar" ? "bg-purple-100 dark:bg-purple-900" : ""}
              ${section.id === "main" ? "bg-green-100 dark:bg-green-900" : ""}
              ${section.id === "footer" ? "bg-orange-100 dark:bg-orange-900" : ""}
            `}
          >
            {section.label}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            Sections
          </h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sections.map((section) => (
                  <SortableItem
                    key={section.id}
                    id={section.id}
                    label={section.label}
                    visible={section.visible}
                    onToggle={() => handleToggle(section.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            Layout Settings
          </h3>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Layout Type
            </label>
            <div className="flex gap-2">
              {(["stack", "grid", "sidebar"] as LayoutType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSettingChange("layoutType", type)}
                  className={`
                    px-4 py-2 text-sm rounded-lg capitalize transition-colors
                    ${
                      settings.layoutType === type
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }
                  `}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label
              htmlFor="spacing"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Spacing: {settings.spacing}
            </label>
            <input
              type="range"
              id="spacing"
              min="0"
              max="8"
              value={settings.spacing}
              onChange={(e) => handleSettingChange("spacing", Number(e.target.value))}
              className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-3">
            <label
              htmlFor="maxWidth"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Max Width: {settings.maxWidth}px
            </label>
            <input
              type="range"
              id="maxWidth"
              min="600"
              max="1600"
              step="100"
              value={settings.maxWidth}
              onChange={(e) => handleSettingChange("maxWidth", Number(e.target.value))}
              className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          Live Preview
        </h3>
        <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 bg-zinc-50 dark:bg-zinc-900 min-h-[300px]">
          {visibleSections.length > 0 ? (
            renderPreview()
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-400">
              No sections visible
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
