import { restoreLocalArchive } from "../apps/web/lib/local/archive.ts";
const [filename, directory] = process.argv.slice(2);
if (!filename || !directory) {
  console.error(
    "Usage: npm run local:restore -- <backup.somssi-backup.gz> <NEW-private-directory>",
  );
  process.exitCode = 1;
} else {
  try {
    console.log(
      "Restored and verified:",
      await restoreLocalArchive(filename, directory),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
