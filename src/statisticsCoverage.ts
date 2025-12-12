import type {Scenario, CoverNode, CoverTableNode} from './Scenario.js'
import type {FluentStatistics, CoverageResult} from './statistics.js'
import {wilsonScoreInterval} from './statistics.js'

/**
 * Options for coverage verification.
 */
export interface VerifyCoverageOptions {
  /** Confidence level for coverage verification (default 0.95) */
  confidence?: number
}

/**
 * Result of coverage verification.
 */
export interface CoverageVerificationResult {
  /** All coverage requirements and their results */
  coverageResults: CoverageResult[]
  /** Coverage requirements that were not satisfied */
  unsatisfied: string[]
  /** Whether all coverage requirements were satisfied */
  allSatisfied: boolean
}

/**
 * Verify coverage requirements for a scenario against collected statistics.
 *
 * @param scenario - The scenario containing coverage requirements
 * @param statistics - The collected statistics from test execution
 * @param options - Verification options (confidence level)
 * @returns Coverage verification result
 *
 * @example
 * ```typescript
 * const scenario = fc.scenario()
 *   .forall('x', fc.integer(-100, 100))
 *   .cover(10, ({x}) => x < 0, 'negative')
 *   .cover(10, ({x}) => x > 0, 'positive')
 *   .then(({x}) => Math.abs(x) >= 0)
 *   .buildScenario();
 *
 * // After running tests...
 * const verification = verifyCoverage(scenario, result.statistics, { confidence: 0.99 });
 * if (!verification.allSatisfied) {
 *   console.error('Coverage requirements not met:', verification.unsatisfied);
 * }
 * ```
 */
export function verifyCoverage<Rec extends {} = {}>(
  scenario: Scenario<Rec>,
  statistics: FluentStatistics,
  options: VerifyCoverageOptions = {}
): CoverageVerificationResult {
  const confidence = options.confidence ?? 0.95
  if (confidence <= 0 || confidence >= 1) {
    throw new Error(`Confidence level must be between 0 and 1, got ${confidence}`)
  }

  // Extract coverage nodes from scenario
  const coverNodes = scenario.nodes.filter(
    (node): node is CoverNode<Rec> => node.type === 'cover'
  )
  const coverTableNodes = scenario.nodes.filter(
    (node): node is CoverTableNode<Rec> => node.type === 'coverTable'
  )

  // If no coverage requirements, return early
  if (coverNodes.length === 0 && coverTableNodes.length === 0) {
    return {
      coverageResults: [],
      unsatisfied: [],
      allSatisfied: true
    }
  }

  // Build coverage requirements list
  const coverageRequirements: Array<{ label: string; requiredPercentage: number }> = []

  // Add cover node requirements
  for (const node of coverNodes) {
    coverageRequirements.push({
      label: node.label,
      requiredPercentage: node.requiredPercentage
    })
  }

  // Add coverTable node requirements (one per category)
  for (const node of coverTableNodes) {
    for (const [category, percentage] of Object.entries(node.categories)) {
      coverageRequirements.push({
        label: `${node.name}.${category}`,
        requiredPercentage: percentage
      })
    }
  }

  // Verify coverage requirements
  const coverageResults: CoverageResult[] = []
  const unsatisfied: string[] = []

  const labels = statistics.labels ?? {}
  const testsRun = statistics.testsRun

  for (const requirement of coverageRequirements) {
    const labelCount = labels[requirement.label] ?? 0
    const observedPercentage = testsRun > 0 ? (labelCount / testsRun) * 100 : 0

    // Calculate Wilson score interval for observed percentage
    const [lower, upper] = wilsonScoreInterval(labelCount, testsRun, confidence)
    const confidenceInterval: [number, number] = [lower * 100, upper * 100]

    // Requirement is satisfied if the required percentage is not greater than the
    // upper bound of the confidence interval. This means it's statistically
    // plausible that the true percentage meets or exceeds the requirement.
    const requiredPct = requirement.requiredPercentage / 100
    const satisfied = requiredPct <= upper

    coverageResults.push({
      label: requirement.label,
      requiredPercentage: requirement.requiredPercentage,
      observedPercentage,
      satisfied,
      confidenceInterval,
      confidence
    })

    if (!satisfied) {
      const ciStr = `[${confidenceInterval[0].toFixed(2)}, ${confidenceInterval[1].toFixed(2)}]`
      unsatisfied.push(
        `${requirement.label}: required ${requirement.requiredPercentage}%, ` +
        `observed ${observedPercentage.toFixed(2)}% (CI: ${ciStr})`
      )
    }
  }

  return {
    coverageResults,
    unsatisfied,
    allSatisfied: unsatisfied.length === 0
  }
}
