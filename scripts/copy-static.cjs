const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../client');
const dstDir = path.resolve(__dirname, '../dist/client');

function ensureDir(p) {
	if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dst) {
	ensureDir(path.dirname(dst));
	fs.copyFileSync(src, dst);
}

function walk(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			walk(full);
		} else if (/\.(html|css)$/.test(entry.name)) {
			const rel = path.relative(srcDir, full);
			const out = path.join(dstDir, rel);
			copyFile(full, out);
		}
	}
}

ensureDir(dstDir);
walk(srcDir);
console.log('Static assets copied to dist/client');




