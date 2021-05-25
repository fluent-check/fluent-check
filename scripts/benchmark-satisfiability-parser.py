import os, sys, json
import numpy as np
import pandas as pd

############
## MACROS ##
############

TIME = 'Time (ms)'
SAMPLE_SIZE = 'Sample Size'
TEST_CASES = 'Test Cases'
COVERAGE = 'Coverage (%)'
SATISFIABILITY = 'Satisfiability (%)'
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
    parsedData = {}
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
            SATISFIABILITY
        ])
        df.index += 1
        df.to_csv(PATH + v + FILE_DELIMETER + c.split('.')[0] + CSV_EXTENSION)
        parsedData[c.split('.')[0]] = df
    
    for p in range(1, len(parsedData[list(parsedData.keys())[0]]) + 1):
        vdfData = []
        for key in parsedData.keys():
            vdfData.append([key] +  parsedData[key].iloc[[p - 1]].values.tolist()[0])

        df = pd.DataFrame(vdfData, columns = [
            'Strategy',
            MEAN + SEPARATOR + TIME, STD + SEPARATOR + TIME,
            SAMPLE_SIZE,
            MEAN + SEPARATOR + TEST_CASES, STD + SEPARATOR + TEST_CASES,
            MEAN + SEPARATOR + COVERAGE, STD + SEPARATOR + COVERAGE,
            SATISFIABILITY
        ])
        df.to_csv(PATH + v + FILE_DELIMETER + 'P' + str(p) + CSV_EXTENSION, index=False)
