import {expect} from 'chai'
import * as fc from '../../src/arbitraries/index.js'
import type {Graph} from '../../src/arbitraries/types.js'

describe('ArbitraryGraph', () => {
  describe('graph()', () => {
    it('should generate graphs with specified node count', () => {
      const arb = fc.graph({nodes: 5})
      const samples = arb.sample(10)

      for (const sample of samples) {
        expect(sample.value.nodes).to.have.length(5)
        expect(sample.value.nodes).to.deep.equal([0, 1, 2, 3, 4])
      }
    })

    it('should generate graphs with custom node labels', () => {
      const nodes = ['A', 'B', 'C']
      const arb = fc.graph({nodes})
      const samples = arb.sample(10)

      for (const sample of samples) {
        expect(sample.value.nodes).to.deep.equal(['A', 'B', 'C'])
      }
    })

    it('should generate directed graphs by default', () => {
      const arb = fc.graph({nodes: 3})
      const samples = arb.sample(10)

      for (const sample of samples) {
        expect(sample.value.directed).to.be.true
      }
    })

    it('should generate undirected graphs when specified', () => {
      const arb = fc.graph({nodes: 3, directed: false})
      const samples = arb.sample(10)

      for (const sample of samples) {
        expect(sample.value.directed).to.be.false
      }
    })

    it('should respect edge count range', () => {
      const arb = fc.graph({nodes: 5, edges: {min: 3, max: 5}})
      const samples = arb.sample(20)

      for (const sample of samples) {
        const edgeCount = countEdges(sample.value)
        expect(edgeCount).to.be.at.least(3)
        expect(edgeCount).to.be.at.most(5)
      }
    })

    it('should generate exact edge count when specified as number', () => {
      const arb = fc.graph({nodes: 4, edges: 4})
      const samples = arb.sample(10)

      for (const sample of samples) {
        const edgeCount = countEdges(sample.value)
        expect(edgeCount).to.equal(4)
      }
    })

    it('should handle empty graphs', () => {
      const arb = fc.graph({nodes: 0})
      const samples = arb.sample(5)

      for (const sample of samples) {
        expect(sample.value.nodes).to.have.length(0)
        expect(sample.value.edges.size).to.equal(0)
      }
    })

    it('should not create duplicate edges', () => {
      const arb = fc.graph({nodes: 4, edges: {min: 5, max: 10}})
      const samples = arb.sample(20)

      for (const sample of samples) {
        const edgeSet = new Set<string>()
        for (const [source, adj] of sample.value.edges) {
          for (const entry of adj) {
            const key = `${source}->${entry.target}`
            expect(edgeSet.has(key)).to.be.false
            edgeSet.add(key)
          }
        }
      }
    })

    it('should not create self-loops', () => {
      const arb = fc.graph({nodes: 5, edges: {min: 5, max: 10}})
      const samples = arb.sample(20)

      for (const sample of samples) {
        for (const [source, adj] of sample.value.edges) {
          for (const entry of adj) {
            expect(entry.target).to.not.equal(source)
          }
        }
      }
    })
  })

  describe('directedGraph()', () => {
    it('should create directed graphs', () => {
      const arb = fc.directedGraph(5)
      const samples = arb.sample(10)

      for (const sample of samples) {
        expect(sample.value.directed).to.be.true
        expect(sample.value.nodes).to.have.length(5)
      }
    })

    it('should accept edge configuration', () => {
      const arb = fc.directedGraph(4, {min: 2, max: 4})
      const samples = arb.sample(20)

      for (const sample of samples) {
        const edgeCount = countEdges(sample.value)
        expect(edgeCount).to.be.at.least(2)
        expect(edgeCount).to.be.at.most(4)
      }
    })
  })

  describe('undirectedGraph()', () => {
    it('should create undirected graphs', () => {
      const arb = fc.undirectedGraph(5)
      const samples = arb.sample(10)

      for (const sample of samples) {
        expect(sample.value.directed).to.be.false
      }
    })

    it('should have bidirectional edges', () => {
      const arb = fc.undirectedGraph(4, {min: 3, max: 5})
      const samples = arb.sample(10)

      for (const sample of samples) {
        // In undirected graphs, if A->B exists, B->A should also exist
        for (const [source, adj] of sample.value.edges) {
          for (const entry of adj) {
            const reverseAdj = sample.value.edges.get(entry.target) ?? []
            const hasReverse = reverseAdj.some(e => e.target === source)
            expect(hasReverse).to.be.true
          }
        }
      }
    })
  })

  describe('weightedGraph()', () => {
    it('should generate graphs with edge weights', () => {
      const arb = fc.weightedGraph({nodes: 4, edges: {min: 3, max: 5}}, fc.integer(1, 100))
      const samples = arb.sample(10)

      for (const sample of samples) {
        for (const [, adj] of sample.value.edges) {
          for (const entry of adj) {
            expect(entry).to.have.property('weight')
            expect((entry as {weight: number}).weight).to.be.at.least(1)
            expect((entry as {weight: number}).weight).to.be.at.most(100)
          }
        }
      }
    })
  })

  describe('connectedGraph()', () => {
    it('should generate connected graphs', () => {
      const arb = fc.connectedGraph(5)
      const samples = arb.sample(10)

      for (const sample of samples) {
        expect(isConnected(sample.value)).to.be.true
      }
    })

    it('should have at least n-1 edges for n nodes', () => {
      const arb = fc.connectedGraph(5)
      const samples = arb.sample(10)

      for (const sample of samples) {
        const edgeCount = countEdges(sample.value)
        expect(edgeCount).to.be.at.least(4) // n-1 for connectivity
      }
    })
  })

  describe('dag()', () => {
    it('should generate acyclic graphs', () => {
      const arb = fc.dag(5)
      const samples = arb.sample(20)

      for (const sample of samples) {
        expect(sample.value.directed).to.be.true
        expect(hasCycle(sample.value)).to.be.false
      }
    })

    it('should be topologically sortable', () => {
      const arb = fc.dag(5, {min: 3, max: 6})
      const samples = arb.sample(10)

      for (const sample of samples) {
        const sorted = topologicalSort(sample.value)
        expect(sorted).to.not.be.null
      }
    })
  })

  describe('shrinking', () => {
    it('should shrink by removing edges', () => {
      const arb = fc.graph({nodes: 4, edges: {min: 2, max: 5}})
      const sample = arb.sample(1)[0]
      if (sample === undefined) return

      const initialEdgeCount = countEdges(sample.value)
      if (initialEdgeCount <= 0) return

      const shrunkArb = arb.shrink(sample)
      const shrunkSamples = shrunkArb.sample(5)

      for (const shrunk of shrunkSamples) {
        expect(countEdges(shrunk.value)).to.be.lessThan(initialEdgeCount)
      }
    })

    it('should maintain node set during edge shrinking', () => {
      const arb = fc.graph({nodes: 4, edges: 4})
      const sample = arb.sample(1)[0]
      if (sample === undefined) return

      const shrunkArb = arb.shrink(sample)
      const shrunkSamples = shrunkArb.sample(5)

      for (const shrunk of shrunkSamples) {
        expect(shrunk.value.nodes).to.deep.equal(sample.value.nodes)
      }
    })
  })

  describe('canGenerate', () => {
    it('should accept valid graphs', () => {
      const arb = fc.graph({nodes: 3, edges: {min: 1, max: 3}})
      const sample = arb.sample(1)[0]
      if (sample === undefined) return

      expect(arb.canGenerate(sample)).to.be.true
    })

    it('should reject graphs with wrong node count', () => {
      const arb = fc.graph({nodes: 3})
      const wrongGraph: Graph = {
        nodes: [0, 1], // Only 2 nodes
        edges: new Map(),
        directed: true
      }

      expect(arb.canGenerate({value: wrongGraph})).to.be.false
    })
  })

  describe('cornerCases', () => {
    it('should include empty graph when min edges is 0', () => {
      const arb = fc.graph({nodes: 3, edges: {min: 0, max: 3}})
      const corners = arb.cornerCases()

      const hasEmpty = corners.some(c => countEdges(c.value) === 0)
      expect(hasEmpty).to.be.true
    })
  })

  describe('identity functions', () => {
    it('should produce consistent hash codes', () => {
      const arb = fc.graph({nodes: 3, edges: 2})
      const sample = arb.sample(1)[0]
      if (sample === undefined) return

      const hash = arb.hashCode()
      expect(hash(sample.value)).to.equal(hash(sample.value))
    })

    it('should correctly identify equal graphs', () => {
      const arb = fc.graph({nodes: 3})
      const equals = arb.equals()

      const graph1: Graph = {
        nodes: [0, 1, 2],
        edges: new Map([[0, [{target: 1}]]]),
        directed: true
      }

      const graph2: Graph = {
        nodes: [0, 1, 2],
        edges: new Map([[0, [{target: 1}]]]),
        directed: true
      }

      expect(equals(graph1, graph2)).to.be.true
    })
  })
})

// Helper functions
function countEdges<N, E>(graph: Graph<N, E>): number {
  let count = 0
  for (const [, adj] of graph.edges) {
    count += adj.length
  }
  return graph.directed ? count : count / 2
}

function isConnected<N, E>(graph: Graph<N, E>): boolean {
  if (graph.nodes.length === 0) return true

  const visited = new Set<N>()
  const queue: N[] = [graph.nodes[0] as N]
  visited.add(graph.nodes[0] as N)

  while (queue.length > 0) {
    const node = queue.shift()!
    const neighbors = graph.edges.get(node) ?? []

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.target)) {
        visited.add(neighbor.target)
        queue.push(neighbor.target)
      }
    }

    if (!graph.directed) {
      for (const [source, adj] of graph.edges) {
        if (adj.some(e => e.target === node) && !visited.has(source)) {
          visited.add(source)
          queue.push(source)
        }
      }
    }
  }

  return visited.size === graph.nodes.length
}

function hasCycle<N, E>(graph: Graph<N, E>): boolean {
  const WHITE = 0, GRAY = 1, BLACK = 2
  const color = new Map<N, number>()

  for (const node of graph.nodes) {
    color.set(node, WHITE)
  }

  const dfs = (node: N): boolean => {
    color.set(node, GRAY)

    for (const neighbor of graph.edges.get(node) ?? []) {
      if (color.get(neighbor.target) === GRAY) return true
      if (color.get(neighbor.target) === WHITE && dfs(neighbor.target)) return true
    }

    color.set(node, BLACK)
    return false
  }

  for (const node of graph.nodes) {
    if (color.get(node) === WHITE && dfs(node)) return true
  }

  return false
}

function topologicalSort<N, E>(graph: Graph<N, E>): N[] | null {
  const inDegree = new Map<N, number>()
  for (const node of graph.nodes) {
    inDegree.set(node, 0)
  }

  for (const [, adj] of graph.edges) {
    for (const entry of adj) {
      inDegree.set(entry.target, (inDegree.get(entry.target) ?? 0) + 1)
    }
  }

  const queue: N[] = []
  for (const [node, degree] of inDegree) {
    if (degree === 0) queue.push(node)
  }

  const result: N[] = []
  while (queue.length > 0) {
    const node = queue.shift()!
    result.push(node)

    for (const neighbor of graph.edges.get(node) ?? []) {
      const newDegree = (inDegree.get(neighbor.target) ?? 1) - 1
      inDegree.set(neighbor.target, newDegree)
      if (newDegree === 0) queue.push(neighbor.target)
    }
  }

  return result.length === graph.nodes.length ? result : null
}
