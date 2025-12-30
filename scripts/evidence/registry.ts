
export interface StudyConfig {
  id: string
  ts: string
  py: string
  category: 'core' | 'apparatus'
  description: string
}

export const registry: Record<string, StudyConfig> = {
  // Core Studies
  'calibration': {
    id: 'calibration',
    ts: 'scripts/evidence/calibration.study.ts',
    py: 'analysis/calibration.py',
    category: 'core',
    description: 'Tests confidence calibration accuracy'
  },
  'detection': {
    id: 'detection',
    ts: 'scripts/evidence/detection.study.ts',
    py: 'analysis/detection.py',
    category: 'core',
    description: 'Compares bug detection rates between methods'
  },
  'efficiency': {
    id: 'efficiency',
    ts: 'scripts/evidence/efficiency.study.ts',
    py: 'analysis/efficiency.py',
    category: 'core',
    description: 'Tests adaptation to property complexity'
  },
  'exists': {
    id: 'exists',
    ts: 'scripts/evidence/exists.study.ts',
    py: 'analysis/exists.py',
    category: 'core',
    description: 'Tests existential witness detection'
  },
  'shrinking': {
    id: 'shrinking',
    ts: 'scripts/evidence/shrinking.study.ts',
    py: 'analysis/shrinking.py',
    category: 'core',
    description: 'Evaluates shrinking effectiveness'
  },
  'double-negation': {
    id: 'double-negation',
    ts: 'scripts/evidence/double-negation.study.ts',
    py: 'analysis/double_negation.py',
    category: 'core',
    description: 'Tests equivalence of double-negation'
  },

  // Apparatus Studies
  'biased-sampling': {
    id: 'biased-sampling',
    ts: 'scripts/evidence/biased-sampling.study.ts',
    py: 'analysis/biased_sampling.py',
    category: 'apparatus',
    description: 'Tests impact of biased sampling on boundary bugs'
  },
  'weighted-union': {
    id: 'weighted-union',
    ts: 'scripts/evidence/weighted-union.study.ts',
    py: 'analysis/weighted_union.py',
    category: 'apparatus',
    description: 'Tests probability distribution of unions'
  },
  'corner-case-coverage': {
    id: 'corner-case-coverage',
    ts: 'scripts/evidence/corner-case-coverage.study.ts',
    py: 'analysis/corner_case_coverage.py',
    category: 'apparatus',
    description: 'Tests percentage of bugs found via corner cases'
  },
  'filter-cascade': {
    id: 'filter-cascade',
    ts: 'scripts/evidence/filter-cascade.study.ts',
    py: 'analysis/filter_cascade.py',
    category: 'apparatus',
    description: 'Tests size estimation accuracy with filters'
  },
  'chained-distribution': {
    id: 'chained-distribution',
    ts: 'scripts/evidence/chained-distribution.study.ts',
    py: 'analysis/chained_distribution.py',
    category: 'apparatus',
    description: 'Tests distribution of chained arbitraries'
  },
  'shrinking-fairness': {
    id: 'shrinking-fairness',
    ts: 'scripts/evidence/shrinking-fairness.study.ts',
    py: 'analysis/shrinking_fairness.py',
    category: 'apparatus',
    description: 'Tests fairness of shrinking across quantifiers'
  },
  'length-distribution': {
    id: 'length-distribution',
    ts: 'scripts/evidence/length-distribution.study.ts',
    py: 'analysis/length_distribution.py',
    category: 'apparatus',
    description: 'Tests impact of length distribution on collection bugs'
  },
  'caching-tradeoff': {
    id: 'caching-tradeoff',
    ts: 'scripts/evidence/caching-tradeoff.study.ts',
    py: 'analysis/caching_tradeoff.py',
    category: 'apparatus',
    description: 'Tests impact of caching on diversity'
  },
  'streaming-accuracy': {
    id: 'streaming-accuracy',
    ts: 'scripts/evidence/streaming-accuracy.study.ts',
    py: 'analysis/streaming_accuracy.py',
    category: 'apparatus',
    description: 'Tests accuracy of streaming Bayesian stats'
  },
  'sample-budget': {
    id: 'sample-budget',
    ts: 'scripts/evidence/sample-budget.study.ts',
    py: 'analysis/sample_budget.py',
    category: 'apparatus',
    description: 'Tests effective sample size in nested loops'
  },
  'deduplication': {
    id: 'deduplication',
    ts: 'scripts/evidence/deduplication.study.ts',
    py: 'analysis/deduplication.py',
    category: 'apparatus',
    description: 'Tests efficiency of deduplication'
  },
  'mapped-size': {
    id: 'mapped-size',
    ts: 'scripts/evidence/mapped-size.study.ts',
    py: 'analysis/mapped_size.py',
    category: 'apparatus',
    description: 'Tests size estimation for mapped arbitraries'
  },
  'shrinking-strategies': {
    id: 'shrinking-strategies',
    ts: 'scripts/evidence/shrinking-strategies-comparison.study.ts',
    py: 'analysis/shrinking_strategies_comparison.py',
    category: 'apparatus',
    description: 'Compares different shrinking strategies'
  },
  'ci-calibration': {
    id: 'ci-calibration',
    ts: 'scripts/evidence/ci-calibration.study.ts',
    py: 'analysis/ci_calibration.py',
    category: 'apparatus',
    description: 'Tests credible interval calibration for size estimation'
  },
  'ci-convergence': {
    id: 'ci-convergence',
    ts: 'scripts/evidence/ci-convergence.study.ts',
    py: 'analysis/ci_convergence.py',
    category: 'apparatus',
    description: 'Tests convergence of credible intervals'
  },
  'early-termination': {
    id: 'early-termination',
    ts: 'scripts/evidence/early-termination.study.ts',
    py: 'analysis/early_termination.py',
    category: 'apparatus',
    description: 'Tests correctness of early termination decisions'
  },
  'adversarial-patterns': {
    id: 'adversarial-patterns',
    ts: 'scripts/evidence/adversarial-patterns.study.ts',
    py: 'analysis/adversarial_patterns.py',
    category: 'apparatus',
    description: 'Tests calibration under adversarial filter patterns'
  },
  'composition-depth': {
    id: 'composition-depth',
    ts: 'scripts/evidence/composition-depth.study.ts',
    py: 'analysis/composition_depth.py',
    category: 'apparatus',
    description: 'Tests impact of composition depth on coverage'
  }
}
