'use strict';

var $$rAFSchedulerFactory = ['$$rAF', function($$rAF) {
  var queue, cancelFn, queuePosition = 0;

  function scheduler(tasks) {
    // we make a copy since RAFScheduler mutates the state
    // of the passed in array variable and this would be difficult
    // to track down on the outside code
    if (queuePosition > 1024 && queuePosition * 2 >= queue.length) {
      queue = queue.slice(queuePosition);
      queuePosition = 0;
    }
    if (queue === scheduler.queue) {
      queue = queue.concat(tasks);
    } else if (isArray(tasks)) {
      for (var i = 0; i < tasks.length; i++) queue.push(tasks[i]);
    } else {
      queue.push(tasks);
    }
    nextTick();
  }

  queue = scheduler.queue = [];

  /* waitUntilQuiet does two things:
   * 1. It will run the FINAL `fn` value only when an uncanceled RAF has passed through
   * 2. It will delay the next wave of tasks from running until the quiet `fn` has run.
   *
   * The motivation here is that animation code can request more time from the scheduler
   * before the next wave runs. This allows for certain DOM properties such as classes to
   * be resolved in time for the next animation to run.
   */
  scheduler.waitUntilQuiet = function(fn) {
    if (cancelFn) cancelFn();

    cancelFn = $$rAF(function() {
      cancelFn = null;
      fn();
      nextTick();
    });
  };

  return scheduler;

  function nextTick() {
    if (queuePosition === queue.length) return;

    var items = queue[queuePosition];
    queue[queuePosition++] = null;
    if (queuePosition === queue.length) {
      queue = [];
      queuePosition = 0;
    }
    for (var i = 0; i < items.length; i++) {
      items[i]();
    }

    if (!cancelFn) {
      $$rAF(function() {
        if (!cancelFn) nextTick();
      });
    }
  }
}];
