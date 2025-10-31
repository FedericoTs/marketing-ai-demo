'use client';

import { useState, useEffect } from 'react';
import { Canvas, FabricObject } from 'fabric';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Type,
  Square,
  Circle,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  FileText,
  Settings2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getVariableTypeConfig, type VariableType } from '@/lib/design/variable-types';

interface LayersPanelProps {
  canvas: Canvas | null;
  onUpdate: () => void;
  templateName?: string;
  templateDescription?: string;
  onTemplateNameChange?: (name: string) => void;
  onTemplateDescriptionChange?: (description: string) => void;
}

interface LayerItem {
  id: string;
  object: FabricObject;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  variableType?: VariableType;
}

function LayerIcon({ type }: { type: string }) {
  switch (type) {
    case 'i-text':
    case 'text':
      return <Type className="h-4 w-4" />;
    case 'rect':
      return <Square className="h-4 w-4" />;
    case 'circle':
      return <Circle className="h-4 w-4" />;
    case 'image':
      return <ImageIcon className="h-4 w-4" />;
    default:
      return <Square className="h-4 w-4" />;
  }
}

function SortableLayerItem({
  layer,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDelete,
}: {
  layer: LayerItem;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-all
        ${isSelected ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-100'}
        ${!layer.visible ? 'opacity-50' : ''}
      `}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drag Handle - visible on hover */}
      <div
        {...attributes}
        {...listeners}
        className={`cursor-grab active:cursor-grabbing transition-opacity ${isHovered || isDragging ? 'opacity-100' : 'opacity-0'}`}
      >
        <GripVertical className="h-3.5 w-3.5 text-slate-400" />
      </div>

      {/* Layer Icon */}
      <div className="text-slate-500">
        <LayerIcon type={layer.type} />
      </div>

      {/* Layer Name */}
      <span className="flex-1 text-xs truncate">{layer.name}</span>

      {/* Variable Badge */}
      {layer.variableType && layer.variableType !== 'none' && (
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 border border-purple-300"
          title={getVariableTypeConfig(layer.variableType).description}
        >
          <span className="text-xs">{getVariableTypeConfig(layer.variableType).icon}</span>
        </div>
      )}

      {/* Actions - visible on hover */}
      <div className={`flex items-center gap-0.5 transition-opacity ${isHovered || isSelected ? 'opacity-100' : 'opacity-0'}`}>
        <button
          className="h-5 w-5 rounded hover:bg-slate-200 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
          title={layer.visible ? 'Hide' : 'Show'}
        >
          {layer.visible ? (
            <Eye className="h-3 w-3 text-slate-600" />
          ) : (
            <EyeOff className="h-3 w-3 text-slate-400" />
          )}
        </button>

        <button
          className="h-5 w-5 rounded hover:bg-slate-200 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock();
          }}
          title={layer.locked ? 'Unlock' : 'Lock'}
        >
          {layer.locked ? (
            <Lock className="h-3 w-3 text-slate-600" />
          ) : (
            <Unlock className="h-3 w-3 text-slate-400" />
          )}
        </button>

        <button
          className="h-5 w-5 rounded hover:bg-red-100 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete"
        >
          <Trash2 className="h-3 w-3 text-slate-600 hover:text-red-600" />
        </button>
      </div>
    </div>
  );
}

export function LayersPanel({
  canvas,
  onUpdate,
  templateName,
  templateDescription,
  onTemplateNameChange,
  onTemplateDescriptionChange
}: LayersPanelProps) {
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isTemplateFormCollapsed, setIsTemplateFormCollapsed] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Canvas dimensions for display
  const CANVAS_WIDTH = 1800;
  const CANVAS_HEIGHT = 1200;

  // Load layers from canvas
  useEffect(() => {
    if (!canvas) {
      setLayers([]);
      return;
    }

    const updateLayers = () => {
      const objects = canvas.getObjects();
      const layerItems: LayerItem[] = objects.map((obj, index) => {
        const objectAny = obj as any;
        return {
          id: objectAny._id || `layer-${index}`,
          object: obj,
          name: objectAny.name || `${obj.type || 'Object'} ${index + 1}`,
          type: obj.type || 'unknown',
          visible: obj.visible !== false,
          locked: obj.selectable === false,
          variableType: objectAny.variableType || 'none',
        };
      }).reverse(); // Reverse to show top layers first

      setLayers(layerItems);

      // Update selected layer
      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        const activeAny = activeObject as any;
        setSelectedLayerId(activeAny._id || null);
      } else {
        setSelectedLayerId(null);
      }
    };

    updateLayers();

    // Listen for canvas changes
    canvas.on('object:added', updateLayers);
    canvas.on('object:removed', updateLayers);
    canvas.on('object:modified', updateLayers);
    canvas.on('selection:created', updateLayers);
    canvas.on('selection:updated', updateLayers);
    canvas.on('selection:cleared', updateLayers);

    return () => {
      canvas.off('object:added', updateLayers);
      canvas.off('object:removed', updateLayers);
      canvas.off('object:modified', updateLayers);
      canvas.off('selection:created', updateLayers);
      canvas.off('selection:updated', updateLayers);
      canvas.off('selection:cleared', updateLayers);
    };
  }, [canvas]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!canvas || !over || active.id === over.id) return;

    const oldIndex = layers.findIndex((layer) => layer.id === active.id);
    const newIndex = layers.findIndex((layer) => layer.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder layers
    const newLayers = arrayMove(layers, oldIndex, newIndex);
    setLayers(newLayers);

    // Update canvas z-index (reverse because layers are displayed reversed)
    const objects = canvas.getObjects();
    const reversedNewLayers = [...newLayers].reverse();
    reversedNewLayers.forEach((layer, index) => {
      const objIndex = objects.indexOf(layer.object);
      if (objIndex !== -1) {
        layer.object.moveTo(index);
      }
    });

    canvas.renderAll();
    onUpdate();
  };

  const handleSelectLayer = (layer: LayerItem) => {
    if (!canvas) return;
    canvas.setActiveObject(layer.object);
    canvas.renderAll();
    setSelectedLayerId(layer.id);
  };

  const handleToggleVisibility = (layer: LayerItem) => {
    if (!canvas) return;
    layer.object.set('visible', !layer.visible);
    canvas.renderAll();
    onUpdate();
  };

  const handleToggleLock = (layer: LayerItem) => {
    if (!canvas) return;
    const newLocked = !layer.locked;
    layer.object.set('selectable', !newLocked);
    layer.object.set('evented', !newLocked);
    canvas.renderAll();
    onUpdate();
  };

  const handleDeleteLayer = (layer: LayerItem) => {
    if (!canvas) return;
    canvas.remove(layer.object);
    canvas.renderAll();
    onUpdate();
  };

  return (
    <Card className="w-full h-full overflow-hidden overflow-x-hidden border-0 rounded-none bg-white border-r border-slate-200 flex flex-col">
      {/* Template Form Section */}
      <div className="border-b border-slate-200">
        <button
          onClick={() => setIsTemplateFormCollapsed(!isTemplateFormCollapsed)}
          className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="h-3.5 w-3.5 text-slate-600" />
            <span className="text-xs font-semibold text-slate-700">Template Settings</span>
          </div>
          {isTemplateFormCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          )}
        </button>

        {!isTemplateFormCollapsed && (
          <div className="px-3 pb-3 pt-1 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Template Name</Label>
              <Input
                value={templateName || ''}
                onChange={(e) => onTemplateNameChange?.(e.target.value)}
                placeholder="e.g., Summer Sale Postcard"
                className="h-7 text-xs bg-slate-50 border-slate-200 focus:bg-white transition-colors"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Description</Label>
              <Textarea
                value={templateDescription || ''}
                onChange={(e) => onTemplateDescriptionChange?.(e.target.value)}
                placeholder="Describe this template..."
                className="text-xs resize-none bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                rows={3}
              />
            </div>
          </div>
        )}
      </div>

      {/* Layers Section */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-700">Layers</h3>
          <span className="text-xs text-slate-500">{layers.length}</span>
        </div>

        {layers.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-xs text-slate-400">
            No layers yet. Add objects to the canvas.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={layers.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {layers.map((layer) => (
                  <SortableLayerItem
                    key={layer.id}
                    layer={layer}
                    isSelected={layer.id === selectedLayerId}
                    onSelect={() => handleSelectLayer(layer)}
                    onToggleVisibility={() => handleToggleVisibility(layer)}
                    onToggleLock={() => handleToggleLock(layer)}
                    onDelete={() => handleDeleteLayer(layer)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </Card>
  );
}
