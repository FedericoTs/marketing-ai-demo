'use client';

import { useEffect, useState } from 'react';
import { FabricObject, IText } from 'fabric';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Type,
} from 'lucide-react';
import { ColorPicker } from './color-picker';
import { FontSelector } from './font-selector';
import { VARIABLE_TYPES, type VariableType, getVariableTypeConfig } from '@/lib/design/variable-types';

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
      fontStyle: (selectedObject as IText).fontStyle || 'normal',
      underline: (selectedObject as IText).underline || false,
      linethrough: (selectedObject as IText).linethrough || false,
      textAlign: (selectedObject as IText).textAlign || 'left',
      lineHeight: (selectedObject as IText).lineHeight || 1.16,
      charSpacing: (selectedObject as IText).charSpacing || 0,
      textColor: (selectedObject as IText).fill || '#000000',

      // Shape properties
      fill: selectedObject.fill || '#000000',
      stroke: selectedObject.stroke || '#000000',
      strokeWidth: Math.round(selectedObject.strokeWidth ?? 0),

      // Variable marker properties
      variableType: (selectedObject as any).variableType || 'none',
      isReusable: (selectedObject as any).isReusable || false,
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

  const isText = selectedObject.type === 'i-text' || selectedObject.type === 'text' || selectedObject.type === 'textbox';
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
    } else if (key === 'variableType') {
      // Handle variable marker changes
      const variableConfig = getVariableTypeConfig(value as VariableType);
      (selectedObject as any).variableType = value;
      (selectedObject as any).isReusable = variableConfig.isReusable;

      // Apply or remove visual styling
      // NOTE: Skip border styling for image objects (causes zoom drift bug in Fabric.js)
      const isImageObject = selectedObject.type === 'image';

      if (!isImageObject) {
        if (value !== 'none') {
          // Apply purple border and styling for variables (text only)
          selectedObject.set({
            borderColor: '#9333ea',
            borderScaleFactor: 3,
            borderDashArray: [5, 5],
            cornerColor: '#9333ea',
            cornerSize: 8,
            transparentCorners: false,
          } as any);
        } else {
          // Remove variable styling (text only)
          selectedObject.set({
            borderColor: '#178cf9',
            borderScaleFactor: 1,
            borderDashArray: null,
            cornerColor: '#178cf9',
            cornerSize: 6,
            transparentCorners: false,
          } as any);
        }
      }
      // For image objects, metadata is set but no visual border (prevents drift)

      setProperties({ ...properties, variableType: value, isReusable: variableConfig.isReusable });
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
      <div className="px-3 py-3 border-b border-slate-200 shrink-0">
        <h3 className="text-xs font-semibold text-slate-700">Properties</h3>
        <p className="text-[10px] text-slate-500 capitalize mt-0.5">
          {selectedObject.type?.replace(/-/g, ' ')}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 overflow-x-auto">
          <TabsList className="w-full rounded-none border-b border-slate-200 bg-white h-9 p-0 justify-start inline-flex">
            <TabsTrigger
              value="transform"
              className="text-xs rounded-none data-[state=active]:bg-slate-50 data-[state=active]:text-slate-900 data-[state=active]:shadow-none h-9 px-4 whitespace-nowrap"
            >
              Transform
            </TabsTrigger>
            {!isText && (
              <TabsTrigger
                value="style"
                className="text-xs rounded-none data-[state=active]:bg-slate-50 data-[state=active]:text-slate-900 data-[state=active]:shadow-none h-9 px-4 whitespace-nowrap"
              >
                Style
              </TabsTrigger>
            )}
            {isText && (
              <TabsTrigger
                value="text"
                className="text-xs rounded-none data-[state=active]:bg-slate-50 data-[state=active]:text-slate-900 data-[state=active]:shadow-none h-9 px-4 whitespace-nowrap"
              >
                Text
              </TabsTrigger>
            )}
            <TabsTrigger
              value="variable"
              className="text-xs rounded-none data-[state=active]:bg-slate-50 data-[state=active]:text-slate-900 data-[state=active]:shadow-none h-9 px-4 whitespace-nowrap"
            >
              Variable
            </TabsTrigger>
          </TabsList>
        </div>

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
              {/* Font */}
              <FontSelector
                fontFamily={properties.fontFamily}
                fontSize={properties.fontSize}
                fontWeight={properties.fontWeight}
                onFontFamilyChange={(value) => updateProperty('fontFamily', value)}
                onFontSizeChange={(value) => updateProperty('fontSize', value)}
                onFontWeightChange={(value) => updateProperty('fontWeight', value)}
                label="Font"
              />

              {/* Text Style (Bold, Italic, Underline, Strikethrough) */}
              <div className="space-y-2">
                <Label className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">
                  Text Style
                </Label>
                <div className="grid grid-cols-4 gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-9 ${properties.fontWeight === 700 ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200'}`}
                    onClick={() => updateProperty('fontWeight', properties.fontWeight === 700 ? 400 : 700)}
                    title="Bold (Cmd+B)"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-9 ${properties.fontStyle === 'italic' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200'}`}
                    onClick={() => updateProperty('fontStyle', properties.fontStyle === 'italic' ? 'normal' : 'italic')}
                    title="Italic (Cmd+I)"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-9 ${properties.underline ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200'}`}
                    onClick={() => updateProperty('underline', !properties.underline)}
                    title="Underline (Cmd+U)"
                  >
                    <UnderlineIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-9 ${properties.linethrough ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200'}`}
                    onClick={() => updateProperty('linethrough', !properties.linethrough)}
                    title="Strikethrough"
                  >
                    <Strikethrough className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Text Alignment */}
              <div className="space-y-2">
                <Label className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">
                  Alignment
                </Label>
                <div className="grid grid-cols-4 gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-9 ${properties.textAlign === 'left' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200'}`}
                    onClick={() => updateProperty('textAlign', 'left')}
                    title="Align Left (Cmd+Shift+L)"
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-9 ${properties.textAlign === 'center' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200'}`}
                    onClick={() => updateProperty('textAlign', 'center')}
                    title="Align Center (Cmd+Shift+C)"
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-9 ${properties.textAlign === 'right' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200'}`}
                    onClick={() => updateProperty('textAlign', 'right')}
                    title="Align Right (Cmd+Shift+R)"
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-9 ${properties.textAlign === 'justify' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200'}`}
                    onClick={() => updateProperty('textAlign', 'justify')}
                    title="Justify"
                  >
                    <AlignJustify className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Line Height */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">
                    Line Height
                  </Label>
                  <Input
                    type="number"
                    value={properties.lineHeight?.toFixed(2) || '1.16'}
                    onChange={(e) => updateProperty('lineHeight', parseFloat(e.target.value) || 1.16)}
                    className="w-16 h-6 px-1.5 text-xs bg-slate-50 border-slate-200"
                    min={0.5}
                    max={3}
                    step={0.1}
                  />
                </div>
                <Slider
                  value={[properties.lineHeight || 1.16]}
                  onValueChange={([value]) => updateProperty('lineHeight', value)}
                  min={0.5}
                  max={3}
                  step={0.05}
                  className="mt-2"
                />
              </div>

              {/* Letter Spacing */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">
                    Letter Spacing
                  </Label>
                  <Input
                    type="number"
                    value={Math.round(properties.charSpacing || 0)}
                    onChange={(e) => updateProperty('charSpacing', parseInt(e.target.value) || 0)}
                    className="w-16 h-6 px-1.5 text-xs bg-slate-50 border-slate-200"
                    min={-200}
                    max={800}
                    step={10}
                  />
                </div>
                <Slider
                  value={[properties.charSpacing || 0]}
                  onValueChange={([value]) => updateProperty('charSpacing', value)}
                  min={-200}
                  max={800}
                  step={10}
                  className="mt-2"
                />
              </div>

              {/* Text Color */}
              <ColorPicker
                color={properties.textColor}
                onChange={(value) => updateProperty('textColor', value)}
                label="Color"
              />
            </div>
          </TabsContent>
        )}

        {/* Variable Tab */}
        <TabsContent value="variable" className="flex-1 overflow-y-auto p-3 mt-0">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-medium text-slate-600 uppercase tracking-wide">
                Variable Data Type
              </Label>
              <Select
                value={properties.variableType || 'none'}
                onValueChange={(value) => updateProperty('variableType', value)}
              >
                <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VARIABLE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="text-xs">
                      <span className="mr-2">{type.icon}</span>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Variable Type Description */}
              {properties.variableType && properties.variableType !== 'none' && (
                <div className="mt-3 p-3 rounded-md bg-purple-50 border border-purple-200">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">
                      {getVariableTypeConfig(properties.variableType as VariableType).icon}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-purple-900 mb-1">
                        {getVariableTypeConfig(properties.variableType as VariableType).label}
                      </p>
                      <p className="text-[10px] text-purple-700">
                        {getVariableTypeConfig(properties.variableType as VariableType).description}
                      </p>

                      {/* Reusable Status */}
                      <div className="mt-2 flex items-center gap-1">
                        <div className={`h-1.5 w-1.5 rounded-full ${properties.isReusable ? 'bg-purple-600' : 'bg-orange-600'}`} />
                        <span className="text-[10px] text-purple-600 font-medium">
                          {properties.isReusable ? 'Reusable (same for all)' : 'Personalized (unique per recipient)'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Visual Indicator Info */}
              {properties.variableType && properties.variableType !== 'none' && (
                <div className="mt-2 p-2 rounded-md bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-600">
                    <span className="font-medium">Visual Indicator:</span> This object will display a purple dashed border on the canvas to mark it as a variable.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
