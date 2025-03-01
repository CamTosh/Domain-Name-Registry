
import { Database } from "bun:sqlite";
import { initializeDatabase, queries } from "../database";
import { isValidDomain } from "../utils/domains";

class RegistrarSimulator {
  private db: Database;
  private domains: string[] = [
    'premium.tsh', 'crypto.tsh', 'nft.tsh', 'meta.tsh', 'web3.tsh',
    'defi.tsh', 'exchange.tsh', 'trade.tsh', 'invest.tsh', 'bank.tsh',
    'game.tsh', 'play.tsh', 'sport.tsh', 'bet.tsh', 'casino.tsh',
    'shop.tsh', 'store.tsh', 'market.tsh', 'buy.tsh', 'sell.tsh'
  ];

  private registrars: {
    id: string;
    strategy: 'aggressive' | 'steady' | 'burst' | 'random';
    targetDomains: string[];
  }[] = [];

  constructor() {
    this.db = new Database("registry.sqlite", { create: true });
    initializeDatabase(this.db);
    this.setupRegistrars();
  }

  private setupRegistrars() {
    // Create registrars with different strategies
    const registrarsConfig = [
      { id: 'aggressive_reg', strategy: 'aggressive', domainCount: 15 },
      { id: 'steady_reg', strategy: 'steady', domainCount: 8 },
      { id: 'burst_reg', strategy: 'burst', domainCount: 10 },
      { id: 'random_reg', strategy: 'random', domainCount: 5 }
    ];

    registrarsConfig.forEach(config => {
      // Create registrar in database
      queries.createRegistrar(this.db, config.id, 'password123');

      // Randomly assign target domains
      const targetDomains = [...this.domains]
        .sort(() => 0.5 - Math.random())
        .slice(0, config.domainCount);

      this.registrars.push({
        id: config.id,
        strategy: config.strategy as any,
        targetDomains
      });
    });
  }

  private async simulateAggressiveStrategy(registrar: typeof this.registrars[0], hours: number) {
    // Aggressive: Frequent checks with bursts, high volume
    const startTime = Date.now() - (hours * 3600000);
    let currentTime = startTime;

    while (currentTime < Date.now()) {
      // Every minute during peak hours
      if (this.isPeakHour(currentTime)) {
        for (const domain of registrar.targetDomains) {
          // Multiple rapid checks
          for (let i = 0; i < 3; i++) {
            await this.logAction(registrar.id, domain, 'check', currentTime + (i * 100));
          }

          if (Math.random() < 0.1) { // 10% chance of create attempt
            await this.logAction(registrar.id, domain, 'create', currentTime + 500);
          }
        }
      }
      currentTime += 60000; // Advance 1 minute
    }
  }

  private async simulateSteadyStrategy(registrar: typeof this.registrars[0], hours: number) {
    // Steady: Regular intervals, consistent checking
    const startTime = Date.now() - (hours * 3600000);
    let currentTime = startTime;

    while (currentTime < Date.now()) {
      // Every 5 minutes
      if (currentTime % 300000 === 0) {
        for (const domain of registrar.targetDomains) {
          await this.logAction(registrar.id, domain, 'check', currentTime);

          if (Math.random() < 0.05) { // 5% chance of create attempt
            await this.logAction(registrar.id, domain, 'create', currentTime + 1000);
          }
        }
      }
      currentTime += 60000; // Advance 1 minute
    }
  }

  private async simulateBurstStrategy(registrar: typeof this.registrars[0], hours: number) {
    // Burst: Periods of intense activity followed by quiet
    const startTime = Date.now() - (hours * 3600000);
    let currentTime = startTime;

    while (currentTime < Date.now()) {
      // Burst every hour at random minute
      if (currentTime % 3600000 === 0) {
        const burstTime = currentTime + Math.random() * 3600000;

        // Intense burst of activity
        for (const domain of registrar.targetDomains) {
          for (let i = 0; i < 10; i++) { // 10 rapid checks
            await this.logAction(registrar.id, domain, 'check', burstTime + (i * 50));
          }

          if (Math.random() < 0.15) { // 15% chance of create attempt
            await this.logAction(registrar.id, domain, 'create', burstTime + 600);
          }
        }
      }
      currentTime += 60000; // Advance 1 minute
    }
  }

  private async simulateRandomStrategy(registrar: typeof this.registrars[0], hours: number) {
    // Random: Unpredictable checking patterns
    const startTime = Date.now() - (hours * 3600000);
    let currentTime = startTime;

    while (currentTime < Date.now()) {
      if (Math.random() < 0.3) { // 30% chance of activity each minute
        const domain = registrar.targetDomains[Math.floor(Math.random() * registrar.targetDomains.length)];
        await this.logAction(registrar.id, domain, 'check', currentTime);

        if (Math.random() < 0.08) { // 8% chance of create attempt
          await this.logAction(registrar.id, domain, 'create', currentTime + 200);
        }
      }
      currentTime += 60000; // Advance 1 minute
    }
  }

  private isPeakHour(timestamp: number): boolean {
    const hour = new Date(timestamp).getHours();
    // Consider 9-17 as peak hours
    return hour >= 9 && hour <= 17;
  }

  private async logAction(
    registrarId: string,
    domain: string,
    action: string,
    timestamp: number
  ) {
    if (!isValidDomain(domain)) {
      console.error(`Invalid domain: ${domain}`);
      return;
    }

    const success = Math.random() < 0.95; // 95% success rate for simplicity
    const details = JSON.stringify({
      timestamp: new Date(timestamp).toISOString(),
      clientIP: '192.168.1.' + Math.floor(Math.random() * 255)
    });

    queries.logRegistrarAction(this.db, {
      registrarId,
      domain,
      action,
      success,
      details
    });
  }

  async simulate(hours: number = 24) {
    console.log(`Starting simulation for the last ${hours} hours...`);

    for (const registrar of this.registrars) {
      console.log(`Simulating ${registrar.strategy} strategy for ${registrar.id}...`);

      switch (registrar.strategy) {
        case 'aggressive':
          await this.simulateAggressiveStrategy(registrar, hours);
          break;
        case 'steady':
          await this.simulateSteadyStrategy(registrar, hours);
          break;
        case 'burst':
          await this.simulateBurstStrategy(registrar, hours);
          break;
        case 'random':
          await this.simulateRandomStrategy(registrar, hours);
          break;
      }
    }

    console.log('Simulation completed!');

    // Print some stats
    for (const registrar of this.registrars) {
      const stats = queries.getRegistrarStats(this.db, registrar.id, Date.now() - (hours * 3600000));
      console.log(`\nStats for ${registrar.id}:`);
      console.log(JSON.stringify(stats, null, 2));
    }

    this.db.close();
  }
}

// Run the simulation
const simulator = new RegistrarSimulator();
simulator.simulate(24)
  .then(() => console.log('Simulation complete'))
  .catch(console.error);
