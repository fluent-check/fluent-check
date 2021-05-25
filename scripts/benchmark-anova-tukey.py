import sys, os
import pandas as pd
import numpy as np
from scipy.stats import f_oneway
from statsmodels.stats.multicomp import pairwise_tukeyhsd

############
## MACROS ##
############

RANDOM = ['PBT_R_S1', 'PBT_R_S2', 'PBT_R_S3', 'PBT_R_S4', 'PBT_R_S5', 'PBT_R_S6', 'PBT_R_S7', 'PBT_R_S8']
COVERAGE_GUIDED = ['PBT_CG_S1', 'PBT_CG_S2', 'PBT_CG_S3', 'PBT_CG_S4', 'PBT_CG_S5', 'PBT_CG_S6', 'PBT_CG_S7', 'PBT_CG_S8']
BIAS = [2, 5, 6, 8]
PAIR_WISE = [4, 6, 7, 8]
CONSTANT_EXTRACTION = [3, 5, 7, 8]
COLUMNS = ['Group1', 'Group2', 'Mean Diff', 'P-Adj', 'Lower', 'Upper', 'Reject']

###############
## FUNCTIONS ##
###############

def withMixin(mixin, type = ''):
    data = []
    base = RANDOM + COVERAGE_GUIDED
    baseTemplate = ['PBT_R_S', 'PBT_CG_S']
    if type == 'Random': 
        base = RANDOM
        baseTemplate = ['PBT_R_S']
    elif type == 'Coverage-Guided':
        base = COVERAGE_GUIDED
        baseTemplate = ['PBT_CG_S']
    for val in mixin:
        for template in baseTemplate:
            if template + str(val) in base:
                data.append(template + str(val))
    return data

def withoutMixin(mixin, type = ''):
    base = RANDOM + COVERAGE_GUIDED
    baseTemplate = ['PBT_R_S', 'PBT_CG_S']
    if type == 'Random': 
        base = RANDOM
        baseTemplate = ['PBT_R_S']
    elif type == 'Coverage-Guided':
        base = COVERAGE_GUIDED
        baseTemplate = ['PBT_CG_S']
    data = base.copy()
    for val in mixin:
        for template in baseTemplate:
            if template + str(val) in base:
                data.remove(template + str(val))
    return data

def time(df, type = 'Min'):
    config = ['Random', 'Coverage-Guided']
    mixins = {'Bias': BIAS, 'PairWiseTesting': PAIR_WISE, 'ConstantExtraction': CONSTANT_EXTRACTION}
    filteredDf = df.filter(items=['Strategy', type + ' Mean Time (ms)'])

    data = []
    for c in config:
        for k in mixins.keys():
            with_ = filteredDf[filteredDf['Strategy'].isin(withMixin(mixins[k], c))][type + ' Mean Time (ms)'].values.tolist()
            without_ = filteredDf[filteredDf['Strategy'].isin(withoutMixin(mixins[k], c))][type + ' Mean Time (ms)'].values.tolist()

            if not (all(elem == with_[0] for elem in with_) and all(elem == without_[0] for elem in without_)):
                # f_oneway(with_, without_)
                df = pd.DataFrame({'time': with_ + without_,
                       'group': np.repeat([c + ' with' + k, c + ' without' + k], repeats=len(with_))}) 

                tukey = pairwise_tukeyhsd(endog=df['time'],
                                          groups=df['group'],
                                          alpha=0.05)

                data.append(tukey._results_table.data[1:][0])
    
    if len(data) > 0:
        pd.DataFrame(data=data, columns=COLUMNS).to_csv(PATH + v + '/' + str(type).upper() + '_TIME.csv', index=False)

def coverage(df, type = 'Min'):
    c = 'Coverage-Guided'
    mixins = {'Bias': BIAS, 'PairWiseTesting': PAIR_WISE, 'ConstantExtraction': CONSTANT_EXTRACTION}
    filteredDf = df.filter(items=['Strategy', type + ' Mean Coverage (%)'])

    data = []
    for k in mixins.keys():
        with_ = filteredDf[filteredDf['Strategy'].isin(withMixin(mixins[k], c))][type + ' Mean Coverage (%)'].values.tolist()
        without_ = filteredDf[filteredDf['Strategy'].isin(withoutMixin(mixins[k], c))][type + ' Mean Coverage (%)'].values.tolist()

        if not (all(elem == with_[0] for elem in with_) and all(elem == without_[0] for elem in without_)):
            # F = f_oneway(with_, without_)
            df = pd.DataFrame({'coverage': with_ + without_,
                           'group': np.repeat([c + ' with' + k, c + ' without' + k], repeats=len(with_))}) 

            tukey = pairwise_tukeyhsd(endog=df['coverage'],
                                      groups=df['group'],
                                      alpha=0.05)

            data.append(tukey._results_table.data[1:][0])
        
    if len(data) > 0:
        pd.DataFrame(data=data, columns=COLUMNS).to_csv(PATH + v + '/' + str(type).upper() + '_COVERAGE.csv', index=False)

def testCases(df, type = 'Min'):
    config = ['Random', 'Coverage-Guided']
    mixins = {'Bias': BIAS, 'PairWiseTesting': PAIR_WISE, 'ConstantExtraction': CONSTANT_EXTRACTION}
    filteredDf = df.filter(items=['Strategy', type + ' Mean Test Cases'])

    data = []
    for c in config:
        for k in mixins.keys():
            with_ = filteredDf[filteredDf['Strategy'].isin(withMixin(mixins[k], c))][type + ' Mean Test Cases'].values.tolist()
            without_ = filteredDf[filteredDf['Strategy'].isin(withoutMixin(mixins[k], c))][type + ' Mean Test Cases'].values.tolist()

            if not (all(elem == with_[0] for elem in with_) and all(elem == without_[0] for elem in without_)):
                # f_oneway(with_, without_)
                df = pd.DataFrame({'testcases': with_ + without_,
                                   'group': np.repeat([c + ' with' + k, c + ' without' + k], repeats=len(with_))}) 

                tukey = pairwise_tukeyhsd(endog=df['testcases'],
                                          groups=df['group'],
                                          alpha=0.05)

                data.append(tukey._results_table.data[1:][0])

            
    for k in mixins.keys():
        with_R  = filteredDf[filteredDf['Strategy'].isin(withMixin(mixins[k], 'Random'))][type + ' Mean Test Cases'].values.tolist()
        with_CG = filteredDf[filteredDf['Strategy'].isin(withMixin(mixins[k], 'Coverage-Guided'))][type + ' Mean Test Cases'].values.tolist()

        if not (all(elem == with_R[0] for elem in with_R) and all(elem == with_CG[0] for elem in with_CG)):
            # f_oneway(with_, without_)
            df = pd.DataFrame({'testcases': with_R + with_CG,
                               'group': np.repeat(['Random with' + k, 'Coverage-Guided with' + k], repeats=len(with_R))}) 

            tukey = pairwise_tukeyhsd(endog=df['testcases'],
                                      groups=df['group'],
                                      alpha=0.05)

            data.append(tukey._results_table.data[1:][0])

    R  = filteredDf[filteredDf['Strategy'].isin(RANDOM)][type + ' Mean Test Cases'].values.tolist()
    CG = filteredDf[filteredDf['Strategy'].isin(COVERAGE_GUIDED)][type + ' Mean Test Cases'].values.tolist()

    if not (all(elem == R[0] for elem in R) and all(elem == CG[0] for elem in CG)):
        # f_oneway(with_, without_)
        df = pd.DataFrame({'testcases': R + CG,
                           'group': np.repeat(['Random', 'Coverage-Guided'], repeats=len(R))}) 

        tukey = pairwise_tukeyhsd(endog=df['testcases'],
                                  groups=df['group'],
                                  alpha=0.05)

        data.append(tukey._results_table.data[1:][0])
    
    if len(data) > 0:
        pd.DataFrame(data=data, columns=COLUMNS).to_csv(PATH + v + '/' + str(type).upper() + '_TEST_CASES.csv', index=False)

##########
## MAIN ##
##########

if len(sys.argv) < 2:
    sys.exit()

VERSIONS = []
PATH = './.benchmarks/' + sys.argv[1] + '/'

for subdir in os.listdir(PATH):
    d = os.path.join(PATH, subdir)
    if os.path.isdir(d):
        VERSIONS.append(subdir)

if len(VERSIONS) < 1:
    sys.exit()

for v in VERSIONS:
    df = pd.read_csv(PATH + v + '/' + v + '.csv')
    time(df)
    testCases(df)
    coverage(df)
