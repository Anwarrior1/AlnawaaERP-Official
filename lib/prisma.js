require("dotenv").config();

let client;

function getPrisma() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Create a real .env file from .env.example.");
  }
  if (!client) {
    const { PrismaClient } = require("@prisma/client");
    client = new PrismaClient();
  }
  return client;
}

async function disconnectPrisma() {
  if (client) await client.$disconnect();
}

module.exports = {
  getPrisma,
  disconnectPrisma,
};
