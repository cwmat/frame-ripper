import { openDB, type IDBPDatabase } from 'idb';
import type { ExtractedFrame } from '../types';

const DB_NAME = 'frame-ripper-db';
const DB_VERSION = 1;

interface FrameRipperDB {
  frames: {
    key: string;
    value: ExtractedFrame;
    indexes: { 'by-index': number };
  };
}

let dbInstance: IDBPDatabase<FrameRipperDB> | null = null;

async function getDb(): Promise<IDBPDatabase<FrameRipperDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<FrameRipperDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('frames')) {
        const store = db.createObjectStore('frames', { keyPath: 'id' });
        store.createIndex('by-index', 'index');
      }
    },
  });

  return dbInstance;
}

export async function saveFrame(frame: ExtractedFrame): Promise<void> {
  const db = await getDb();
  await db.put('frames', frame);
}

export async function saveFramesBatch(frames: ExtractedFrame[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('frames', 'readwrite');
  for (const frame of frames) {
    tx.store.put(frame);
  }
  await tx.done;
}

export async function getFrame(id: string): Promise<ExtractedFrame | undefined> {
  const db = await getDb();
  return db.get('frames', id);
}

export async function getAllFrames(): Promise<ExtractedFrame[]> {
  const db = await getDb();
  const frames = await db.getAllFromIndex('frames', 'by-index');
  return frames;
}

export async function getFrameCount(): Promise<number> {
  const db = await getDb();
  return db.count('frames');
}

export async function getTotalSize(): Promise<number> {
  const frames = await getAllFrames();
  return frames.reduce((sum, f) => sum + f.size, 0);
}

export async function clearFrames(): Promise<void> {
  const db = await getDb();
  await db.clear('frames');
}

export async function deleteFrame(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('frames', id);
}
