/**
 * Wait until a Colyseus room state matches one of the provided patterns.
 * Returns when every pattern predicate returns true at least once.
 */
export async function waitForPatterns(room, patterns, timeoutMs = 5000) {
  const start = Date.now();
  const checks = patterns.map((p) => ({
    predicate: typeof p === 'function' ? p : (v) => {
      const val = p.path.split('.').reduce((acc, key) => acc && acc[key], v);
      return p.match(val);
    },
    satisfied: false,
  }));

  return new Promise((resolve, reject) => {
    if (checks.every((c) => c.satisfied)) {
      return resolve();
    }

    const timer = setTimeout(() => {
      const failures = checks
        .filter((c) => !c.satisfied)
        .map((c, i) => `pattern ${i}`);
      reject(new Error(`waitForPatterns timed out: ${failures.join(', ')}`));
    }, timeoutMs);

    const tick = async () => {
      if (Date.now() - start > timeoutMs) {
        clearTimeout(timer);
        const failures = checks
          .filter((c) => !c.satisfied)
          .map((c, i) => `pattern ${i}`);
        return reject(new Error(`waitForPatterns timed out: ${failures.join(', ')}`));
      }

      try {
        const state = await room.getState();
        let changed = false;
        for (const check of checks) {
          if (!check.satisfied && check.predicate(state)) {
            check.satisfied = true;
            changed = true;
          }
        }

        if (checks.every((c) => c.satisfied)) {
          clearTimeout(timer);
          return resolve();
        }

        if (changed) {
          setTimeout(tick, 30);
        } else {
          setTimeout(tick, 50);
        }
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    };

    setTimeout(tick, 30);
  });
}
