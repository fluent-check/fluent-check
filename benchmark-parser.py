import os, sys, json, functools
from numpy import integer
import pandas as pd

RUNS = []
VERSIONS = []
CONFIGURATIONS = []

if os.environ.get('FLUENT_CHECK_PROJECT') == None:
    sys.exit()

PROJECT = os.environ.get('FLUENT_CHECK_PROJECT') # Replace this with the project name if you don't want to run the benchmark.sh script.
PATH = './.benchmarks/' + PROJECT + '/'

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

for subdir in os.listdir(PATH + VERSIONS[0] + '/' + RUNS[0]):
    d = os.path.join(PATH + VERSIONS[0] + '/' + RUNS[0], subdir)
    if os.path.isfile(d):
        CONFIGURATIONS.append(subdir)

if len(CONFIGURATIONS) < 1:
    sys.exit()

for v in VERSIONS:
    for c in CONFIGURATIONS:
        configData = {
            'time': {},
            'coverage': {},
            'bugFound': {},
            'testCases': {}
        }
        
        for r in RUNS:
            with open(PATH + v + '/' + r + '/' + c) as f:
                data = json.load(f)
            for key in data.keys():
                if configData['time'].get(key) == None: 
                    configData['time'][key], configData['coverage'][key], configData['bugFound'][key], configData['testCases'][key] = [], [], [], []
                
                configData['time'][key].append(data[key]['actual']['benchmark_metrics']['time'])
                configData['coverage'][key].append(data[key]['actual']['benchmark_metrics']['coverage'])
                configData['bugFound'][key].append(data[key]['expected']['satisfiable'] == data[key]['actual']['satisfiable'])
                configData['testCases'][key].append(data[key]['actual']['benchmark_metrics']['number_test_cases'])
        
        dfData = []
        for key in configData['time'].keys():
            dfData.append([
                float("{:.5f}".format(functools.reduce(lambda acc, val : acc + val, configData['time'][key], 0) / len(configData['time'][key]))), 
                int(functools.reduce(lambda acc, val : acc + val, configData['testCases'][key], 0) / len(configData['testCases'][key])),
                float("{:.2f}".format(functools.reduce(lambda acc, val : acc + val, configData['coverage'][key], 0) / len(configData['coverage'][key]))), 
                float("{:.2f}".format((functools.reduce(lambda acc, val : acc + 1 if val else acc, configData['bugFound'][key], 0) * 100) / len(configData['bugFound'][key])))
            ])
        
        df = pd.DataFrame(dfData, columns = ['Time (ms)', 'Test Cases (Total)', 'Coverage (%)', 'Bug Found (%)'])
        df.index += 1
        df.to_csv(PATH + v + '/' + c.split('.')[0] + '.csv')

if len(sys.argv) > 1 and sys.argv[1] == '--show':
    for v in VERSIONS:
        for c in CONFIGURATIONS:
            print('-------------------- ' + v + ' - ' + c + ' --------------------\n')
            print(pd.read_csv(PATH + v + '/' + c.split('.')[0] + '.csv', index_col=0))
            print()
