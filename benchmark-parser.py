import os, sys, json, functools
import numpy as np
from numpy.core.fromnumeric import mean 
import pandas as pd

############
## MACROS ##
############

TIME = 'Time (ms)'
SAMPLE_SIZE = 'Sample Size'
TEST_CASES = 'Test Cases'
COVERAGE = 'Coverage (%)'
BUG_FOUND = 'Bug Found (%)'
STD = 'Std'
MIN = 'Min'
MAX = 'Max'
MEAN = 'Mean'
FILE_DELIMETER = '/'
SEPARATOR = ' '
CSV_EXTENSION = '.csv'

RUNS = []
VERSIONS = []
CONFIGURATIONS = []

# if os.environ.get('FLUENT_CHECK_PROJECT') == None:
#     sys.exit()

PROJECT = 'stack' # os.environ.get('FLUENT_CHECK_PROJECT') # Replace this with the project name if you don't want to run the benchmark.sh script.
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
                configData['status'][key].append(data[key]['expected']['satisfiable'] != data[key]['actual']['satisfiable'])
                configData['testCases'][key].append(data[key]['actual']['benchmarkMetrics']['numberTestCases'])
                configData['sampleSize'][key].append(data[key]['actual']['benchmarkMetrics']['sampleSize'])
        
        dfData = []
        for key in configData['time'].keys():
            dfData.append([
                float("{:.5f}".format(np.mean(configData['time'][key]))), float("{:.5f}".format(np.std(configData['time'][key]))),
                int(np.mean(configData['sampleSize'][key])),
                int(np.mean(configData['testCases'][key])), int(np.std(configData['testCases'][key])),
                float("{:.2f}".format(np.mean(configData['coverage'][key]))), float("{:.2f}".format(np.std(configData['coverage'][key]))),
                float("{:.2f}".format(configData['status'][key].count(True) / len(configData['status'][key]) * 100))
            ])
        
        df = pd.DataFrame(dfData, columns = [
            MEAN + SEPARATOR + TIME, STD + SEPARATOR + TIME,
            SAMPLE_SIZE,
            MEAN + SEPARATOR + TEST_CASES, STD + SEPARATOR + TEST_CASES,
            MEAN + SEPARATOR + COVERAGE, STD + SEPARATOR + COVERAGE,
            BUG_FOUND
        ])
        df.index += 1
        df.to_csv(PATH + v + FILE_DELIMETER + c.split('.')[0] + CSV_EXTENSION)

        filteredDf = df[df[BUG_FOUND] > 0]
        vdfData.append([c.split('.')[0],
                filteredDf[MEAN + SEPARATOR + TIME][filteredDf[MEAN + SEPARATOR + TIME].idxmin()],
                filteredDf[STD  + SEPARATOR + TIME][filteredDf[MEAN + SEPARATOR + TIME].idxmin()],
                filteredDf[MEAN + SEPARATOR + TIME][filteredDf[MEAN + SEPARATOR + TIME].idxmax()],
                filteredDf[STD  + SEPARATOR + TIME][filteredDf[MEAN + SEPARATOR + TIME].idxmax()],
                filteredDf[SAMPLE_SIZE].min(), filteredDf[SAMPLE_SIZE].max(),
                filteredDf[MEAN + SEPARATOR + TEST_CASES][filteredDf[MEAN + SEPARATOR + TEST_CASES].idxmin()],
                filteredDf[STD  + SEPARATOR + TEST_CASES][filteredDf[MEAN + SEPARATOR + TEST_CASES].idxmin()],
                filteredDf[MEAN + SEPARATOR + TEST_CASES][filteredDf[MEAN + SEPARATOR + TEST_CASES].idxmax()],
                filteredDf[STD  + SEPARATOR + TEST_CASES][filteredDf[MEAN + SEPARATOR + TEST_CASES].idxmax()],
                filteredDf[MEAN + SEPARATOR + COVERAGE][filteredDf[MEAN + SEPARATOR + COVERAGE].idxmin()],
                filteredDf[STD  + SEPARATOR + COVERAGE][filteredDf[MEAN + SEPARATOR + COVERAGE].idxmin()],
                filteredDf[MEAN + SEPARATOR + COVERAGE][filteredDf[MEAN + SEPARATOR + COVERAGE].idxmax()],
                filteredDf[STD  + SEPARATOR + COVERAGE][filteredDf[MEAN + SEPARATOR + COVERAGE].idxmax()],
                len(filteredDf) > 0
            ]) if len(filteredDf) > 0 else [c.split('.')[0], None, None, None, None, None, None, None, None, len(filteredDf) > 0]
    df = pd.DataFrame(vdfData, columns = [
            'Strategy',
            MIN + SEPARATOR + TIME, STD + SEPARATOR + MIN + SEPARATOR + TIME,
            MAX + SEPARATOR + TIME, STD + SEPARATOR + MAX + SEPARATOR + TIME,
            MIN + SEPARATOR + SAMPLE_SIZE, MAX + SEPARATOR + SAMPLE_SIZE,
            MIN + SEPARATOR + TEST_CASES, STD + SEPARATOR + MIN + SEPARATOR + TEST_CASES,
            MAX + SEPARATOR + TEST_CASES, STD + SEPARATOR + MAX + SEPARATOR + TEST_CASES,
            MIN + SEPARATOR + COVERAGE, STD + SEPARATOR + MIN + SEPARATOR + COVERAGE,
            MAX + SEPARATOR + COVERAGE, STD + SEPARATOR + MAX + SEPARATOR + COVERAGE,
            'Bug Found'
            ])
    df.to_csv(PATH + v + FILE_DELIMETER + v + CSV_EXTENSION, index=False)

if len(sys.argv) > 1 and sys.argv[1] == '--show':
    for v in VERSIONS:
        for c in CONFIGURATIONS:
            print('-------------------- ' + v + ' - ' + c + ' --------------------\n')
            print(pd.read_csv(PATH + v + FILE_DELIMETER + c.split('.')[0] + CSV_EXTENSION, index_col=0))
            print()
