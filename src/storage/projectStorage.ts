import { ProjectFile } from '../types/plc';
import { sampleProjects } from '../data/sampleProjects';

const DB_NAME = 'logicpulse_plc_db';
const STORE_NAME = 'projects';
const DB_VERSION = 1;
const LOCALSTORAGE_BACKUP_KEY = 'logicpulse_active_project';

class ProjectStorageManager {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.reject(new Error('IndexedDB not supported'));
    }
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'project.id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.dbPromise;
  }

  async saveProject(project: ProjectFile): Promise<void> {
    const updatedProject: ProjectFile = {
      ...project,
      project: {
        ...project.project,
        updatedAt: new Date().toISOString(),
      },
    };

    // Save to localStorage immediately as fast cache
    try {
      localStorage.setItem(LOCALSTORAGE_BACKUP_KEY, JSON.stringify(updatedProject));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(updatedProject);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('IndexedDB write failed, relied on localStorage', err);
    }
  }

  async loadActiveProject(): Promise<ProjectFile> {
    // 1. Try to load from localStorage cache
    try {
      const cached = localStorage.getItem(LOCALSTORAGE_BACKUP_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as ProjectFile;
        if (parsed.ladder && parsed.ioMap) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed reading from local storage cache', e);
    }

    // 2. Try IndexedDB
    try {
      const db = await this.getDB();
      const allProjects = await new Promise<ProjectFile[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result as ProjectFile[]);
        req.onerror = () => reject(req.error);
      });

      if (allProjects.length > 0) {
        return allProjects[0];
      }
    } catch (err) {
      console.warn('IndexedDB read failed:', err);
    }

    // 3. Fallback to default Motor Start/Stop sample project
    return sampleProjects[0];
  }

  async listAllProjects(): Promise<ProjectFile[]> {
    try {
      const db = await this.getDB();
      const stored = await new Promise<ProjectFile[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result as ProjectFile[]);
        req.onerror = () => reject(req.error);
      });

      const map = new Map<string, ProjectFile>();
      // Include presets
      sampleProjects.forEach((p) => map.set(p.project.id, p));
      // Overwrite/merge with user saved
      stored.forEach((p) => map.set(p.project.id, p));
      return Array.from(map.values());
    } catch (err) {
      return sampleProjects;
    }
  }

  exportProjectJSON(project: ProjectFile): void {
    const jsonStr = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = (project.project.name || 'plc_project').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${safeName}_v${project.formatVersion}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  parseImportedJSON(jsonText: string): ProjectFile {
    const parsed = JSON.parse(jsonText);
    if (!parsed.formatVersion || !parsed.ladder || !parsed.ioMap) {
      throw new Error('Invalid project file format. Missing required PLC schema.');
    }
    return parsed as ProjectFile;
  }
}

export const projectStorage = new ProjectStorageManager();
