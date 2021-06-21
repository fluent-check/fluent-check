import os, sys, re
import pandas as pd

############
## MACROS ##
############

FILE_DELIMETER = '/'
CSV_EXTENSION = '.csv'
TEX_EXTENSION = '.tex'
COLUMNS = ['Mutation', 'Group1', 'Group2', 'Mean Diff', 'P-Adj', 'Lower', 'Upper', 'Reject']

RUNS = []
VERSIONS = []
CONFIGURATIONS = []
TIME = []
TEST_CASES = []
COVERAGE = []
SATISFIABILITY = []

if os.environ.get('FLUENT_CHECK_PROJECT') == None:
    print('\nINFO Benchmark Parser :: Environment variable <FLUENT_CHECK_PROJECT> is not set!\n')
    sys.exit()

PROJECT = os.environ.get('FLUENT_CHECK_PROJECT') # Replace this with the project name if you don't want to run the benchmark.sh script.
PATH = './.benchmarks/' + PROJECT + FILE_DELIMETER

for subdir in os.listdir(PATH):
    d = os.path.join(PATH, subdir)
    if os.path.isdir(d):
        VERSIONS.append(subdir)

if len(VERSIONS) < 1:
    sys.exit()

for subdir in os.listdir(PATH + VERSIONS[0]):
    d = os.path.join(PATH + VERSIONS[0], subdir)
    if os.path.isdir(d):
        RUNS.append(subdir)

if len(RUNS) < 1:
    sys.exit()

for subdir in os.listdir(PATH + VERSIONS[0] + FILE_DELIMETER + RUNS[0]):
    d = os.path.join(PATH + VERSIONS[0] + FILE_DELIMETER + RUNS[0], subdir)
    if os.path.isfile(d):
        CONFIGURATIONS.append(subdir)

if len(CONFIGURATIONS) < 1:
    sys.exit()

def parseMetric(metricData, metricName):
    data = []

    for f in metricData:
        id = re.findall('M\d', f)[0] if re.search('P\d+_' + metricName, f) == None else re.findall('P\d+', f)[0]
        df = pd.read_csv(f)
        dfData = df[df['Reject'] == True].values.tolist()
        
        for row in dfData:
            data.append([id] + row)
    
    if len(data) > 0:
        pd.DataFrame(data=data, columns=COLUMNS).to_csv(PATH + metricName + CSV_EXTENSION, index=False)
        pd.DataFrame(data=data, columns=COLUMNS).to_latex(PATH + metricName + TEX_EXTENSION, index=False)

for v in VERSIONS:
    for subdir in os.listdir(PATH + v + FILE_DELIMETER):
        d = os.path.join(PATH + v + FILE_DELIMETER, subdir)
        if os.path.isfile(d):
            if re.search('(P\d+|MIN)_TIME(?!.tex)', subdir):
                TIME.append(PATH + v + FILE_DELIMETER + subdir)
            elif re.search('(P\d+|MIN)_TEST_CASES(?!.tex)', subdir):
                TEST_CASES.append(PATH + v + FILE_DELIMETER + subdir)
            elif re.search('(P\d+|MIN)_COVERAGE(?!.tex)', subdir):
                COVERAGE.append(PATH + v + FILE_DELIMETER + subdir)
            elif re.search('(P\d+|MIN)_SATISFIABILITY(?!.tex)', subdir):
                SATISFIABILITY.append(PATH + v + FILE_DELIMETER + subdir)

parseMetric(TIME, 'TIME')
parseMetric(TEST_CASES, 'TEST_CASES')
parseMetric(COVERAGE, 'COVERAGE')
parseMetric(SATISFIABILITY, 'SATISFIABILITY')
