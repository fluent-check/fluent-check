/**
 * Voronoi Tessellation Utilities
 * 
 * This file contains utility functions for computing Voronoi tessellation
 * in n-dimensional spaces, which is used particularly in Experiment 3.
 */

/**
 * Calculates Euclidean distance between two points
 * @param p1 First point
 * @param p2 Second point
 * @returns Euclidean distance
 */
export function euclideanDistance(p1: number[], p2: number[]): number {
  if (p1.length !== p2.length) {
    throw new Error('Points must have the same dimension');
  }
  
  let sumSquares = 0;
  for (let i = 0; i < p1.length; i++) {
    sumSquares += (p1[i] - p2[i]) ** 2;
  }
  
  return Math.sqrt(sumSquares);
}

/**
 * Generates uniform random points in a d-dimensional unit hypercube
 * @param d The dimension
 * @param n The number of points to generate
 * @returns Array of d-dimensional points
 */
export function generateUniformPoints(d: number, n: number): number[][] {
  const points: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    const point: number[] = [];
    for (let j = 0; j < d; j++) {
      point.push(Math.random()); // Random value in [0,1)
    }
    points.push(point);
  }
  
  return points;
}

/**
 * Computes the volume of a Voronoi cell for a point using Monte Carlo estimation
 * @param point The center point of the Voronoi cell
 * @param allPoints All points in the space
 * @param numSamples Number of Monte Carlo samples to use
 * @param d Dimension of the space
 * @returns Estimated volume of the Voronoi cell
 */
export function estimateVoronoiCellVolume(
  point: number[], 
  allPoints: number[][], 
  numSamples: number, 
  d: number
): number {
  let insideCount = 0;
  
  // Generate random samples and check if they're closer to our point than any other
  for (let i = 0; i < numSamples; i++) {
    const sample: number[] = [];
    for (let j = 0; j < d; j++) {
      sample.push(Math.random());
    }
    
    // Find closest point to this sample
    let closestPoint = point;
    let minDist = euclideanDistance(sample, point);
    
    for (const otherPoint of allPoints) {
      if (otherPoint === point) continue;
      
      const dist = euclideanDistance(sample, otherPoint);
      if (dist < minDist) {
        minDist = dist;
        closestPoint = otherPoint;
        break; // Once we find a closer point, we can stop
      }
    }
    
    // If our point is the closest, this sample is inside its Voronoi cell
    if (closestPoint === point) {
      insideCount++;
    }
  }
  
  // The volume is the proportion of samples inside the cell times the total volume (1 for unit hypercube)
  return insideCount / numSamples;
}

/**
 * Computes KL divergence between two probability distributions
 * @param p First distribution
 * @param q Second distribution
 * @returns KL divergence
 */
export function klDivergence(p: number[], q: number[]): number {
  if (p.length !== q.length) {
    throw new Error('Distributions must have the same length');
  }
  
  // Normalize distributions to ensure they sum to 1
  const pSum = p.reduce((a, b) => a + b, 0);
  const qSum = q.reduce((a, b) => a + b, 0);
  
  const pNorm = p.map(x => x / pSum);
  const qNorm = q.map(x => x / qSum);
  
  // Compute KL divergence
  let kl = 0;
  for (let i = 0; i < p.length; i++) {
    // Avoid log(0) by adding a small epsilon
    const epsilon = 1e-10;
    if (pNorm[i] > epsilon) {
      kl += pNorm[i] * Math.log((pNorm[i] + epsilon) / (qNorm[i] + epsilon));
    }
  }
  
  return kl;
}

/**
 * Computes total variation distance between two probability distributions
 * @param p First distribution
 * @param q Second distribution
 * @returns Total variation distance
 */
export function totalVariationDistance(p: number[], q: number[]): number {
  if (p.length !== q.length) {
    throw new Error('Distributions must have the same length');
  }
  
  // Normalize distributions
  const pSum = p.reduce((a, b) => a + b, 0);
  const qSum = q.reduce((a, b) => a + b, 0);
  
  const pNorm = p.map(x => x / pSum);
  const qNorm = q.map(x => x / qSum);
  
  // Total variation distance is 1/2 * L1 distance
  let tvd = 0;
  for (let i = 0; i < p.length; i++) {
    tvd += Math.abs(pNorm[i] - qNorm[i]);
  }
  
  return tvd / 2;
}

/**
 * Builds a simple locality-sensitive hashing (LSH) function for approximating nearest neighbors
 * @param points Array of points
 * @param d Dimension of the space
 * @param numHashes Number of hash functions to use
 * @returns Function that maps a query point to approximate nearest neighbor index
 */
export function buildLSH(points: number[][], d: number, numHashes: number): (query: number[]) => number {
  // Generate random projection vectors for hashing
  const projections: number[][] = [];
  for (let i = 0; i < numHashes; i++) {
    const proj: number[] = [];
    for (let j = 0; j < d; j++) {
      proj.push(Math.random() * 2 - 1); // Random value in [-1,1]
    }
    projections.push(proj);
  }
  
  // Compute hash signatures for all points
  const signatures: number[][] = [];
  for (const point of points) {
    const sig: number[] = [];
    
    for (const proj of projections) {
      // Compute dot product
      let dotProduct = 0;
      for (let i = 0; i < d; i++) {
        dotProduct += point[i] * proj[i];
      }
      
      // Hash based on sign of dot product
      sig.push(dotProduct > 0 ? 1 : 0);
    }
    
    signatures.push(sig);
  }
  
  // Return function that finds approximate nearest neighbor
  return (query: number[]): number => {
    // Compute query signature
    const querySig: number[] = [];
    for (const proj of projections) {
      let dotProduct = 0;
      for (let i = 0; i < d; i++) {
        dotProduct += query[i] * proj[i];
      }
      querySig.push(dotProduct > 0 ? 1 : 0);
    }
    
    // Find point with most similar signature
    let bestMatch = 0;
    let maxSimilarity = -1;
    
    for (let i = 0; i < signatures.length; i++) {
      // Count matching bits
      let similarity = 0;
      for (let j = 0; j < querySig.length; j++) {
        if (querySig[j] === signatures[i][j]) {
          similarity++;
        }
      }
      
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        bestMatch = i;
      }
    }
    
    return bestMatch;
  };
} 