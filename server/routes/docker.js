import express from 'express';
import { spawn } from 'child_process';

const router = express.Router();

// Helper to execute docker CLI commands
function executeDockerCommand(cmd, args = []) {
  return new Promise((resolve, reject) => {
    const process = spawn('docker', [cmd, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout));
        } catch {
          resolve(stdout);
        }
      } else {
        reject(new Error(stderr || `Docker command failed with code ${code}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
}

// GET /api/docker/info - Get Docker daemon info
router.get('/info', async (req, res) => {
  try {
    const info = await executeDockerCommand('info', ['--format', 'json']);
    res.json({
      status: 'ok',
      data: info
    });
  } catch (error) {
    res.status(503).json({
      error: 'Docker daemon not accessible',
      message: error.message
    });
  }
});

// GET /api/docker/version - Get Docker version
router.get('/version', async (req, res) => {
  try {
    const version = await executeDockerCommand('version', ['--format', 'json']);
    res.json({
      status: 'ok',
      data: version
    });
  } catch (error) {
    res.status(503).json({
      error: 'Docker daemon not accessible',
      message: error.message
    });
  }
});

// GET /api/docker/containers - Get all containers
router.get('/containers', async (req, res) => {
  try {
    const containers = await executeDockerCommand('ps', [
      '-a',
      '--format', '{{json .}}'
    ]);

    // Parse JSONL output
    const containerList = containers
      .split('\n')
      .filter(line => line.trim())
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // Enrich with stats for running containers
    const enrichedContainers = await Promise.all(
      containerList.map(async (container) => {
        if (container.State === 'running') {
          try {
            const stats = await executeDockerCommand('stats', [
              container.ID,
              '--no-stream',
              '--format', 'json'
            ]);

            if (Array.isArray(stats) && stats[0]) {
              return {
                ...container,
                stats: stats[0]
              };
            }
          } catch {
            // Stats not available, continue without them
          }
        }
        return container;
      })
    );

    res.json({
      status: 'ok',
      data: enrichedContainers
    });
  } catch (error) {
    res.status(503).json({
      error: 'Failed to retrieve containers',
      message: error.message
    });
  }
});

// GET /api/docker/containers/:id - Get specific container details
router.get('/containers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const inspect = await executeDockerCommand('inspect', [id]);

    if (!Array.isArray(inspect) || inspect.length === 0) {
      return res.status(404).json({
        error: 'Container not found'
      });
    }

    res.json({
      status: 'ok',
      data: inspect[0]
    });
  } catch (error) {
    res.status(404).json({
      error: 'Container not found',
      message: error.message
    });
  }
});

// POST /api/docker/containers/:id/start - Start a container
router.post('/containers/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    await executeDockerCommand('start', [id]);

    res.json({
      status: 'ok',
      message: `Container ${id} started`
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to start container',
      message: error.message
    });
  }
});

// POST /api/docker/containers/:id/stop - Stop a container
router.post('/containers/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    const { timeout = 10 } = req.body;

    await executeDockerCommand('stop', ['-t', String(timeout), id]);

    res.json({
      status: 'ok',
      message: `Container ${id} stopped`
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to stop container',
      message: error.message
    });
  }
});

// POST /api/docker/containers/:id/restart - Restart a container
router.post('/containers/:id/restart', async (req, res) => {
  try {
    const { id } = req.params;
    const { timeout = 10 } = req.body;

    await executeDockerCommand('restart', ['-t', String(timeout), id]);

    res.json({
      status: 'ok',
      message: `Container ${id} restarted`
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to restart container',
      message: error.message
    });
  }
});

// POST /api/docker/containers/:id/remove - Remove a container
router.post('/containers/:id/remove', async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false, removeVolumes = false } = req.body;

    const args = [id];
    if (force) args.unshift('-f');
    if (removeVolumes) args.unshift('-v');

    await executeDockerCommand('rm', args);

    res.json({
      status: 'ok',
      message: `Container ${id} removed`
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to remove container',
      message: error.message
    });
  }
});

// GET /api/docker/images - Get all images
router.get('/images', async (req, res) => {
  try {
    const images = await executeDockerCommand('images', [
      '-a',
      '--format', '{{json .}}'
    ]);

    const imageList = images
      .split('\n')
      .filter(line => line.trim())
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    res.json({
      status: 'ok',
      data: imageList
    });
  } catch (error) {
    res.status(503).json({
      error: 'Failed to retrieve images',
      message: error.message
    });
  }
});

// POST /api/docker/images/:id/remove - Remove an image
router.post('/images/:id/remove', async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false } = req.body;

    const args = [id];
    if (force) args.unshift('-f');

    await executeDockerCommand('rmi', args);

    res.json({
      status: 'ok',
      message: `Image ${id} removed`
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to remove image',
      message: error.message
    });
  }
});

// GET /api/docker/networks - Get all networks
router.get('/networks', async (req, res) => {
  try {
    const networks = await executeDockerCommand('network', [
      'ls',
      '--format', '{{json .}}'
    ]);

    const networkList = networks
      .split('\n')
      .filter(line => line.trim())
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    res.json({
      status: 'ok',
      data: networkList
    });
  } catch (error) {
    res.status(503).json({
      error: 'Failed to retrieve networks',
      message: error.message
    });
  }
});

// GET /api/docker/volumes - Get all volumes
router.get('/volumes', async (req, res) => {
  try {
    const volumes = await executeDockerCommand('volume', [
      'ls',
      '--format', '{{json .}}'
    ]);

    const volumeList = volumes
      .split('\n')
      .filter(line => line.trim())
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    res.json({
      status: 'ok',
      data: volumeList
    });
  } catch (error) {
    res.status(503).json({
      error: 'Failed to retrieve volumes',
      message: error.message
    });
  }
});

// POST /api/docker/volumes - Create a volume
router.post('/volumes', async (req, res) => {
  try {
    const { name, driver = 'local', driverOpts = {} } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Volume name is required'
      });
    }

    const args = [name, '-d', driver];
    Object.entries(driverOpts).forEach(([key, value]) => {
      args.push('-o', `${key}=${value}`);
    });

    await executeDockerCommand('volume', ['create', ...args]);

    res.json({
      status: 'ok',
      message: `Volume ${name} created`
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to create volume',
      message: error.message
    });
  }
});

// POST /api/docker/volumes/:name/remove - Remove a volume
router.post('/volumes/:name/remove', async (req, res) => {
  try {
    const { name } = req.params;
    const { force = false } = req.body;

    const args = [name];
    if (force) args.unshift('-f');

    await executeDockerCommand('volume', ['rm', ...args]);

    res.json({
      status: 'ok',
      message: `Volume ${name} removed`
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to remove volume',
      message: error.message
    });
  }
});

// GET /api/docker/logs/:containerid - Get container logs
router.get('/logs/:containerid', async (req, res) => {
  try {
    const { containerid } = req.params;
    const { tail = 100, timestamps = false } = req.query;

    const args = [containerid, '--tail', String(tail)];
    if (timestamps) args.push('-t');

    const logs = await executeDockerCommand('logs', args);

    res.json({
      status: 'ok',
      data: logs
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to retrieve logs',
      message: error.message
    });
  }
});

// Health check
router.get('/health', (req, res) => {
  executeDockerCommand('ps', ['-q', '--limit', '1'])
    .then(() => {
      res.json({
        status: 'ok',
        docker: 'connected'
      });
    })
    .catch(() => {
      res.status(503).json({
        status: 'error',
        docker: 'disconnected'
      });
    });
});

export default router;
