import os, sys, json, functools
import pandas as pd

############
## MACROS ##
############

TIME = 'Time (ms)'
SAMPLE_SIZE = 'Sample Size'
TEST_CASES = 'Test Cases'
COVERAGE = 'Coverage (%)'
BUG_FOUND = 'Bug Found (%)'
FILE_DELIMETER = '/'
CSV_EXTENSION = '.csv'

RUNS = []
VERSIONS = []
CONFIGURATIONS = []

if os.environ.get('FLUENT_CHECK_PROJECT') == None:
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

for v in VERSIONS:
    vdfData = []
    for c in CONFIGURATIONS:
        configData = { 'time': {}, 'status': {}, 'coverage': {}, 'testCases': {}, 'sampleSize': {} }
        for r in RUNS:
            with open(PATH + v + FILE_DELIMETER + r + FILE_DELIMETER + c) as f:
                data = json.load(f)
            for key in data.keys():
                if configData['time'].get(key) == None: 
                    configData['time'][key], configData['coverage'][key], configData['status'][key], configData['testCases'][key], configData['sampleSize'][key] = [], [], [], [], []
                
                configData['time'][key].append(data[key]['actual']['benchmarkMetrics']['time'])
                configData['coverage'][key].append(data[key]['actual']['benchmarkMetrics']['coverage'])
                configData['status'][key].append(data[key]['expected']['satisfiable'] == data[key]['actual']['satisfiable'])
                configData['testCases'][key].append(data[key]['actual']['benchmarkMetrics']['numberTestCases'])
                configData['sampleSize'][key].append(data[key]['actual']['benchmarkMetrics']['sampleSize'])
        
        dfData = []
        for key in configData['time'].keys():
            dfData.append([
                float("{:.5f}".format(functools.reduce(lambda acc, val : acc + val, configData['time'][key], 0) / len(configData['time'][key]))), 
                int(functools.reduce(lambda acc, val : acc + val, configData['sampleSize'][key], 0) / len(configData['sampleSize'][key])),
                int(functools.reduce(lambda acc, val : acc + val, configData['testCases'][key], 0) / len(configData['testCases'][key])),
                float("{:.2f}".format(functools.reduce(lambda acc, val : acc + val, configData['coverage'][key], 0) / len(configData['coverage'][key]))), 
                float("{:.2f}".format((functools.reduce(lambda acc, val : acc + 1 if val else acc, configData['status'][key], 0) * 100) / len(configData['status'][key])))
            ])
        
        df = pd.DataFrame(dfData, columns = [TIME, SAMPLE_SIZE, TEST_CASES, COVERAGE, BUG_FOUND])
        df.index += 1
        df.to_csv(PATH + v + FILE_DELIMETER + c.split('.')[0] + CSV_EXTENSION)

        filteredDf = df[df[BUG_FOUND] > 0]
        vdfData.append([c.split('.')[0],
                min(filteredDf[TIME]), max(filteredDf[TIME]),
                min(filteredDf[SAMPLE_SIZE]), max(filteredDf[SAMPLE_SIZE]),
                min(filteredDf[TEST_CASES]), max(filteredDf[TEST_CASES]),
                min(filteredDf[COVERAGE]), max(filteredDf[COVERAGE]),
                len(filteredDf) > 0
            ]) if len(filteredDf) > 0 else [c.split('.')[0], None, None, None, None, None, None, None, None, len(filteredDf) > 0]
    df = pd.DataFrame(vdfData, columns = [
            'Strategy', 
            'Min ' + TIME, 'Max ' + TIME, 
            'Min ' + SAMPLE_SIZE, 'Max ' + SAMPLE_SIZE, 
            'Min ' + TEST_CASES, 'Max ' + TEST_CASES, 
            'Min ' + COVERAGE, 'Max ' + COVERAGE,
            'Bug Found'
            ])
    df.to_csv(PATH + v + FILE_DELIMETER + v + CSV_EXTENSION, index=False)

if len(sys.argv) > 1 and sys.argv[1] == '--show':
    for v in VERSIONS:
        for c in CONFIGURATIONS:
            print('-------------------- ' + v + ' - ' + c + ' --------------------\n')
            print(pd.read_csv(PATH + v + FILE_DELIMETER + c.split('.')[0] + CSV_EXTENSION, index_col=0))
            print()
