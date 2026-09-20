const { execSync } = require('child_process');

console.log('Checking which process is using port 3000...');
try {
  const output = execSync('netstat -ano | findstr :3000', { encoding: 'utf-8' });
  console.log('\n--- Active connections on Port 3000 ---');
  console.log(output);
  console.log('--------------------------------------');
  
  // Extract PIDs from output
  const lines = output.trim().split('\n');
  const pids = new Set();
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && pid !== '0' && /^\d+$/.test(pid)) {
      pids.add(pid);
    }
  }
  
  if (pids.size > 0) {
    console.log(`Found ${pids.size} processes running on port 3000!`);
    for (const pid of pids) {
      try {
        const taskInfo = execSync(`tasklist /FI "PID eq ${pid}"`, { encoding: 'utf-8' });
        console.log(`\nProcess Details for PID ${pid}:`);
        console.log(taskInfo);
      } catch (e) {
        console.log(`Could not get process details for PID ${pid}: ${e.message}`);
      }
    }
    console.log('\n💡 TIP: If there is another Node/PM2 process running here, it is capturing your ngrok requests.');
    console.log('You can terminate it by running:');
    for (const pid of pids) {
      console.log(`taskkill /F /PID ${pid}`);
    }
  } else {
    console.log('No processes found listening on port 3000.');
  }
} catch (err) {
  console.log('Port 3000 is not active, or no processes are running on it.');
}
