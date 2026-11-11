
/* eslint-disable no-undef, no-unused-vars */

// ==================================================
// POINT AND INPUT
// ==================================================

class Point {
  constructor(x, y) {
      this.x = x;
      this.y = y;
  }
}

const delta = 105;



var P = [
  new Point(40, 271),
  new Point(143, 165),
  new Point(247, 165),
  new Point(246, 63),
  new Point(196, 216),
  new Point(300, 216),
  new Point(403, 163)
];

var Q = [
  new Point(144, 270),
  new Point(90, 115),
  new Point(300, 112),
  new Point(300, 163),
  new Point(403, 111)
];

var points = [];



// Visualization configuration
const CELL_SIZE = 70;
const RESOLUTION = 50;
const EPS = 1e-9;

let cells = [];
let altGodauResult = null;



function runAlgorithm(P, Q, B, freeIntervals)
{


}

function resetpoints() {
  P = [];
  Q = [];
  points=[];
   redraw();
}

function mousePressed() {
  
  
  //ignore poitns added near buttons
   console.log(mouseX, mouseY, (mouseY>484 && mouseY<600 )  && (mouseX < 132&&  mouseX > 28));
  if( (mouseY>484 && mouseY<600 )  && (mouseX < 132&&  mouseX > 28))
    return;
  
 
    points.push(new Point(mouseX, mouseY));
   redraw();
}

function setPToPoints()
{
     P = points.map(p => new Point(p.x, p.y));
     points = [];
     if(Q .length >2 ){
         // Rebuild the free-space diagram
    cells = buildFreeSpaceDiagram(P, Q);

    // Recalculate reachable space
    altGodauResult = getReachableSpaceFromAltGodau(
        P,
        Q,
        cells
    );}

    redraw();
   
}

function setQToPoints(){
     Q = points.map(p => new Point(p.x, p.y));
     points = [];
     if(P.length >2 ){
         // Rebuild the free-space diagram
    cells = buildFreeSpaceDiagram(P, Q);

    // Recalculate reachable space
    altGodauResult = getReachableSpaceFromAltGodau(
        P,
        Q,
        cells
    );}

    redraw();
    
}
// ==================================================
// SETUP
// ==================================================

function setup() {

  createCanvas(windowWidth, windowHeight);


    button = createButton("Clear");
    button.position(30, 485);
    button.mousePressed(resetpoints);
    button = createButton("Draw curve P");
    button.position(30, 515);
    button.mousePressed(setPToPoints);
    button = createButton("Draw curve Q");
    button.position(30, 545);
    button.mousePressed(setQToPoints);
    button = createButton("Draw Free diagram");
    button.position(30, 575);
    button.mousePressed(resetpoints);

  // 1. Build the cell grid.
  cells = buildFreeSpaceDiagram(P, Q);

  runAlgorithm(P,Q,cells);
    
  // 2. Execute the Alt-Godau decision algorithm.
  altGodauResult = getReachableSpaceFromAltGodau(
      P,
      Q,
      cells
  );

  // 3. Display results.
  console.log("Alt-Godau result:", altGodauResult);

  console.log(
      "Reachable left:",
      altGodauResult.reachableLeft
  );

  console.log(
      "Reachable bottom:",
      altGodauResult.reachableBottom
  );

  console.log(
      "Reachable right:",
      altGodauResult.reachableRight
  );

  console.log(
      "Reachable top:",
      altGodauResult.reachableTop
  );

  console.log(
      "Endpoint reachable:",
      altGodauResult.endpointReachable
  );

  console.log("curvelength ", Q.length );
  noLoop();
}



// ==================================================
// DRAW
// ==================================================

function draw() {

  background(240);
  
  
  drawCurve(P, "#1976D2", "P");
  drawCurve(Q, "#E67E22", "Q");

  drawFreeSpaceDiagram(cells, altGodauResult);
  for (i in points) {
    ellipse(points[i].x, points[i].y, 4, 4);
  }
 // drawFreeSpaceDiagram(cells, altGodauResult);
}


// ==================================================
// DRAW POLYGONAL CURVES
// ==================================================

function drawCurve(curve, curveColor, name) {

  push();

  stroke(curveColor);
  strokeWeight(3);
  noFill();

  beginShape();

  for (let i = 0; i < curve.length; i++) {
      vertex(curve[i].x, curve[i].y);
  }

  endShape();

  for (let i = 0; i < curve.length; i++) {

      const p = curve[i];

      noStroke();
      fill(curveColor);

      ellipse(p.x, p.y, 12, 12);

      fill(0);
      textSize(14);

      text(
          name + (i + 1),
          p.x + 10,
          p.y - 10
      );
  }

  pop();
}


// ==================================================
// DRAW A REACHABLE INTERVAL ON A VERTICAL EDGE
// ==================================================

function drawVerticalInterval(
  interval,
  x,
  cellY,
  cellSize
) {

  if (interval === null) {
      return;
  }

  const y1 = cellY + (1 - interval[1]) * cellSize;
  const y2 = cellY + (1 - interval[0]) * cellSize;

  stroke(0, 80, 255);
  strokeWeight(5);

  line(x, y1, x, y2);
}


// ==================================================
// DRAW A REACHABLE INTERVAL ON A HORIZONTAL EDGE
// ==================================================

function drawHorizontalInterval(
  interval,
  y,
  cellX,
  cellSize
) {

  if (interval === null) {
      return;
  }

  const x1 = cellX + interval[0] * cellSize;
  const x2 = cellX + interval[1] * cellSize;

  stroke(0, 80, 255);
  strokeWeight(5);

  line(x1, y, x2, y);
}


// ==================================================
// DRAW FREE-SPACE DIAGRAM AND REACHABLE INTERVALS
// ==================================================

function drawFreeSpaceDiagram(cells, result) {

  const rows = cells.length;
  const cols = cells[0].length;

  const cellSize = Math.min(
      CELL_SIZE,
      Math.max(35, (width - 480) / cols),
      Math.max(35, (height - 220) / rows)
  );

  const offsetX = Math.max(
      440,
      width - (cols * cellSize + 90)
  );

  const offsetY = 250;

  const pixelSize = cellSize / RESOLUTION;

  push();

  // Title
  noStroke();
  fill(0);
  textSize(20);

  text(
      "Free-space diagram",
      offsetX,
      offsetY - 35
  );

  // ----------------------------------------------
  // Draw free and non-free space
  // ----------------------------------------------

  for (let j = 0; j < rows; j++) {

      for (let i = 0; i < cols; i++) {

          const cell = cells[j][i];

          const cellX = offsetX + i * cellSize;
          const cellY = offsetY + (rows - 1 - j) * cellSize;

          noStroke();

          for (let y = 0; y < RESOLUTION; y++) {

              for (let x = 0; x < RESOLUTION; x++) {

                  const s = (x + 0.5) / RESOLUTION;
                  const t = 1 - (y + 0.5) / RESOLUTION;

                  if (isFree(cell, s, t)) {
                      fill(0, 180, 0);
                  } else {
                      fill(200, 50, 50);
                  }

                  rect(
                      cellX + x * pixelSize,
                      cellY + y * pixelSize,
                      pixelSize + 0.2,
                      pixelSize + 0.2
                  );
              }
          }
      }
  }

  // ----------------------------------------------
  // Draw cell borders
  // ----------------------------------------------

  noFill();
  stroke(0);
  strokeWeight(1);

  rect(
      offsetX,
      offsetY,
      cols * cellSize,
      rows * cellSize
  );

  for (let i = 1; i < cols; i++) {

      const x = offsetX + i * cellSize;

      line(
          x,
          offsetY,
          x,
          offsetY + rows * cellSize
      );
  }

  for (let j = 1; j < rows; j++) {

      const y = offsetY + j * cellSize;

      line(
          offsetX,
          y,
          offsetX + cols * cellSize,
          y
      );
  }

  // ----------------------------------------------
  // Draw reachable intervals
  // ----------------------------------------------

  // Outer left boundary.
  for (let j = 0; j < rows; j++) {

      const cellY = offsetY + (rows - 1 - j) * cellSize;

      drawVerticalInterval(
          result.reachableLeft[j],
          offsetX,
          cellY,
          cellSize
      );
  }

  // Outer bottom boundary.
  for (let i = 0; i < cols; i++) {

      const cellX = offsetX + i * cellSize;

      drawHorizontalInterval(
          result.reachableBottom[i],
          offsetY + rows * cellSize,
          cellX,
          cellSize
      );
  }

  // Outgoing right and top boundaries of each cell.
  for (let j = 0; j < rows; j++) {

      for (let i = 0; i < cols; i++) {

          const cellX = offsetX + i * cellSize;
          const cellY = offsetY + (rows - 1 - j) * cellSize;

          drawVerticalInterval(
              result.reachableRight[j][i],
              cellX + cellSize,
              cellY,
              cellSize
          );

          drawHorizontalInterval(
              result.reachableTop[j][i],
              cellY,
              cellX,
              cellSize
          );
      }
  }

  if (result.endpointReachable && result.path !== null) {

    drawFrechetPath(
        result.path,
        offsetX,
        offsetY,
        cellSize,
        rows
    );

}
  // ----------------------------------------------
  // Axis labels
  // ----------------------------------------------

  noStroke();
  fill(0);
  textSize(13);
  textAlign(CENTER);

  for (let i = 0; i <= cols; i++) {

      text(
          i + 1,
          offsetX + i * cellSize,
          offsetY + rows * cellSize + 18
      );
  }

  textAlign(RIGHT);

  for (let j = 0; j <= rows; j++) {

      text(
          j + 1,
          offsetX - 10,
          offsetY + (rows - j) * cellSize + 5
      );
  }

  // Axis titles
  textAlign(CENTER);
  textSize(16);

  text(
      "P →",
      offsetX + cols * cellSize / 2,
      offsetY + rows * cellSize + 45
  );

  push();

  translate(
      offsetX - 45,
      offsetY + rows * cellSize / 2
  );

  rotate(-HALF_PI);

  text("Q →", 0, 0);

  pop();

  // ----------------------------------------------
  // Legend
  // ----------------------------------------------

  textAlign(LEFT);
  textSize(13);

  fill(0, 180, 0);
  rect(
      offsetX,
      offsetY + rows * cellSize + 65,
      13,
      13
  );

  fill(0);
  text(
      "Free space",
      offsetX + 20,
      offsetY + rows * cellSize + 77
  );

  fill(200, 50, 50);
  rect(
      offsetX + 110,
      offsetY + rows * cellSize + 65,
      13,
      13
  );

  fill(0);
  text(
      "Non-free space",
      offsetX + 130,
      offsetY + rows * cellSize + 77
  );

  stroke(0, 80, 255);
  strokeWeight(5);

  line(
      offsetX + 275,
      offsetY + rows * cellSize + 71,
      offsetX + 292,
      offsetY + rows * cellSize + 71
  );

  noStroke();
  fill(0);

  text(
      "Reachable",
      offsetX + 300,
      offsetY + rows * cellSize + 77
  );

  // ----------------------------------------------
  // Decision result
  // ----------------------------------------------

  textSize(16);
  textAlign(LEFT);

  fill(result.endpointReachable ? "#087A32" : "#C62828");

  text(
      result.endpointReachable
          ? "YES: endpoint is reachable"
          : "NO: endpoint is not reachable",
      offsetX,
      offsetY - 10
  );

  pop();
}


// ==================================================
// RESIZE CANVAS
// ==================================================

function windowResized() {

  resizeCanvas(windowWidth, windowHeight);

  redraw();
}
