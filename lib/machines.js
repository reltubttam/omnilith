const fetch = require('./fetch');

/**
  * given an express route classifier, always pass calls to it to a certain machine
  */
function addForwardPath(opts, app, route) {
  if (app.hasOwnProperty(route.method)) {
    app[route.method](route.path, async (req, res, next) => {
      const targetMachine = getForRoute(opts, route);
      if (!targetMachine) {
        return next(new Error('no machine can be assigned'));
      } else if (!!opts.thisMachine && targetMachine.name == opts.thisMachine) {
        return next();
      }
      try {
        const fetchedResponse = await fetch(opts, targetMachine, req);
        const json = await fetchedResponse.json();

        res.status(fetchedResponse.status)
          .send(json);
      } catch (err) {
        next(err);
      }
    });
  }
}

/**
  * find best machine to handle a given task
  * strategies are 'round-robin' or 'random'
  */
function getForRoute(opts, route) {
  const targets = route.machines.map(name => opts.machines[name])
    .filter(machine => !!machine && machine.active)
    .sort((a, b) => a.lastUsedTS - b.lastUsedTS);

  if (!targets.length) {
    return null;
  }
  let index = 0;
  if (route.strategy == 'random') {
    index = Math.floor(Math.random() * targets.length);
  }
  targets[index].lastUsedTS = Date.now();
  return targets[index];
}

/**
  * set active state on a machine, optionally inverting after timeOut ms
  */
function setActive(opts, activeState, machineName, timeOut) {
  if (opts.machines[machineName]) {
    opts.machines[machineName].active = activeState;

    if (typeof timeOut != 'undefined') {
      setTimeout(() => setActive(opts, !activeState, machineName), timeOut);
    }
  } else {
    throw new Error('unknown machine');
  }
}

module.exports = {
  setActive,
  addForwardPath,
  getForRoute,
};
