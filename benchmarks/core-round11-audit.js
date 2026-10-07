'use strict';
/* eslint-env node */
process.env.AUDIT_BASE_URL = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:8767/core-round11/case.html';
process.env.AUDIT_OUTPUT = process.env.AUDIT_OUTPUT || 'tmp/core-round11-results.json';
require('./core-next-audit');
