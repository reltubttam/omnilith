const proxyquire = require('proxyquire');
var assert = require('assert');
const machines = proxyquire
  .noCallThru()
  .load('./machines', {
    './fetch': async (opts, targetMachine, req) => {
      return {
        json: () => Promise.resolve({}),
        status: 200,
      }
    }
  });

const opts = {
  machines: {
    HAL9000: {
      baseUrl: 'http://localhost:8765',
      lastUsedTS: Date.now() - 10000,
      active: false
    },
    skynet: {
      baseUrl: 'http://localhost:8764',
      lastUsedTS: Date.now() - 8000,
      active: true
    },
    holly: {
      baseUrl: 'http://localhost:8763',
      lastUsedTS: Date.now() - 6000,
      active: true
    },
    jarvis: {
      baseUrl: 'http://localhost:8762',
      lastUsedTS: Date.now() - 4000,
      active: true
    },
    daedalus: {
      baseUrl: 'http://localhost:8761',
      lastUsedTS: Date.now() - 2000,
      active: true
    }
  },
};

describe('machines.getForRoute', () => {
  it('round-robin strategy uses least recently used active machine', () => {
    const machine = machines.getForRoute(opts, {
      machines: ['HAL9000', 'skynet', 'jarvis', 'holly'],
      strategy: 'round-robin',
    });
    assert.equal(machine.baseUrl, opts.machines.skynet.baseUrl);
  });

  it('random strategy uses random active machine', () => {
    const firstMachine = machines.getForRoute(opts, {
      machines: ['HAL9000', 'skynet', 'jarvis', 'holly'],
      strategy: 'random',
    });
    let secondMachne = {};
    for (let i = 0; !secondMachne.baseUrl && i < 1000; i++) {
      machine = machines.getForRoute(opts, {
        machines: ['HAL9000', 'skynet', 'jarvis', 'holly'],
        strategy: 'random',
      });
      if (machine.baseUrl != firstMachine.baseUrl) {
        secondMachne = machine;
      }
    }
    if (!secondMachne.baseUrl) {
      throw new Error('multiple machnes not seen')
    }
  });
});

describe('machines.setActive', () => {
  it('sets active state if no timeout', () => {
    opts.machines.daedalus.active = true;
    machines.setActive(opts, false, 'daedalus');
    assert.equal(opts.machines.daedalus.active, false);
  });

  it('sets active state then reverts after timeout', async () => {
    opts.machines.daedalus.active = true;
    machines.setActive(opts, false, 'daedalus', 9);
    assert.equal(opts.machines.daedalus.active, false);
    await new Promise(resolve => setTimeout(resolve, 99));
    assert.equal(opts.machines.daedalus.active, true);
  });
});
