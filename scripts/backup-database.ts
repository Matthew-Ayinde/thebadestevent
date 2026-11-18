// Read-only backup: exports every collection in the database from MONGODB_URI to
// backups/<database>-<timestamp>/<collection>.jsonl (Extended JSON, one document per line,
// so ObjectIds and dates restore exactly). Restore with scripts/restore-database.ts.
// Usage: node --env-file=.env.local --import tsx scripts/backup-database.ts
import { mkdirSync, writeFileSync, createWriteStream } from 'node:fs';
import { join } from 'node:path';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';

const { EJSON } = mongoose.mongo.BSON;

async function main() {
  await connectDB();
  const db = mongoose.connection.db!;
  const name = mongoose.connection.name;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = join(process.cwd(), 'backups', `${name}-${stamp}`);
  mkdirSync(dir, { recursive: true });
  console.log(`Backing up "${name}" → ${dir}`);

  const manifest: { collection: string; documents: number; indexes: unknown[] }[] = [];
  for (const { name: collection, type } of await db.listCollections().toArray()) {
    if (type === 'view' || collection.startsWith('system.')) continue;
    const out = createWriteStream(join(dir, `${collection}.jsonl`));
    let documents = 0;
    for await (const doc of db.collection(collection).find()) {
      out.write(EJSON.stringify(doc, { relaxed: false }) + '\n');
      documents++;
    }
    await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
    const indexes = await db.collection(collection).indexes();
    manifest.push({ collection, documents, indexes });
    console.log(`  ${collection.padEnd(28)} ${documents}`);
  }

  writeFileSync(
    join(dir, 'manifest.json'),
    JSON.stringify({ database: name, createdAt: new Date().toISOString(), collections: manifest }, null, 2)
  );
  console.log(`Done: ${manifest.length} collections, ${manifest.reduce((n, c) => n + c.documents, 0)} documents.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
