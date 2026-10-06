'use strict';
/* eslint-env node */
process.env.AUDIT_BASE_URL = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:8767/core-round4/case.html';
process.env.AUDIT_OUTPUT = process.env.AUDIT_OUTPUT || 'tmp/core-round4-results.json';
require('./core-next-audit');
