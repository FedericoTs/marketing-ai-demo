'use client';

import { useEffect, useState } from 'react';
import { FabricObject, IText } from 'fabric';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ColorPicker } from './color-picker';
import { FontSelector } from './font-selector';

interface PropertyPanelProps {
  selectedObject: FabricObject | null;
  onUpdate: () => void;
  forceUpdate?: number; // Version counter that changes when object is modified
}

export function PropertyPanel({ selectedObject, onUpdate, forceUpdate }: PropertyPanelProps) {
  const [properties, setProperties] = useState<any>({});
  const [activeTab, setActiveTab] = useState('transform');

  // Load properties from selected object
  // Re-runs when selectedObject changes OR when forceUpdate counter changes (object modified)
  useEffect(() => {
    if (!selectedObject) {
      setProperties({});
      return;
    }

    setProperties({
      // Common properties
      left: Math.round(selectedObject.left ?? 0),
      top: Math.round(selectedObject.top ?? 0),
      width: Math.round(selectedObject.width ?? 100),
      height: Math.round(selectedObject.height ?? 100),
      scaleX: selectedObject.scaleX ?? 1,
      scaleY: selectedObject.scaleY ?? 1,
      angle: Math.round(selectedObject.angle ?? 0),
      opacity: selectedObject.opacity !== undefined ? Math.round(selectedObject.opacity * 100) : 100,

      // Text properties
      fontFamily: (selectedObject as IText).fontFamily || 'Arial',
      fontSize: Math.round((selectedObject as IText).fontSize ?? 16),
      fontWeight: (selectedObject as IText).fontWeight ?? 400,
      textColor: (selectedObject as IText).fill || '#000000',

      // Shape properties
      fill: selectedObject.fill || '#000000',
      stroke: selectedObject.stroke || '#000000',
      strokeWidth: Math.round(selectedObject.strokeWidth ?? 0),
    });
  }, [selectedObject, forceUpdate]); // Added forceUpdate dependency

  if (!selectedObject) {
    return (
      <Card className="w-full p-3 h-full overflow-y-auto border-0 rounded-none bg-white border-l border-slate-200">
        <div className="flex items-center justify-center h-full text-xs text-slate-400 text-center px-2">
          Select an object to edit properties
        </div>
      </Card>
    );
  }

  const isText = selectedObject.type === 'i-text' || selectedObject.type === 'text';
  const isShape = selectedObject.type === 'rect' || selectedObject.type === 'circle';

  const updateProperty = (key: string, value: any) => {
    if (!selectedObject) return;

    // Handle special cases
    if (key === 'opacity') {
      selectedObject.set('opacity', value / 100);
    } else if (key === 'textColor') {
      selectedObject.set('fill', value);
    } else if (key === 'fontFamily' || key === 'fontSize' || key === 'fontWeight') {
      (selectedObject as IText).set(key as any, value);
    } else {
      selectedObject.set(key as any, value);
    }

    // Update coordinates after transformation (important for rotation, scaling, position)
    selectedObject.setCoords();

    setProperties({ ...properties, [key]: value });
    onUpdate();
  };

  return (
    <Card className="w-full h-full overflow-hidden border-0 rounded-none bg-white border-l border-slate-200 flex flex-col">
      {/* Header */}
      <div className="px-3 py-3 border-b border-slate-200">
        <h3 className="text-xs font-semibold text-slate-700">Properties</h3>
        <p className="text-[10px] text-slate-500 capitalize mt-0.5">
          {selectedObject.type?.replace(/-/g, ' ')}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full rounded-none border-b border-slate-200 bg-white h-9 p-0 justify-start">
          <TabsTrigger
            value="transform"
            className="text-xs rounded-none data-[state=active]:bg-slate-50 data-[state=active]:text-slate-900 data-[state=active]:shadow-none h-9 px-4"
          >
            Transform
          </TabsTrigger>
          <TabsTrigger
            value="style"
            className="text-xs rounded-none data-[state=active]:bg-slate-50 data-[state=active]:text-slate-900 data-[state=active]:shadow-none h-9 px-4"
          >
            Style
          </TabsTrigger>
          {isText && (
            <TabsTrigger
              value="text"
              className="text-xs rounded-none data-[state=active]:bg-slate-50 data-[state=active]:text-slate-900 data-[state=active]:shadow-none h-9 px-4"
            >
              Text
            </TabsTrigger>
          )}
        </TabsList>

        {/* Transform Tab */}
        <TabsContent value="transform" className="flex-1 overflow-y-auto p-3 mt-0">
          <div className="space-y-4">
            {/* Position */}
            <div className="space-y-2">
              <Label className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">Position</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">X</Label>
                  <Input
                    type="number"
                    value={Math.round(properties.left ?? 0) || 0}
                    onChange={(e) => updateProperty('left', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Y</Label>
                  <Input
                    type="number"
                    value={Math.round(properties.top ?? 0) || 0}
                    onChange={(e) => updateProperty('top', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Size */}
            <div className="space-y-2">
              <Label className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">Size</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Width</Label>
                  <Input
                    type="number"
                    value={Math.round(((properties.width ?? 100) * (properties.scaleX ?? 1))) || 1}
                    onChange={(e) => {
                      const newWidth = parseFloat(e.target.value) || 1;
                      const baseWidth = properties.width ?? 100;
                      updateProperty('scaleX', baseWidth > 0 ? newWidth / baseWidth : 1);
                    }}
                    className="h-7 text-xs bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                    min={1}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Height</Label>
                  <Input
                    type="number"
                    value={Math.round(((properties.height ?? 100) * (properties.scaleY ?? 1))) || 1}
                    onChange={(e) => {
                      const newHeight = parseFloat(e.target.value) || 1;
                      const baseHeight = properties.height ?? 100;
                      updateProperty('scaleY', baseHeight > 0 ? newHeight / baseHeight : 1);
                    }}
                    className="h-7 text-xs bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                    min={1}
                  />
                </div>
              </div>
            </div>

            {/* Rotation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">Rotation</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={Math.round(properties.angle ?? 0) || 0}
                    onChange={(e) => updateProperty('angle', parseFloat(e.target.value) || 0)}
                    className="w-14 h-6 px-1.5 text-xs bg-slate-50 border-slate-200"
                    min={0}
                    max={360}
                  />
                  <span className="text-[10px] text-slate-400">°</span>
                </div>
              </div>
              <Slider
                value={[properties.angle]}
                onValueChange={([value]) => updateProperty('angle', value)}
                min={0}
                max={360}
                step={1}
                className="mt-2"
              />
            </div>

            {/* Opacity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">Opacity</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={Math.round(properties.opacity ?? 100) || 100}
                    onChange={(e) => updateProperty('opacity', parseFloat(e.target.value) || 100)}
                    className="w-14 h-6 px-1.5 text-xs bg-slate-50 border-slate-200"
                    min={0}
                    max={100}
                  />
                  <span className="text-[10px] text-slate-400">%</span>
                </div>
              </div>
              <Slider
                value={[properties.opacity]}
                onValueChange={([value]) => updateProperty('opacity', value)}
                min={0}
                max={100}
                step={1}
                className="mt-2"
              />
            </div>
          </div>
        </TabsContent>

        {/* Style Tab */}
        <TabsContent value="style" className="flex-1 overflow-y-auto p-3 mt-0">
          <div className="space-y-4">
            {isShape && (
              <>
                <ColorPicker
                  color={properties.fill}
                  onChange={(value) => updateProperty('fill', value)}
                  label="Fill"
                />

                <ColorPicker
                  color={properties.stroke}
                  onChange={(value) => updateProperty('stroke', value)}
                  label="Stroke"
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">Stroke Width</Label>
                    <Input
                      type="number"
                      value={Math.round(properties.strokeWidth ?? 0) || 0}
                      onChange={(e) => updateProperty('strokeWidth', parseInt(e.target.value) || 0)}
                      className="w-14 h-6 px-1.5 text-xs bg-slate-50 border-slate-200"
                      min={0}
                      max={50}
                    />
                  </div>
                  <Slider
                    value={[properties.strokeWidth]}
                    onValueChange={([value]) => updateProperty('strokeWidth', value)}
                    min={0}
                    max={50}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </>
            )}
            {!isShape && (
              <div className="flex items-center justify-center h-32 text-xs text-slate-400">
                No style options for this object
              </div>
            )}
          </div>
        </TabsContent>

        {/* Text Tab */}
        {isText && (
          <TabsContent value="text" className="flex-1 overflow-y-auto p-3 mt-0">
            <div className="space-y-4">
              <FontSelector
                fontFamily={properties.fontFamily}
                fontSize={properties.fontSize}
                fontWeight={properties.fontWeight}
                onFontFamilyChange={(value) => updateProperty('fontFamily', value)}
                onFontSizeChange={(value) => updateProperty('fontSize', value)}
                onFontWeightChange={(value) => updateProperty('fontWeight', value)}
                label="Font"
              />

              <ColorPicker
                color={properties.textColor}
                onChange={(value) => updateProperty('textColor', value)}
                label="Color"
              />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </Card>
  );
}
