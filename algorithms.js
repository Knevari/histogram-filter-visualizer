const obstacles = [1, 2];

function getBlockFromRepr(world, blockRepr) {
  const [i, j] = blockRepr.split("-");
  return world[i][j];
}

function reconstructPath(world, cameFrom, current, goal) {
  const totalPath = [];

  while (cameFrom.has(current.repr)) {
    const repr = cameFrom.get(current.repr);
    const block = getBlockFromRepr(world, repr);
    current = world[block.x][block.y];
    totalPath.unshift([current.x, current.y]);
  }

  totalPath.push([goal.x, goal.y]);

  return totalPath;
}

function AStar(world, pos, goal) {
  const h = (node) =>
    manhattanDistance(node.x, node.y, goal.x, goal.y);

  if (!goal instanceof Vector) return [];

  // Reset World Beliefs
  for (let i = 0; i < world.length; i++) {
    for (let j = 0; j < world[0].length; j++) {
      const cell = world[i][j];
      if (cell.x === pos.x && cell.y === pos.y) {
        cell.h = h(cell);
        cell.g = 0;
        cell.f = cell.g + cell.h;
      } else {
        cell.h = Infinity;
        cell.g = Infinity;
        cell.f = Infinity;
      }
    }
  }

  let lowest, current;

  const frontier = new Set();
  const cameFrom = new Map();

  frontier.add(world[pos.x][pos.y].repr);

  while (frontier.size > 0) {
    lowest = Infinity;

    frontier.forEach(blockRepr => {
      block = getBlockFromRepr(world, blockRepr);

      if (block.f < lowest) {
        lowest = block.f;
        current = block;
      }
    });

    if (current.x === goal.x && current.y === goal.y) {
      return reconstructPath(world, cameFrom, current, goal);
    }

    frontier.delete(current.repr);

    for (let i = -1; i < 2; i++) {
      for (let j = -1; j < 2; j++) {
        if (i === 0 && j === 0) continue;

        const nextX = current.x + i;
        const nextY = current.y + j;

        if (world[nextX] && world[nextX][nextY]) {
          const neighbor = world[nextX][nextY];

          if (obstacles.indexOf(neighbor.type) >= 0) continue;

          const tentativeScore = current.g +
                manhattanDistance(current.x, current.y, neighbor.x, neighbor.y);

          if (tentativeScore < neighbor.g) {
            cameFrom.set(neighbor.repr, current.repr);
            neighbor.g = tentativeScore;
            neighbor.f = neighbor.g + h(neighbor);
            if (!frontier.has(neighbor.repr))
              frontier.add(neighbor.repr);
          }
        }
      }
    }
  }

  return [];
}

function manhattanDistance(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}
