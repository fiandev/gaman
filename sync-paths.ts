import { file, JSONC, write } from "bun";
import { readdirSync, existsSync } from "node:fs";

const PACKAGE_JSON_PATH = "./package.json";
const TSCONFIG_PATH = "./tsconfig.json";
const TYPE_TSCONFIG_PATH = "./tsconfig.dts.json";

async function safeJsonParse(path: string): Promise<any> {
  try {
    const content = await file(path).text();
    // Bersihin trailing commas & comments sederhana biar gak gampang error
    const cleanContent = content// Hapus trailing commas
    
    return JSONC.parse(cleanContent);
  } catch (e) {
    throw new Error(`Gagal parse file: ${path}. Pastikan format JSON bener (gak ada typo koma/kurung).`);
  }
}

async function sync() {
  try {
    // Pake safe parse biar aman
    const pkg = await safeJsonParse(PACKAGE_JSON_PATH);
    const tsconfig = await safeJsonParse(TSCONFIG_PATH);
    const typeTsconfig = await safeJsonParse(TYPE_TSCONFIG_PATH);

    console.log("🚀 Syncing GamanJS Workspace...");

    // --- LOGIC PATHS (Sama kayak sebelumnya) ---
    const newPaths: Record<string, string[]> = {
      "gaman": ["./src/index.ts"]
    };

    if (pkg.exports) {
      for (const [key, value] of Object.entries(pkg.exports)) {
        if (key === "." || key === "./package.json") continue;
        const aliasKey = key.replace("./", "gaman/");
        const target = (value as any).import || (value as any).types || "";
        if (target) {
          const srcPath = target
            .replace("./dist/", "./src/")
            .replace(/\.(mjs|js|d\.ts)$/, ".ts");
          newPaths[aliasKey] = [srcPath];
        }
      }
    }

    tsconfig.compilerOptions = {
      ...tsconfig.compilerOptions,
      paths: newPaths
    };
    typeTsconfig.compilerOptions = {
      ...typeTsconfig.compilerOptions,
      paths: newPaths
    }
    
    

    // Tulis balik dengan rapi
    await write(TSCONFIG_PATH, JSON.stringify(tsconfig, null, 2));
    await write(TYPE_TSCONFIG_PATH, JSON.stringify(typeTsconfig, null, 2));
    console.log("✅ Core paths synced to tsconfig.json");

    // --- LOGIC AUTO-GENERATE TSCONFIG PACKAGES ---
    // (Tambahin logic readdirSync lu yang tadi di sini)

  } catch (err: any) {
    console.error(`❌ Sync failed: ${err.message}`);
  }
}

sync();