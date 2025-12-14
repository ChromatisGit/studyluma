import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWorksheetStorage } from './WorksheetStorageContext';

type SetStateAction<T> = T | ((prev: T) => T);

type UseTaskPersistenceOptions<T> = {
  serialize?: (value: T) => string;
  deserialize?: (raw: string, fallback: T) => T;
};

export function useTaskPersistence<T>(
  taskKey: string,
  initialValue: T,
  options?: UseTaskPersistenceOptions<T>
) {
  const storage = useWorksheetStorage();
  const [value, setValue] = useState<T>(initialValue);
  const [worksheetId, setWorksheetId] = useState<string | null>(null);
  const fallbackRef = useRef(initialValue);

  useEffect(() => {
    fallbackRef.current = initialValue;
  }, [initialValue]);

  const isStringInitial = typeof initialValue === 'string';

  const serialize = useMemo(
    () =>
      options?.serialize ??
      ((val: T) => {
        if (isStringInitial) return String(val);
        return JSON.stringify(val);
      }),
    [options?.serialize, isStringInitial]
  );

  const deserialize = useMemo(
    () =>
      options?.deserialize ??
      ((raw: string, fallback: T) => {
        if (isStringInitial) return raw as unknown as T;
        try {
          return JSON.parse(raw) as T;
        } catch {
          return fallback;
        }
      }),
    [options?.deserialize, isStringInitial]
  );

  useEffect(() => {
    if (!storage) {
      setWorksheetId(null);
      setValue(fallbackRef.current);
      return;
    }

    const currentId = storage.worksheetId;
    if (!currentId) return;

    const isNewWorksheet = worksheetId !== currentId;
    setWorksheetId(currentId);

    const raw = storage.readResponse(taskKey);
    if (raw) {
      setValue(deserialize(raw, fallbackRef.current));
      return;
    }

    if (isNewWorksheet) {
      setValue(fallbackRef.current);
    }
  }, [storage, taskKey, deserialize, worksheetId]);

  const updateValue = useCallback(
    (next: SetStateAction<T>) => {
      setValue(prev => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        if (storage) {
          storage.saveResponse(taskKey, serialize(resolved));
        }
        return resolved;
      });
    },
    [serialize, storage, taskKey]
  );

  return {
    value,
    setValue: updateValue,
    worksheetId,
  };
}
