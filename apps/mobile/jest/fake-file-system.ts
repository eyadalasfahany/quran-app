import type { DownloadPauseState, DownloadProgress, DownloadTaskOptions } from 'expo-file-system';

// An in-memory stand-in for the parts of expo-file-system that the audio downloads use. Tests drive a
// transfer with `progress`, `complete` and `fail`, and read what is on "disk" through `fakeFiles`.

type Part = string | FakeFile | FakeDirectory;

const files = new Map<string, number>();
const directories = new Set<string>();
const tasks: FakeDownloadTask[] = [];

function joinUri(parts: readonly Part[]): string {
  return parts
    .map((part) => (typeof part === 'string' ? part : part.uri))
    .map((part, index) => (index === 0 ? part.replace(/\/+$/, '') : part.replace(/^\/+|\/+$/g, '')))
    .join('/');
}

export class FakeDirectory {
  readonly uri: string;

  constructor(...parts: Part[]) {
    this.uri = joinUri(parts);
  }

  get exists(): boolean {
    return directories.has(this.uri) || [...files.keys()].some((uri) => uri.startsWith(`${this.uri}/`));
  }

  create(options?: { intermediates?: boolean; idempotent?: boolean }): void {
    if (this.exists && !options?.idempotent) {
      throw new Error(`Directory already exists: ${this.uri}`);
    }
    directories.add(this.uri);
  }

  delete(): void {
    for (const uri of [...files.keys()]) {
      if (uri.startsWith(`${this.uri}/`)) {
        files.delete(uri);
      }
    }
    for (const dir of [...directories]) {
      if (dir === this.uri || dir.startsWith(`${this.uri}/`)) {
        directories.delete(dir);
      }
    }
  }
}

export class FakeFile {
  readonly uri: string;

  constructor(...parts: Part[]) {
    this.uri = joinUri(parts);
  }

  get exists(): boolean {
    return files.has(this.uri);
  }

  get parentDirectory(): FakeDirectory {
    return new FakeDirectory(this.uri.slice(0, this.uri.lastIndexOf('/')));
  }

  info(): { exists: boolean; uri: string; size: number } {
    return { exists: this.exists, uri: this.uri, size: files.get(this.uri) ?? 0 };
  }

  delete(): void {
    if (!files.delete(this.uri)) {
      throw new Error(`File does not exist: ${this.uri}`);
    }
  }

  static createDownloadTask(url: string, destination: FakeFile | FakeDirectory, options?: DownloadTaskOptions) {
    return new FakeDownloadTask(url, destination as FakeFile, options);
  }
}

export class FakeDownloadTask {
  state: 'idle' | 'active' | 'paused' | 'completed' | 'cancelled' | 'error' = 'idle';
  bytesWritten = 0;
  readonly resumedFrom: string | null;
  private resolveTransfer: ((file: FakeFile | null) => void) | null = null;
  private rejectTransfer: ((error: Error) => void) | null = null;

  constructor(
    readonly url: string,
    readonly destination: FakeFile,
    readonly options: DownloadTaskOptions = {},
    resumeData: string | null = null,
  ) {
    this.resumedFrom = resumeData;
    tasks.push(this);
  }

  static fromSavable(state: DownloadPauseState, options?: DownloadTaskOptions): FakeDownloadTask {
    const task = new FakeDownloadTask(state.url, new FakeFile(state.fileUri), options, state.resumeData ?? null);
    task.state = 'paused';
    return task;
  }

  downloadAsync(): Promise<FakeFile | null> {
    return this.start();
  }

  resumeAsync(): Promise<FakeFile | null> {
    return this.start();
  }

  private start(): Promise<FakeFile | null> {
    this.state = 'active';
    return new Promise((resolve, reject) => {
      this.resolveTransfer = resolve;
      this.rejectTransfer = reject;
    });
  }

  pauseAsync(): Promise<void> {
    this.state = 'paused';
    this.resolveTransfer?.(null);
    return Promise.resolve();
  }

  savable(): DownloadPauseState {
    return {
      url: this.url,
      fileUri: this.destination.uri,
      isDirectory: false,
      resumeData: `resume-at-${this.bytesWritten}`,
    };
  }

  cancel(): void {
    if (this.state !== 'active') {
      return;
    }
    this.state = 'cancelled';
    this.rejectTransfer?.(Object.assign(new Error('Download was cancelled.'), { name: 'AbortError' }));
  }

  /** Test control: reports progress through the `onProgress` option. */
  progress(bytesWritten: number, totalBytes: number): void {
    this.bytesWritten = bytesWritten;
    const data: DownloadProgress = { bytesWritten, totalBytes };
    this.options.onProgress?.(data);
  }

  /** Test control: writes the file (`bytesOnDisk` bytes) and finishes the transfer. */
  complete(bytesOnDisk = this.bytesWritten): void {
    files.set(this.destination.uri, bytesOnDisk);
    this.state = 'completed';
    this.resolveTransfer?.(new FakeFile(this.destination.uri));
  }

  /** Test control: fails the transfer. */
  fail(message = 'Network request failed.'): void {
    this.state = 'error';
    this.rejectTransfer?.(new Error(message));
  }
}

/** Test control: a file already on "disk". */
export function putFile(uri: string, size: number): void {
  files.set(uri, size);
}

export function fileExists(uri: string): boolean {
  return files.has(uri);
}

export function transfers(): FakeDownloadTask[] {
  return tasks;
}

export function resetFakeFileSystem(): void {
  files.clear();
  directories.clear();
  tasks.length = 0;
}

export const fakeExpoFileSystem = {
  Directory: FakeDirectory,
  DownloadTask: FakeDownloadTask,
  File: FakeFile,
  Paths: {
    cache: new FakeDirectory('file:///cache'),
    document: new FakeDirectory('file:///documents'),
  },
};
