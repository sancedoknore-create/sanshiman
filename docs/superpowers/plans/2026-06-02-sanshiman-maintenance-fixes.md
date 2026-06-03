# Sanshiman Maintenance Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the current engineering hygiene issues in `D:/sanshiman/resources/app`: lockfile metadata drift, the `tmp` high-severity audit finding, and accidental auto-publish behavior in the release batch script, then verify tests and build.

**Architecture:** This is a maintenance-only change. It should not alter runtime app behavior except for release packaging safety; dependency metadata is updated through npm so `package-lock.json` stays consistent with `package.json` and the installed dependency tree.

**Tech Stack:** Electron, electron-vite, electron-builder, npm, Vitest, Windows batch script.

---

## File Structure

- Modify: `D:/sanshiman/resources/app/package-lock.json`
  - Responsibility: lock exact dependency versions and package metadata. Must reflect `package.json` version `1.0.18` and contain the fixed `tmp` dependency resolution.
- Modify: `D:/sanshiman/resources/app/build-release.bat`
  - Responsibility: local Windows release helper. It must build installers without publishing unless the user explicitly runs a separate publishing command.
- Read/verify only: `D:/sanshiman/resources/app/package.json`
  - Responsibility: source package metadata and npm scripts. Do not change unless npm updates lock metadata only.

---

### Task 1: Synchronize Lockfile Metadata and Fix Audit Vulnerability

**Files:**
- Modify: `D:/sanshiman/resources/app/package-lock.json:1-30`
- Modify: `D:/sanshiman/resources/app/package-lock.json:6080-6088` or equivalent `node_modules/tmp` block after npm rewrites it
- Verify: `D:/sanshiman/resources/app/package.json:1-10`

- [ ] **Step 1: Confirm the current version mismatch and vulnerable dependency**

Run:

```bash
node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('/d/sanshiman/resources/app/package.json','utf8')); const l=JSON.parse(fs.readFileSync('/d/sanshiman/resources/app/package-lock.json','utf8')); console.log({packageVersion:p.version, lockVersion:l.version, lockRootVersion:l.packages[''].version, tmpVersion:l.packages['node_modules/tmp'] && l.packages['node_modules/tmp'].version});"
```

Expected before fixing:

```text
{ packageVersion: '1.0.18', lockVersion: '1.0.13', lockRootVersion: '1.0.13', tmpVersion: '0.2.5' }
```

- [ ] **Step 2: Let npm update the lockfile and dependency tree safely**

Run:

```bash
npm --prefix /d/sanshiman/resources/app audit fix
```

Expected:

```text
fixed 1 of 1 vulnerability
```

Acceptable alternate output: npm may say packages were changed and `found 0 vulnerabilities`. Do not use `--force`.

- [ ] **Step 3: Re-check lockfile metadata and `tmp` version**

Run:

```bash
node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('/d/sanshiman/resources/app/package.json','utf8')); const l=JSON.parse(fs.readFileSync('/d/sanshiman/resources/app/package-lock.json','utf8')); console.log({packageVersion:p.version, lockVersion:l.version, lockRootVersion:l.packages[''].version, tmpVersion:l.packages['node_modules/tmp'] && l.packages['node_modules/tmp'].version});"
```

Expected after fixing:

```text
{ packageVersion: '1.0.18', lockVersion: '1.0.18', lockRootVersion: '1.0.18', tmpVersion: '0.2.6' }
```

If `tmpVersion` is higher than `0.2.6`, that is also acceptable. If the package versions are still `1.0.13`, run this lockfile-only synchronization:

```bash
npm --prefix /d/sanshiman/resources/app install --package-lock-only
```

Then run the same Node verification command again.

- [ ] **Step 4: Verify audit is clean**

Run:

```bash
npm --prefix /d/sanshiman/resources/app audit --audit-level=moderate
```

Expected:

```text
found 0 vulnerabilities
```

---

### Task 2: Make Release Batch Script Non-Publishing by Default

**Files:**
- Modify: `D:/sanshiman/resources/app/build-release.bat:1-6`

- [ ] **Step 1: Replace publish-always with publish-never and document explicit publish command**

Replace the whole file `D:/sanshiman/resources/app/build-release.bat` with:

```bat
@echo off
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
REM 默认只构建安装包，不发布到 GitHub。
REM 如需发布，必须明确手动运行: npm run build:win -- -p always
npm run build:win -- -p never
```

Reason: `-p always` can publish to GitHub when `GH_TOKEN` exists. `-p never` keeps packaging local by default.

- [ ] **Step 2: Verify the script no longer contains auto-publish**

Run:

```bash
node -e "const fs=require('fs'); const s=fs.readFileSync('/d/sanshiman/resources/app/build-release.bat','utf8'); console.log(s); if(/-p\s+always/.test(s.split(/\r?\n/).filter(line=>!/^\s*REM\b/i.test(line)).join('\n'))) process.exit(1);"
```

Expected: command exits successfully and the executable npm line is:

```bat
npm run build:win -- -p never
```

---

### Task 3: Full Verification

**Files:**
- Verify: `D:/sanshiman/resources/app/package.json`
- Verify: `D:/sanshiman/resources/app/package-lock.json`
- Verify: `D:/sanshiman/resources/app/build-release.bat`

- [ ] **Step 1: Run the unit test suite**

Run:

```bash
npm --prefix /d/sanshiman/resources/app test
```

Expected:

```text
Test Files  20 passed (20)
Tests       162 passed (162)
```

Notes: Node may print experimental `localStorage` warnings and jsdom may print `HTMLMediaElement` not implemented messages. Those are acceptable if all tests pass.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm --prefix /d/sanshiman/resources/app run build
```

Expected:

```text
✓ built
```

Notes: The warning `renderer config is missing` is expected in this project because `electron.vite.config.mjs` intentionally only builds main/preload and preserves the existing `out/renderer` output.

- [ ] **Step 3: Final audit check**

Run:

```bash
npm --prefix /d/sanshiman/resources/app audit --audit-level=moderate
```

Expected:

```text
found 0 vulnerabilities
```

- [ ] **Step 4: Summarize changed files**

Run:

```bash
node -e "const fs=require('fs'); const lock=JSON.parse(fs.readFileSync('/d/sanshiman/resources/app/package-lock.json','utf8')); const bat=fs.readFileSync('/d/sanshiman/resources/app/build-release.bat','utf8'); console.log('package-lock version:', lock.version); console.log('root package version:', lock.packages[''].version); console.log('tmp version:', lock.packages['node_modules/tmp'] && lock.packages['node_modules/tmp'].version); console.log('release script uses -p never:', /npm run build:win -- -p never/.test(bat));"
```

Expected:

```text
package-lock version: 1.0.18
root package version: 1.0.18
tmp version: 0.2.6
release script uses -p never: true
```

If `tmp version` is higher than `0.2.6`, that is acceptable.

---

## Self-Review

**Spec coverage:**
- Synchronize `package-lock.json` version with `package.json`: Task 1 Step 3.
- Fix `npm audit` high-severity `tmp` finding: Task 1 Steps 2 and 4.
- Change `build-release.bat` default from publishing to non-publishing: Task 2 Step 1.
- Verify tests and build: Task 3 Steps 1 and 2.

**Placeholder scan:** No placeholders are present. Every command and expected result is explicit.

**Type/signature consistency:** No application APIs are introduced or modified. Commands consistently target `/d/sanshiman/resources/app` and files under `D:/sanshiman/resources/app`.
