import { $ } from 'bun';
import { basename, join } from 'path';
import { readdirSync, statSync, existsSync } from 'fs';
import { Logger } from './src/utils/logger.ts';

const rootDir = process.cwd();
const packagesDir = join(rootDir, 'packages');

const getPackageDirs = () => {
	if (!existsSync(packagesDir)) return [];
	return readdirSync(packagesDir)
		.filter((f) => statSync(join(packagesDir, f)).isDirectory())
		.map((f) => join(packagesDir, f));
};

const allProjectsToBuild = [rootDir, ...getPackageDirs()];

Logger.info(`\nGaman Monorepo Builder`);
Logger.info(`Found ${allProjectsToBuild.length} projects to build...\n`);

for (const pkgPath of allProjectsToBuild) {
	const pkgName = pkgPath === rootDir ? 'gaman (root)' : basename(pkgPath);

	const originalCwd = process.cwd();
	process.chdir(pkgPath);

	Logger.info(`\n📦 Building project: ${pkgName}`);

	try {
		const outDir = join(pkgPath, 'dist');
		await $`rm -rf ${outDir}`.cwd(pkgPath);

		const tsupScript = `
import { build } from 'tsup';
import { fixImportsPlugin } from 'esbuild-fix-imports-plugin';
build({
	entry: ['src/**/*.ts'],
	outDir: 'dist',
	format: ['esm', 'cjs'],
	target: 'node20',
	minifySyntax: true,
	minifyWhitespace: false,
	minifyIdentifiers: false,
	splitting: false,
	sourcemap: false,
	cjsInterop: false,
	clean: true,
	bundle: false,
	external: ['michi', 'gaman', 'gaman/types', 'gaman/responder', 'gaman/compose', 'gaman/utils', 'gaman/formdata', 'gaman/header', 'gaman/enums'],
	esbuildPlugins: [fixImportsPlugin()],
});
`;
		await $`bun -e ${tsupScript}`.cwd(pkgPath);

		await $`bunx tsc --project tsconfig.dts.json`.cwd(pkgPath);
		await $`find dist -name "*.test.*" -type f -delete`.cwd(pkgPath);

		Logger.info(`✅ ${pkgName} build success!`);
	} catch (err) {
		console.error(`❌ Error building ${pkgName}:`, err);
		process.exit(1);
	} finally {
		process.chdir(originalCwd);
	}
}

Logger.info(`\nAll projects built successfully!\n`);