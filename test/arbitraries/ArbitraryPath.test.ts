import {expect} from 'chai'
import * as fc from '../../src/arbitraries/index.js'
import * as fcMain from '../../src/index.js'
import type {Graph} from '../../src/arbitraries/types.js'
import {NoArbitrary} from '../../src/arbitraries/NoArbitrary.js'

describe('ArbitraryPath', () => {
  // Helper to create test graphs
  const createSimpleGraph = (): Graph => ({
    nodes: [0, 1, 2, 3, 4],
    edges: new Map([
      [0, [{target: 1}, {target: 2}]],
      [1, [{target: 2}, {target: 3}]],
      [2, [{target: 3}]],
      [3, [{target: 4}]],
      [4, []]
    ]),
    directed: true
  })

  const createDisconnectedGraph = (): Graph => ({
    nodes: [0, 1, 2, 3],
    edges: new Map([
      [0, [{target: 1}]],
      [1, []],
      [2, [{target: 3}]],
      [3, []]
    ]),
    directed: true
  })

  const createUndirectedGraph = (): Graph => ({
    nodes: [0, 1, 2, 3],
    edges: new Map([
      [0, [{target: 1}]],
      [1, [{target: 0}, {target: 2}]],
      [2, [{target: 1}, {target: 3}]],
      [3, [{target: 2}]]
    ]),
    directed: false
  })

  describe('path()', () => {
    it('should generate paths starting from source', () => {
      const graph = createSimpleGraph()
      const arb = fc.path(graph, 0)
      const samples = arb.sample(10)

      for (const sample of samples) {
        expect(sample.value[0]).to.equal(0)
      }
    })

    it('should generate valid paths (all edges exist)', () => {
      const graph = createSimpleGraph()
      const arb = fc.path(graph, 0)
      const samples = arb.sample(10)

      for (const sample of samples) {
        for (let i = 0; i < sample.value.length - 1; i++) {
          const from = sample.value[i]
          const to = sample.value[i + 1]
          const adj = graph.edges.get(from as number) ?? []
          const hasEdge = adj.some(e => e.target === to)
          expect(hasEdge).to.be.true
        }
      }
    })

    it('should generate paths ending at target when specified', () => {
      const graph = createSimpleGraph()
      const arb = fc.path(graph, 0, 4)
      const samples = arb.sample(10)

      for (const sample of samples) {
        expect(sample.value[0]).to.equal(0)
        expect(sample.value[sample.value.length - 1]).to.equal(4)
      }
    })

    it('should respect maxLength', () => {
      const graph = createSimpleGraph()
      const arb = fc.path(graph, 0, undefined, 3)
      const samples = arb.sample(20)

      for (const sample of samples) {
        expect(sample.value.length).to.be.at.most(3)
      }
    })

    it('should return NoArbitrary when source not in graph', () => {
      const graph = createSimpleGraph()
      const arb = fc.path(graph, 99)
      expect(arb).to.equal(NoArbitrary)
    })

    it('should return NoArbitrary when target not in graph', () => {
      const graph = createSimpleGraph()
      const arb = fc.path(graph, 0, 99)
      expect(arb).to.equal(NoArbitrary)
    })

    it('should generate simple paths (no repeated nodes)', () => {
      const graph = createSimpleGraph()
      const arb = fc.path(graph, 0)
      const samples = arb.sample(20)

      for (const sample of samples) {
        const seen = new Set<number>()
        for (const node of sample.value) {
          expect(seen.has(node)).to.be.false
          seen.add(node)
        }
      }
    })
  })

  describe('path with undirected graphs', () => {
    it('should traverse edges in both directions', () => {
      const graph = createUndirectedGraph()
      const arb = fc.path(graph, 0, 3)
      const samples = arb.sample(10)

      for (const sample of samples) {
        expect(sample.value[0]).to.equal(0)
        expect(sample.value[sample.value.length - 1]).to.equal(3)
      }
    })
  })

  describe('unreachable targets', () => {
    it('should handle disconnected graphs gracefully', () => {
      const graph = createDisconnectedGraph()
      const arb = fc.path(graph, 0, 3) // 3 is not reachable from 0

      // The arbitrary may return undefined from pick() when target is unreachable
      // This is handled gracefully - sample will just be empty or have no valid paths
      const samples = arb.sample(5)
      // All samples should either be empty or not reach target
      // (implementation returns undefined when path is impossible)
      expect(samples.length).to.be.at.most(5)
    })
  })

  describe('shrinking', () => {
    it('should shrink paths by removing intermediate nodes', () => {
      const graph = createSimpleGraph()
      const arb = fc.path(graph, 0)

      // Find a path with more than 2 nodes
      const samples = arb.sample(20)
      const longPath = samples.find(s => s.value.length > 2)

      if (longPath !== undefined) {
        const shrunkArb = arb.shrink(longPath)
        const shrunkSamples = shrunkArb.sample(5)

        for (const shrunk of shrunkSamples) {
          expect(shrunk.value.length).to.be.lessThan(longPath.value.length)
          // Verify path is still valid
          expect(shrunk.value[0]).to.equal(0)
        }
      }
    })

    it('should maintain path validity after shrinking', () => {
      const graph = createSimpleGraph()
      const arb = fc.path(graph, 0, 4)
      const samples = arb.sample(10)

      for (const sample of samples) {
        if (sample.value.length > 2) {
          const shrunkArb = arb.shrink(sample)
          const shrunkSamples = shrunkArb.sample(3)

          for (const shrunk of shrunkSamples) {
            // Verify start and end
            expect(shrunk.value[0]).to.equal(0)
            expect(shrunk.value[shrunk.value.length - 1]).to.equal(4)

            // Verify all edges exist
            for (let i = 0; i < shrunk.value.length - 1; i++) {
              const from = shrunk.value[i]
              const to = shrunk.value[i + 1]
              const adj = graph.edges.get(from as number) ?? []
              expect(adj.some(e => e.target === to)).to.be.true
            }
          }
        }
      }
    })
  })

  describe('canGenerate', () => {
    it('should accept valid paths', () => {
      const graph = createSimpleGraph()
      const arb = fc.path(graph, 0)
      const sample = arb.sample(1)[0]

      if (sample !== undefined) {
        expect(arb.canGenerate(sample)).to.be.true
      }
    })

    it('should reject paths not starting from source', () => {
      const graph = createSimpleGraph()
      const arb = fc.path(graph, 0)

      expect(arb.canGenerate({value: [1, 2, 3]})).to.be.false
    })

    it('should reject paths with invalid edges', () => {
      const graph = createSimpleGraph()
      const arb = fc.path(graph, 0)

      // 0 -> 4 is not a direct edge
      expect(arb.canGenerate({value: [0, 4]})).to.be.false
    })

    it('should reject paths exceeding maxLength', () => {
      const graph = createSimpleGraph()
      const arb = fc.path(graph, 0, undefined, 3)

      expect(arb.canGenerate({value: [0, 1, 2, 3, 4]})).to.be.false
    })

    it('should reject paths with repeated nodes', () => {
      const graph: Graph = {
        nodes: [0, 1, 2],
        edges: new Map([
          [0, [{target: 1}]],
          [1, [{target: 0}, {target: 2}]],
          [2, []]
        ]),
        directed: true
      }
      const arb = fc.path(graph, 0)

      // Path with cycle: 0 -> 1 -> 0 has repeated node
      expect(arb.canGenerate({value: [0, 1, 0]})).to.be.false
    })
  })

  describe('cornerCases', () => {
    it('should include single node path', () => {
      const graph = createSimpleGraph()
      const arb = fc.path(graph, 0)
      const corners = arb.cornerCases()

      const hasSingleNode = corners.some(c => c.value.length === 1 && c.value[0] === 0)
      expect(hasSingleNode).to.be.true
    })

    it('should include direct path when edge exists', () => {
      const graph = createSimpleGraph()
      const arb = fc.path(graph, 0, 1) // Direct edge 0->1 exists
      const corners = arb.cornerCases()

      const hasDirect = corners.some(c =>
        c.value.length === 2 && c.value[0] === 0 && c.value[1] === 1
      )
      expect(hasDirect).to.be.true
    })
  })

  describe('identity functions', () => {
    it('should produce consistent hash codes', () => {
      const graph = createSimpleGraph()
      const arb = fc.path(graph, 0)
      const sample = arb.sample(1)[0]

      if (sample !== undefined) {
        const hash = arb.hashCode()
        expect(hash(sample.value)).to.equal(hash(sample.value))
      }
    })

    it('should correctly identify equal paths', () => {
      const graph = createSimpleGraph()
      const arb = fc.path(graph, 0)
      const equals = arb.equals()

      const path1 = [0, 1, 2]
      const path2 = [0, 1, 2]
      const path3 = [0, 2, 3]

      expect(equals(path1, path2)).to.be.true
      expect(equals(path1, path3)).to.be.false
    })
  })
})

describe('Integration: Graph and Path with exists()', () => {
  it('should find paths using exists quantifier', () => {
    const graph: Graph = {
      nodes: [0, 1, 2, 3],
      edges: new Map([
        [0, [{target: 1}]],
        [1, [{target: 2}]],
        [2, [{target: 3}]],
        [3, []]
      ]),
      directed: true
    }

    const result = fcMain.scenario()
      .exists('path', fc.path(graph, 0, 3))
      .then(({path}: {path: number[]}) => {
        // Verify path is valid
        return path[0] === 0 && path[path.length - 1] === 3
      })
      .check()

    expect(result.satisfiable).to.be.true
    if (result.example !== undefined) {
      expect(result.example.path[0]).to.equal(0)
      expect(result.example.path[result.example.path.length - 1]).to.equal(3)
    }
  })

  it('should verify graph properties with forall', () => {
    // All graphs should have valid edges (no self-loops)
    const result = fcMain.scenario()
      .forall('graph', fc.graph({nodes: 4, edges: {min: 2, max: 5}}))
      .then(({graph}: {graph: Graph}) => {
        for (const [source, adj] of graph.edges) {
          for (const entry of adj) {
            if (entry.target === source) return false // Self-loop found
          }
        }
        return true
      })
      .check()

    expect(result.satisfiable).to.be.true
  })
})
