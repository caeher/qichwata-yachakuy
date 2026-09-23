import { fileURLToPath } from "node:url";

/**
 * Application accounts are provisioned by Clerk. There is no commercial or
 * educational catalog that needs seed data at this stage.
 */
export async function seedApplicationData(): Promise<void> {}

async function main() {
  await seedApplicationData();
  console.log("No initial data is required.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
