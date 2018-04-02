# omnilith

Omnilith is a framework that aims to combine some of the best aspects of micro service and monolithic architectures.  A single web server is used but many instances of this are run in different locations, these instances then can forward http jobs to each other or handle them themselves.  The forwarding rules can be changed at any time to allow load balancing with millisecond down time, they also offer the maximum possible configuration.  The system can also be run with with a single instance with no forwarding during development with minimal change.

This works by creating an express server as normal then passing it to Omnilith which exposes the following:
- first, the worker app is exposed with it's routes prefixed as internal so other instances can send work to it.
- second,  any non-internal traffic is checked to see if it should be forwarded, if so this is done by http call from the first server to the second.
- thirdly, another reference to the worker app is used to catch any non-internal traffic that does not require forwarding.

While these servers are running, the rules for redirecting and which other servers are operational can all be configured with zero down time.

## Installation

```
$ npm install omnilith
```

## Example

npm install the dependencies, save the following to a file then run three instances of it on the same localhost.  The three instances should have MACHINE_NAME environment variables set to `'HAL9000'`, `'skynet'` and `'holly'` respectively.  By making GET and POST http calls to the different machines, you should see the load being balanced across.
```javascript
const express = require('express');
const bodyParser = require('body-parser');
const omnilith = require('omnilith');

const thisMachine = process.env.MACHINE_NAME;

const gatewayApp = express();
gatewayApp.use(bodyParser.urlencoded({
  extended: false
}));
gatewayApp.use(bodyParser.json());

const app = express();
app.get('/resource/one', (req, res, next) => {
  console.log('GET message received!');
  res.status(200).send({
    resource: 1
  });
});
app.post('/resource/two', (req, res, next) => {
  console.log('POST message received!');
  res.status(200).send({
    resource: 2,
    receivedBody: req.body
  });
});

const machines = {
  HAL9000: 'http://localhost:8765',
  skynet: 'http://localhost:8764',
  holly: 'http://localhost:8763',
};
const routes = [{
    method: 'GET',
    path: '/resource/:id',
    machines: ['HAL9000', 'skynet', 'holly'],
  },
  {
    method: 'POST',
    path: '/resource/:id',
    machines: ['skynet', 'holly'],
  },
];
const containingApp = omnilith(app, {
  routes,
  machines,
  gatewayApp,
  thisMachine,
});

containingApp.use((req, res, next) => {
  console.log('unexpected message received!');
  res.status(404).send({
    unexpected: true,
  });
});

const thisPort = containingApp.listMachines()[thisMachine].port;
containingApp.listen(thisPort);
```

## API

### containingApp = omnilith(app, opts)

Creates a new Omnilith app containing the passed worker app.  opts is an object with the following properties to configure Omnilith:

- **routes** array of objects, each describing a rule for forwarding to different machines.  Each rule has the following properties:
  - **method** method this rule applies to.
  - **path** description of path, uses all syntaxes supported by express.
  - **machines** array of string machine names, servers tasked with this kind of work.
  - **strategy** (optional) string when multiple servers could be forwarded to, `'round-robin'` will choose the one last called, `'random'` will choose one at random.  `'round-robin'` if omitted.
- **machines** object, initialised as `{machineName: baseUrl}`.  The format returned from  `containingApp.listMachines()` can also be used (if for example you want to initialize a machine as inactive).
 - **gatewayApp (optional)** as the forwarding to other services may happen before the worker app is reached, this optional express app is needed for middleware to run on all incoming requests (such as body parsing or authentication.
 - **thisMachine (optional)** string name of this machine, if provided the server can use it to avoid making http calls to itself.
 - **headersMask** object of headers to set when forwarding to other instances for identification.
 - **internalPrefix** by default, internal traffic is redirected with a path prefix of `'internal'`.  If this would cause a collision in existing routes, an alternative can be provided here.

### `containingApp.activate(machineName, [timeOut])`, `containingApp.deactivate(machineName, [timeOut])`

These methods will make another machine callable or not callable from the instance it is used from.  If a timeOut in ms is provided, the status will revert after this period.

If This functionality should be required over http, care should be taken the call is not forwarded (so place the listener on the containing app, not the worker app).

### `containingApp.listMachines()`
Returns detailed information on the machines running, including their `lastUsedTS` time stamp, `baseUrl` address, `active` status and `port` number.

### `containingApp.listRoutes()`
Returns detailed information on the routes currently configured.

### `containingApp.rebuildRoutes(routes)`
Updates the definitions of routes held by Omnilith, then builds a new forwarding app before replacing the old one for the new one.  Generally this takes microseconds.


### `containingApp.rebuildMachines(machines)`
Similar logic to `rebuildRoutes` but updating the machines.  The machines can be in the detailed form returned from `listMachines` or the shorter form of `{machineName: baseUrl}`. 

## License

MIT