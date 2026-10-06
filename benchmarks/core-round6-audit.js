'use strict';
/* eslint-env node */
process.env.AUDIT_BASE_URL = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:8767/core-round6/case.html';
process.env.AUDIT_OUTPUT = process.env.AUDIT_OUTPUT || 'tmp/core-round6-results.json';
require('./core-next-audit');
