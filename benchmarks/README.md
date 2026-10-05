Instructions for using benchpress (how to create benchmarks, how to run, how to configure) can be
found at: https://github.com/angular/benchpress/blob/master/README.md.

In this project, there is a configured grunt task for building the benchmarks,
`grunt bp_build`, which places the runnable benchmarks in "/build/benchmarks/".
The existing `grunt webserver` task can be used to serve the built benchmarks at `localhost:8000/build/benchmarks/<benchmark-name>`

For a local audit without Benchpress, run `yarn.cmd grunt build:angular` and open
`benchmarks/performance-audit.html`. See [PERFORMANCE-AUDIT.md](PERFORMANCE-AUDIT.md)
for measured results, methodology, limitations and optimization candidates.

For retained-memory measurements, open `benchmarks/memory-audit.html` in Chrome
started with `--js-flags=--expose-gc --enable-precise-memory-info`.

For template linking and promise rejection queues, open `benchmarks/queue-audit.html`
after building the core. It checks task counts and reports seven-sample medians.

For direct interpolation, HTTP interceptor setup and event listener compaction,
open `benchmarks/internal-audit.html` after building the core. Synthetic cases
check outputs and callback counts; results are seven-sample medians after warmup.
