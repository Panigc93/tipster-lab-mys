#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
node --test tests/engine.test.mjs tests/cli.test.mjs tests/properties.test.mjs tests/compare.test.mjs tests/quality.test.mjs tests/funnel.test.mjs
python3 -m unittest discover -s tests -p 'test_*.py'
node --check collector/mys-export.js
node web/build.mjs
if [ "${MYS_BROWSER_TEST:-0}" = 1 ]; then node tests/browser.test.mjs; fi
