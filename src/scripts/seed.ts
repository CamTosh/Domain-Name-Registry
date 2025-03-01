import { Database } from "bun:sqlite";
import { initializeDatabase } from "../database";

const RESERVED_DOMAINS = [
  'nic.tsh',    // Registry information
  'whois.tsh',  // WHOIS service
  'rdds.tsh',   // Registration Data Directory Services
  'epp.tsh',    // EPP service
];

const SAMPLE_DOMAINS = [
  'search.tsh',
  'email.tsh',
  'news.tsh',
  'login.tsh',
  'mail.tsh',
  'blog.tsh',
  'shop.tsh',
  'music.tsh',
  'cloud.tsh',
  'video.tsh',
  'games.tsh',
  'movie.tsh',
  'social.tsh',
  'sports.tsh',
  'travel.tsh',
  'photos.tsh',
  'weather.tsh',
  'food.tsh',
  'health.tsh',
  'home.tsh',
  'jobs.tsh',
  'dating.tsh',
  'chat.tsh',
  'forum.tsh',
  'finance.tsh',
  'books.tsh',
  'auction.tsh',
  'classified.tsh',
  'dictionary.tsh',
  'market.tsh',
  'radio.tsh',
  'business.tsh',
  'education.tsh',
  'science.tsh',
  'art.tsh',
  'directory.tsh',
  'download.tsh',
  'calendar.tsh',
  'map.tsh',
  'flight.tsh',
  'hotel.tsh',
  'restaurant.tsh',
  'movie.tsh',
  'design.tsh',
  'software.tsh',
  'career.tsh',
  'property.tsh',
  'marketing.tsh',
  'fashion.tsh',
  'fitness.tsh',
  'realestate.tsh',
  'technology.tsh',
  'hosting.tsh',
  'bank.tsh',
  'mobile.tsh',
  'insurance.tsh',
  'computer.tsh',
  'loan.tsh',
  'domain.tsh',
  'university.tsh',
  'office.tsh',
  'translate.tsh',
  'car.tsh',
  'money.tsh',
  'casino.tsh',
  'portal.tsh',
  'research.tsh',
  'media.tsh',
  'server.tsh',
  'web.tsh',
  'network.tsh',
  'storage.tsh',
  'security.tsh',
  'event.tsh',
  'training.tsh',
  'camera.tsh',
  'game.tsh',
  'support.tsh',
  'review.tsh',
  'developer.tsh',
  'code.tsh',
  'legal.tsh',
  'crypto.tsh',
  'digital.tsh',
  'sport.tsh',
  'rental.tsh',
  'streaming.tsh',
  'global.tsh',
  'group.tsh',
  'space.tsh',
  'project.tsh',
  'online.tsh',
  'info.tsh',
  'data.tsh',
  'link.tsh',
  'world.tsh',
  'system.tsh',
  'platform.tsh',
  'mobile.tsh',
  'file.tsh',
  'content.tsh',
  'channel.tsh',
  'access.tsh'
];

async function seed() {
  console.log("Starting database seeding...");

  const db = new Database("registry.sqlite", { create: true });
  initializeDatabase(db);

  const now = Date.now();
  const oneYear = 365 * 24 * 60 * 60 * 1000;

  // Insert reserved domains (assigned to registry operator)
  console.log("\nCreating reserved domains...");
  for (const domain of RESERVED_DOMAINS) {
    try {
      db.run(`
        INSERT OR IGNORE INTO domains (
          name,
          status,
          registrar,
          created_at,
          updated_at,
          expiry_date
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        domain,
        'active',
        'registry',  // Special registrar for reserved domains
        now,
        now,
        now + (10 * oneYear)  // 10 years validity for reserved domains
      ]);
      console.log(`✓ Reserved: ${domain}`);
    } catch (error) {
      console.error(`✗ Failed to reserve ${domain}:`, error);
    }
  }

  // Insert sample domains (distributed between test registrars)
  console.log("\nCreating sample domains...");
  const registrars = ['test1', 'test2'];

  for (const domain of SAMPLE_DOMAINS) {
    try {
      const registrar = registrars[Math.floor(Math.random() * registrars.length)];
      db.run(`
        INSERT OR IGNORE INTO domains (
          name,
          status,
          registrar,
          created_at,
          updated_at,
          expiry_date
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        domain,
        'active',
        registrar,
        now,
        now,
        now + oneYear
      ]);
      console.log(`✓ Created: ${domain} (${registrar})`);
    } catch (error) {
      console.error(`✗ Failed to create ${domain}:`, error);
    }
  }

  // Add registry operator if not exists
  console.log("\nEnsuring registry operator exists...");
  try {
    db.run(`
      INSERT OR IGNORE INTO registrars (
        id,
        password,
        credits
      ) VALUES (?, ?, ?)
    `, [
      'registry',
      crypto.randomUUID(),  // Generate random password for registry operator
      999999  // Unlimited credits for registry
    ]);
    console.log("✓ Registry operator account configured");
  } catch (error) {
    console.error("✗ Failed to create registry operator:", error);
  }

  console.log("\nSeeding completed!");

  // Print summary
  const domainCount = db.prepare("SELECT COUNT(*) as count FROM domains").get() as { count: number };
  const registrarCount = db.prepare("SELECT COUNT(*) as count FROM registrars").get() as { count: number };

  console.log("\nSummary:");
  console.log(`- Total domains: ${domainCount.count}`);
  console.log(`- Total registrars: ${registrarCount.count}`);

  db.close();
}

// Run the seed function
seed().catch(console.error);
