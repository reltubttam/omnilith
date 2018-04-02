const express = require('express');
const machines = require('./lib/machines');
const validate = require('./lib/validate');

/**
  * build a new omnilith
  */
function build(workerApp, buildOpts) {
  let containingApp = null;
  let forwardingApp = null;
  let opts = validate.opts(buildOpts);

  // the containing app starts with gateway middleware if provided
  if (opts.gatewayApp) {
    containingApp = opts.gatewayApp;
  } else {
    containingApp = express();
  }

  // at /<internalPrefix> level, expose worker app to be called by other machines 
  containingApp.use('/' + opts.internalPrefix, workerApp);

  // at / level, forward selected paths to other machines
  containingApp.use((req, res, next) => forwardingApp(req, res, next));

  // if not caught by the above, at / level, handle worker app
  containingApp.use('/', workerApp);

  function rebuild(rebuildOpts) {
    // check rebuilding to valid state then recreate forwarding app
    if (rebuildOpts) {
      opts = validate.opts(buildOpts, rebuildOpts);
    }

    const newForwardingApp = express();
    opts.routes.forEach(route => machines.addForwardPath(opts, newForwardingApp, route));
    forwardingApp = newForwardingApp;

    return containingApp;
  }
  rebuild();

  containingApp.activate = (machineName, timeOut) => machines.setActive(opts, true, machineName, timeOut);
  containingApp.deactivate = (machineName, timeOut) => machines.setActive(opts, false, machineName, timeOut);
  containingApp.listMachines = () => opts.machines;
  containingApp.listRoutes = () => opts.routes;
  containingApp.rebuildMachines = (machines) => rebuild({machines});
  containingApp.rebuildRoutes = (routes) => rebuild({routes});

  return containingApp;
}

module.exports = build;
