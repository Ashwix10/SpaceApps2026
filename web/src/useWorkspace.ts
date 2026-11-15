import { useEffect, useState } from 'react';
import { emptyWorkspace, parseWorkspace, WORKSPACE_KEY } from './workspace';
export function useWorkspace() {
  const [initial] = useState(() => {
    try { return { value:parseWorkspace(localStorage.getItem(WORKSPACE_KEY)), blocked:false, error:'' }; }
    catch { return { value:emptyWorkspace(), blocked:true, error:'Saved data could not be read. Existing browser data has not been overwritten; changes will last only for this session.' }; }
  });
  const [workspace, setWorkspace] = useState(initial.value);
  const [storageError, setStorageError] = useState(initial.error);
  useEffect(() => {
    if (initial.blocked) return;
    try { localStorage.setItem(WORKSPACE_KEY,JSON.stringify(workspace)); setStorageError(''); }
    catch { setStorageError('Browser storage is unavailable or full. Changes will last only for this session.'); }
  }, [workspace, initial.blocked]);
  return { workspace, setWorkspace, storageError };
}
