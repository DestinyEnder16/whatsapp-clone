// Minimal stand-in for expo-file-system (File / Directory / Paths) so upload
// code can be tested. Use with:
//   jest.mock('expo-file-system', () => require('../test-utils/fileSystemMock'));
//   const { File } = require('expo-file-system');   // File.copies, File.deleted, File.failCopy
export class File {
  static copies: { from: string; to: string }[] = [];
  static deleted: string[] = [];
  static failCopy = false;
  uri: string;
  name: string;
  size = 1000;
  type = 'image/jpeg';
  constructor(...parts: any[]) {
    const [first, second] = parts;
    this.uri = typeof first === 'string' ? first : `${first.uri}/${second}`;
    this.name = this.uri.split('/').pop() as string;
  }
  copy(destination: File) {
    if (File.failCopy) throw new Error('disk full');
    File.copies.push({ from: this.uri, to: destination.uri });
  }
  delete() {
    File.deleted.push(this.uri);
  }
}

export class Directory {
  uri: string;
  constructor(base: any, name: string) {
    this.uri = `${base.uri}/${name}`;
  }
  create() {}
}

export const Paths = { document: { uri: 'file:///documents' } };
