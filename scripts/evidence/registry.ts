
export interface StudyConfig {
  id: string
  ts: string
  py: string
  tags: string[]
  description: string
}

export const registry: Record<string, StudyConfig> = {
  // Core Studies
  'calibration': {
    id: 'calibration',
    ts: 'scripts/evidence/calibration.study.ts',
    py: 'analysis/calibration.py',
    tags: ['core', 'calibration', 'confidence'],
    description: 'Tests confidence calibration accuracy'
  },
  'detection': {
    id: 'detection',
    ts: 'scripts/evidence/detection.study.ts',
    py: 'analysis/detection.py',
    tags: ['core', 'detection', 'bugs'],
    description: 'Compares bug detection rates between methods'
  },
  'efficiency': {
    id: 'efficiency',
    ts: 'scripts/evidence/efficiency.study.ts',
    py: 'analysis/efficiency.py',
    tags: ['core', 'efficiency', 'performance'],
    description: 'Tests adaptation to property complexity'
  },
  'exists': {
    id: 'exists',
    ts: 'scripts/evidence/exists.study.ts',
    py: 'analysis/exists.py',
    tags: ['core', 'quantifiers', 'exists'],
    description: 'Tests existential witness detection'
  },
  'shrinking': {
    id: 'shrinking',
    ts: 'scripts/evidence/shrinking.study.ts',
    py: 'analysis/shrinking.py',
    tags: ['core', 'shrinking', 'ux'],
    description: 'Evaluates shrinking effectiveness'
  },
  'double-negation': {
    id: 'double-negation',
    ts: 'scripts/evidence/double-negation.study.ts',
    py: 'analysis/double_negation.py',
    tags: ['core', 'logic', 'equivalence'],
    description: 'Tests equivalence of double-negation'
  },

  // Apparatus Studies
  'biased-sampling': {
    id: 'biased-sampling',
    ts: 'scripts/evidence/biased-sampling.study.ts',
    py: 'analysis/biased_sampling.py',
    tags: ['apparatus', 'sampling', 'bias'],
    description: 'Tests impact of biased sampling on boundary bugs'
  },
  'weighted-union': {
    id: 'weighted-union',
    ts: 'scripts/evidence/weighted-union.study.ts',
    py: 'analysis/weighted_union.py',
    tags: ['apparatus', 'combinators', 'union'],
    description: 'Study G: Tests probability distribution of unions (Weighted Selection)'
  },
  'corner-case-coverage': {
    id: 'corner-case-coverage',
    ts: 'scripts/evidence/corner-case-coverage.study.ts',
    py: 'analysis/corner_case_coverage.py',
    tags: ['apparatus', 'coverage', 'corner-cases'],
    description: 'Tests percentage of bugs found via corner cases'
  },
  'filter-cascade': {
    id: 'filter-cascade',
    ts: 'scripts/evidence/filter-cascade.study.ts',
    py: 'analysis/filter_cascade.py',
    tags: ['apparatus', 'filters', 'size-estimation'],
    description: 'Tests size estimation accuracy with filters'
  },
  'chained-distribution': {
    id: 'chained-distribution',
    ts: 'scripts/evidence/chained-distribution.study.ts',
    py: 'analysis/chained_distribution.py',
    tags: ['apparatus', 'distribution', 'chaining'],
    description: 'Tests distribution of chained arbitraries'
  },
  'shrinking-fairness': {
    id: 'shrinking-fairness',
    ts: 'scripts/evidence/shrinking-fairness.study.ts',
    py: 'analysis/shrinking_fairness.py',
    tags: ['apparatus', 'shrinking', 'fairness'],
    description: 'Tests fairness of shrinking across quantifiers'
  },
  'length-distribution': {
    id: 'length-distribution',
    ts: 'scripts/evidence/length-distribution.study.ts',
    py: 'analysis/length_distribution.py',
    tags: ['apparatus', 'distribution', 'collections'],
    description: 'Tests impact of length distribution on collection bugs'
  },
  'caching-tradeoff': {
    id: 'caching-tradeoff',
    ts: 'scripts/evidence/caching-tradeoff.study.ts',
    py: 'analysis/caching_tradeoff.py',
    tags: ['apparatus', 'caching', 'performance'],
    description: 'Tests impact of caching on diversity'
  },
  'streaming-accuracy': {
    id: 'streaming-accuracy',
    ts: 'scripts/evidence/streaming-accuracy.study.ts',
    py: 'analysis/streaming_accuracy.py',
    tags: ['apparatus', 'statistics', 'streaming'],
    description: 'Tests accuracy of streaming Bayesian stats'
  },
  'sample-budget': {
    id: 'sample-budget',
    ts: 'scripts/evidence/sample-budget.study.ts',
    py: 'analysis/sample_budget.py',
    tags: ['apparatus', 'sampling', 'budget'],
    description: 'Tests effective sample size in nested loops'
  },
  'deduplication': {
    id: 'deduplication',
    ts: 'scripts/evidence/deduplication.study.ts',
    py: 'analysis/deduplication.py',
    tags: ['apparatus', 'deduplication', 'efficiency'],
    description: 'Tests efficiency of deduplication'
  },
  'mapped-size': {
    id: 'mapped-size',
    ts: 'scripts/evidence/mapped-size.study.ts',
    py: 'analysis/mapped_size.py',
    tags: ['apparatus', 'size-estimation', 'map'],
    description: 'Tests size estimation for mapped arbitraries'
  },
  'shrinking-strategies': {
    id: 'shrinking-strategies',
    ts: 'scripts/evidence/shrinking-strategies-comparison.study.ts',
    py: 'analysis/shrinking_strategies_comparison.py',
    tags: ['apparatus', 'shrinking', 'comparison'],
    description: 'Compares different shrinking strategies'
  },
  'ci-calibration': {
    id: 'ci-calibration',
    ts: 'scripts/evidence/ci-calibration.study.ts',
    py: 'analysis/ci_calibration.py',
    tags: ['apparatus', 'statistics', 'confidence', 'calibration'],
    description: 'Tests credible interval calibration for size estimation'
  },
  'ci-convergence': {
    id: 'ci-convergence',
    ts: 'scripts/evidence/ci-convergence.study.ts',
    py: 'analysis/ci_convergence.py',
    tags: ['apparatus', 'statistics', 'convergence'],
    description: 'Tests convergence of credible intervals'
  },
  'early-termination': {
    id: 'early-termination',
    ts: 'scripts/evidence/early-termination.study.ts',
    py: 'analysis/early_termination.py',
    tags: ['apparatus', 'optimization', 'early-termination'],
    description: 'Tests correctness of early termination decisions'
  },
  'adversarial-patterns': {
    id: 'adversarial-patterns',
    ts: 'scripts/evidence/adversarial-patterns.study.ts',
    py: 'analysis/adversarial_patterns.py',
    tags: ['apparatus', 'security', 'adversarial'],
    description: 'Tests calibration under adversarial filter patterns'
  },
  'composition-depth': {
    id: 'composition-depth',
    ts: 'scripts/evidence/composition-depth.study.ts',
    py: 'analysis/composition_depth.py',
    tags: ['apparatus', 'composition', 'depth'],
    description: 'Tests impact of composition depth on coverage'
  },
  'shrinking-ci-calibration': {
    id: 'shrinking-ci-calibration',
    ts: 'scripts/evidence/shrinking-ci-calibration.study.ts',
    py: 'analysis/shrinking_ci_calibration.py',
    tags: ['apparatus', 'shrinking', 'calibration'],
    description: 'Tests CI calibration for shrunk filtered arbitraries (cold-start)'
  },
  'chained-ci-validation': {
    id: 'chained-ci-validation',
    ts: 'scripts/evidence/chained-ci-validation.study.ts',
    py: 'analysis/chained_ci_validation.py',
    tags: ['apparatus', 'chaining', 'validation'],
    description: 'Tests size propagation through ChainedArbitrary (flatMap)'
  },
  'beta-prior-comparison': {
    id: 'beta-prior-comparison',
    ts: 'scripts/evidence/beta-prior-comparison.study.ts',
    py: 'analysis/beta_prior_comparison.py',
    tags: ['apparatus', 'statistics', 'priors'],
    description: 'Compares Beta priors (2,1), (1,1), (0.5,0.5) for size estimation calibration'
  },
  'correlation-effects': {
    id: 'correlation-effects',
    ts: 'scripts/evidence/correlation-effects.study.ts',
    py: 'analysis/correlation_effects.py',
    tags: ['apparatus', 'statistics', 'correlation'],
    description: 'Tests impact of correlation on interval arithmetic calibration'
  },
  'warm-start-shrinking': {
    id: 'warm-start-shrinking',
    ts: 'scripts/evidence/warm-start-shrinking.study.ts',
    py: 'analysis/warm_start_shrinking.py',
    tags: ['apparatus', 'shrinking', 'warm-start', 'optimization'],
    description: 'Study I: Tests impact of warm-start posterior transfer during shrinking'
  },
}
