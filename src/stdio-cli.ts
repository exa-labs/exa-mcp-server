import { main } from "./stdio.js";

main().catch((error) => {
  console.error(
    `Server initialization error: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
});
