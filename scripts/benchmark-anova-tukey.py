import sys, os, re
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
MIXINS = {'Bias': BIAS, 'PairWiseTesting': PAIR_WISE, 'ConstantExtraction': CONSTANT_EXTRACTION}
SEPARATOR = ' '

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

def baseMetric(df, metric, config, path, type = 'Min'):
    filteredDf = df.filter(items=['Strategy', type + SEPARATOR + metric])

    data = []
    for c in config:
        for k in MIXINS.keys():
            with_ = filteredDf[filteredDf['Strategy'].isin(withMixin(MIXINS[k], c))][type + SEPARATOR + metric].values.tolist()
            without_ = filteredDf[filteredDf['Strategy'].isin(withoutMixin(MIXINS[k], c))][type + SEPARATOR + metric].values.tolist()

            if not (all(elem == with_[0] for elem in with_) and all(elem == without_[0] for elem in without_)):
                df = pd.DataFrame({'metric': with_ + without_,
                                   'group': np.repeat([c + ' with' + k, c + ' without' + k], repeats=len(with_))}) 

                tukey = pairwise_tukeyhsd(endog=df['metric'],
                                          groups=df['group'],
                                          alpha=0.05)

                data.append(tukey._results_table.data[1:][0])
    
    if len(data) > 0:
        pd.DataFrame(data=data, columns=COLUMNS).to_csv(path, index=False)

def globalMetric(df, metric, config, path, type = 'Min'):
    filteredDf = df.filter(items=['Strategy', type + SEPARATOR + metric])

    data = []
    for c in config:
        for k in MIXINS.keys():
            with_ = filteredDf[filteredDf['Strategy'].isin(withMixin(MIXINS[k], c))][type + SEPARATOR + metric].values.tolist()
            without_ = filteredDf[filteredDf['Strategy'].isin(withoutMixin(MIXINS[k], c))][type + SEPARATOR + metric].values.tolist()

            if not (all(elem == with_[0] for elem in with_) and all(elem == without_[0] for elem in without_)):
                df = pd.DataFrame({'metric': with_ + without_,
                                   'group': np.repeat([c + ' with' + k, c + ' without' + k], repeats=len(with_))}) 

                tukey = pairwise_tukeyhsd(endog=df['metric'],
                                          groups=df['group'],
                                          alpha=0.05)

                data.append(tukey._results_table.data[1:][0])

    R  = filteredDf[filteredDf['Strategy'].isin(RANDOM)][type + SEPARATOR + metric].values.tolist()
    CG = filteredDf[filteredDf['Strategy'].isin(COVERAGE_GUIDED)][type + SEPARATOR + metric].values.tolist()

    if not (all(elem == R[0] for elem in R) and all(elem == CG[0] for elem in CG)):
        df = pd.DataFrame({'metric': R + CG,
                           'group': np.repeat(['Random', 'Coverage-Guided'], repeats=len(R))}) 

        tukey = pairwise_tukeyhsd(endog=df['metric'],
                                  groups=df['group'],
                                  alpha=0.05)

        data.append(tukey._results_table.data[1:][0])
    
    if len(data) > 0:
        pd.DataFrame(data=data, columns=COLUMNS).to_csv(path, index=False)

##########
## MAIN ##
##########

if len(sys.argv) < 2:
    sys.exit()

PATH = './.benchmarks/' + sys.argv[1] + '/'

DATA = []

if len(sys.argv) == 3 and sys.argv[2] == '-S':
    PATH += 'M0/'
    
    for subdir in os.listdir(PATH):
        d = os.path.join(PATH, subdir)
        if os.path.isfile(d) and re.search('.*P\d+\.csv', d) != None:
            DATA.append(subdir)
    
    if len(DATA) < 1:
        sys.exit()

    SEPARATOR = ''
    
    for d in DATA:
        df = pd.read_csv(PATH + d)
        baseMetric(df, 'Mean Coverage (%)', ['Coverage-Guided'], PATH + d.split('.')[0] + '_COVERAGE.csv', '')
        globalMetric(df, 'Mean Time (ms)', ['Random', 'Coverage-Guided'], PATH + d.split('.')[0] + '_TIME.csv', '')
        globalMetric(df, 'Mean Test Cases', ['Random', 'Coverage-Guided'], PATH + d.split('.')[0] + '_TEST_CASES.csv', '')
        globalMetric(df, 'Satisfiability (%)', ['Random', 'Coverage-Guided'], PATH + d.split('.')[0] + '_SATISFIABILITY.csv', '')
else:
    for subdir in os.listdir(PATH):
        d = os.path.join(PATH, subdir)
        if os.path.isdir(d):
            DATA.append(subdir)

    if len(DATA) < 1:
        sys.exit()

    for d in DATA:
        df = pd.read_csv(PATH + d + '/' + d + '.csv')
        baseMetric(df, 'Mean Coverage (%)', ['Coverage-Guided'], PATH + d + '/MIN_COVERAGE.csv')
        globalMetric(df, 'Mean Time (ms)', ['Random', 'Coverage-Guided'], PATH + d + '/MIN_TIME.csv')
        globalMetric(df, 'Mean Test Cases', ['Random', 'Coverage-Guided'], PATH + d + '/MIN_TEST_CASES.csv')
