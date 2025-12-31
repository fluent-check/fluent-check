
import { spawnSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { registry, StudyConfig } from './registry.js'

const ARGS = process.argv.slice(2)
const QUICK_MODE = ARGS.includes('--quick') || process.env.QUICK_MODE === '1'
const ANALYSIS_ONLY = ARGS.includes('--analysis-only')
const THREADS_ARG = ARGS.find(a => a.startsWith('--threads='))
const THREADS = THREADS_ARG ? parseInt(THREADS_ARG.split('=')[1], 10) : 1
const VENV_PYTHON = path.join(process.cwd(), 'analysis/.venv/bin/python')

function printHelp() {
  console.log(`
Usage: npx tsx scripts/evidence/execute.ts [options] [studies]

Options:
  --quick           Run in quick mode (reduced sample sizes)
  --threads=N       Run with N threads (default: 1)
  --analysis-only   Skip data generation and only run analysis
  --all             Run ALL studies
  --list-studies    List all available studies
  --list-tags       List all available tags
  --<tag>           Run all studies with specific tag (e.g. --core, --apparatus, --shrinking)
  --help            Show this help message

Studies:
  ${Object.keys(registry).join(', ')}

Examples:
  npx tsx scripts/evidence/execute.ts --core --quick
  npx tsx scripts/evidence/execute.ts --shrinking
  npx tsx scripts/evidence/execute.ts calibration detection
`)
}

function printStudies() {
  console.log('Available Studies:')
  const maxIdLen = Math.max(...Object.keys(registry).map(k => k.length))
  for (const study of Object.values(registry)) {
    console.log(`  ${study.id.padEnd(maxIdLen + 2)} ${study.description}`)
  }
}

function printTags() {
  const allTags = new Set<string>()
  for (const study of Object.values(registry)) {
    study.tags.forEach(t => allTags.add(t))
  }
  console.log('Available Tags:')
  console.log(`  ${Array.from(allTags).sort().join(', ')}`)
}

if (ARGS.includes('--help')) {
  printHelp()
  process.exit(0)
}

if (ARGS.includes('--list-studies')) {
  printStudies()
  process.exit(0)
}

if (ARGS.includes('--list-tags')) {
  printTags()
  process.exit(0)
}

function getSelectedStudies(): StudyConfig[] {
  const selected: StudyConfig[] = []
  const explicitNames = ARGS.filter(a => !a.startsWith('--'))
  const tagFilters = ARGS.filter(a => 
    a.startsWith('--') && 
    !['--quick', '--all', '--help', '--list-studies', '--list-tags'].includes(a)
  ).map(t => t.slice(2))
  
  if (ARGS.includes('--all')) {
    return Object.values(registry)
  }

  // Add studies matching tags
  if (tagFilters.length > 0) {
    const studiesWithTags = Object.values(registry).filter(s => 
      tagFilters.some(tag => s.tags.includes(tag))
    )
    selected.push(...studiesWithTags)
  }

  // Add explicitly named studies
  for (const name of explicitNames) {
    if (registry[name]) {
      if (!selected.find(s => s.id === name)) {
        selected.push(registry[name])
      }
    } else {
      console.warn(`Warning: Unknown study '${name}'`)
    }
  }

  // Remove duplicates if any (e.g. if selected by tag AND name)
  const uniqueSelected = Array.from(new Set(selected.map(s => s.id)))
    .map(id => selected.find(s => s.id === id)!)

  return uniqueSelected
}

function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv = process.env) {
  const result = spawnSync(command, args, { stdio: 'inherit', env })
  if (result.error) {
    console.error(`Error executing ${command}:`, result.error)
    process.exit(1)
  }
  if (result.status !== 0) {
    console.error(`${command} exited with status ${result.status}`)
    process.exit(result.status ?? 1)
  }
}

function checkPythonEnv() {
  if (!fs.existsSync(VENV_PYTHON)) {
    console.error('Python virtual environment not found at analysis/.venv')
    console.error('Please run: npm run evidence:setup')
    process.exit(1)
  }
}

async function main() {
  const studies = getSelectedStudies()

  if (studies.length === 0) {
    console.error('No studies selected.')
    printHelp()
    process.exit(1)
  }

  checkPythonEnv()

  console.log(`Running ${studies.length} studies in ${QUICK_MODE ? 'QUICK' : 'FULL'} mode...`)
  
  const env = { 
    ...process.env, 
    QUICK_MODE: QUICK_MODE ? '1' : '0',
    THREADS: String(THREADS)
  }

  for (const study of studies) {
    console.log(`------------------------------------------------------------`)
    console.log(`Study: ${study.id} (${study.description})`)
    console.log(`------------------------------------------------------------`)

    // 1. Generate Data (TypeScript)
    if (!ANALYSIS_ONLY) {
      console.log(`> Generating data...`)
      runCommand('npx', ['tsx', study.ts], env)
    } else {
      console.log(`> Skipping data generation (--analysis-only)`)
    }

    // 2. Analyze Data (Python)
    if (study.py) {
      console.log(`> Analyzing results...`)
      // Run inside analysis dir so imports work
      const pyScriptPath = path.resolve(study.py)
      runCommand(VENV_PYTHON, [pyScriptPath], { ...env, PYTHONPATH: path.dirname(pyScriptPath) })
    }
  }

  console.log(`✓ All selected studies completed successfully.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
