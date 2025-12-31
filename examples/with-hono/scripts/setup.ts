import { createAuthManager } from '@static-admin/api';
import * as readline from 'node:readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('Static Admin Setup');
  console.log('==================\n');

  const auth = createAuthManager({
    database: './admin.db',
  });

  // Initialize database
  await auth.initialize();
  console.log('Database initialized.\n');

  // Check if user exists
  const email = await question('Admin email: ');
  const existingUser = await auth.getUserByEmail(email);

  if (existingUser) {
    console.log(`\nUser "${email}" already exists.`);
    rl.close();
    return;
  }

  const password = await question('Admin password: ');
  const name = await question('Admin name (optional): ');

  try {
    const user = await auth.createUser(email, password, name || undefined);
    console.log(`\nAdmin user created successfully!`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name || '(not set)'}`);
  } catch (error) {
    console.error('\nFailed to create user:', error);
  }

  rl.close();
}

main().catch(console.error);
