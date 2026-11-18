// Restores collections from a backup made by scripts/backup-database.ts into the database in
// MONGODB_URI. Each restored collection is replaced wholesale (documents and indexes) by its
// backed-up state. Dry run by default; pass --apply to write.
//
// Undo the event-pages migration (only the collections it touched):
//   node --env-file=.env.local --import tsx scripts/restore-database.ts --from backups/<folder> \
//     --collections medallionguests,medallionevents,eventsites --apply
// Restore everything: omit --collections.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';

const { EJSON } = mongoose.mongo.BSON;
const arg = (flag: string) => (process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : undefined);
const apply = process.argv.includes('--apply');

type IndexSpec = { name: string; key: Record<string, 1 | -1>; v?: number; ns?: string; [option: string]: unknown };

async function main() {
  const from = arg('--from');
  if (!from || !existsSync(join(from, 'manifest.json'))) throw new Error('Pass --from <backup folder> (it must contain manifest.json)');
  const manifest = JSON.parse(readFileSync(join(from, 'manifest.json'), 'utf8')) as {
    database: string;
    collections: { collection: string; documents: number; indexes: IndexSpec[] }[];
  };
  const only = arg('--collections')?.split(',').map((s) => s.trim()).filter(Boolean);

  await connectDB();
  const db = mongoose.connection.db!;
  console.log(`${apply ? '' : '[dry run] '}Restoring backup of "${manifest.database}" into "${mongoose.connection.name}"`);
  if (manifest.database !== mongoose.connection.name) console.log('  ⚠ The backup came from a different database name.');

  const targets = only ?? manifest.collections.map((c) => c.collection);
  for (const name of targets) {
    const entry = manifest.collections.find((c) => c.collection === name);
    const docs = entry
      ? readFileSync(join(from, `${name}.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => EJSON.parse(l, { relaxed: false }))
      : [];
    const current = await db.collection(name).estimatedDocumentCount().catch(() => 0);
    console.log(`  ${name.padEnd(28)} now ${current} → backup ${docs.length}${entry ? '' : ' (not in backup — will be emptied)'}`);
    if (!apply) continue;

    const coll = db.collection(name);
    await coll.deleteMany({});
    // Drop indexes the backup didn't have (e.g. ones added after it was taken), then recreate the backup's.
    const wanted = new Set((entry?.indexes ?? []).map((i) => i.name));
    for (const idx of await coll.indexes().catch(() => [])) {
      if (idx.name && idx.name !== '_id_' && !wanted.has(idx.name)) await coll.dropIndex(idx.name);
    }
    if (docs.length) await coll.insertMany(docs, { ordered: true });
    for (const idx of entry?.indexes ?? []) {
      if (idx.name === '_id_') continue;
      // Keep every option (TTL expireAfterSeconds, partialFilterExpression, collation…), not just unique/sparse.
      const { key, v: _v, ns: _ns, ...options } = idx;
      await coll.createIndex(key, options as mongoose.mongo.CreateIndexesOptions).catch((err) =>
        console.log(`    index ${idx.name} not recreated: ${err.message}`)
      );
    }
  }
  console.log(apply ? 'Restore complete.' : 'Dry run complete — re-run with --apply to write.');
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
