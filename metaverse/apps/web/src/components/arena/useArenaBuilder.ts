import { useState } from 'react';
import type React from 'react';
import { api } from '../../utils/api';
import type { AvailableElement, RoomPrefab } from './ElementsPanel';

type BuilderMode = 'pointer' | 'brush' | 'eraser';

interface UseArenaBuilderInput {
  spaceId?: string;
  showPanel: boolean;
  setShowPanel: (open: boolean) => void;
  setDimensions: React.Dispatch<React.SetStateAction<{ w: number; h: number }>>;
  fetchSpace: () => Promise<void>;
  refetchAvailableAssets: () => Promise<any>;
  setShowUsers: (show: boolean) => void;
}

export function useArenaBuilder({
  spaceId,
  showPanel,
  setShowPanel,
  setDimensions,
  fetchSpace,
  refetchAvailableAssets,
  setShowUsers,
}: UseArenaBuilderInput) {
  const [availableElements, setAvailableElements] = useState<AvailableElement[]>([]);
  const [roomPrefabs, setRoomPrefabs] = useState<RoomPrefab[]>([]);
  const [addingElement, setAddingElement] = useState<string | null>(null);
  const [builderMode, setBuilderMode] = useState<BuilderMode>('pointer');
  const [addX, setAddX] = useState('0');
  const [addY, setAddY] = useState('0');
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelMsg, setPanelMsg] = useState('');
  const [hiddenElementIds, setHiddenElementIds] = useState<string[]>([]);

  const toggleHideElement = (id: string) => {
    setHiddenElementIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const closeBuild = () => {
    setShowPanel(false);
    setAddingElement(null);
    setBuilderMode('pointer');
  };

  const fetchAvailableElements = async () => {
    const result = await refetchAvailableAssets();
    if (!result.data) return;
    setAvailableElements(result.data.elements ?? []);
    setRoomPrefabs(result.data.roomPrefabs ?? []);
  };

  const toggleBuild = () => {
    if (showPanel) {
      closeBuild();
      return;
    }
    setShowPanel(true);
    setShowUsers(false);
    fetchAvailableElements();
  };

  const handleUpdateDimensions = async (w: number, h: number) => {
    if (w <= 0 || h <= 0) return;
    setDimensions({ w, h });
    setPanelMsg(`Map expanded to ${w}x${h}!`);
    try {
      await api.put(`/space/${spaceId}`, { dimensions: `${w}x${h}` });
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddElementAt = async (elementId: string, targetX: number, targetY: number) => {
    if (!spaceId) return;
    setPanelLoading(true);
    setPanelMsg('');
    try {
      await api.post('/space/element', {
        elementId,
        spaceId,
        x: targetX,
        y: targetY,
      });
      setPanelMsg('Element placed on map!');
      setAddingElement(null);
      await fetchSpace();
    } catch (error: any) {
      setPanelMsg(error.response?.data?.message || 'Failed to place element');
    } finally {
      setPanelLoading(false);
    }
  };

  const handleAddElement = async () => {
    if (!addingElement || !spaceId) return;
    await handleAddElementAt(addingElement, parseInt(addX) || 0, parseInt(addY) || 0);
  };

  const handleStampPrefab = async (prefab: any, startX: number, startY: number) => {
    if (!spaceId) return;
    setPanelLoading(true);
    setPanelMsg(`Importing ${prefab.name}...`);
    try {
      for (const item of prefab.items) {
        await api.post('/space/element', {
          elementId: item.elementId,
          spaceId,
          x: startX + item.offsetX,
          y: startY + item.offsetY,
        });
      }
      setPanelMsg(`${prefab.name} imported successfully!`);
      await fetchSpace();
    } catch (error: any) {
      setPanelMsg(error.response?.data?.message || 'Failed to import prefab');
    } finally {
      setPanelLoading(false);
    }
  };

  const handleRemoveElement = async (elementInstanceId: string) => {
    setPanelLoading(true);
    setPanelMsg('');
    try {
      await api.delete('/space/element', { data: { id: elementInstanceId } });
      setPanelMsg('Element removed!');
      await fetchSpace();
    } catch (error: any) {
      setPanelMsg(error.response?.data?.message || 'Failed to remove element');
    } finally {
      setPanelLoading(false);
    }
  };

  return {
    availableElements,
    roomPrefabs,
    addingElement,
    setAddingElement,
    builderMode,
    setBuilderMode,
    addX,
    setAddX,
    addY,
    setAddY,
    panelLoading,
    panelMsg,
    hiddenElementIds,
    toggleHideElement,
    closeBuild,
    toggleBuild,
    handleUpdateDimensions,
    handleAddElementAt,
    handleAddElement,
    handleStampPrefab,
    handleRemoveElement,
  };
}
