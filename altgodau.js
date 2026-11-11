
// ==================================================
// RECONSTRUCT A MONOTONE PATH BY BACKTRACKING
// ==================================================

function reconstructFrechetPath(curveP, curveQ, result) {

  const p = curveP.length - 1;
  const q = curveQ.length - 1;

  const lastRight = result.reachableRight[q - 1][p - 1];
  const lastTop = result.reachableTop[q - 1][p - 1];

  // Check which final boundary reaches (p,q).
  const rightWorks =
      lastRight !== null && lastRight[1] >= 1 - EPS;

  const topWorks =
      lastTop !== null && lastTop[1] >= 1 - EPS;

  if (!rightWorks && !topWorks) {
      return null;
  }

  // Start at the final endpoint.
  let i = p - 1;
  let j = q - 1;

  let boundary = rightWorks ? "right" : "top";

  let s = 1;
  let t = 1;

  // Store the path backwards.
  const reversedPath = [[p, q]];

  function addPoint(x, y) {

      const last = reversedPath[reversedPath.length - 1];

      if (
          Math.abs(last[0] - x) > EPS ||
          Math.abs(last[1] - y) > EPS
      ) {
          reversedPath.push([x, y]);
      }
  }

  // Each iteration moves to the previous cell.
  for (let step = 0; step <= p + q; step++) {

      // Retrieve the incoming reachable intervals.
      const Lr = (i === 0)
          ? result.reachableLeft[j]
          : result.reachableRight[j][i - 1];

      const Br = (j === 0)
          ? result.reachableBottom[i]
          : result.reachableTop[j - 1][i];

      let sourceS;
      let sourceT;
      let sourceBoundary;

      // ------------------------------------------
      // Current target is on the RIGHT boundary.
      // ------------------------------------------

      if (boundary === "right") {

          if (Br !== null) {

              // The cell was reached from the bottom.
              sourceS = Br[0];
              sourceT = 0;
              sourceBoundary = "bottom";

          } else if (Lr !== null) {

              // The cell was reached from the left.
              sourceS = 0;
              sourceT = Lr[0];
              sourceBoundary = "left";

          } else {
              return null;
          }
      }

      // ------------------------------------------
      // Current target is on the TOP boundary.
      // ------------------------------------------

      else {

          if (Lr !== null) {

              // The cell was reached from the left.
              sourceS = 0;
              sourceT = Lr[0];
              sourceBoundary = "left";

          } else if (Br !== null) {

              // The cell was reached from the bottom.
              sourceS = Br[0];
              sourceT = 0;
              sourceBoundary = "bottom";

          } else {
              return null;
          }
      }

      // Add the entry point in global parameter coordinates.
      const globalS = i + sourceS;
      const globalT = j + sourceT;

      addPoint(globalS, globalT);

      // ------------------------------------------
      // Move to the previous cell.
      // ------------------------------------------

      if (sourceBoundary === "left") {

          if (i === 0) {
              // We have reached the outer left boundary.
              // Initialization guarantees a path to (0,0).
              addPoint(0, 0);
              break;
          }

          // The left boundary is the previous cell's right.
          i--;

          boundary = "right";
          s = 1;
          t = sourceT;
      }

      else {

          if (j === 0) {
              // We have reached the outer bottom boundary.
              // Initialization guarantees a path to (0,0).
              addPoint(0, 0);
              break;
          }

          // The bottom boundary is the previous cell's top.
          j--;

          boundary = "top";
          s = sourceS;
          t = 1;
      }
  }

  // Convert backwards traversal into forward traversal.
  reversedPath.reverse();

  return reversedPath;
}

// ==================================================
// BUILD THE CELL GRID
// ==================================================

function buildFreeSpaceDiagram(curveP, curveQ) {

  const cells = [];

  for (let j = 0; j < curveQ.length - 1; j++) {

      cells[j] = [];

      for (let i = 0; i < curveP.length - 1; i++) {

          cells[j][i] = {
              i: i,
              j: j,

              p0: curveP[i],
              p1: curveP[i + 1],

              q0: curveQ[j],
              q1: curveQ[j + 1]
          };
      }
  }

  return cells;
}


// ==================================================
// INTERPOLATION
// ==================================================

function interpolate(A, B, t) {

  return new Point(
      A.x + t * (B.x - A.x),
      A.y + t * (B.y - A.y)
  );
}


// ==================================================
// FREE-SPACE CONDITION
// ==================================================

function isFree(cell, s, t) {

  const p = interpolate(cell.p0, cell.p1, s);
  const q = interpolate(cell.q0, cell.q1, t);

  const dx = p.x - q.x;
  const dy = p.y - q.y;

  return dx * dx + dy * dy <= delta * delta;
}


// ==================================================
// COMPUTE FREE INTERVAL ON A SEGMENT
// ==================================================

function segmentCircleInterval(A, B, C) {

  // Find u in [0,1] such that:
  // distance(A + u(B-A), C) <= delta

  const dx = B.x - A.x;
  const dy = B.y - A.y;

  const fx = A.x - C.x;
  const fy = A.y - C.y;

  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - delta * delta;

  // Degenerate segment.
  if (a < 1e-12) {
      return c <= 0 ? [0, 1] : null;
  }

  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
      return null;
  }

  const sqrtD = Math.sqrt(discriminant);

  const r1 = (-b - sqrtD) / (2 * a);
  const r2 = (-b + sqrtD) / (2 * a);

  const lower = Math.max(0, r1);
  const upper = Math.min(1, r2);

  if (lower > upper) {
      return null;
  }

  return [lower, upper];
}


// ==================================================
// COMPUTE ALL FOUR FREE INTERVALS
// ==================================================

function computeFreeIntervals(cells) {

  const rows = cells.length;
  const cols = cells[0].length;

  const freeIntervals = [];

  for (let j = 0; j < rows; j++) {

      freeIntervals[j] = [];

      for (let i = 0; i < cols; i++) {

          const cell = cells[j][i];

          // Left boundary: s = 0
          const L = segmentCircleInterval(
              cell.q0,
              cell.q1,
              cell.p0
          );

          // Bottom boundary: t = 0
          const B = segmentCircleInterval(
              cell.p0,
              cell.p1,
              cell.q0
          );

          // Right boundary: s = 1
          const R = segmentCircleInterval(
              cell.q0,
              cell.q1,
              cell.p1
          );

          // Top boundary: t = 1
          const T = segmentCircleInterval(
              cell.p0,
              cell.p1,
              cell.q1
          );

          freeIntervals[j][i] = {
              L: L,
              B: B,
              R: R,
              T: T
          };
      }
  }

  return freeIntervals;
}


// ==================================================
// INITIALIZE REACHABLE LEFT BOUNDARY
// ==================================================

function initializeReachableLeft(
  curveP,
  curveQ,
  freeIntervals
) {

  const q = curveQ.length - 1;

  const reachableLeft = Array(q).fill(null);

  // Starting point must be free.
  const dx = curveP[0].x - curveQ[0].x;
  const dy = curveP[0].y - curveQ[0].y;

  if (dx * dx + dy * dy > delta * delta) {
      return reachableLeft;
  }

  let canContinue = true;

  for (let j = 0; j < q; j++) {

      // Free interval on the left boundary.
      const Lf = freeIntervals[j][0].L;

      if (
          !canContinue ||
          Lf === null ||
          Lf[0] > EPS
      ) {

          reachableLeft[j] = null;
          canContinue = false;

      } else {

          // Reachable interval starts at 0.
          reachableLeft[j] = [0, Lf[1]];

          // Can we reach the end of this Q segment?
          canContinue = Lf[1] >= 1 - EPS;
      }
  }

  return reachableLeft;
}


// ==================================================
// INITIALIZE REACHABLE BOTTOM BOUNDARY
// ==================================================

function initializeReachableBottom(
  curveP,
  curveQ,
  freeIntervals
) {

  const p = curveP.length - 1;

  const reachableBottom = Array(p).fill(null);

  // Starting point must be free.
  const dx = curveP[0].x - curveQ[0].x;
  const dy = curveP[0].y - curveQ[0].y;

  if (dx * dx + dy * dy > delta * delta) {
      return reachableBottom;
  }

  let canContinue = true;

  for (let i = 0; i < p; i++) {

      // Free interval on the bottom boundary.
      const Bf = freeIntervals[0][i].B;

      if (
          !canContinue ||
          Bf === null ||
          Bf[0] > EPS
      ) {

          reachableBottom[i] = null;
          canContinue = false;

      } else {

          // Reachable interval starts at 0.
          reachableBottom[i] = [0, Bf[1]];

          // Can we reach the end of this P segment?
          canContinue = Bf[1] >= 1 - EPS;
      }
  }

  return reachableBottom;
}


// ==================================================
// COMPUTE REACHABLE RIGHT INTERVAL
// ==================================================

function computeReachableRight(Lr, Br, Rf) {

  if (Rf === null) {
      return null;
  }

  // Case 1: Entry from the bottom.
  // Every free point on the right is reachable.
  if (Br !== null) {
      return Rf;
  }

  // Case 2: Entry from the left.
  // Clip using the lower endpoint of Lr.
  if (Lr !== null) {

      const lower = Math.max(Rf[0], Lr[0]);

      if (lower > Rf[1] + EPS) {
          return null;
      }

      return [lower, Rf[1]];
  }

  // No incoming reachable boundary.
  return null;
}


// ==================================================
// COMPUTE REACHABLE TOP INTERVAL
// ==================================================

function computeReachableTop(Lr, Br, Tf) {

  if (Tf === null) {
      return null;
  }

  // Case 1: Entry from the left.
  // Every free point on the top is reachable.
  if (Lr !== null) {
      return Tf;
  }

  // Case 2: Entry from the bottom.
  // Clip using the lower endpoint of Br.
  if (Br !== null) {

      const lower = Math.max(Tf[0], Br[0]);

      if (lower > Tf[1] + EPS) {
          return null;
      }

      return [lower, Tf[1]];
  }

  // No incoming reachable boundary.
  return null;
}

// ==================================================
// DRAW THE FRECHET PATH
// ==================================================

function drawFrechetPath(path, offsetX, offsetY, cellSize, rows) {

  if (path === null || path.length < 2) {
      return;
  }

  push();

  // Draw the path in purple.
  stroke(180, 0, 220);
  strokeWeight(3);
  noFill();

  beginShape();

  for (const point of path) {

      const x = offsetX + point[0] * cellSize;

      const y = offsetY + (rows - point[1]) * cellSize;

      vertex(x, y);
  }

  endShape();

  // Draw path vertices.
  noStroke();
  fill(180, 0, 220);

  for (const point of path) {

      const x = offsetX + point[0] * cellSize;

      const y = offsetY + (rows - point[1]) * cellSize;

      ellipse(x, y, 7, 7);
  }

  pop();
}


// ==================================================
// MAIN ALT-GODAU DECISION ALGORITHM
// ==================================================

function getReachableSpaceFromAltGodau(
  curveP,
  curveQ,
  cells
) {

  const p = curveP.length - 1;
  const q = curveQ.length - 1;

  // 1. Compute all free intervals.
  const freeIntervals = computeFreeIntervals(cells);

  // 2. Initialize reachable outer boundaries.
  const reachableLeft = initializeReachableLeft(
      curveP,
      curveQ,
      freeIntervals
  );

  const reachableBottom = initializeReachableBottom(
      curveP,
      curveQ,
      freeIntervals
  );

  // 3. Store outgoing reachable intervals.
  const reachableRight = Array.from(
      { length: q },
      () => Array(p).fill(null)
  );

  const reachableTop = Array.from(
      { length: q },
      () => Array(p).fill(null)
  );

  // 4. Propagate reachability through all cells.
  for (let i = 0; i < p; i++) {

      for (let j = 0; j < q; j++) {

          // --------------------------------------
          // Incoming reachable intervals
          // --------------------------------------

          // Left interval:
          // Either outer left boundary or previous cell's right.
          const Lr = (i === 0)
              ? reachableLeft[j]
              : reachableRight[j][i - 1];

          // Bottom interval:
          // Either outer bottom boundary or previous row's top.
          const Br = (j === 0)
              ? reachableBottom[i]
              : reachableTop[j - 1][i];

          // --------------------------------------
          // Outgoing free intervals
          // --------------------------------------

          const Rf = freeIntervals[j][i].R;
          const Tf = freeIntervals[j][i].T;

          // --------------------------------------
          // Compute outgoing reachable intervals
          // --------------------------------------

          reachableRight[j][i] =
              computeReachableRight(Lr, Br, Rf);

          reachableTop[j][i] =
              computeReachableTop(Lr, Br, Tf);
      }
  }

  // 5. Check the final endpoint (p,q).
  const lastRight = reachableRight[q - 1][p - 1];
  const lastTop = reachableTop[q - 1][p - 1];

  // The endpoint corresponds to parameter 1
  // on both the final right and top boundaries.
  const endpointReachable =
      (lastRight !== null &&
       lastRight[0] <= 1 + EPS &&
       lastRight[1] >= 1 - EPS) ||

      (lastTop !== null &&
       lastTop[0] <= 1 + EPS &&
       lastTop[1] >= 1 - EPS);
      
       const result = {
        freeIntervals,
        reachableLeft,
        reachableBottom,
        reachableRight,
        reachableTop,
        endpointReachable
    };
    
    // If the endpoint is reachable, reconstruct the path.
    result.path = endpointReachable
        ? reconstructFrechetPath(curveP, curveQ, result)
        : null;
    
    return result;
}

// ==================================================
// BUILD THE CELL GRID
// ==================================================

function buildFreeSpaceDiagram(curveP, curveQ) {

  const cells = [];

  for (let j = 0; j < curveQ.length - 1; j++) {

      cells[j] = [];

      for (let i = 0; i < curveP.length - 1; i++) {

          cells[j][i] = {
              i: i,
              j: j,

              p0: curveP[i],
              p1: curveP[i + 1],

              q0: curveQ[j],
              q1: curveQ[j + 1]
          };
      }
  }

  return cells;
}