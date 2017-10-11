const env = require('../env');
const spawn = require('child_process').spawnSync;

if (env.compatible) {
    spawn('npm', ['run', 'test-coverage'], { stdio: 'inherit' });
} else {
    spawn('npm', ['run', 'test-no-coverage'], { stdio: 'inherit' });
}
