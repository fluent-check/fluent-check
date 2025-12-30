
import { spawnSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { registry, StudyConfig } from './registry.js'

const ARGS = process.argv.slice(2)
const QUICK_MODE = ARGS.includes('--quick') || process.env.QUICK_MODE === '1'
const VENV_PYTHON = path.join(process.cwd(), 'analysis/.venv/bin/python')

function printHelp() {
  console.log(`
Usage: npx tsx scripts/evidence/execute.ts [options] [studies]

Options:
  --quick       Run in quick mode (reduced sample sizes)
  --core        Run all core confidence studies
  --apparatus   Run all statistical apparatus studies
  --all         Run ALL studies (core + apparatus)
  --help        Show this help message

Studies:
  ${Object.keys(registry).join(', ')}

Examples:
  npx tsx scripts/evidence/execute.ts --core --quick
  npx tsx scripts/evidence/execute.ts calibration detection
`)
}

if (ARGS.includes('--help')) {
  printHelp()
  process.exit(0)
}

function getSelectedStudies(): StudyConfig[] {
  const selected: StudyConfig[] = []
  const explicitNames = ARGS.filter(a => !a.startsWith('--'))
  
  if (ARGS.includes('--all')) {
    return Object.values(registry)
  }

  if (ARGS.includes('--core')) {
    selected.push(...Object.values(registry).filter(s => s.category === 'core'))
  }

  if (ARGS.includes('--apparatus')) {
    selected.push(...Object.values(registry).filter(s => s.category === 'apparatus'))
  }

  for (const name of explicitNames) {
    if (registry[name]) {
      if (!selected.find(s => s.id === name)) {
        selected.push(registry[name])
      }
    } else {
      console.warn(`Warning: Unknown study '${name}'`)
    }
  }

  return selected
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
  
  const env = { ...process.env, QUICK_MODE: QUICK_MODE ? '1' : '0' }

  for (const study of studies) {
    console.log(`------------------------------------------------------------`)
    console.log(`Study: ${study.id} (${study.description})`)
    console.log(`------------------------------------------------------------`)

    // 1. Generate Data (TypeScript)
    console.log(`> Generating data...`)
    runCommand('npx', ['tsx', study.ts], env)

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
