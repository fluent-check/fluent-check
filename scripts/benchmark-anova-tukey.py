import sys, os
import pandas as pd
import numpy as np
from scipy.stats import f_oneway
from statsmodels.stats.multicomp import pairwise_tukeyhsd

RANDOM = ['PBT_R_S1', 'PBT_R_S2', 'PBT_R_S3', 'PBT_R_S4', 'PBT_R_S5', 'PBT_R_S6', 'PBT_R_S7', 'PBT_R_S8']
COVERAGE_GUIDED = ['PBT_CG_S1', 'PBT_CG_S2', 'PBT_CG_S3', 'PBT_CG_S4', 'PBT_CG_S5', 'PBT_CG_S6', 'PBT_CG_S7', 'PBT_CG_S8']
BIAS = [2, 5, 6, 8]
PAIR_WISE = [4, 6, 7, 8]
CONSTANT_EXTRACTION = [3, 5, 7, 8]

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

def time(df):
    config = ['Random', 'Coverage-Guided']
    mixins = {'Bias': BIAS, 'PairWiseTesting': PAIR_WISE, 'ConstantExtraction': CONSTANT_EXTRACTION}
    filteredDf = df.filter(items=['Strategy', 'Min Time (ms)'])

    data = []
    for c in config:
        for k in mixins.keys():
            with_ = filteredDf[filteredDf['Strategy'].isin(withMixin(mixins[k], c))]['Min Time (ms)'].values.tolist()
            without_ = filteredDf[filteredDf['Strategy'].isin(withoutMixin(mixins[k], c))]['Min Time (ms)'].values.tolist()

            # f_oneway(with_, without_)

            df = pd.DataFrame({'time': with_ + without_,
                       'group': np.repeat([c + ' with' + k, c + ' without' + k], repeats=len(with_))}) 

            tukey = pairwise_tukeyhsd(endog=df['time'],
                                    groups=df['group'],
                                    alpha=0.05)

            data.append(tukey._results_table.data[1:][0])
    
    pd.DataFrame(data=data, columns=['Group1', 'Group2', 'Mean Diff', 'P-Adj', 'Lower', 'Upper', 'Reject']).to_csv(PATH + v + '/TIME.csv', index=False)

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
    time(pd.read_csv(PATH + v + '/' + v + '.csv'))
