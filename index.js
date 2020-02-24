const BLOCK_SIZE = 25;

const cnv = document.querySelector("canvas");
const ctx = cnv.getContext("2d");
const simplex = new SimplexNoise(Math.random);

let state;

class SimulationState {
  constructor(rows, cols, pHit, pMiss, algorithm) {
    this.rows = rows;
    this.cols = cols;
    this.pHit = pHit;
    this.pMiss = pMiss;
    this.beliefs = initBeliefs(rows, cols);
    this.world = initWorld(rows, cols);
    this.truePose = new Vector();
    this.mouse = new Vector(NaN, NaN);
    this.goal = null;
    this.path = [];
    this.findPath = algorithm;
  }

  calculatePath() {
    if (this.goal) {
      this.path = this.findPath(this.world, this.truePose, this.goal);
    }
  }

  next() {
    this.sense();

    if (this.goal) this.calculatePath();

    if (this.path.length) {
      this.path.shift();

      const coords = this.path.shift();

      if (coords) {
        // Update Beliefs According to Movement
        const diffX = coords[0] - this.truePose.x;
        const diffY = coords[1] - this.truePose.y;

        this.beliefs = this.move(diffX, diffY);

        this.truePose.x = coords[0];
        this.truePose.y = coords[1];
      }
    }
  }

  move(dx, dy) {
    const newBeliefs = Array.from({ length: this.rows }, () => {
      return Array.from({ length: this.cols }, () => 0);
    });

    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        const newX = (i + dx) % this.rows;
        const newY = (j + dy) % this.cols;
        if (newBeliefs[newX]) newBeliefs[newX][newY] = this.beliefs[i][j];
      }
    }

    return blur(newBeliefs, 0.5);
  }

  sense() {
    const { x, y } = this.truePose;

    let i, j, dx, dy, nextX, nextY, hit;

    const truePoseNearby = [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
    ];

    const win = [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
    ];

    for (dx = -3; dx < 4; dx++) {
      for (dy = -3; dy < 4; dy++) {
        nextX = (x + dx) % this.rows;
        nextY = (y + dy) % this.cols;
        if (this.world[nextX] && this.world[nextX][nextY]) {
          truePoseNearby[dx+3][dy+3] = this.world[nextX][nextY].type;
        }
      }
    }

    for (i = 0; i < this.rows; i++) {
      for (j = 0; j < this.cols; j++) {
        for (dx = -3; dx < 4; dx++) {
          for (dy = -3; dy < 4; dy++) {
            nextX = (i + dx) % this.rows;
            nextY = (j + dy) % this.cols;
            if (this.world[nextX] && this.world[nextX][nextY]) {
              win[dx+3][dy+3] = this.world[nextX][nextY].type;
            }
          }
        }

        hit = Number(matricesEqual(win, truePoseNearby));
        this.beliefs[i][j] *= (hit * this.pHit + (1-hit) * this.pMiss);
      }
    }

    this.beliefs = normalize(this.beliefs);
  }
}

function findPos(obj) {
	let curleft = 0;
  let curtop = 0;

	if (obj.offsetParent) {
		do {
			curleft += obj.offsetLeft;
			curtop += obj.offsetTop;
		} while (obj = obj.offsetParent);
	}

	return { left : curleft, top : curtop };
}

function updateMousePos(e) {
  const posX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
  const posY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;

  const targetPos = findPos(cnv);

  if (state) {
    state.mouse.x = posX - targetPos.left;
    state.mouse.y = posY - targetPos.top;
    state.goal = new Vector(
      Math.floor(state.mouse.x / BLOCK_SIZE),
      Math.floor(state.mouse.y / BLOCK_SIZE)
    );
  }
}

function debounce(fn, delay = 200) {
  let timeout;
  return function debouncedFunction() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    setTimeout(() => fn.apply(context, args), delay);
  }
}

function isIntersection(x, y) {
  return state.mouse.x >= x && state.mouse.x <= x + BLOCK_SIZE &&
         state.mouse.y >= y && state.mouse.y <= y + BLOCK_SIZE
}

function initWorld(width, height) {
  let noise, key;
  const world = []
  for (let i = 0; i < width; i++) {
    world[i] = [];
    for (let j = 0; j < height; j++) {
      noise = simplex.noise2D(i * 0.128, j * 0.128);
      key = `${i}-${j}`;
      if (noise < 0.2) {
        world[i][j] = new Block(i, j, tiles.grass, key)
      } else if (noise < 0.4) {
        world[i][j] = new Block(i, j, tiles.obstacle, key);
      } else {
        world[i][j] = new Block(i, j, tiles.rock, key);
      }
    }
  }
  return world;
}

function initBeliefs(width, height) {
  const area = width * height, beliefs = [];
  for (let i = 0; i < width; i++) {
    beliefs[i] = [];
    for (let j = 0; j < height; j++) {
      beliefs[i][j] = 1 / area;
    }
  }
  return beliefs;
}

function normalize(grid) {
  let total = 0;

  const rows = grid.length;
  const cols = grid[0].length;

  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      total += grid[i][j];

  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      grid[i][j] /= total;

  return grid;
}

function blur(grid, blurring = 0.12) {
  const rows = grid.length;
  const cols = grid[0].length;

  const center = 1.0-blurring;
  const corner = blurring / 12.0;
  const adjacent = blurring / 6.0;

  let i, j, dx, dy;

  const win = [
    [corner, adjacent, corner],
    [adjacent, center, adjacent],
    [corner, adjacent, corner]
  ];

  const newGrid = Array.from({ length: rows }, () => {
    return Array.from({ length: cols }, () => 0);
  });

  for (i = 0; i < rows; i++) {
    for (j = 0; j < cols; j++) {
      const val = grid[i][j];
      for (dx = -1; dx < 2; dx++) {
        for (dy = -1; dy < 2; dy++) {
          const mult = win[dx+1][dy+1];
          const newX = (i + dx) % rows;
          const newY = (j + dy) % cols;
          if (newGrid[newX] && newGrid[newX][newY] >= 0) {
            newGrid[newX][newY] += mult * val;
          }
        }
      }
    }
  }

  return normalize(newGrid);
}

function matricesEqual(m1, m2) {
  if (m1.length !== m2.length) {
    return false;
  }

  const rows = m1.length;
  const cols = m2.length;

  let equal = true;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (m1[i][j] !== m2[i][j]) equal = false;
    }
  }

  return equal;
}

function getRandomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function setup() {
  // Set Canvas Size
  cnv.width = window.innerWidth;
  cnv.height = window.innerHeight;

  const rows = Math.ceil(cnv.width / BLOCK_SIZE);
  const cols = Math.ceil(cnv.height / BLOCK_SIZE);

  // Initialize Simulation State
  state = new SimulationState(rows, cols, 0.9, 0.1, AStar);

  state.truePose.x = Math.floor(state.rows / 2);
  state.truePose.y = Math.floor(state.cols / 2);

  let isOverlapping = true;

  let x = state.truePose.x;
  let y = state.truePose.y;

  do {
    x++;
    y++;

    state.truePose.x = x;
    state.truePose.y = y;

    if (state.world[x][y].type === 0) {
      isOverlapping = false;
    }

  } while (isOverlapping)
}

function draw() {
  requestAnimationFrame(draw);
  ctx.clearRect(0, 0, cnv.width, cnv.height);

  // Draw The Grid
  for (let i = 0; i < state.rows; i++) {
    for (let j = 0; j < state.cols; j++) {
      const cell = state.world[i][j].type;
      ctx.beginPath();

      if (state.truePose.x === i && state.truePose.y === j) {
        ctx.fillStyle = "#F5F5F5";
      } else if (isIntersection(i * BLOCK_SIZE, j * BLOCK_SIZE)) {
        ctx.fillStyle = "#FF0000";
      } else {
        ctx.fillStyle = colors[cell];
      }

      ctx.rect(i * BLOCK_SIZE, j * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      // ctx.stroke();
      ctx.fill();
      ctx.closePath();
    }
  }

  // Draw Path
  if (state.path) {
    for (let i = 0; i < state.path.length; i++) {
      const [x, y] = state.path[i];

      ctx.beginPath();

      if (i === state.path.length - 1) {
        ctx.fillStyle = "#000000";
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      }

      ctx.rect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      ctx.stroke();
      ctx.fill();
      ctx.closePath();
    }
  }

  // Draw Beliefs
  for (let i = 0; i < state.rows; i++) {
    for (let j = 0; j < state.cols; j++) {
      const belief = state.beliefs[i][j];
      ctx.beginPath();
      ctx.fillStyle = "rgba(170, 218, 255, 0.6)";
      ctx.arc(
        i * BLOCK_SIZE + BLOCK_SIZE / 2 - 1,
        j * BLOCK_SIZE + BLOCK_SIZE / 2 - 1,
        belief * 100, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.closePath();
    }
  }

  // Debug
  // if (!state.path.length) {
  //   state.goal = new Vector(
  //     Math.floor(Math.random() * state.rows),
  //     Math.floor(Math.random() * state.cols)
  //   )
  // }

  state.next();
}

function setupListeners() {
  window.addEventListener("resize", debounce(setup));
  cnv.addEventListener("click", updateMousePos);
}

setup();
draw();
setupListeners();
