'use client';

import { Canvas, FabricObject, Group as FabricGroup } from 'fabric';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Copy,
  Group,
  Ungroup,
  BringToFront,
  SendToBack,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface AlignmentToolsProps {
  canvas: Canvas | null;
  onUpdate: () => void;
}

export function AlignmentTools({ canvas, onUpdate }: AlignmentToolsProps) {
  const getSelectedObjects = (): FabricObject[] => {
    if (!canvas) return [];
    const activeObjects = canvas.getActiveObjects();
    return activeObjects.length > 0 ? activeObjects : [];
  };

  // Alignment functions
  const alignLeft = () => {
    const objects = getSelectedObjects();
    if (objects.length === 0) {
      toast.error('No objects selected');
      return;
    }

    const minLeft = Math.min(...objects.map((obj) => obj.left || 0));
    objects.forEach((obj) => obj.set('left', minLeft));
    canvas?.renderAll();
    onUpdate();
  };

  const alignCenter = () => {
    const objects = getSelectedObjects();
    if (objects.length === 0) {
      toast.error('No objects selected');
      return;
    }

    const avgLeft =
      objects.reduce((sum, obj) => sum + (obj.left || 0) + (obj.width || 0) / 2, 0) / objects.length;
    objects.forEach((obj) => obj.set('left', avgLeft - (obj.width || 0) / 2));
    canvas?.renderAll();
    onUpdate();
  };

  const alignRight = () => {
    const objects = getSelectedObjects();
    if (objects.length === 0) {
      toast.error('No objects selected');
      return;
    }

    const maxRight = Math.max(...objects.map((obj) => (obj.left || 0) + (obj.width || 0)));
    objects.forEach((obj) => obj.set('left', maxRight - (obj.width || 0)));
    canvas?.renderAll();
    onUpdate();
  };

  const alignTop = () => {
    const objects = getSelectedObjects();
    if (objects.length === 0) {
      toast.error('No objects selected');
      return;
    }

    const minTop = Math.min(...objects.map((obj) => obj.top || 0));
    objects.forEach((obj) => obj.set('top', minTop));
    canvas?.renderAll();
    onUpdate();
  };

  const alignMiddle = () => {
    const objects = getSelectedObjects();
    if (objects.length === 0) {
      toast.error('No objects selected');
      return;
    }

    const avgTop =
      objects.reduce((sum, obj) => sum + (obj.top || 0) + (obj.height || 0) / 2, 0) / objects.length;
    objects.forEach((obj) => obj.set('top', avgTop - (obj.height || 0) / 2));
    canvas?.renderAll();
    onUpdate();
  };

  const alignBottom = () => {
    const objects = getSelectedObjects();
    if (objects.length === 0) {
      toast.error('No objects selected');
      return;
    }

    const maxBottom = Math.max(...objects.map((obj) => (obj.top || 0) + (obj.height || 0)));
    objects.forEach((obj) => obj.set('top', maxBottom - (obj.height || 0)));
    canvas?.renderAll();
    onUpdate();
  };

  // Arrange functions
  const bringToFront = () => {
    const objects = getSelectedObjects();
    if (objects.length === 0) {
      toast.error('No objects selected');
      return;
    }

    objects.forEach((obj) => canvas?.bringObjectToFront(obj));
    canvas?.renderAll();
    onUpdate();
  };

  const sendToBack = () => {
    const objects = getSelectedObjects();
    if (objects.length === 0) {
      toast.error('No objects selected');
      return;
    }

    objects.forEach((obj) => canvas?.sendObjectToBack(obj));
    canvas?.renderAll();
    onUpdate();
  };

  const bringForward = () => {
    const objects = getSelectedObjects();
    if (objects.length === 0) {
      toast.error('No objects selected');
      return;
    }

    objects.forEach((obj) => canvas?.bringObjectForward(obj));
    canvas?.renderAll();
    onUpdate();
  };

  const sendBackward = () => {
    const objects = getSelectedObjects();
    if (objects.length === 0) {
      toast.error('No objects selected');
      return;
    }

    objects.forEach((obj) => canvas?.sendObjectBackwards(obj));
    canvas?.renderAll();
    onUpdate();
  };

  // Group/Ungroup
  const groupObjects = () => {
    if (!canvas) return;

    const objects = getSelectedObjects();
    if (objects.length < 2) {
      toast.error('Select at least 2 objects to group');
      return;
    }

    const group = new FabricGroup(objects);
    canvas.remove(...objects);
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
    onUpdate();
    toast.success('Objects grouped');
  };

  const ungroupObjects = () => {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'group') {
      toast.error('Select a group to ungroup');
      return;
    }

    const group = activeObject as FabricGroup;
    const items = group.getObjects();

    canvas.remove(group);
    items.forEach((item) => canvas.add(item));
    canvas.renderAll();
    onUpdate();
    toast.success('Objects ungrouped');
  };

  // Duplicate
  const duplicateObject = async () => {
    if (!canvas) return;

    const objects = getSelectedObjects();
    if (objects.length === 0) {
      toast.error('No objects selected');
      return;
    }

    for (const obj of objects) {
      const cloned = await obj.clone();
      cloned.set({
        left: (cloned.left || 0) + 10,
        top: (cloned.top || 0) + 10,
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      onUpdate();
    }

    toast.success('Object duplicated');
  };

  return (
    <div className="flex items-center gap-1">
      {/* Alignment */}
      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" onClick={alignLeft} title="Align Left">
        <AlignLeft className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" onClick={alignCenter} title="Align Center">
        <AlignCenter className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" onClick={alignRight} title="Align Right">
        <AlignRight className="h-3.5 w-3.5" />
      </Button>

      <div className="w-px h-4 bg-slate-200 mx-1" />

      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" onClick={alignTop} title="Align Top">
        <AlignVerticalJustifyStart className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" onClick={alignMiddle} title="Align Middle">
        <AlignVerticalJustifyCenter className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" onClick={alignBottom} title="Align Bottom">
        <AlignVerticalJustifyEnd className="h-3.5 w-3.5" />
      </Button>

      <div className="w-px h-4 bg-slate-200 mx-1" />

      {/* Arrange */}
      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" onClick={bringToFront} title="Bring to Front">
        <BringToFront className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" onClick={bringForward} title="Bring Forward">
        <ChevronUp className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" onClick={sendBackward} title="Send Backward">
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" onClick={sendToBack} title="Send to Back">
        <SendToBack className="h-3.5 w-3.5" />
      </Button>

      <div className="w-px h-4 bg-slate-200 mx-1" />

      {/* Group/Duplicate */}
      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" onClick={groupObjects} title="Group Objects">
        <Group className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" onClick={ungroupObjects} title="Ungroup Objects">
        <Ungroup className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-slate-100" onClick={duplicateObject} title="Duplicate">
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
