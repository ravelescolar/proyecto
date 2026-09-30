import { spawn } from 'child_process';

process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.NEXT_DIST_DIR = '.next_dev';

const rawArgs = process.argv.slice(2);
const convertedArgs = [];

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg === '--host') {
    convertedArgs.push('-H');
  } else if (arg.startsWith('--host=')) {
    convertedArgs.push('-H', arg.split('=')[1]);
  } else {
    convertedArgs.push(arg);
  }
}

// Ensure port 3000 and 0.0.0.0 are set if missing
if (!convertedArgs.includes('-p') && !convertedArgs.includes('--port')) {
  convertedArgs.push('-p', '3000');
}
if (!convertedArgs.includes('-H') && !convertedArgs.includes('--hostname')) {
  convertedArgs.push('-H', '0.0.0.0');
}

const child = spawn('npx', ['next', 'dev', ...convertedArgs], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
