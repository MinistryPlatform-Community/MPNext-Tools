# Update Dependencies Command

Audit and upgrade project dependencies: apply safe updates, evaluate majors
individually, sweep for vulnerabilities beyond `npm audit`, and record the result
in `.claude/packages/`.

**Arguments** (optional):
- `--security-only` — stop after step 4 (in-range updates). Use for an urgent
  advisory; skips all major-version evaluation.
- `--check` — report only, change nothing. Runs steps 1–3 and reports.

## Principles

1. **Establish the baseline before touching anything.** Every later "this broke"
   claim is meaningless without the numbers from step 2.
2. **Never batch majors.** One major per install, verified, before the next. A
   batched failure costs more to bisect than the batching saved.
3. **Type-check as well as test.** The 2026-09-13 audit found a jest-dom 7 break
   that passed all 805 tests and produced 60 type errors. Tests alone are not a
   sufficient gate.
4. **A hold is a deliverable.** Every held-back package needs a written clearing
   condition and the one-line command that re-checks it.
5. **Verify peer ranges from the registry, not from blog posts.** `npm view X
   peerDependencies` is authoritative; release-note summaries are frequently
   wrong or incomplete.

---

## Instructions

### 1. Set up

- Confirm the tree is clean (`git status`). Stash or commit first if not.
- Branch from `dev` per CLAUDE.md:
  `git switch dev && git pull && git switch -c chore/dependency-audit-YYYY-MM`
- Read the most recent file in `.claude/packages/` **before doing anything
  else** — its "Held back" section tells you what is already known to be blocked
  and what condition clears it. Re-check each hold with its recorded command; do
  not re-derive the analysis.

### 2. Capture the baseline

Record these numbers — they are the comparison for everything that follows:

```bash
npm run test:run    # test + file counts
npm run lint
npm run build 2>&1 | grep -cE "error TS"   # may be non-zero already
npm audit
node -v && npm -v
```

> `npm run build` regenerates `_INSTALL/` and rewrites `next-env.d.ts` (it
> flip-flops between the `next dev` and `next build` forms). Revert that churn
> before committing: `git checkout -- _INSTALL/ next-env.d.ts`

### 3. Survey

```bash
npm outdated
npm audit --json
```

Split the results into:
- **In-range** (`Wanted` ≠ `Current`) — safe, handled in step 4.
- **Majors** (`Latest` ≠ `Wanted`) — one-by-one in step 6.

For anything with an advisory, trace where it actually enters the tree:
`npm ls <pkg> --all`. A transitive vulnerability is usually fixed by bumping its
*parent*, not by an override.

If `--check`, report and stop here.

### 4. Apply in-range updates

```bash
npm update --save
npm audit
```

This alone often clears every advisory. Verify against the baseline
(test / lint / type-error count), then commit on its own — keep security fixes
separate from major upgrades so they can be cherry-picked or reverted alone.

If `--security-only`, stop here.

### 5. Prune unreferenced packages

For each direct dependency, check for real references:

```bash
grep -rl "['\"]<pkg>" --exclude-dir=node_modules --exclude-dir=.git \
  --exclude-dir=.next src/ scripts/ *.ts *.mjs *.css
```

Check config files too — a package can be used without being imported
(`postcss.config.mjs`, `eslint.config.mjs`, `globals.css` `@plugin`/`@import`,
`next.config.ts`). Removing a dead dependency is strictly better than upgrading
it across a major.

**Keep** a package that pins a version for the toolchain even with no direct
import (e.g. `postcss`). Only remove what is provably unreachable, and say in the
commit how you proved it.

### 6. Evaluate each major, one at a time

For each, **before installing**, check the registry:

```bash
npm view <pkg>@<target> peerDependencies engines --json
```

Then confirm the rest of the tree can satisfy those peers — especially any
wrapper package. A wrapper's peer range on its wrapped library is the usual
blocker (`@grapesjs/react` → `grapesjs`, `eslint-config-next` →
`eslint-plugin-react`). Check whether the wrapper's **latest** release supports
the target; if it does not, the upgrade is blocked upstream and no override fixes
it — record it as a hold.

Then install that **one** package, and verify:

```bash
npm install <pkg>@<target>
npm run test:run
npm run lint
npm run build 2>&1 | grep -cE "error TS"   # compare to baseline
```

- Any new type error is a real break even if tests pass — find the migration
  (usually a changed entry point or type-registration mechanism) before
  accepting.
- If the package is used by a script rather than the app, **run the script**
  (e.g. `npm run setup:check` for `chalk`).
- If the break is upstream and unfixable, `git checkout -- package.json
  package-lock.json && npm install` and record it as a hold.

Also check anything CI depends on by path. CI runs `npm run test:coverage` and
uploads `coverage/coverage-final.json`; major test-runner versions have moved
output directories before, so confirm the file still exists at that exact path:

```bash
npm run test:coverage && ls coverage/coverage-final.json
```

If any adopted package raises the Node floor, update `engines.node` to the
**strictest** range among the dependencies — an inaccurate `engines` lets install
succeed and runtime fail.

### 7. Sweep for vulnerabilities beyond `npm audit`

`npm audit` reports only GitHub-**reviewed** advisories. Query the full resolved
tree against OSV.dev, which aggregates more feeds:

```bash
npm ls --all --json > "$TEMP/tree.json"
node -e "
const fs=require('fs');
const t=JSON.parse(fs.readFileSync(process.env.TEMP+'/tree.json','utf8'));
const seen=new Map();
(function walk(n){if(!n||!n.dependencies)return;for(const[k,v]of Object.entries(n.dependencies)){if(v.version){const key=k+'@'+v.version;if(!seen.has(key)){seen.set(key,{name:k,version:v.version});walk(v);}}}})(t);
const all=[...seen.values()];
(async()=>{for(let i=0;i<all.length;i+=200){
  const c=all.slice(i,i+200);
  const r=await fetch('https://api.osv.dev/v1/querybatch',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({queries:c.map(d=>({package:{name:d.name,ecosystem:'npm'},version:d.version}))})});
  (await r.json()).results.forEach((x,k)=>{if(x.vulns&&x.vulns.length)console.log('HIT',c[k].name+'@'+c[k].version,x.vulns.map(v=>v.id).join(','));});
}console.log('scanned',all.length);})();
"
```

**Triage every hit before reporting it.** OSV ranges are sometimes malformed —
fetch `https://api.osv.dev/v1/vulns/<ID>` and read `affected[].ranges` directly.
A record with `{"introduced":"0"}` and no `fixed` event matches every version and
is almost always a false positive. Known standing false positive: `grapesjs` /
GHSA-589f-c66p-hxr4.

For richer context on a specific library's breaking changes, `context7` is
available (`resolve-library-id` then `query-docs`).

### 8. Supply-chain checks

```bash
npm ls --all 2>&1 | grep -i deprecated
```

Then check publish recency for upgraded packages. A version published within the
last day or two has had no soak time and deserves a look:

```bash
node -e "
const p='<pkg>';(async()=>{const j=await(await fetch('https://registry.npmjs.org/'+encodeURIComponent(p))).json();
const v=require('./node_modules/'+p+'/package.json').version;const d=j.time[v];
const x=j.versions[v];
console.log(v,d,'| maintainers:',j.maintainers.map(m=>m.name).join(','),
 '| publisher:',x._npmUser&&x._npmUser.name,
 '| provenance:',!!(x.dist&&x.dist.attestations),
 '| scripts:',Object.keys(x.scripts||{}).filter(s=>/^(pre|post)?install/.test(s)));})();
"
```

Accept a same-day release only if the maintainer set is unchanged, it was
published by the project's normal CI with **provenance attestations**, and it
adds no install scripts. Otherwise pin to the previous version and note why.

### 9. Record and commit

- Write `.claude/packages/YYYY-MM-DD.md` following the structure of the previous
  record: result table, security findings, removals, majors adopted, **majors
  held with clearing conditions**, and any pre-existing issues found but not
  fixed.
- Add a row to the index table in `.claude/packages/README.md`.
- Add a row to the **Dependency Audit History** table in `CLAUDE.md`.
- Commit in the same separable units used above (in-range / removals / each
  major), then open a PR targeting `dev`.

### 10. Report to the user

Lead with the security outcome (advisory count before → after, and name anything
critical). Then: what was upgraded, what was held and why, and any pre-existing
problems surfaced. Call out explicitly anything you did **not** do.
