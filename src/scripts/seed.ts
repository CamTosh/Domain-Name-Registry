import { Database } from "bun:sqlite";
import { initializeDatabase, queries } from "../database";

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
  'file.tsh',
  'content.tsh',
  'channel.tsh',
  'access.tsh'
];

async function seed() {
  console.log("Starting database seeding...");

  const db = new Database("registry.sqlite", { create: true });
  initializeDatabase(db);

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

  console.log("\nCreating reserved domains...");
  for (const domain of RESERVED_DOMAINS) {
    try {

      queries.createDomain(db, domain, 'registry');
      console.log(`✓ Reserved: ${domain}`);
    } catch (error) {
      console.error(`✗ Failed to reserve ${domain}:`, error);
    }
  }

  console.log("\nCreating random domains...");
  for (const domain of SAMPLE_DOMAINS) {
    try {
      // Random expiry between 1 hour and tomorrow
      const now = Date.now();
      const oneHour = now + (60 * 60 * 1000);
      const tomorrow = now + (24 * 60 * 60 * 1000);
      const randomExpiry = Math.floor(Math.random() * (tomorrow - oneHour) + oneHour);

      queries.createDomain(db, domain, 'registry', randomExpiry);
      console.log(`✓ Reserved: ${domain}`);
    } catch (error) {
      console.error(`✗ Failed to reserve ${domain}:`, error);
    }
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
