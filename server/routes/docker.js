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

function parseDockerJsonLines(payload) {
  if (Array.isArray(payload)) {
    return payload.filter(Boolean);
  }

  if (payload && typeof payload === 'object') {
    return [payload];
  }

  if (typeof payload !== 'string') {
    return [];
  }

  return payload
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
}

const SHELL_CANDIDATES = [
  { shell: '/bin/bash', label: 'Bash' },
  { shell: '/bin/sh', label: 'Sh' },
  { shell: '/bin/ash', label: 'Ash' },
  { shell: 'sh', label: 'Sh (PATH)' }
];

async function canExecShell(containerId, shellPath) {
  try {
    await executeDockerCommand('exec', [containerId, shellPath, '-c', 'exit 0']);
    return true;
  } catch {
    return false;
  }
}

async function resolveShellOptions(containerId) {
  const available = [];
  for (const candidate of SHELL_CANDIDATES) {
    // Try candidates one by one and keep only shells that really exist in the target container.
    if (await canExecShell(containerId, candidate.shell)) {
      available.push({
        shell: candidate.shell,
        label: candidate.label,
        command: `docker exec -it ${containerId} ${candidate.shell}`
      });
    }
  }
  return available;
}

function executeDockerExecCommand(containerId, shellPath, command) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['exec', containerId, shellPath, '-c', command], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120000
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        exitCode: Number.isFinite(code) ? code : 1,
        stdout,
        stderr
      });
    });

    child.on('error', (error) => {
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
    const containerList = parseDockerJsonLines(containers);

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

            const statsList = parseDockerJsonLines(stats);
            if (statsList[0]) {
              return {
                ...container,
                stats: statsList[0]
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

    const imageList = parseDockerJsonLines(images);

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

    const networkList = parseDockerJsonLines(networks);

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

    const volumeList = parseDockerJsonLines(volumes);

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

// GET /api/docker/exec/:containerid - 获取进入容器的命令
// 返回用于在 Web Terminal 中执行的命令
router.get('/exec/:containerid', async (req, res) => {
  try {
    const { containerid } = req.params;

    // 验证容器是否存在且正在运行
    const containers = await executeDockerCommand('ps', [
      '--filter', `id=${containerid}`,
      '--format', '{{json .}}'
    ]);

    const containerList = parseDockerJsonLines(containers);

    if (containerList.length === 0) {
      return res.status(404).json({
        error: 'Container not found or not running'
      });
    }

    const container = containerList[0];

    const shellOptions = await resolveShellOptions(container.ID);
    const fallbackCommand = `docker exec -it ${container.ID} /bin/bash || docker exec -it ${container.ID} /bin/sh || docker exec -it ${container.ID} /bin/ash || docker exec -it ${container.ID} sh`;

    if (shellOptions.length === 0) {
      return res.status(422).json({
        error: 'No interactive shell found in container',
        message: 'This container image may be distroless/scratch and does not include sh/bash.',
        data: {
          containerid: container.ID,
          name: container.Names || 'unknown',
          shellOptions: [],
          quickCommand: fallbackCommand,
          fallbackCommand
        }
      });
    }

    const quickCommand = shellOptions[0].command;

    // 返回可用的 shell 选项
    res.json({
      status: 'ok',
      data: {
        containerid: container.ID,
        name: container.Names || 'unknown',
        shellOptions,
        // 用户可以复制此命令到终端执行（已按容器实际可用 shell 自动选择）
        quickCommand,
        fallbackCommand
      }
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to get exec command',
      message: error.message
    });
  }
});

// GET /api/docker/ps/:containerid - 获取容器的直接交互端点信息
router.get('/ps/:containerid', async (req, res) => {
  try {
    const { containerid } = req.params;
    const inspect = await executeDockerCommand('inspect', [containerid]);

    if (!Array.isArray(inspect) || inspect.length === 0) {
      return res.status(404).json({
        error: 'Container not found'
      });
    }

    const container = inspect[0];
    const isRunning = container.State.Running;

    res.json({
      status: 'ok',
      data: {
        id: container.Id.substring(0, 12),
        name: container.Name.replace('/', ''),
        state: isRunning ? 'running' : 'exited',
        running: isRunning,
        image: container.Config.Image,
        entrypoint: container.Config.Entrypoint,
        cmd: container.Config.Cmd,
        workdir: container.Config.WorkingDir,
        user: container.Config.User,
        mounts: container.Mounts.map(m => ({
          source: m.Source,
          destination: m.Destination,
          mode: m.Mode,
          rw: m.RW
        })),
        ports: Object.entries(container.NetworkSettings.Ports || {}).map(([port, bindings]) => ({
          port,
          bindings: bindings || []
        })),
        networks: Object.entries(container.NetworkSettings.Networks || {}).map(([name, config]) => ({
          name,
          ipAddress: config.IPAddress,
          gateway: config.Gateway,
          ipPrefixLen: config.IPPrefixLen
        }))
      }
    });
  } catch (error) {
    res.status(404).json({
      error: 'Container not found',
      message: error.message
    });
  }
});

// POST /api/docker/terminal/:containerid/exec - 在容器中执行命令
router.post('/terminal/:containerid/exec', async (req, res) => {
  try {
    const { containerid } = req.params;
    const rawCommand = String(req.body?.command || '').trim();
    const requestedShell = String(req.body?.shell || '').trim();

    if (!rawCommand) {
      return res.status(400).json({
        error: 'Command is required'
      });
    }

    if (rawCommand.length > 4000) {
      return res.status(400).json({
        error: 'Command too long'
      });
    }

    const containers = await executeDockerCommand('ps', [
      '--filter', `id=${containerid}`,
      '--format', '{{json .}}'
    ]);
    const containerList = parseDockerJsonLines(containers);

    if (containerList.length === 0) {
      return res.status(404).json({
        error: 'Container not found or not running'
      });
    }

    const container = containerList[0];
    const shellOptions = await resolveShellOptions(container.ID);
    if (shellOptions.length === 0) {
      return res.status(422).json({
        error: 'No interactive shell found in container'
      });
    }

    const shell = shellOptions.find(item => item.shell === requestedShell)?.shell || shellOptions[0].shell;
    const execution = await executeDockerExecCommand(container.ID, shell, rawCommand);

    res.json({
      status: 'ok',
      data: {
        containerid: container.ID,
        shell,
        command: rawCommand,
        exitCode: execution.exitCode,
        stdout: execution.stdout,
        stderr: execution.stderr
      }
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to execute container command',
      message: error.message
    });
  }
});

// POST /api/docker/terminal/:containerid/stream - 流式执行命令并实时返回输出
router.post('/terminal/:containerid/stream', async (req, res) => {
  try {
    const { containerid } = req.params;
    const rawCommand = String(req.body?.command || '').trim();
    const requestedShell = String(req.body?.shell || '').trim();

    if (!rawCommand) {
      return res.status(400).json({
        error: 'Command is required'
      });
    }

    if (rawCommand.length > 4000) {
      return res.status(400).json({
        error: 'Command too long'
      });
    }

    const containers = await executeDockerCommand('ps', [
      '--filter', `id=${containerid}`,
      '--format', '{{json .}}'
    ]);
    const containerList = parseDockerJsonLines(containers);
    if (containerList.length === 0) {
      return res.status(404).json({
        error: 'Container not found or not running'
      });
    }

    const container = containerList[0];
    const shellOptions = await resolveShellOptions(container.ID);
    if (shellOptions.length === 0) {
      return res.status(422).json({
        error: 'No interactive shell found in container'
      });
    }

    const shell = shellOptions.find(item => item.shell === requestedShell)?.shell || shellOptions[0].shell;
    const child = spawn('docker', ['exec', container.ID, shell, '-c', rawCommand], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const writeEvent = (event) => {
      if (res.writableEnded) return;
      res.write(`${JSON.stringify(event)}\n`);
    };

    writeEvent({
      type: 'start',
      containerid: container.ID,
      shell,
      command: rawCommand
    });

    child.stdout.on('data', (chunk) => {
      writeEvent({
        type: 'stdout',
        chunk: chunk.toString()
      });
    });

    child.stderr.on('data', (chunk) => {
      writeEvent({
        type: 'stderr',
        chunk: chunk.toString()
      });
    });

    child.on('close', (code) => {
      writeEvent({
        type: 'exit',
        exitCode: Number.isFinite(code) ? code : 1
      });
      res.end();
    });

    child.on('error', (error) => {
      writeEvent({
        type: 'error',
        message: error.message
      });
      res.end();
    });

    req.on('close', () => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    });
  } catch (error) {
    res.status(400).json({
      error: 'Failed to stream container command',
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
