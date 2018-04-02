const url = require('url');

/**
  * sanitize options passed on build or rebuild
  * will infer missing details from previous state
  */
function validateOpts(lastOpts, newOpts) {
  const opts = Object.assign({
    internalPrefix: 'internal',
    routes: [],
    headersMask: {},
    machines: {},
    thisMachine: null,
  }, lastOpts, newOpts);

  opts.routes = opts.routes.filter(route => !!route &&
    !!route.path &&
    !!route.machines &&
    !!route.machines.length
  );
  opts.routes.forEach(route => {
    if (!route.method) {
      route.method = 'get';
    }
    route.method = route.method.toLowerCase();
    route.strategy = route.strategy || 'round-robin';

    if (!Array.isArray(route.machines)) {
      route.machines = [route.machines];
    }

    route.machines.forEach((machine, index, allMachines) => {
      if (typeof machine == 'object') {
        if (!machine.baseUrl) {
          throw new Error('baseUrl missing on machine in routes');
        }
        allMachines[index] = machine.name || machine.baseUrl;
        if (!opts.machines[allMachines[index]]) {
          opts.machines[allMachines[index]] = {
            name: allMachines[index],
            lastUsedTS: Date.now(),
            active: true,
            baseUrl: machine.baseUrl,
          };
        }
      } else {
        if (!opts.machines[machine]) {
          opts.machines[machine] = {
            name: machine,
            lastUsedTS: Date.now(),
            active: true,
            baseUrl: machine,
          };
        }
      }
    })
  });

  Object.keys(opts.machines)
    .forEach(name => {
      if (!name) {
        throw new Error('missing machine name');
      }
      if (typeof opts.machines[name] == 'string') {
        const parsedBaseUrl = url.parse(opts.machines[name]);
        opts.machines[name] = {
          name,
          lastUsedTS: Date.now(),
          active: true,
          baseUrl: opts.machines[name],
          port: parsedBaseUrl.port,
        };
      } else {
        machine = opts.machines[name];
        if (!machine.baseUrl) {
          throw new Error('baseUrl missing on machine: ', name);
        }
        const parsedBaseUrl = url.parse(machine.baseUrl);
        machine.port = parsedBaseUrl.port;
        machine.name = name;
        if (!machine.lastUsedTS) {
          machine.lastUsedTS = Date.now();
        }
        if (machine.active === undefined) {
          machine.active = true;
        }
      }
    });

  return opts
}

module.exports = {
  opts: validateOpts
}
