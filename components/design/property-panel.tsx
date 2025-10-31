'use client';

import { useEffect, useState } from 'react';
import { FabricObject, IText } from 'fabric';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ColorPicker } from './color-picker';
import { FontSelector } from './font-selector';

interface PropertyPanelProps {
  selectedObject: FabricObject | null;
  onUpdate: () => void;
}

export function PropertyPanel({ selectedObject, onUpdate }: PropertyPanelProps) {
  const [properties, setProperties] = useState<any>({});

  // Load properties from selected object
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
  }, [selectedObject]);

  if (!selectedObject) {
    return (
      <Card className="w-full p-3 h-full overflow-y-auto border-0 rounded-none">
        <div className="flex items-center justify-center h-full text-xs text-muted-foreground text-center px-2">
          Select an object to edit its properties
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

    setProperties({ ...properties, [key]: value });
    onUpdate();
  };

  return (
    <Card className="w-full p-3 h-full overflow-y-auto border-0 rounded-none">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-sm font-semibold">Properties</h3>
          <p className="text-xs text-muted-foreground capitalize">
            {selectedObject.type?.replace(/-/g, ' ')}
          </p>
        </div>

        <Separator />

        {/* Text Properties */}
        {isText && (
          <>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Text</h4>

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
                label="Text Color"
              />
            </div>
            <Separator />
          </>
        )}

        {/* Shape Properties */}
        {isShape && (
          <>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Fill & Stroke</h4>

              <ColorPicker
                color={properties.fill}
                onChange={(value) => updateProperty('fill', value)}
                label="Fill Color"
              />

              <ColorPicker
                color={properties.stroke}
                onChange={(value) => updateProperty('stroke', value)}
                label="Stroke Color"
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Stroke Width</Label>
                  <Input
                    type="number"
                    value={properties.strokeWidth}
                    onChange={(e) => updateProperty('strokeWidth', parseInt(e.target.value) || 0)}
                    className="w-16 h-8 px-2 text-sm"
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
                />
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Transform Properties */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Transform</h4>

          {/* Position */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">X</Label>
              <Input
                type="number"
                value={Math.round(properties.left)}
                onChange={(e) => updateProperty('left', parseFloat(e.target.value) || 0)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Y</Label>
              <Input
                type="number"
                value={Math.round(properties.top)}
                onChange={(e) => updateProperty('top', parseFloat(e.target.value) || 0)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Size */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Width</Label>
              <Input
                type="number"
                value={Math.round((properties.width || 100) * (properties.scaleX || 1)) || 0}
                onChange={(e) => {
                  const newWidth = parseFloat(e.target.value) || 1;
                  const baseWidth = properties.width || 100;
                  updateProperty('scaleX', baseWidth > 0 ? newWidth / baseWidth : 1);
                }}
                className="h-8 text-sm"
                min={1}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Height</Label>
              <Input
                type="number"
                value={Math.round((properties.height || 100) * (properties.scaleY || 1)) || 0}
                onChange={(e) => {
                  const newHeight = parseFloat(e.target.value) || 1;
                  const baseHeight = properties.height || 100;
                  updateProperty('scaleY', baseHeight > 0 ? newHeight / baseHeight : 1);
                }}
                className="h-8 text-sm"
                min={1}
              />
            </div>
          </div>

          {/* Rotation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Rotation</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={Math.round(properties.angle)}
                  onChange={(e) => updateProperty('angle', parseFloat(e.target.value) || 0)}
                  className="w-16 h-8 px-2 text-sm"
                  min={0}
                  max={360}
                />
                <span className="text-xs text-muted-foreground">°</span>
              </div>
            </div>
            <Slider
              value={[properties.angle]}
              onValueChange={([value]) => updateProperty('angle', value)}
              min={0}
              max={360}
              step={1}
            />
          </div>

          {/* Opacity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Opacity</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={Math.round(properties.opacity)}
                  onChange={(e) => updateProperty('opacity', parseFloat(e.target.value) || 0)}
                  className="w-16 h-8 px-2 text-sm"
                  min={0}
                  max={100}
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <Slider
              value={[properties.opacity]}
              onValueChange={([value]) => updateProperty('opacity', value)}
              min={0}
              max={100}
              step={1}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
