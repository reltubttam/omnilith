const validate = require('./validate');
var assert = require('assert');

const opts = {
  internalPrefix: 'internal',
  routes: [{
    method: 'get',
    path: '/thing',
    machines: [
      'HAL9000'
    ],
    strategy: 'round-robin'
  }],
  headersMask: {},
  machines: {
    HAL9000: {
      baseUrl: 'http://localhost:8765',
      lastUsedTS: 1522595443765,
      active: true
    },
  },
  thisMachine: 'HAL9000'
}

describe('validate.opts', () => {
  it('works for simple initial build', () => {
    const validatedOpts = validate.opts(opts);
    assert.deepEqual(validatedOpts, opts);
  });

  it('works for simple rebuild', () => {
    const validatedOpts = validate.opts({}, opts);
    assert.deepEqual(validatedOpts, opts);
  });

  it('falls back to defaults', () => {
    const validatedOpts = validate.opts({});
    assert.deepEqual(validatedOpts, {
      internalPrefix: 'internal',
      routes: [],
      headersMask: {},
      machines: {},
      thisMachine: null,
    });
  });
});
